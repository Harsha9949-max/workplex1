import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Camera, Briefcase, CreditCard, ShieldCheck,
  FileText, CheckCircle, ChevronRight, ChevronLeft,
  Loader2, AlertCircle, Upload, Lock
} from 'lucide-react';
import { Venture, UserRole, VentureRoleMap, UserProfile } from '../types';
import { encrypt } from '../lib/security';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface OnboardingFlowProps {
  user: any;
  onComplete: (data: Partial<UserProfile>) => void;
  onCancel: () => void;
}

export default function OnboardingFlow({ user, onComplete, onCancel }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    age: 18,
    bankAccount: '',
    upiId: '',
    aadhaar: '',
    pan: '',
    contractSigned: false,
    wallets: { earned: 0, pending: 27, bonus: 0, savings: 0 },
    onboardingStatus: 'in_progress'
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 7));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const steps = [
    { id: 1, title: 'Identity', icon: <User size={20} /> },
    { id: 2, title: 'Portrait', icon: <Camera size={20} /> },
    { id: 3, title: 'Venture', icon: <Briefcase size={20} /> },
    { id: 4, title: 'Specialty', icon: <Briefcase size={20} /> },
    { id: 5, title: 'Payouts', icon: <CreditCard size={20} /> },
    { id: 6, title: 'KYC', icon: <ShieldCheck size={20} /> },
    { id: 7, title: 'Contract', icon: <FileText size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#111111] z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#E8B84B] to-[#00C9A7] shadow-[0_0_15px_rgba(232,184,75,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 7) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-6 pt-12 pb-24">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={onCancel}
            className="mb-8 text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <ChevronLeft size={16} /> Exit Setup
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#E8B84B]/10 rounded-2xl flex items-center justify-center text-[#E8B84B] border border-[#E8B84B]/20">
              {steps[step - 1].icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-[#E8B84B] uppercase tracking-[0.2em] mb-1">Step {step} of 7</p>
              <h1 className="text-3xl font-black tracking-tight">{steps[step - 1].title}</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            {step === 1 && <IdentityStep data={formData} update={setFormData} onNext={nextStep} />}
            {step === 2 && <PhotoStep user={user} data={formData} update={setFormData} onNext={nextStep} />}
            {step === 3 && <VentureStep data={formData} update={setFormData} onNext={nextStep} />}
            {step === 4 && <RoleStep data={formData} update={setFormData} onNext={nextStep} />}
            {step === 5 && <PayoutStep data={formData} update={setFormData} onNext={nextStep} />}
            {step === 6 && <KycStep data={formData} update={setFormData} onNext={nextStep} />}
            {step === 7 && <ContractStep data={formData} update={setFormData} onComplete={() => onComplete(formData)} />}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-steps ---

function IdentityStep({ data, update, onNext }: any) {
  const isValid = data.name?.length >= 3 && data.age >= 18;
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Full Legal Name</label>
        <input
          type="text"
          value={data.name}
          onChange={e => update({ ...data, name: e.target.value })}
          placeholder="As per Aadhaar"
          className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Your Age</label>
        <div className="flex gap-4">
          <input
            type="number"
            value={data.age}
            onChange={e => update({ ...data, age: parseInt(e.target.value) })}
            className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all"
          />
        </div>
        {data.age < 18 && <p className="text-red-500 text-xs mt-2 font-bold">Must be 18+ to join</p>}
      </div>
      <button
        disabled={!isValid}
        onClick={onNext}
        className="w-full bg-[#E8B84B] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#E8B84B]/20 disabled:opacity-20 flex items-center justify-center gap-2 group mt-8"
      >
        Continue <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

function PhotoStep({ user, data, update, onNext }: any) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);
      setError(null);

      const storageRef = ref(storage, `profiles/${user.uid}/photo`);

      // Show progress during upload
      const snapshot = await uploadBytes(storageRef, file);
      setUploadProgress(100);

      const url = await getDownloadURL(snapshot.ref);
      update({ ...data, photoURL: url });
      setError(null);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleSkip = () => {
    update({ ...data, photoURL: null });
    onNext();
  };

  return (
    <div className="space-y-8 flex flex-col items-center">
      <div className="relative group">
        <div className="w-40 h-40 bg-[#111111] rounded-[48px] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#E8B84B]/50">
          {data.photoURL ? (
            <img src={data.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <Camera size={40} className="text-gray-700 group-hover:text-[#E8B84B] transition-colors" />
          )}
          {loading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
              <Loader2 size={32} className="text-[#E8B84B] animate-spin" />
              {uploadProgress > 0 && (
                <span className="text-xs text-white font-bold">{uploadProgress}%</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-2 -right-2 bg-[#E8B84B] text-black p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
        >
          <Upload size={20} />
        </button>
      </div>
      <p className="text-gray-500 text-sm text-center max-w-xs">Upload a clear professional portrait for your verified worker profile. You can skip this step and add it later.</p>
      <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleUpload} />

      {error && (
        <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <button
        disabled={loading}
        onClick={onNext}
        className="w-full bg-white text-black font-black py-5 rounded-2xl disabled:opacity-20 flex items-center justify-center gap-2 mt-8"
      >
        {data.photoURL ? (
          <>Verified Portrait Set <ChevronRight size={20} /></>
        ) : (
          <>Continue Without Photo <ChevronRight size={20} /></>
        )}
      </button>

      <button
        onClick={handleSkip}
        disabled={loading}
        className="w-full bg-transparent text-gray-500 hover:text-white font-bold py-4 rounded-2xl disabled:opacity-20 transition-colors text-sm"
      >
        Skip for now
      </button>
    </div>
  );
}

function VentureStep({ data, update, onNext }: any) {
  const ventures: { id: Venture, desc: string, color: string }[] = [
    { id: 'BuyRix', desc: 'Leading e-commerce marketing ecosystem.', color: '#3B82F6' },
    { id: 'Vyuma', desc: 'Content production & viral outreach.', color: '#A855F7' },
    { id: 'TrendyVerse', desc: 'Lifestyle & trend prediction platform.', color: '#EC4899' },
    { id: 'Growplex', desc: 'Social growth & client acquisition.', color: '#10B981' },
  ];

  return (
    <div className="space-y-4">
      {ventures.map(v => (
        <button
          key={v.id}
          onClick={() => {
            update({ ...data, venture: v.id, role: undefined });
            onNext();
          }}
          className={`w-full p-6 bg-[#111111] border rounded-3xl text-left transition-all hover:scale-[1.02] flex items-center gap-6 ${data.venture === v.id ? 'border-[#E8B84B] bg-[#E8B84B]/5' : 'border-white/5'}`}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${v.color}20` }}>
            <Briefcase size={24} style={{ color: v.color }} />
          </div>
          <div>
            <h3 className="text-lg font-black">{v.id}</h3>
            <p className="text-xs text-gray-500 font-medium">{v.desc}</p>
          </div>
          <ChevronRight size={20} className="ml-auto text-gray-700" />
        </button>
      ))}
    </div>
  );
}

function RoleStep({ data, update, onNext }: any) {
  const roles = VentureRoleMap[data.venture as Venture] || [];
  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Available Roles in {data.venture}</p>
      {roles.map(r => (
        <button
          key={r}
          onClick={() => {
            update({ ...data, role: r });
            onNext();
          }}
          className={`w-full p-6 bg-[#111111] border rounded-3xl text-left transition-all flex items-center gap-4 ${data.role === r ? 'border-[#E8B84B] bg-[#E8B84B]/5' : 'border-white/5'}`}
        >
          <div className="w-3 h-3 rounded-full bg-[#E8B84B]" />
          <h3 className="text-lg font-bold capitalize">{r.replace('_', ' ')}</h3>
          {data.role === r && <CheckCircle size={20} className="ml-auto text-[#00C9A7]" />}
        </button>
      ))}
    </div>
  );
}

function PayoutStep({ data, update, onNext }: any) {
  const isValid = data.upiId?.includes('@') || data.bankAccount?.length >= 10;
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Primary UPI ID</label>
        <input
          type="text"
          value={data.upiId}
          onChange={e => update({ ...data, upiId: e.target.value })}
          placeholder="yourname@upi"
          className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all"
        />
      </div>
      <div className="flex items-center gap-4 py-4">
        <div className="h-px bg-white/5 flex-1" />
        <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">OR</span>
        <div className="h-px bg-white/5 flex-1" />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Bank Account Number</label>
        <input
          type="text"
          value={data.bankAccount}
          onChange={e => update({ ...data, bankAccount: e.target.value })}
          placeholder="123456789012"
          className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all"
        />
      </div>
      <button
        disabled={!isValid}
        onClick={onNext}
        className="w-full bg-[#00C9A7] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#00C9A7]/20 disabled:opacity-20 flex items-center justify-center gap-2 mt-8"
      >
        Save Payout Methods <ChevronRight size={20} />
      </button>
    </div>
  );
}

function KycStep({ data, update, onNext }: any) {
  const isValid = data.aadhaar?.length === 12 && data.pan?.length === 10;
  return (
    <div className="space-y-6">
      <div className="p-4 bg-[#E8B84B]/5 border border-[#E8B84B]/20 rounded-2xl flex items-start gap-4 mb-4">
        <Lock size={20} className="text-[#E8B84B] shrink-0 mt-1" />
        <div>
          <p className="text-xs font-bold text-[#E8B84B] mb-1">Encrypted Verification</p>
          <p className="text-[10px] text-gray-500 leading-relaxed">Your Sensitive data is AES-256 encrypted locally before transmission. Only authorized staff can view this for tax compliance.</p>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Aadhaar Number</label>
        <input
          type="text"
          maxLength={12}
          value={data.aadhaar}
          onChange={e => update({ ...data, aadhaar: e.target.value })}
          placeholder="12-digit number"
          className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all tracking-widest"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">PAN Number</label>
        <input
          type="text"
          maxLength={10}
          value={data.pan?.toUpperCase()}
          onChange={e => update({ ...data, pan: e.target.value.toUpperCase() })}
          placeholder="ABCDE1234F"
          className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all tracking-widest uppercase"
        />
      </div>
      <button
        disabled={!isValid}
        onClick={onNext}
        className="w-full bg-[#E8B84B] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#E8B84B]/20 disabled:opacity-20 flex items-center justify-center gap-2 mt-8"
      >
        Secure Documents <ChevronRight size={20} />
      </button>
    </div>
  );
}

function ContractStep({ data, update, onComplete }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 h-64 overflow-y-auto text-gray-400 text-xs leading-relaxed font-mono">
        <p className="mb-4 text-white font-bold opacity-100">WORKPLEX SERVICE AGREEMENT</p>
        <p className="mb-4">This agreement is entered into by and between HVRS INNOVATIONS ("The Platform") and {data.name} ("The Worker").</p>
        <p className="mb-2">1. The Worker agrees to provide promotional or creation services for the venture: {data.venture}.</p>
        <p className="mb-2">2. Commissions are released 7-days after task approval for security.</p>
        <p className="mb-2">3. Any attempt at fraud or spoofing will result in a permanent ban and forfeiture of all earnings.</p>
        <p className="mb-2">4. Signing bonus of Rs.27 is credited as pending and unlocks after the first task approval.</p>
        <p className="mb-2">By clicking sign below, you digitally attest to those terms.</p>
      </div>

      <div
        onClick={() => update({ ...data, contractSigned: !data.contractSigned })}
        className={`p-6 border-2 rounded-3xl cursor-pointer transition-all flex items-center gap-4 ${data.contractSigned ? 'border-[#00C9A7] bg-[#00C9A7]/5' : 'border-white/5 bg-[#111111]'}`}
      >
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${data.contractSigned ? 'bg-[#00C9A7] border-[#00C9A7]' : 'border-white/20'}`}>
          {data.contractSigned && <CheckCircle size={20} className="text-black" />}
        </div>
        <div>
          <h4 className="font-black text-sm">I digitally sign this agreement</h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">{new Date().toDateString()}</p>
        </div>
      </div>

      <button
        disabled={!data.contractSigned}
        onClick={onComplete}
        className="w-full bg-[#E8B84B] text-black font-black py-6 rounded-2xl shadow-[0_20px_40px_rgba(232,184,75,0.2)] disabled:opacity-20 flex items-center justify-center gap-3 mt-8 scale-105"
      >
        Complete Registration & Start Earning <SparkleIcon />
      </button>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
  );
}
