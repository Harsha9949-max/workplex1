/**
 * WorkPlex — Enhanced Profile Screen
 * Better profile display, stats, settings, referral section
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle,
  Share2,
  ShieldCheck,
  UserCircle,
  LogOut,
  Copy,
  QrCode,
  ExternalLink,
  TrendingUp,
  Calendar,
  Award,
  Users,
  Eye,
  EyeOff,
  Settings,
  Bell,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { UserData } from '../types';
import { StreakDisplay, BadgeGrid, LevelProgress } from './Gamification';

interface ProfileScreenProps {
  userData: UserData;
  teamSize: number;
  onLogout: () => void;
}

export default function ProfileScreen({ userData, teamSize, onLogout }: ProfileScreenProps) {
  const referralLink = `${window.location.origin}/?ref=${auth.currentUser?.uid || ''}`;
  const profileLink = `${window.location.origin}/${userData.username || ''}`;
  const [copied, setCopied] = useState(false);
  const [profileCopied, setProfileCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTotalEarnedPublicly, setShowTotalEarnedPublicly] = useState(userData.showTotalEarnedPublicly !== false);

  const handleTogglePublicEarned = async () => {
    const newValue = !showTotalEarnedPublicly;
    setShowTotalEarnedPublicly(newValue);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        showTotalEarnedPublicly: newValue
      });
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const stats = [
    {
      label: 'Total Earned',
      value: `₹${(userData.totalEarned || 0).toLocaleString()}`,
      icon: <TrendingUp size={20} className="text-[#E8B84B]" />,
      color: 'text-[#E8B84B]'
    },
    {
      label: 'Day Streak',
      value: `${userData.streak || 0}`,
      icon: <Calendar size={20} className="text-orange-500" />,
      color: 'text-orange-500'
    },
    ...(userData.role === 'lead_marketer' || userData.role === 'manager' ? [{
      label: 'Team Size',
      value: `${teamSize} Members`,
      icon: <Users size={20} className="text-[#00C9A7]" />,
      color: 'text-[#00C9A7]'
    }] : []),
    {
      label: 'Badges',
      value: `${(userData.badges || []).length}`,
      icon: <Award size={20} className="text-purple-400" />,
      color: 'text-purple-400'
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 pb-32 max-w-3xl mx-auto">
      {/* QR Modal */}
      {showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowQR(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#111111] p-6 sm:p-8 rounded-[2rem] border border-gray-800 flex flex-col items-center text-center max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white p-4 rounded-2xl mb-6">
              <QRCodeSVG value={referralLink} size={200} />
            </div>
            <h3 className="text-xl font-bold mb-2">My Referral QR</h3>
            <p className="text-gray-500 text-sm mb-6">Scan to join WorkPlex under {userData.name}</p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full bg-[#E8B84B] text-black font-bold py-3 rounded-xl active:scale-95 transition-transform"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Profile Header */}
      <motion.div
        className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-800/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          <div className="relative">
            <motion.img
              src={userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userData.name}`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[#E8B84B]/30 object-cover"
              alt="Profile"
              referrerPolicy="no-referrer"
              whileHover={{ scale: 1.05 }}
            />
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              {userData.level}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black mb-1">{userData.name}</h2>
            <p className="text-gray-500 text-sm mb-3">{userData.venture} · {userData.role}</p>
            <StreakDisplay streak={userData.streak || 0} />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#111111] p-4 rounded-2xl border border-gray-800/50 hover:border-gray-700 transition-colors"
          >
            <div className="mb-2">{stat.icon}</div>
            <p className={`text-lg sm:text-xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Level Progress */}
      <div className="bg-[#111111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800/50">
        <LevelProgress totalEarned={userData.totalEarned || 0} currentLevel={userData.level || 'Bronze'} />
      </div>

      {/* Badges */}
      <div className="bg-[#111111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800/50">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Award size={16} className="text-[#E8B84B]" />
          Your Badges
        </h3>
        <BadgeGrid earnedBadges={userData.badges || []} />
      </div>

      {/* Privacy & Sharing */}
      <div className="bg-[#111111] rounded-2xl sm:rounded-3xl border border-gray-800/50 divide-y divide-gray-800/50">
        <h3 className="p-5 sm:p-6 pb-0 text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Settings size={16} />
          Privacy & Sharing
        </h3>

        <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#00C9A7]/10 rounded-xl flex items-center justify-center shrink-0">
              {showTotalEarnedPublicly ? <Eye size={18} className="text-[#00C9A7]" /> : <EyeOff size={18} className="text-gray-500" />}
            </div>
            <div>
              <h4 className="text-sm font-bold">Public Earnings</h4>
              <p className="text-xs text-gray-500 mt-0.5">Show total earned on public profile</p>
            </div>
          </div>
          <button
            onClick={handleTogglePublicEarned}
            className={`w-12 h-6 rounded-full transition-colors relative ${showTotalEarnedPublicly ? 'bg-[#00C9A7]' : 'bg-gray-700'}`}
          >
            <motion.div
              animate={{ x: showTotalEarnedPublicly ? 24 : 4 }}
              className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm"
            />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E8B84B]/10 rounded-xl flex items-center justify-center shrink-0">
              <Share2 size={18} className="text-[#E8B84B]" />
            </div>
            <div className="flex-1 min-w-0 mr-3">
              <h4 className="text-sm font-bold">Share Profile</h4>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{profileLink}</p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(profileLink);
              setProfileCopied(true);
              setTimeout(() => setProfileCopied(false), 2000);
            }}
            className="p-2.5 bg-gray-800 rounded-xl text-[#E8B84B] active:scale-95 transition-transform hover:bg-gray-700"
          >
            {profileCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Viral Growth */}
      <div className="bg-[#111111] rounded-2xl sm:rounded-3xl border border-gray-800/50 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ExternalLink size={16} />
          Viral Growth
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQR(true)}
            className="bg-[#1A1A1A] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-800/50 flex flex-col items-center gap-3 hover:border-[#E8B84B]/30 transition-colors"
          >
            <div className="w-12 h-12 bg-[#E8B84B]/10 rounded-xl flex items-center justify-center">
              <QrCode className="text-[#E8B84B]" size={24} />
            </div>
            <span className="font-bold text-xs sm:text-sm">My QR Code</span>
          </motion.button>
          <Link
            to={`/${userData.username || ''}`}
            className="bg-[#1A1A1A] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-800/50 flex flex-col items-center gap-3 hover:border-[#00C9A7]/30 transition-colors active:scale-95"
          >
            <div className="w-12 h-12 bg-[#00C9A7]/10 rounded-xl flex items-center justify-center">
              <UserCircle className="text-[#00C9A7]" size={24} />
            </div>
            <span className="font-bold text-xs sm:text-sm">Public Profile</span>
          </Link>
        </div>
      </div>

      {/* Referral Link */}
      {(userData.role === 'lead_marketer' || userData.role === 'manager') && (
        <div className="bg-[#111111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800/50">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Share2 size={16} />
            Referral Link
          </h3>
          <div className="flex items-center gap-3 bg-black/50 p-3 sm:p-4 rounded-xl border border-gray-800/50">
            <span className="text-xs text-gray-400 truncate flex-1 font-mono">{referralLink}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-[#E8B84B] flex items-center gap-2 shrink-0 hover:gap-3 transition-all"
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copied && <span className="text-[10px] font-bold">Copied!</span>}
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <motion.button
        onClick={onLogout}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full bg-red-500/10 text-red-500 font-bold py-3.5 sm:py-4 rounded-xl border border-red-500/20 flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors active:scale-[0.98]"
      >
        <LogOut size={18} />
        Logout
      </motion.button>
    </div>
  );
}
