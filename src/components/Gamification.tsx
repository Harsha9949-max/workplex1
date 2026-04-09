import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Award, Star, Share2, X, CheckCircle2, Timer, Zap, Target, TrendingUp, Users, ShieldCheck, Rocket, Crown } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import confetti from 'canvas-confetti';

// --- Types ---

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const BADGES: Badge[] = [
  { id: 'first_sale', name: 'First Sale', description: 'Completed your first approved task!', icon: <Zap size={24} />, color: 'text-blue-400' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintained a 7-day streak!', icon: <Flame size={24} />, color: 'text-orange-500' },
  { id: 'coupon_king', name: 'Coupon King', description: 'Used 100+ coupons!', icon: <Crown size={24} />, color: 'text-yellow-400' },
  { id: 'top_earner', name: 'Top Earner', description: 'Reached #1 on the weekly leaderboard!', icon: <Trophy size={24} />, color: 'text-yellow-500' },
  { id: 'club_10k', name: '10K Club', description: 'Earned over ₹10,000 total!', icon: <TrendingUp size={24} />, color: 'text-green-400' },
  { id: 'club_50k', name: '50K Club', description: 'Earned over ₹50,000 total!', icon: <Rocket size={24} />, color: 'text-purple-400' },
  { id: 'team_builder', name: 'Team Builder', description: 'Built a team of 10+ members!', icon: <Users size={24} />, color: 'text-indigo-400' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Completed a mystery task within 30 mins!', icon: <Timer size={24} />, color: 'text-red-400' },
  { id: 'early_bird', name: 'Early Bird', description: 'One of the first 1,000 users!', icon: <Target size={24} />, color: 'text-cyan-400' },
];

export const LEVELS = [
  { name: 'Bronze', minEarnings: 0, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  { name: 'Silver', minEarnings: 5000, color: 'text-gray-300', bg: 'bg-gray-300/10', border: 'border-gray-300/20' },
  { name: 'Gold', minEarnings: 20000, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  { name: 'Platinum', minEarnings: 50000, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
];

// --- Components ---

export function StreakDisplay({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-2xl">
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Flame className="text-orange-500" size={20} fill="currentColor" />
      </motion.div>
      <span className="font-black text-orange-500">{streak} Day Streak</span>
    </div>
  );
}

export function BadgeGrid({ earnedBadges }: { earnedBadges: string[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {BADGES.map((badge) => {
        const isEarned = earnedBadges.includes(badge.id);
        return (
          <motion.div
            key={badge.id}
            whileHover={{ scale: 1.05 }}
            className={`relative group flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all ${
              isEarned 
                ? `${badge.color} bg-white/5 border-white/10` 
                : 'text-gray-600 bg-black/20 border-white/5 grayscale'
            }`}
          >
            <div className={`p-3 rounded-2xl ${isEarned ? 'bg-white/5 shadow-lg shadow-black/20' : 'bg-black/40'}`}>
              {badge.icon}
            </div>
            <span className="text-[10px] font-bold text-center leading-tight">{badge.name}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 p-2 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10 text-center">
              {badge.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function LevelProgress({ totalEarned, currentLevel }: { totalEarned: number, currentLevel: string }) {
  const currentIndex = LEVELS.findIndex(l => l.name === currentLevel);
  const nextLevel = LEVELS[currentIndex + 1];
  
  if (!nextLevel) return null;

  const progress = Math.min(100, (totalEarned / nextLevel.minEarnings) * 100);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Current Level</p>
          <h3 className={`text-xl font-black ${LEVELS[currentIndex].color}`}>{currentLevel}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Next: {nextLevel.name}</p>
          <p className="text-sm font-black text-white">₹{totalEarned.toLocaleString()} / ₹{nextLevel.minEarnings.toLocaleString()}</p>
        </div>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full ${nextLevel.color.replace('text', 'bg')}`}
        />
      </div>
    </div>
  );
}

export function LeaderboardTab({ venture }: { venture: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const weekId = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`; // Simplified weekId
    
    const q = query(
      collection(db, 'leaderboard', venture, 'weekly', weekId, 'entries'),
      orderBy('rank', 'asc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEntries(data);
      setLoading(false);
    });

    return unsub;
  }, [venture]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading Leaderboard...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-lg font-black flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" />
          Weekly Top 10
        </h3>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
          {venture}
        </span>
      </div>

      <div className="bg-[#111111] rounded-[2rem] border border-white/5 overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">No data for this week yet.</p>
            <p className="text-xs">Be the first to climb the ranks!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map((entry, idx) => (
              <div 
                key={entry.id} 
                className={`flex items-center gap-4 p-4 transition-colors hover:bg-white/5 ${
                  entry.id === auth.currentUser?.uid ? 'bg-[#E8B84B]/10' : ''
                }`}
              >
                <div className="w-8 text-center font-black text-lg">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : entry.rank}
                </div>
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center font-black text-[#E8B84B]">
                  {entry.userName[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{entry.userName}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{entry.venture}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-[#E8B84B]">₹{entry.earnedThisWeek.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">This Week</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LevelUpCelebration({ level, uid, onClose }: { level: string, uid: string, onClose: () => void }) {
  const onShare = () => {
    const text = `I just reached ${level} on WorkPlex! Earning money from home 🏠 Join me: workplex.hvrs.in/join?ref=${uid}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const levelData = LEVELS.find(l => l.name === level) || LEVELS[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={24} />
      </button>

      <div className="max-w-md w-full text-center space-y-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center border-4 ${levelData.border} ${levelData.bg} relative`}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse rounded-full" />
          <Award size={80} className={levelData.color} />
        </motion.div>

        <div className="space-y-2">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black text-white"
          >
            LEVEL UP!
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-400 font-bold"
          >
            You've reached <span className={levelData.color}>{level}</span> status
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-4"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="font-black text-white">Higher Commissions</p>
              <p className="text-xs text-gray-400 font-medium">Earn up to 15% more on every task</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-black text-white">Priority Support</p>
              <p className="text-xs text-gray-400 font-medium">Instant withdrawal approvals</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3"
        >
          <button
            onClick={onShare}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#25D366]/20"
          >
            <Share2 size={24} />
            Share to WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-[2rem] font-bold transition-all"
          >
            Continue Working
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function MysteryTaskPopup({ task, onAccept, onClose }: { task: any, onAccept: () => void, onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = task.expiresAt.toDate().getTime() - now;
      
      if (distance < 0) {
        clearInterval(timer);
        onClose();
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [task.expiresAt, onClose]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 50 }}
      className="fixed bottom-24 left-6 right-6 z-50 bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-[2.5rem] shadow-2xl shadow-purple-500/40 border border-white/20"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white animate-bounce">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">MYSTERY TASK!</h3>
            <p className="text-xs text-white/70 font-bold uppercase tracking-widest">Limited Time Offer</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="bg-black/20 rounded-3xl p-4 mb-6 space-y-2">
        <p className="text-lg font-bold text-white">{task.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#E8B84B]">
            <TrendingUp size={16} />
            <span className="font-black text-xl">₹{task.earning}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
            <Timer size={16} />
            <span>{timeLeft}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onAccept}
        className="w-full bg-white text-purple-700 py-4 rounded-2xl font-black text-lg hover:bg-purple-50 transition-all shadow-lg"
      >
        Accept & Start Now
      </button>
    </motion.div>
  );
}
