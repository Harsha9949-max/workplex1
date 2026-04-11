/**
 * WorkPlex Phase 10 — Viral Layer: Public Profiles, Team Chat, Live Feed, Sharing
 * Publicly accessible pages, real-time chat, viral growth features
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Send, QrCode, Share2, Copy, Check,
  TrendingUp, Flame, Award, ShieldCheck, ArrowUpRight, X
} from 'lucide-react';
import {
  doc, getDoc, collection, query, where, orderBy, limit, onSnapshot,
  addDoc, updateDoc, serverTimestamp, FieldValue
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, getCurrentLevel, formatCurrency, BADGES, UserMode } from './types';

// ===== 1. PUBLIC WORKER PROFILE =====
export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snap = await getDocs(q);
        if (snap.empty) {
          setError('Profile not found');
          setLoading(false);
          return;
        }
        setProfile({ id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };
    if (username) loadProfile();
  }, [username]);

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${username}`);
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">Loading...</div>;
  if (error || !profile) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 text-center">
      <div>
        <h2 className="text-2xl font-black mb-2">{error || 'Profile not found'}</h2>
        <button onClick={() => navigate('/')} className="bg-[#E8B84B] text-black font-bold px-6 py-3 rounded-xl mt-4">Go Home</button>
      </div>
    </div>
  );

  const level = getCurrentLevel(profile.wallets?.earned || 0);
  const earnedBadges = BADGES.filter(b => profile.badges?.includes(b.id));

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-12">
      {/* Header */}
      <div className="bg-[#111111] border-b border-gray-800 p-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="font-black">{profile.name}</h1>
          <div className="flex gap-2">
            <button onClick={copyProfileLink} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-gray-800 text-center">
          <img
            src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
            alt={profile.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-[#E8B84B]/30"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="bg-[#E8B84B]/20 text-[#E8B84B] px-3 py-1 rounded-full text-sm font-bold">
              {profile.mode || 'Promoter'}
            </span>
            {profile.mode === 'Promoter' && (
              <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-sm">
                {profile.venture} • {profile.role}
              </span>
            )}
            {profile.mode === 'Partner' && (
              <span className="bg-[#00C9A7]/20 text-[#00C9A7] px-3 py-1 rounded-full text-sm">
                {profile.shopName}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">Joined {profile.joinedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center border border-gray-800">
            <TrendingUp className="w-6 h-6 text-[#00C9A7] mx-auto mb-2" />
            <p className="text-lg font-black">{formatCurrency(profile.wallets?.earned || 0)}</p>
            <p className="text-xs text-gray-500">Earned</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center border border-gray-800">
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-lg font-black">{profile.streak || 0}</p>
            <p className="text-xs text-gray-500">Day Streak</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 text-center border border-gray-800">
            <Award className="w-6 h-6 text-[#E8B84B] mx-auto mb-2" />
            <p className="text-lg font-black">{level}</p>
            <p className="text-xs text-gray-500">Level</p>
          </div>
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-gray-800">
            <h3 className="font-bold mb-4">Badges Earned ({earnedBadges.length})</h3>
            <div className="grid grid-cols-4 gap-3">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="text-center">
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <p className="text-[10px] text-gray-500">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black font-bold py-4 rounded-2xl hover:scale-[1.02] transition-transform"
        >
          Join WorkPlex
        </button>
      </div>
    </div>
  );
}

// ===== 2. TEAM CHAT (Lead Marketer Only) =====
export function TeamChat({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!leadId) return;
    const q = query(collection(db, 'teamChats', leadId, 'messages'), orderBy('timestamp', 'asc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [leadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    try {
      await addDoc(collection(db, 'teamChats', leadId, 'messages'), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'You',
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-gray-800 p-4 flex items-center gap-3">
        <Users className="w-5 h-5 text-[#E8B84B]" />
        <div>
          <h3 className="font-bold">{leadName}'s Team</h3>
          <p className="text-xs text-gray-500">{messages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'bg-[#E8B84B] text-black' : 'bg-[#1A1A1A] text-white border border-gray-800'
                  }`}>
                  {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.senderName}</p>}
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-black/60' : 'text-gray-500'}`}>
                    {msg.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#111111] border-t border-gray-800 p-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-[#E8B84B] text-black px-4 rounded-xl hover:bg-[#D4A743] transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ===== 3. LIVE EARNINGS FEED =====
export function LiveEarningsFeed({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ amount: number; source: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Show toast for new transactions
      if (transactions.length > 0 && txs.length > transactions.length) {
        const newTx = txs[0];
        if (newTx.amount > 0) {
          setToast({ amount: newTx.amount, source: newTx.description || 'Task approved' });
          setTimeout(() => setToast(null), 4000);
        }
      }
      setTransactions(txs);
    });
    return () => unsub();
  }, [userId, transactions.length]);

  return (
    <>
      {/* Scrolling Feed */}
      <div className="bg-[#111111] py-3 border-t border-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#00C9A7] rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Earnings</span>
          </div>
          <div className="h-8 overflow-hidden relative">
            {transactions.length > 0 && (
              <motion.div
                animate={{ y: [0, -32 * transactions.length] }}
                transition={{ duration: transactions.length * 3, repeat: Infinity, ease: 'linear' }}
                className="space-y-0"
              >
                {[...transactions, ...transactions].map((tx, idx) => (
                  <div key={idx} className="h-8 flex items-center gap-2">
                    <span className="text-[#00C9A7] font-black text-xs">+{formatCurrency(tx.amount)}</span>
                    <span className="text-gray-400 text-[10px] truncate">{tx.description || 'Earning'}</span>
                    <span className="text-gray-600 text-[9px] ml-auto">
                      {tx.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#00C9A7] text-black px-6 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,201,167,0.3)] flex items-center gap-3 z-50"
          >
            <TrendingUp className="w-5 h-5" />
            <div>
              <p className="font-black text-sm">{formatCurrency(toast.amount)} Earned!</p>
              <p className="text-xs font-medium opacity-70">{toast.source}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ===== 4. SHARE UTILITIES =====
export const ShareUtils = {
  levelUp: (level: string, uid: string, mode: UserMode, shopSlug?: string) => {
    const text = mode === 'Partner'
      ? `I just reached ${level} on WorkPlex! Check out my shop: ${window.location.origin}/shop/${shopSlug}`
      : `I just reached ${level} on WorkPlex! Earning money from home 🔥 Join me: ${window.location.origin}/join?ref=${uid}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  },
  badge: (badgeName: string, uid: string) => {
    const text = `Just unlocked "${badgeName}" on WorkPlex! 💪 Join me: ${window.location.origin}/join?ref=${uid}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  },
  shop: (shopName: string, shopSlug: string) => {
    const text = `Shop the best deals on ${shopName}! Visit my WorkPlex store: ${window.location.origin}/shop/${shopSlug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  },
  coupon: (code: string, venture: string) => {
    const text = `Shop on ${venture} and save! Use code ${code}: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
};
