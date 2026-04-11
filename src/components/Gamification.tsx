/**
 * WorkPlex Phase 8 — Gamification Engine
 * Streaks, badges, leaderboards, level-up celebrations for BOTH Promoters and Partners
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Award, Trophy, TrendingUp, Star, Zap, Users, ShoppingBag, CheckCircle, Clock, Crown } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, UserMode, BADGES, LEVELS, getCurrentLevel, getLevelProgress, formatCurrency } from '../types';
import confetti from 'canvas-confetti';

interface GamificationProps {
  user: any;
  userData: UserProfile;
}

export default function GamificationEngine({ user, userData }: GamificationProps) {
  const [mode] = useState<UserMode>(userData.mode || 'Promoter');
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard' | 'streak'>('badges');
  const [levelUp, setLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState(0);
  const [streak, setStreak] = useState(userData.streak || 0);
  const [loading, setLoading] = useState(true);

  const currentLevel = getCurrentLevel(userData.wallets?.earned || 0);
  const nextLevel = LEVELS.find(l => l.name === LEVELS[LEVELS.findIndex(l => l.name === currentLevel) + 1]?.name);
  const progress = getLevelProgress(userData.wallets?.earned || 0);

  // Real-time streak listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStreak(data.streak || 0);
        // Check level up
        const level = getCurrentLevel(data.wallets?.earned || 0);
        if (level !== currentLevel && LEVELS.findIndex(l => l.name === level) > LEVELS.findIndex(l => l.name === currentLevel)) {
          setNewLevel(level);
          setLevelUp(true);
          triggerConfetti();
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid, currentLevel]);

  // Leaderboard listener
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('wallets.earned', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      const entries = snap.docs.map((d, i) => ({
        rank: i + 1,
        uid: d.id,
        name: d.data().name,
        earned: d.data().wallets?.earned || 0,
        mode: d.data().mode,
        level: getCurrentLevel(d.data().wallets?.earned || 0)
      }));
      setLeaderboard(entries);
      const userEntry = entries.find(e => e.uid === user.uid);
      setUserRank(userEntry?.rank || 0);
    });
    return () => unsub();
  }, [user.uid]);

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#E8B84B', '#00C9A7', '#FFD700'] });
  };

  const earnedBadges = BADGES.filter(b => userData.badges?.includes(b.id));
  const unearnedBadges = BADGES.filter(b => !userData.badges?.includes(b.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* Header */}
      <div className="bg-[#111111] border-b border-gray-800 p-4">
        <h1 className="text-xl font-black">Gamification</h1>
        <p className="text-xs text-gray-500">{mode === 'Promoter' ? 'Task & Achievement System' : 'Shop Growth System'}</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Level Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#E8B84B]/20 to-[#1A1A1A] rounded-2xl p-6 border border-[#E8B84B]/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Current Level</p>
              <h2 className="text-3xl font-black" style={{ color: LEVELS.find(l => l.name === currentLevel)?.color }}>{currentLevel}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">Next Level</p>
              <p className="text-lg font-bold" style={{ color: nextLevel?.color || '#666' }}>{nextLevel?.name || 'MAX'}</p>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-[#E8B84B] to-[#00C9A7]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{formatCurrency(userData.wallets?.earned || 0)} earned • {nextLevel ? formatCurrency(nextLevel.min - (userData.wallets?.earned || 0)) : 'Max level'} to {nextLevel?.name || 'Legend'}</p>
        </motion.div>

        {/* Streak Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1A1A1A] rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Flame className="w-10 h-10 text-orange-500" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-black">{streak} Days</h3>
                <p className="text-sm text-gray-500">Current Streak</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#00C9A7]">+₹50</p>
              <p className="text-xs text-gray-500">Every 7 days</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 bg-[#1A1A1A] p-1 rounded-xl">
          {(['badges', 'leaderboard', 'streak'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-[#E8B84B] text-black' : 'text-gray-500 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-bold mb-4">Your Badges ({earnedBadges.length}/{BADGES.length})</h3>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((badge) => {
                const earned = userData.badges?.includes(badge.id);
                return (
                  <motion.div key={badge.id} whileHover={{ scale: 1.05 }} className={`rounded-2xl p-4 border text-center ${earned ? 'bg-[#E8B84B]/10 border-[#E8B84B]/30' : 'bg-[#1A1A1A] border-gray-800 opacity-50'}`}>
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <p className="text-xs font-bold mb-1">{badge.name}</p>
                    <p className="text-[10px] text-gray-500">{badge.description}</p>
                    {earned && <CheckCircle className="w-4 h-4 text-[#00C9A7] mx-auto mt-2" />}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-bold mb-4">Weekly Leaderboard</h3>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <motion.div key={entry.uid} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`flex items-center gap-3 p-3 rounded-xl border ${entry.uid === user.uid ? 'bg-[#E8B84B]/10 border-[#E8B84B]/30' : 'bg-[#1A1A1A] border-gray-800'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{ backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#333', color: i < 3 ? '#000' : '#fff' }}>
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{entry.name}</p>
                    <p className="text-xs text-gray-500">{entry.mode} • {entry.level}</p>
                  </div>
                  <p className="font-bold text-[#00C9A7]">{formatCurrency(entry.earned)}</p>
                </motion.div>
              ))}
            </div>
            {userRank > 10 && (
              <div className="mt-4 bg-[#1A1A1A] rounded-xl p-4 border border-gray-800 text-center">
                <p className="text-sm text-gray-400">Your Rank: <span className="text-[#E8B84B] font-bold">#{userRank}</span></p>
              </div>
            )}
          </motion.div>
        )}

        {/* Streak Tab */}
        {activeTab === 'streak' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-bold mb-4">Streak Calendar</h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => {
                const isActive = i < streak;
                const isToday = i === streak;
                return (
                  <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${isToday ? 'bg-[#E8B84B] text-black' : isActive ? 'bg-[#00C9A7]/20 text-[#00C9A7]' : 'bg-[#1A1A1A] text-gray-600'}`}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
              <h4 className="font-bold mb-2">Streak Rewards</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-400">7-day streak</span><span className="text-[#00C9A7] font-bold">+₹50 bonus</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-400">14-day streak</span><span className="text-[#00C9A7] font-bold">+₹100 bonus</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-400">30-day streak</span><span className="text-[#00C9A7] font-bold">+₹250 bonus + Badge</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Level Up Celebration */}
      <AnimatePresence>
        {levelUp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLevelUp(false)}>
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="text-center" onClick={(e) => e.stopPropagation()}>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-32 h-32 bg-gradient-to-br from-[#E8B84B] to-[#00C9A7] rounded-full flex items-center justify-center mx-auto mb-6">
                <Crown className="w-16 h-16 text-black" />
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-2">Level Up!</h2>
              <p className="text-xl text-[#E8B84B] font-bold mb-6">You are now {newLevel}</p>
              <button onClick={() => setLevelUp(false)} className="bg-[#E8B84B] text-black font-bold px-8 py-4 rounded-2xl hover:bg-[#D4A743] transition-colors">Continue</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
