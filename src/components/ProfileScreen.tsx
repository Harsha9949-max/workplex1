/**
 * WorkPlex Phase 5 — Profile Screen
 * User profile management, KYC, settings, logout, QR code, referral link
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ShieldCheck, Bell, LogOut, Share2, QrCode,
  Edit3, CheckCircle, ChevronRight, Copy, CopyCheck,
  Users, Award, TrendingUp, Settings, Camera
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { UserProfile, UserMode, getCurrentLevel, getNextLevel, getLevelProgress, formatCurrency } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface ProfileScreenProps {
  user: any;
  userData: UserProfile;
  onLogout: () => void;
}

export default function ProfileScreen({ user, userData, onLogout }: ProfileScreenProps) {
  const [mode] = useState<UserMode>(userData.mode || 'Promoter');
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editName, setEditName] = useState(userData.name || '');
  const [editUPI, setEditUPI] = useState(userData.upiId || '');
  const [editBank, setEditBank] = useState(userData.bankAccount || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stats, setStats] = useState({
    totalEarned: userData.wallets?.earned || 0,
    tasksCompleted: 0,
    teamSize: 0,
    level: getCurrentLevel(userData.wallets?.earned || 0)
  });

  const level = getCurrentLevel(stats.totalEarned);
  const nextLevel = getNextLevel(level);
  const levelProgress = getLevelProgress(stats.totalEarned);

  const referralLink = `${window.location.origin}/join?ref=${user.uid}`;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileRef = ref(storage, `profiles/${user.uid}/photo.jpg`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editName,
        upiId: editUPI,
        bankAccount: editBank,
        updatedAt: serverTimestamp()
      });
      setShowEditModal(false);
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: Bell, label: 'Notifications', value: notificationsEnabled, onChange: () => setNotificationsEnabled(!notificationsEnabled), type: 'toggle' },
    { icon: QrCode, label: 'QR Code', onClick: () => setShowQR(true), type: 'button' },
    { icon: Share2, label: 'Share Profile', onClick: copyReferralLink, type: 'button' },
    { icon: Settings, label: 'Settings', type: 'button' },
    { icon: ShieldCheck, label: 'Privacy Policy', type: 'button' },
    { icon: LogOut, label: 'Logout', onClick: onLogout, type: 'danger' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* ===== HEADER ===== */}
      <div className="bg-[#111111] border-b border-gray-800 p-4">
        <h1 className="text-xl font-black">Profile</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* ===== PROFILE CARD ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1A] rounded-2xl p-6 border border-gray-800"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img
                src={userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userData.name}`}
                alt="Profile"
                className="w-20 h-20 rounded-full border-2 border-[#E8B84B]/30"
                referrerPolicy="no-referrer"
              />
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#E8B84B] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#D4A743] transition-colors">
                <Camera className="w-4 h-4 text-black" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black">{userData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-[#E8B84B]/20 text-[#E8B84B] px-2 py-0.5 rounded-full">
                  {mode}
                </span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                  {userData.venture} • {userData.role}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{userData.phone}</p>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Edit3 className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Level Progress */}
          <div className="bg-[#111111] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#E8B84B]" />
                <span className="font-bold">{level}</span>
              </div>
              {nextLevel && (
                <span className="text-xs text-gray-500">Next: {nextLevel.name}</span>
              )}
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#E8B84B] to-[#00C9A7]"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatCurrency(stats.totalEarned)} earned • {nextLevel ? formatCurrency(nextLevel.min - stats.totalEarned) : 'Max level'} to {nextLevel?.name || 'Legend'}
            </p>
          </div>
        </motion.div>

        {/* ===== STATS GRID ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: 'Total Earned', value: formatCurrency(stats.totalEarned), icon: TrendingUp, color: '#00C9A7' },
            { label: 'Tasks Done', value: stats.tasksCompleted, icon: CheckCircle, color: '#E8B84B' },
            { label: 'Level', value: level, icon: Award, color: '#A855F7' },
            { label: mode === 'Promoter' ? 'Team Size' : 'Products', value: stats.teamSize || 0, icon: Users, color: '#3B82F6' }
          ].map((stat, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* ===== REFERRAL LINK ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1A1A1A] rounded-2xl p-4 border border-gray-800"
        >
          <h3 className="font-bold mb-3">Referral Link</h3>
          <div className="bg-[#111111] rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate flex-1 mr-2">{referralLink}</span>
            <button
              onClick={copyReferralLink}
              className="text-[#E8B84B] hover:text-[#D4A743] transition-colors"
            >
              {copied ? <CopyCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>

        {/* ===== MENU ITEMS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden"
        >
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between p-4 border-b border-gray-800 last:border-b-0 hover:bg-white/5 transition-colors ${item.type === 'danger' ? 'text-red-500' : 'text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span className="font-bold">{item.label}</span>
              </div>
              {item.type === 'toggle' ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onChange?.();
                  }}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${item.value ? 'bg-[#00C9A7]' : 'bg-gray-700'
                    }`}
                >
                  <motion.div
                    className="w-4 h-4 bg-white rounded-full"
                    animate={{ x: item.value ? 24 : 0 }}
                  />
                </div>
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ===== EDIT PROFILE MODAL ===== */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-[#1A1A1A] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4">Edit Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E8B84B]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={editUPI}
                    onChange={(e) => setEditUPI(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Bank Account</label>
                  <input
                    type="text"
                    value={editBank}
                    onChange={(e) => setEditBank(e.target.value)}
                    className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E8B84B]/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-800 text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 bg-[#E8B84B] text-black font-bold py-3 rounded-xl hover:bg-[#D4A743] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== QR CODE MODAL ===== */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] rounded-3xl p-6 max-w-sm w-full border border-gray-800 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4">My QR Code</h3>
              <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                <QRCodeSVG value={referralLink} size={200} />
              </div>
              <p className="text-sm text-gray-400 mb-4">Scan to join WorkPlex</p>
              <button
                onClick={() => setShowQR(false)}
                className="w-full bg-[#E8B84B] text-black font-bold py-3 rounded-xl hover:bg-[#D4A743] transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
