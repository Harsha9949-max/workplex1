/**
 * WorkPlex — OnboardingFlow Component
 * Multi-step wizard with dual-mode selection (Promoter vs Partner)
 *
 * Step 1: Phone OTP verification (handled by parent auth)
 * Step 2: Basic Info (name, age 18+, photo upload)
 * Step 3: MODE SELECTION (Promoter or Partner)
 * Steps 4-8: Promoter (Venture, Role, Payout, KYC, Contract)
 * Steps 4-5: Partner (Shop Setup, Preferences)
 *
 * Production-ready with validation, file uploads, encryption, and smooth animations
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Camera,
  Briefcase,
  CreditCard,
  ShieldCheck,
  FileText,
  CheckCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
  Upload,
  Lock,
  ShoppingBag,
  Tag,
  Store,
  ImageIcon,
} from 'lucide-react';
import {
  Venture,
  UserRole,
  VentureRoleMap,
  UserProfile,
  UserMode,
  ShopCategory,
  SHOP_CATEGORIES,
  defaultWallet,
  generateSlug,
} from '../types';
import { encrypt, getDeviceFingerprint, isValidAadhaar, isValidPAN, isValidUPI } from '../lib/security';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ============================================================
// Props
// ============================================================

export interface OnboardingFlowProps {
  user: { uid: string; email?: string; phoneNumber?: string; photoURL?: string } | null;
  onComplete: (data: Partial<UserProfile>) => void;
  onCancel: () => void;
  userInfo?: {
    email: string;
    phone: string;
    photoURL: string;
  };
}

// ============================================================
// Constants
// ============================================================

const VENTURES: Array<{ id: Venture; desc: string; color: string }> = [
  { id: 'BuyRix', desc: 'Leading e-commerce marketing ecosystem.', color: '#3B82F6' },
  { id: 'Vyuma', desc: 'Content production & viral outreach.', color: '#A855F7' },
  { id: 'TrendyVerse', desc: 'Lifestyle & trend prediction platform.', color: '#EC4899' },
  { id: 'Growplex', desc: 'Social growth & client acquisition.', color: '#10B981' },
];

const PARTNER_CATEGORIES: ShopCategory[] = [...SHOP_CATEGORIES] as ShopCategory[];

// ============================================================
// Step Labels
// ============================================================

const PROMOTER_STEPS = [
  'Verify Phone',
  'Basic Info',
  'Choose Mode',
  'Select Venture',
  'Choose Role',
  'Payout Setup',
  'KYC Verification',
  'Sign Contract',
];

const PARTNER_STEPS = [
  'Verify Phone',
  'Basic Info',
  'Choose Mode',
  'Shop Setup',
  'Preferences',
];

// ============================================================
// Component
// ============================================================

export default function OnboardingFlow({ user, onComplete, onCancel, userInfo }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<UserMode | null>(null);

  // Common form data
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    photoURL: userInfo?.photoURL || '',
    bankAccount: '',
    upiId: '',
    aadhaar: '',
    pan: '',
    savingsPercent: 0,
  });

  // Promoter-specific
  const [venture, setVenture] = useState<Venture | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  // Partner-specific
  const [shopName, setShopName] = useState('');
  const [shopLogo, setShopLogo] = useState<File | null>(null);
  const [shopLogoURL, setShopLogoURL] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<ShopCategory[]>([]);
  const [defaultCommission, setDefaultCommission] = useState(15);

  // Upload states
  const [photoUploadLoading, setPhotoUploadLoading] = useState(false);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total steps based on mode
  const isPromoter = mode === 'Promoter';
  const isPartner = mode === 'Partner';
  const totalSteps = isPartner ? PARTNER_STEPS.length : PROMOTER_STEPS.length;
  const stepLabels = isPartner ? PARTNER_STEPS : PROMOTER_STEPS;
  const currentStepLabel = stepLabels[step - 1] || '';

  // ============================================================
  // Helpers
  // ============================================================

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const nextStep = () => {
    setStep((s) => Math.min(s + 1, totalSteps));
    setError(null);
  };

  const handleModeSelect = (selectedMode: UserMode) => {
    setMode(selectedMode);
    setStep(4);
    setError(null);
  };

  // ============================================================
  // File Uploads
  // ============================================================

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    try {
      setPhotoUploadLoading(true);
      setError(null);

      const storageRef = ref(storage, `profiles/${user.uid}/photo.jpg`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updateFormData({ photoURL: url });
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      console.error('[Onboarding] Photo upload error:', firebaseError);
      setError(firebaseError.message || 'Failed to upload image. Please try again.');
    } finally {
      setPhotoUploadLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be less than 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    try {
      setLogoUploadLoading(true);
      setError(null);
      setShopLogo(file);

      // Create local preview URL (upload to Firebase on submit)
      const localUrl = URL.createObjectURL(file);
      setShopLogoURL(localUrl);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load logo. Please try again.');
    } finally {
      setLogoUploadLoading(false);
    }
  };

  const toggleCategory = (category: ShopCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      }
      if (prev.length >= 3) {
        setError('Maximum 3 categories allowed');
        return prev;
      }
      return [...prev, category];
    });
    setError(null);
  };

  // ============================================================
  // Step Validation
  // ============================================================

  const handleIdentityNext = () => {
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!formData.age || formData.age < 18) {
      setError('You must be at least 18 years old to join WorkPlex.');
      return;
    }
    nextStep();
  };

  const handlePayoutNext = () => {
    const hasUPI = formData.upiId && isValidUPI(formData.upiId);
    const hasBank = formData.bankAccount && formData.bankAccount.replace(/\D/g, '').length >= 9;
    if (!hasUPI && !hasBank) {
      setError('Please provide either a valid UPI ID or Bank Account number.');
      return;
    }
    nextStep();
  };

  const handleKYCNext = () => {
    if (!isValidAadhaar(formData.aadhaar)) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!isValidPAN(formData.pan)) {
      setError('Please enter a valid PAN number (e.g., ABCDE1234F).');
      return;
    }
    nextStep();
  };

  const handlePartnerSetupNext = () => {
    if (!shopName || shopName.trim().length < 3) {
      setError('Shop name must be at least 3 characters.');
      return;
    }
    if (selectedCategories.length < 1) {
      setError('Please select at least 1 category for your shop.');
      return;
    }
    nextStep();
  };

  // ============================================================
  // Final Submit
  // ============================================================

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const slug = generateSlug(shopName);

      // Upload shop logo if provided (for Partners)
      let uploadedLogoUrl = '';
      if (isPartner && shopLogo) {
        const logoStorageRef = ref(storage, `shops/${user.uid}/logo.jpg`);
        const logoSnapshot = await uploadBytes(logoStorageRef, shopLogo);
        uploadedLogoUrl = await getDownloadURL(logoSnapshot.ref);
      }

      // Encrypt sensitive data before sending to Firestore
      const encryptedAadhaar = encrypt(formData.aadhaar);
      const encryptedPan = encrypt(formData.pan);

      const profileData: Partial<UserProfile> = {
        uid: user.uid,
        name: formData.name.trim(),
        phone: user.phoneNumber || userInfo?.phone || '',
        email: user.email || userInfo?.email || '',
        photoURL: formData.photoURL || user.photoURL || '',
        age: formData.age,
        mode: mode as UserMode,
        upiId: formData.upiId,
        bankAccount: formData.bankAccount,
        aadhaar: encryptedAadhaar,
        pan: encryptedPan,
        deviceFingerprint: getDeviceFingerprint(),
        level: 'Bronze',
        streak: 0,
        contractSigned: true,
        kycDone: true,
        firstTaskDone: false,
        onboardingStatus: 'completed',
        onboardingStep: totalSteps,
        wallets: defaultWallet(), // Rs.27 bonus to PENDING wallet
        savingsPercent: formData.savingsPercent,
        joinedAt: new Date() as any,
        lastActiveAt: new Date() as any,
      };

      if (isPromoter && venture) {
        profileData.venture = venture;
        profileData.role = role || undefined;
      }

      if (isPartner) {
        profileData.shopName = shopName.trim();
        profileData.shopSlug = slug;
        profileData.shopLogo = uploadedLogoUrl;
        profileData.categories = selectedCategories;
        profileData.defaultCommission = defaultCommission;
        profileData.shopPublished = false;
      }

      onComplete(profileData);
    } catch (err: unknown) {
      const firebaseError = err as { message?: string };
      setError(firebaseError.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Progress Bar
  // ============================================================

  const progressPercent = (step / totalSteps) * 100;

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Step {step} of {totalSteps}
        </span>
        <span className="text-[10px] font-black text-[#E8B84B] uppercase tracking-widest">
          {currentStepLabel}
        </span>
      </div>
      <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#E8B84B] to-[#FFD700] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        />
      </div>
    </div>
  );

  // ============================================================
  // Step Renderers
  // ============================================================

  const renderStepContent = () => {
    // --- Step 2: Basic Info + Photo (Common) ---
    if (step === 2) {
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              Full Legal Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="As per Aadhaar"
              className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              Your Age
            </label>
            <input
              type="number"
              min={18}
              max={100}
              value={formData.age || ''}
              onChange={(e) => updateFormData({ age: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 25"
              className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white"
            />
            {formData.age !== undefined && formData.age < 18 && formData.age > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2"
              >
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-xs font-bold">
                  You must be at least 18 years old to join WorkPlex.
                </p>
              </motion.div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              Profile Photo (optional)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 bg-[#111111] rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#E8B84B]/50">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-700" />
                  )}
                  {photoUploadLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={20} className="text-[#E8B84B] animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploadLoading}
                  className="absolute -bottom-1 -right-1 bg-[#E8B84B] text-black p-2 rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Upload size={14} />
                </button>
              </div>
              <p className="text-gray-500 text-xs flex-1">
                Upload a clear photo for your verified profile. You can skip this and add it later.
              </p>
            </div>
          </div>

          <button
            onClick={handleIdentityNext}
            className="w-full bg-[#E8B84B] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#E8B84B]/20 flex items-center justify-center gap-2 group mt-4 active:scale-[0.98] transition-transform"
          >
            Continue
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      );
    }

    // --- Step 3: Mode Selection (Common) ---
    if (step === 3) {
      return (
        <div className="space-y-4">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">
            How do you want to earn?
          </p>

          {/* Promoter Card */}
          <button
            onClick={() => handleModeSelect('Promoter')}
            className="w-full p-6 bg-[#111111] border border-white/5 rounded-3xl text-left transition-all hover:scale-[1.02] hover:border-[#E8B84B]/50 flex items-center gap-6 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#E8B84B]/10 flex items-center justify-center group-hover:bg-[#E8B84B]/20 transition-colors">
              <Tag size={28} className="text-[#E8B84B]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white mb-1">Complete tasks &amp; share coupons</h3>
              <p className="text-xs text-gray-500 font-medium">
                Promoter — Earn by completing tasks and sharing coupon codes
              </p>
            </div>
            <ChevronRight size={20} className="text-gray-700 group-hover:text-[#E8B84B] transition-colors" />
          </button>

          {/* Partner Card */}
          <button
            onClick={() => handleModeSelect('Partner')}
            className="w-full p-6 bg-[#111111] border border-white/5 rounded-3xl text-left transition-all hover:scale-[1.02] hover:border-[#00C9A7]/50 flex items-center gap-6 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#00C9A7]/10 flex items-center justify-center group-hover:bg-[#00C9A7]/20 transition-colors">
              <ShoppingBag size={28} className="text-[#00C9A7]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white mb-1">Create your online shop</h3>
              <p className="text-xs text-gray-500 font-medium">
                Partner — Build your own store without inventory, earn margin on every sale
              </p>
            </div>
            <ChevronRight size={20} className="text-gray-700 group-hover:text-[#00C9A7] transition-colors" />
          </button>
        </div>
      );
    }

    // ============================================================
    // PROMOTER-ONLY STEPS (4-8)
    // ============================================================

    if (isPromoter) {
      // Step 4: Venture Selection
      if (step === 4) {
        return (
          <div className="space-y-4">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">
              Select Your Venture
            </p>
            {VENTURES.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setVenture(v.id);
                  nextStep();
                }}
                className="w-full p-6 bg-[#111111] border border-white/5 rounded-3xl text-left transition-all hover:scale-[1.02] hover:border-[#E8B84B]/30 flex items-center gap-6 group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${v.color}20` }}
                >
                  <Briefcase size={24} style={{ color: v.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white">{v.id}</h3>
                  <p className="text-xs text-gray-500 font-medium">{v.desc}</p>
                </div>
                <ChevronRight size={20} className="text-gray-700 group-hover:text-[#E8B84B] transition-colors" />
              </button>
            ))}
          </div>
        );
      }

      // Step 5: Role Selection
      if (step === 5) {
        const roles = venture ? VentureRoleMap[venture] || [] : [];
        return (
          <div className="space-y-4">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">
              Select Your Role in {venture}
            </p>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r as UserRole);
                  nextStep();
                }}
                className="w-full p-6 bg-[#111111] border border-white/5 rounded-3xl text-left transition-all hover:scale-[1.02] hover:border-[#E8B84B]/30 flex items-center gap-4 group"
              >
                <div className="w-3 h-3 rounded-full bg-[#E8B84B]/30 group-hover:bg-[#E8B84B] transition-colors" />
                <h3 className="text-lg font-bold text-white capitalize">{r.replace(/_/g, ' ')}</h3>
                <ChevronRight size={20} className="ml-auto text-gray-700 group-hover:text-[#E8B84B] transition-colors" />
              </button>
            ))}
          </div>
        );
      }

      // Step 6: Payout Setup
      if (step === 6) {
        const hasUPI = formData.upiId && isValidUPI(formData.upiId);
        const hasBank = formData.bankAccount && formData.bankAccount.replace(/\D/g, '').length >= 9;
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Primary UPI ID
              </label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => updateFormData({ upiId: e.target.value })}
                placeholder="yourname@upi"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">OR</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Bank Account Number
              </label>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={(e) => updateFormData({ bankAccount: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                placeholder="Enter account number"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white"
              />
            </div>
            <button
              onClick={handlePayoutNext}
              disabled={!hasUPI && !hasBank}
              className="w-full bg-[#00C9A7] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#00C9A7]/20 disabled:opacity-20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              Save Payout Methods <ChevronRight size={20} />
            </button>
          </div>
        );
      }

      // Step 7: KYC Verification
      if (step === 7) {
        const aadhaarValid = isValidAadhaar(formData.aadhaar);
        const panValid = isValidPAN(formData.pan);
        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#E8B84B]/5 border border-[#E8B84B]/20 rounded-2xl flex items-start gap-4">
              <Lock size={20} className="text-[#E8B84B] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#E8B84B] mb-1">AES-256 Encrypted</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Your sensitive KYC data is encrypted locally before being stored. Only authorized systems can decrypt it.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Aadhaar Number
              </label>
              <input
                type="text"
                maxLength={14}
                value={formData.aadhaar}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
                  const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
                  updateFormData({ aadhaar: formatted });
                }}
                placeholder="XXXX XXXX XXXX"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white tracking-widest"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                PAN Number
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.pan.toUpperCase()}
                onChange={(e) => updateFormData({ pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="ABCDE1234F"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white tracking-widest uppercase"
              />
            </div>
            <button
              onClick={handleKYCNext}
              disabled={!aadhaarValid || !panValid}
              className="w-full bg-[#E8B84B] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#E8B84B]/20 disabled:opacity-20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Lock size={18} /> Secure Documents <ChevronRight size={20} />
            </button>
          </div>
        );
      }

      // Step 8: Contract Signing
      if (step === 8) {
        return (
          <div className="space-y-6">
            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 h-56 overflow-y-auto text-gray-400 text-xs leading-relaxed">
              <p className="mb-4 text-white font-bold">WORKPLEX SERVICE AGREEMENT</p>
              <p className="mb-2">
                This agreement is entered into by and between HVRS INNOVATIONS (&quot;The Platform&quot;) and {formData.name} (&quot;The Worker&quot;).
              </p>
              <p className="mb-2">1. The Worker agrees to provide promotional services for the venture: {venture}.</p>
              <p className="mb-2">2. Commissions are released 7 days after task approval for security.</p>
              <p className="mb-2">3. Any attempt at fraud or spoofing will result in a permanent ban and forfeiture of all earnings.</p>
              <p className="mb-2">4. Signing bonus of Rs.27 is credited as PENDING and will be released after first task completion.</p>
              <p className="mb-2">5. The Worker must maintain active status and complete minimum tasks to remain eligible.</p>
              <p className="mb-2">6. Platform reserves the right to modify terms with 7 days notice.</p>
              <p className="mb-2">7. Disputes will be resolved through arbitration in accordance with Indian law.</p>
              <p className="mt-4 text-white font-bold">By clicking &quot;I Agree&quot; below, you acknowledge that you have read, understood, and agree to be bound by these terms.</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#E8B84B] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#E8B84B]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  I Agree — Start Earning
                </>
              )}
            </button>
          </div>
        );
      }
    }

    // ============================================================
    // PARTNER-ONLY STEPS (4-5)
    // ============================================================

    if (isPartner) {
      // Step 4: Shop Setup
      if (step === 4) {
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Shop Name
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g., Trendy Fashion Hub"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#00C9A7] outline-none transition-all placeholder:text-gray-700 text-white"
                autoFocus
              />
              {shopName && (
                <p className="mt-2 text-xs text-gray-500">
                  Your shop URL: <span className="text-[#00C9A7]">workplex.in/shop/{generateSlug(shopName).split('-')[0]}</span>
                </p>
              )}
            </div>

            {/* Shop Logo Upload */}
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Shop Logo (optional)
              </label>
              <div className="relative group">
                <div className="w-full h-32 bg-[#111111] rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#00C9A7]/50">
                  {shopLogoURL ? (
                    <img src={shopLogoURL} alt="Shop Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon size={32} className="text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-600 text-xs">Click to upload logo</p>
                    </div>
                  )}
                  {logoUploadLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={24} className="text-[#00C9A7] animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={logoUploadLoading}
                  className="absolute -bottom-2 -right-2 bg-[#00C9A7] text-black p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={handlePartnerSetupNext}
              disabled={!shopName || shopName.trim().length < 3}
              className="w-full bg-[#00C9A7] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#00C9A7]/20 disabled:opacity-20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              Continue <ChevronRight size={20} />
            </button>
          </div>
        );
      }

      // Step 5: Preferences
      if (step === 5) {
        return (
          <div className="space-y-6">
            {/* Categories */}
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Shop Categories (select up to 3)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PARTNER_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`p-4 rounded-2xl border text-sm font-bold transition-all ${isSelected
                          ? 'bg-[#00C9A7]/10 border-[#00C9A7] text-[#00C9A7]'
                          : 'bg-[#111111] border-white/5 text-gray-400 hover:border-white/20'
                        }`}
                    >
                      {isSelected && <CheckCircle size={14} className="inline mr-1" />}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Commission */}
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                Default Commission: <span className="text-[#00C9A7]">{defaultCommission}%</span>
              </label>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={defaultCommission}
                onChange={(e) => setDefaultCommission(parseInt(e.target.value))}
                className="w-full accent-[#00C9A7]"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>5%</span>
                <span>30%</span>
              </div>
            </div>

            {/* UPI for Partner */}
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                UPI ID (for receiving payments)
              </label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => updateFormData({ upiId: e.target.value })}
                placeholder="yourname@upi"
                className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 focus:border-[#00C9A7] outline-none transition-all placeholder:text-gray-700 text-white"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || selectedCategories.length < 1}
              className="w-full bg-[#00C9A7] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#00C9A7]/20 disabled:opacity-20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Setting up your shop...
                </>
              ) : (
                <>
                  <Store size={20} />
                  Create My Shop
                </>
              )}
            </button>
          </div>
        );
      }
    }

    return null;
  };

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-16 h-16 bg-gradient-to-br from-[#E8B84B] to-[#FFD700] rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(232,184,75,0.2)]"
        >
          <User size={28} className="text-black" />
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-2">
          {step === 2 ? 'Tell Us About Yourself' : step === 3 ? 'Choose Your Path' : currentStepLabel}
        </h2>
        <p className="text-gray-400 text-sm">
          {step === 2 && 'We need a few details to set up your account'}
          {step === 3 && 'Select how you want to earn on WorkPlex'}
          {step > 3 && isPromoter && `Promoter onboarding — ${step - 3} of 5`}
          {step > 3 && isPartner && `Partner setup — ${step - 3} of 2`}
        </p>
      </div>

      {/* Progress Bar (skip for step 1 which is phone auth) */}
      {step >= 2 && renderProgressBar()}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Button */}
      {step > 1 && (
        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            Cancel &amp; go back
          </button>
        </div>
      )}
    </div>
  );
}
