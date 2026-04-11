/**
 * WorkPlex Phase 2 — Home Dashboard with Mode-Specific Content
 * Real-time Firestore listeners, dual-mode support (Promoter vs Partner)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, TrendingUp, Flame, ShoppingBag, ListTodo,
  UserCircle, Share2, ChevronRight, Clock, Bell, Zap,
  Copy, CheckCircle, BarChart3, Package, ArrowRight, X
} from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, UserMode, getCurrentLevel, formatCurrency } from '../types';

interface HomeDashboardProps {
  user: any;
  userData: UserProfile;
}

export default function HomeDashboard({ user, userData }: HomeDashboardProps) {
  const [mode] = useState<UserMode>(userData.mode || 'Promoter');
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showMysteryTask, setShowMysteryTask] = useState(false);
  const [mysteryTask, setMysteryTask] = useState<any>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [stats, setStats] = useState<any>({
    totalProducts: 0,
    totalOrders: 0,
    totalMargin: 0,
    pendingMargin: 0,
    todayEarnings: 0,
    monthlyEarnings: 0
  });

  // Update current time every second for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll announcements
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setAnnouncementIndex(prev => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // Mystery task trigger (Promoters only)
  useEffect(() => {
    if (mode !== 'Promoter') return;
    if (Math.random() < 0.15) {
      setMysteryTask({
        title: 'Mystery Task: Quick Survey',
        earnAmount: 75,
        mysteryWindow: 2,
        description: 'Complete this quick task within 2 hours for instant Rs.75!'
      });
      setShowMysteryTask(true);
    }
  }, [mode]);

  // Real-time listener for user data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  // Real-time listener for coupon (Promoters only)
  useEffect(() => {
    if (mode !== 'Promoter') return;
    if (!['Marketer', 'Content Creator'].includes(userData.role || '')) return;
    const unsub = onSnapshot(doc(db, 'coupons', user.uid), (doc) => {
      if (doc.exists()) setCoupon(doc.data());
    });
    return () => unsub();
  }, [mode, userData.role, user.uid]);

  // Real-time listener for tasks (Promoters only)
  useEffect(() => {
    if (mode !== 'Promoter') return;
    const q = query(
      collection(db, 'tasks'),
      where('venture', '==', userData.venture),
      where('role', 'array-contains', userData.role),
      where('status', '==', 'active'),
      limit(3)
    );
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [mode, userData.venture, userData.role]);

  // Real-time listener for orders (Partners only)
  useEffect(() => {
    if (mode !== 'Partner') return;
    const q = query(
      collection(db, 'partnerOrders'),
      where('partnerId', '==', user.uid),
      orderBy('orderedAt', 'desc'),
      limit(3)
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [mode, user.uid]);

  // Real-time listener for announcements
  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Real-time listener for partner stats (Partners only)
  useEffect(() => {
    if (mode !== 'Partner') return;
    const q = query(collection(db, 'partnerProducts'), where('partnerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setStats(prev => ({ ...prev, totalProducts: snap.size }));
    });
    return () => unsub();
  }, [mode, user.uid]);

  const copyShopLink = async () => {
    if (!userData.shopSlug) return;
    const url = `${window.location.origin}/shop/${userData.shopSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link');
    }
  };

  const shareOnWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getCouponTimeRemaining = () => {
    if (!coupon?.expiresAt) return 0;
    const expires = coupon.expiresAt.toDate ? coupon.expiresAt.toDate().getTime() : new Date(coupon.expiresAt).getTime();
    const remaining = expires - now;
    const total = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };

  const getDaysRemaining = (timestamp: any) => {
    if (!timestamp) return 7;
    const release = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
    const diff = release - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* ===== TOP BAR ===== */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-[#111111] border-b border-gray-800 p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userData.name}`}
              alt="Profile"
              className="w-12 h-12 rounded-full border-2 border-[#E8B84B]/30"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-bold text-lg">{userData.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#E8B84B]/20 text-[#E8B84B] px-2 py-0.5 rounded-full">
                  {mode}
                </span>
                {mode === 'Promoter' && userData.venture && (
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                    {userData.venture} {userData.role}
                  </span>
                )}
                {mode === 'Partner' && userData.shopName && (
                  <span className="text-xs bg-[#00C9A7]/20 text-[#00C9A7] px-2 py-0.5 rounded-full">
                    {userData.shopName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-sm">{userData.streak || 0}d</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#111111] rounded-2xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Earned Balance</p>
          <h1 className="text-3xl font-black text-[#E8B84B]">{formatCurrency(userData.wallets?.earned || 0)}</h1>
          <p className="text-xs text-gray-400 mt-1">Today: +{formatCurrency(stats.todayEarnings || 0)}</p>
        </div>
      </motion.div>

      {/* ===== MODE-SPECIFIC CONTENT ===== */}
      <div className="p-4 sm:p-6 space-y-6">
        {mode === 'Promoter' ? (
          <>
            {/* COUPON CODE CARD */}
            {['Marketer', 'Content Creator'].includes(userData.role || '') && coupon && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#E8B84B]/20 to-[#1A1A1A] p-5 rounded-2xl border border-[#E8B84B]/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#E8B84B]" />
                    <h3 className="font-bold">Your Coupon Code</h3>
                  </div>
                  <span className="text-xs bg-[#E8B84B]/20 text-[#E8B84B] px-2 py-1 rounded-full">
                    {coupon.usageCount || 0} uses today
                  </span>
                </div>
                <p className="text-2xl font-black text-[#E8B84B] mb-3 tracking-wider">{coupon.code}</p>
                <div className="w-full h-2 bg-gray-800 rounded-full mb-3 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#E8B84B]"
                    initial={{ width: '100%' }}
                    animate={{ width: `${getCouponTimeRemaining()}%` }}
                  />
                </div>
                <button
                  onClick={() => shareOnWhatsApp(`Check out ${userData.venture}! Use my code ${coupon.code} for discount!`)}
                  className="w-full bg-[#00C9A7] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#00b395] transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </button>
              </motion.div>
            )}

            {/* AI EARNINGS PREDICTOR */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] p-5 rounded-2xl text-black"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg">AI Predictor</h3>
                  <p className="text-sm font-medium opacity-80">
                    Complete {tasks.length} more tasks to earn {formatCurrency(tasks.reduce((a, b) => a + (b.earnAmount || 0), 0))} extra today!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* TODAY'S TASKS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Today's Tasks</h3>
                <button className="text-[#E8B84B] text-sm font-medium flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold">{task.title}</h4>
                        <span className="text-[#00C9A7] font-black">{formatCurrency(task.earnAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-3">
                        <Clock className="w-3 h-3" />
                        <span>Ends in {task.deadline ? getDaysRemaining(task.deadline) : 24}h</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-[#00C9A7] text-black font-bold py-2 rounded-lg text-sm hover:bg-[#00b395] transition-colors">
                          Accept
                        </button>
                        <button className="flex-1 bg-gray-800 text-gray-400 font-bold py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] p-8 rounded-2xl border border-dashed border-gray-800 text-center">
                  <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No tasks available right now</p>
                </div>
              )}
            </motion.div>

            {/* LEAD MARKETER PROGRESS */}
            {userData.role === 'Marketer' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#1A1A1A] p-5 rounded-2xl border border-gray-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">Journey to Lead Marketer</h3>
                  <span className="text-[#E8B84B] text-sm font-bold">{formatCurrency(stats.monthlyEarnings || 0)} / ₹50,000</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#E8B84B] to-[#00C9A7]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((stats.monthlyEarnings || 0) / 50000) * 100)}%` }}
                  />
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <>
            {/* SHOP STATUS CARD */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#00C9A7]/20 to-[#1A1A1A] p-5 rounded-2xl border border-[#00C9A7]/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#00C9A7]" />
                  <h3 className="font-bold">Your Shop</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${userData.shopPublished ? 'bg-[#00C9A7]/20 text-[#00C9A7]' : 'bg-yellow-500/20 text-yellow-500'}`}>
                  {userData.shopPublished ? 'LIVE' : 'Setup Required'}
                </span>
              </div>
              {userData.shopPublished ? (
                <>
                  <p className="text-sm text-gray-400 mb-3">
                    workplex.hvrs.in/shop/{userData.shopSlug}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={copyShopLink}
                      className="flex-1 bg-[#00C9A7] text-black font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-[#00b395] transition-colors"
                    >
                      {linkCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {linkCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => shareOnWhatsApp(`Check out my shop: workplex.hvrs.in/shop/${userData.shopSlug}`)}
                      className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-gray-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Complete your shop setup to start selling</p>
              )}
            </motion.div>

            {/* PARTNER STATS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: 'Products', value: stats.totalProducts, icon: Package, color: '#E8B84B' },
                { label: 'Orders', value: stats.totalOrders, icon: ShoppingBag, color: '#00C9A7' },
                { label: 'Margin Earned', value: formatCurrency(stats.totalMargin), icon: TrendingUp, color: '#00C9A7' },
                { label: 'Pending', value: formatCurrency(stats.pendingMargin), icon: Clock, color: '#F59E0B' }
              ].map((stat, i) => (
                <div key={i} className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </motion.div>

            {/* RECENT ORDERS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-bold text-lg mb-4">Recent Orders</h3>
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm">{order.customerName}</p>
                          <p className="text-xs text-gray-500">#{order.orderId}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                            order.status === 'shipped' ? 'bg-purple-500/20 text-purple-500' :
                              order.status === 'processing' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-yellow-500/20 text-yellow-500'
                          }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#00C9A7] font-black">{formatCurrency(order.totalAmount)}</span>
                        <span className="text-gray-400 text-xs">Margin: {formatCurrency(order.totalPartnerMargin)}</span>
                      </div>
                      {!order.deliveredAt && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Margin release in {getDaysRemaining(order.marginReleaseAt)} days
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] p-8 rounded-2xl border border-dashed border-gray-800 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No orders yet</p>
                </div>
              )}
            </motion.div>

            {/* BROWSE CATALOG */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full bg-gradient-to-r from-[#00C9A7] to-[#00B396] text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <ShoppingBag className="w-5 h-5" />
              Add More Products to Your Shop
            </motion.button>
          </>
        )}
      </div>

      {/* ===== MYSTERY TASK POPUP ===== */}
      <AnimatePresence>
        {showMysteryTask && mysteryTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] rounded-3xl p-6 max-w-sm w-full border border-[#E8B84B]/30"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#E8B84B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-[#E8B84B]" />
                </div>
                <h3 className="text-xl font-black mb-2">{mysteryTask.title}</h3>
                <p className="text-gray-400 text-sm">{mysteryTask.description}</p>
              </div>
              <div className="bg-[#E8B84B]/10 rounded-xl p-4 mb-6 text-center">
                <p className="text-2xl font-black text-[#E8B84B]">{formatCurrency(mysteryTask.earnAmount)}</p>
                <p className="text-xs text-gray-400">Complete in {mysteryTask.mysteryWindow} hours</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMysteryTask(false)}
                  className="flex-1 bg-gray-800 text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => setShowMysteryTask(false)}
                  className="flex-1 bg-[#E8B84B] text-black font-bold py-3 rounded-xl hover:bg-[#D4A743] transition-colors"
                >
                  Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== ADMIN ANNOUNCEMENTS ===== */}
      {announcements.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-[#E8B84B]/10 border-t border-[#E8B84B]/20 py-3 overflow-hidden">
          <div className="flex items-center gap-2 px-4">
            <Bell className="w-4 h-4 text-[#E8B84B] flex-shrink-0" />
            <AnimatePresence mode="wait">
              <motion.p
                key={announcements[announcementIndex]?.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-gray-300 truncate"
              >
                {announcements[announcementIndex]?.message}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ===== BOTTOM NAVIGATION ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-gray-800 px-4 py-3 flex items-center justify-around z-40">
        <button className="flex flex-col items-center gap-1 text-[#E8B84B]">
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        {mode === 'Promoter' ? (
          <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
            <ListTodo className="w-5 h-5" />
            <span className="text-[10px] font-bold">Tasks</span>
          </button>
        ) : (
          <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-bold">Shop</span>
          </button>
        )}
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold">Wallet</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
          <UserCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
}
