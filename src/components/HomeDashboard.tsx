import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Zap, Share2, ShieldCheck, Home, ShoppingBag, Users, ListTodo, Trophy,
  Wallet, UserCircle, Bell, ChevronRight, TrendingUp, Sparkles, Filter, Search, Flame, Loader2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import {
  query, collection, where, orderBy, limit, onSnapshot, doc, updateDoc,
  serverTimestamp, getDocs, addDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserData, TaskData, CouponData, Announcement, handleFirestoreError, OperationType, FirebaseUser } from '../types';
import { NavButton } from './Navigation';
import ProfileScreen from './ProfileScreen';
import WalletScreen from './WalletScreen';
import TasksScreen from './TasksScreen';
import {
  PromotionCelebration as LevelUpCelebration,
  MysteryTaskPopup,
  LeaderboardTab,
  TeamChat
} from '../ViralLayer';

export function TaskCard({ task, now, onAccept, onSkip }: { task: TaskData, now: number, onAccept: (id: string) => void, onSkip: (id: string) => void }) {
  const getTimeRemaining = (deadline: any) => {
    if (!deadline) return '0h 0m';
    const end = new Date(deadline).getTime();
    const diff = end - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#1A1A1A] p-4 rounded-2xl border border-gray-800 flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-white">{task.title}</h4>
          <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
            <Clock size={12} />
            <span>Ends in {getTimeRemaining(task.deadline)}</span>
          </div>
        </div>
        <span className="text-[#00C9A7] font-black">₹{task.earning}</span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onAccept(task.id!)}
          className="flex-1 bg-[#00C9A7] text-black font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
        >
          Accept
        </button>
        <button
          onClick={() => onSkip(task.id!)}
          className="flex-1 bg-gray-800 text-gray-400 font-bold py-2.5 rounded-xl text-sm active:scale-95 transition-transform"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}

const MemoizedTaskCard = React.memo(TaskCard);

export function CouponCard({ coupon, userData, now }: { coupon: CouponData | null, userData: UserData | null, now: number }) {
  const getCouponProgress = () => {
    if (!coupon?.expiresAt) return 0;
    const end = new Date(coupon.expiresAt).getTime();
    const start = end - (24 * 60 * 60 * 1000); // Assume 24h duration
    const total = end - start;
    const remaining = end - now;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-6 rounded-3xl border border-gray-800 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Zap size={80} className="text-[#E8B84B]" />
      </div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Coupon Code</span>
          <span className="text-[#00C9A7] text-xs font-bold bg-[#00C9A7]/10 px-2 py-1 rounded-lg">
            Used {coupon?.usageCount || 0} times
          </span>
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-wider">{coupon?.code || 'PLEX-XXXX'}</h2>

        <div className="w-full h-1.5 bg-gray-800 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-[#E8B84B]"
            initial={{ width: '100%' }}
            animate={{ width: `${getCouponProgress()}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>

        <button
          onClick={() => {
            const message = `Check out ${userData?.venture}! Use my code ${coupon?.code} for discount: https://workplex.hvrs.com/shop`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
          }}
          className="w-full bg-[#00C9A7] text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00b395] transition-all active:scale-[0.98]"
        >
          <Share2 size={20} /> Share on WhatsApp
        </button>
      </div>
    </motion.div>
  );
}

const MemoizedCouponCard = React.memo(CouponCard);

export default function HomeDashboard({ user }: { user: FirebaseUser }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMysteryTask, setShowMysteryTask] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showCelebration, setShowCelebration] = useState(false);
  const [mysteryTask, setMysteryTask] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [teamSize, setTeamSize] = useState(0);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [globalTransactions, setGlobalTransactions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ amount: number, source: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (recentTransactions.length > 0 && txs.length > recentTransactions.length) {
        const newTx: any = txs[0];
        setToast({ amount: newTx.amount, source: newTx.description });
        setTimeout(() => setToast(null), 4000);
      }
      setRecentTransactions(txs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));
    return () => unsub();
  }, [user.uid, recentTransactions.length]);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setGlobalTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchAIPrediction = async () => {
      const pendingCount = tasks.filter(t => t.status === 'assigned').length;
      const avgEarning = tasks.reduce((a, b) => a + b.earning, 0) / (tasks.length || 1);
      setAiPrediction({
        predictedEarning: pendingCount * avgEarning,
        message: `Complete ${pendingCount} more tasks to earn Rs.${Math.round(pendingCount * avgEarning)} extra today!`
      });
    };
    if (user.uid) fetchAIPrediction();
  }, [user.uid, tasks]);

  useEffect(() => {
    const fetchAIRecommendations = async () => {
      if (userData?.role !== 'Reseller') return;
      setIsAiLoading(true);
      setAiRecommendations(['Electronics', 'Fashion', 'Home Decor', 'Beauty', 'Sports']);
      setIsAiLoading(false);
    };
    if (userData?.role === 'Reseller') fetchAIRecommendations();
  }, [userData?.role, user.uid]);

  useEffect(() => {
    updateDoc(doc(db, 'users', user.uid), { lastActiveAt: serverTimestamp() });
  }, [user.uid]);

  useEffect(() => {
    if (userData?.role === 'Lead Marketer' || userData?.role === 'Manager') {
      const unsubTeam = onSnapshot(collection(db, `teams/${user.uid}/members`), (snapshot) => {
        setTeamSize(snapshot.size);
      });
      return () => unsubTeam();
    }
  }, [userData?.role, user.uid]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Real-time listeners
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docObj) => {
      if (docObj.exists()) setUserData(docObj.data() as UserData);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    const unsubCoupon = onSnapshot(doc(db, 'coupons', user.uid), (docObj) => {
      if (docObj.exists()) setCoupon(docObj.data() as CouponData);
    }, (err) => handleFirestoreError(err, OperationType.GET, `coupons/${user.uid}`));

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks', user.uid, 'assigned'), where('status', '==', 'assigned'), limit(3)),
      (snapshot) => {
        setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskData)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, `tasks/${user.uid}/assigned`)
    );

    const unsubAnnouncements = onSnapshot(
      query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5)),
      (snapshot) => {
        setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
    );

    // Mystery Task Trigger
    const checkMysteryTasks = async () => {
      if (Math.random() < 0.15) {
        const q = query(collection(db, 'mysteryTasks'), where('isMystery', '==', true), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setMysteryTask({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      }
    };
    checkMysteryTasks();

    return () => {
      unsubUser();
      unsubCoupon();
      unsubTasks();
      unsubAnnouncements();
    };
  }, [user.uid]);

  useEffect(() => {
    if (userData?.showPromotionCelebration) {
      setShowCelebration(true);
    }
  }, [userData?.showPromotionCelebration]);

  const handleDismissCelebration = async () => {
    setShowCelebration(false);
    await updateDoc(doc(db, 'users', user.uid), { showPromotionCelebration: false });
  };

  const handleAcceptTask = async (taskId: string) => {
    await updateDoc(doc(db, 'tasks', user.uid, 'assigned', taskId), { status: 'accepted' });
  };

  const handleSkipTask = async (taskId: string) => {
    await updateDoc(doc(db, 'tasks', user.uid, 'assigned', taskId), { status: 'skipped' });
  };

  const handleAcceptMysteryTask = async () => {
    const newMysteryTask: Partial<TaskData> = {
      title: 'Mystery Task: Quick Survey',
      earning: 75,
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'assigned'
    };
    await addDoc(collection(db, 'tasks', user.uid, 'assigned'), newMysteryTask);
    setShowMysteryTask(false);
  };

  const calculateAIPredictor = () => {
    if (tasks.length === 0) return { count: 0, extra: 0 };
    const avgEarning = tasks.reduce((acc, t) => acc + t.earning, 0) / tasks.length;
    return {
      count: tasks.length,
      extra: Math.round(tasks.length * avgEarning)
    };
  };

  const predictor = calculateAIPredictor();

  if (loading) return <HomeSkeleton />;

  return (
    <div className="flex bg-[#0A0A0A] text-white min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col fixed top-0 left-0 w-64 h-full bg-[#111111] border-r border-gray-800 p-6 z-50">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#E8B84B] rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(232,184,75,0.3)]">
            <ShieldCheck size={32} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-widest text-center">WorkPlex</h1>
        </div>
        <div className="flex-1 space-y-2">
          <NavButton active={activeTab === 'home'} icon={<Home />} label="Home" onClick={() => setActiveTab('home')} direction="horizontal" />
          {userData?.role === 'Reseller' && (
            <NavButton active={activeTab === 'catalog'} icon={<ShoppingBag />} label="Catalog" onClick={() => setActiveTab('catalog')} direction="horizontal" />
          )}
          {(userData?.role === 'Lead Marketer' || userData?.role === 'Manager') && (
            <NavButton active={activeTab === 'chat'} icon={<Users />} label="Team" onClick={() => setActiveTab('chat')} direction="horizontal" />
          )}
          <NavButton active={activeTab === 'tasks'} icon={<ListTodo />} label="Tasks" onClick={() => setActiveTab('tasks')} direction="horizontal" />
          <NavButton active={activeTab === 'leaderboard'} icon={<Trophy />} label="Ranks" onClick={() => setActiveTab('leaderboard')} direction="horizontal" />
          <NavButton active={activeTab === 'wallet'} icon={<Wallet />} label="Wallet" onClick={() => setActiveTab('wallet')} direction="horizontal" />
          <NavButton active={activeTab === 'profile'} icon={<UserCircle />} label="Profile" onClick={() => setActiveTab('profile')} direction="horizontal" />
        </div>
      </div>

      <div className="flex-1 min-h-screen pb-32 md:pb-6 md:ml-64 relative w-full md:w-[calc(100%-16rem)]">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-32 left-6 right-6 z-[100] bg-[#00C9A7] text-black p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,201,167,0.3)] flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="font-black text-sm">₹{toast.amount} Earned!</p>
                <p className="text-xs font-bold opacity-70">{toast.source}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'home' ? (
          <>
            {userData?.showPromotionCelebration && (
              <LevelUpCelebration
                level={userData.level || 'Bronze'}
                uid={user.uid}
                onClose={() => updateDoc(doc(db, 'users', user.uid), { showPromotionCelebration: false })}
              />
            )}
            {/* Top Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-[#111111] border-b border-gray-800"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={userData?.photoURL || 'https://picsum.photos/seed/user/200'} className="w-14 h-14 rounded-2xl object-cover border border-[#E8B84B]/30" alt="Profile" referrerPolicy="no-referrer" />
                    <div className="absolute -bottom-1 -right-1 bg-[#E8B84B] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      {userData?.level || 'Bronze'}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{userData?.name || 'User'}</h2>
                    <span className="text-xs bg-[#E8B84B]/10 text-[#E8B84B] px-2 py-0.5 rounded-full border border-[#E8B84B]/20">
                      {userData?.venture} {userData?.role}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-[#E8B84B]">
                    <Flame size={18} fill="currentColor" />
                    <span className="font-bold">{userData?.streak || 0} days</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mb-1">Earned Balance</p>
                  <h1 className="text-4xl font-black text-white">₹{(userData?.wallets?.earned || 0).toLocaleString()}</h1>
                  <p className="text-[#00C9A7] text-sm font-medium mt-1">Today: +₹{userData?.todayEarnings || 0}</p>
                </div>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="bg-[#E8B84B] text-black p-3 rounded-2xl shadow-[0_0_20px_rgba(232,184,75,0.2)] active:scale-95 transition-transform"
                >
                  <Wallet size={24} />
                </button>
              </div>
            </motion.div>

            <div className="px-6 space-y-6 mt-6">
              {/* Live Earnings Feed */}
              <div className="bg-[#111111] py-3 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 mb-2">
                  <div className="w-1.5 h-1.5 bg-[#00C9A7] rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Earnings Feed</span>
                </div>
                <div className="h-8 overflow-hidden relative">
                  <motion.div
                    animate={{ y: [0, -32 * (globalTransactions.length || 1)] }}
                    transition={{
                      duration: (globalTransactions.length || 1) * 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="space-y-0"
                  >
                    {[...globalTransactions, ...globalTransactions].map((tx, idx) => (
                      <div key={idx} className="h-8 flex items-center px-4 gap-2">
                        <span className="text-[#00C9A7] font-black text-xs">₹{tx.amount}</span>
                        <span className="text-gray-400 text-[10px] truncate">from {tx.description}</span>
                        <span className="text-gray-600 text-[9px] ml-auto">
                          {tx.createdAt ? new Date(tx.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>

              {/* Coupon Card */}
              {(userData?.role === 'Marketer' || userData?.role === 'Content Creator') && (
                <MemoizedCouponCard coupon={coupon} userData={userData} now={now} />
              )}

              {/* AI Earnings Predictor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#E8B84B] p-6 rounded-3xl text-black flex items-center justify-between shadow-[0_10px_30px_rgba(232,184,75,0.2)]"
              >
                <div className="max-w-[70%]">
                  <h3 className="font-black text-lg leading-tight">AI Predictor</h3>
                  <p className="text-sm font-bold opacity-80 mt-1">
                    {aiPrediction?.message || `Complete ${predictor.count} more tasks to earn ₹${predictor.extra} extra today`}
                  </p>
                </div>
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={28} />
                </div>
              </motion.div>

              {/* Today's Tasks */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Today's Tasks</h3>
                  <button className="text-[#E8B84B] text-sm font-bold flex items-center gap-1">
                    View All <ChevronRight size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  {tasks.length > 0 ? tasks.map((task) => (
                    <MemoizedTaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      onAccept={handleAcceptTask}
                      onSkip={handleSkipTask}
                    />
                  )) : (
                    <div className="bg-[#1A1A1A] p-8 rounded-3xl border border-dashed border-gray-800 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mb-3">
                        <ListTodo className="text-gray-600" />
                      </div>
                      <p className="text-gray-600 text-sm italic">No tasks assigned for now. Check back later!</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Lead Marketer Progress */}
              <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-300">Journey to Lead Marketer</h3>
                  <span className="text-[#E8B84B] font-black">₹{(userData?.monthlyEarnings || 0).toLocaleString()}/50k</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#E8B84B] to-[#00C9A7]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((userData?.monthlyEarnings || 0) / 50000) * 100)}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                  />
                </div>
                <p className="text-gray-500 text-xs font-bold">{userData?.daysActiveThisMonth || 0} days active this month</p>
              </div>
            </div>
          </>
        ) : activeTab === 'leaderboard' && userData ? (
          <div className="p-6 pb-32">
            <LeaderboardTab venture={userData.venture || 'WorkPlex'} />
          </div>
        ) : activeTab === 'chat' && userData ? (
          <div className="p-6 pb-32">
            <TeamChat leadId={user.uid} leadName={userData.name || 'Your Name'} />
          </div>
        ) : activeTab === 'tasks' && userData ? (
          <TasksScreen user={user} userData={userData as UserData} />
        ) : activeTab === 'wallet' && userData ? (
          <WalletScreen userData={userData as UserData} />
        ) : activeTab === 'catalog' && userData ? (
          <div className="p-6 pb-32">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Product Catalog</h2>
              <div className="flex gap-2">
                <button className="p-2 bg-[#1A1A1A] rounded-xl border border-gray-800"><Search size={20} /></button>
                <button className="p-2 bg-[#1A1A1A] rounded-xl border border-gray-800"><Filter size={20} /></button>
              </div>
            </div>

            {/* AI Recommended Section */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-[#E8B84B]" size={20} />
                <h3 className="text-lg font-bold">AI Recommended for You</h3>
              </div>

              {isAiLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="min-w-[200px] h-32 bg-[#1A1A1A] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : Array.isArray(aiRecommendations) ? (
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {aiRecommendations.map((cat: string, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="min-w-[240px] bg-gradient-to-br from-[#E8B84B]/20 to-[#1A1A1A] p-5 rounded-3xl border border-[#E8B84B]/20"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-[#E8B84B] bg-[#E8B84B]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Trending
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-lg mb-1">{cat}</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">AI Recommended Category</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#1A1A1A] rounded-3xl border border-dashed border-gray-800 text-center">
                  <p className="text-gray-500 text-sm italic">AI is analyzing trends for you...</p>
                </div>
              )}
            </section>

            {/* Regular Categories */}
            <div className="grid grid-cols-2 gap-4">
              {['Electronics', 'Fashion', 'Home Decor', 'Beauty', 'Gadgets', 'Accessories'].map((cat, idx) => (
                <div key={idx} className="bg-[#1A1A1A] p-6 rounded-3xl border border-gray-800 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
                  <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="text-gray-400" />
                  </div>
                  <span className="font-bold text-sm">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'profile' && userData ? (
          <ProfileScreen
            userData={userData}
            teamSize={teamSize}
            onLogout={() => signOut(auth)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh] text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#E8B84B]" />
            <p className="text-sm font-medium uppercase tracking-widest">{activeTab} screen coming soon</p>
          </div>
        )}

        {/* Admin Announcements Slider */}
        <div className="fixed bottom-24 md:bottom-0 left-0 md:left-64 w-full md:w-[calc(100%-16rem)] bg-[#E8B84B]/5 border-y border-[#E8B84B]/10 py-3 overflow-hidden z-20">
          <AnnouncementSlider announcements={announcements} />
        </div>

        {/* Bottom Nav - Mobile only */}
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-gray-800 px-4 py-4 flex justify-between items-center z-40 overflow-x-auto no-scrollbar gap-4">
          <NavButton active={activeTab === 'home'} icon={<Home />} label="Home" onClick={() => setActiveTab('home')} direction="vertical" />
          {userData?.role === 'Reseller' && (
            <NavButton active={activeTab === 'catalog'} icon={<ShoppingBag />} label="Catalog" onClick={() => setActiveTab('catalog')} direction="vertical" />
          )}
          {(userData?.role === 'Lead Marketer' || userData?.role === 'Manager') && (
            <NavButton active={activeTab === 'chat'} icon={<Users />} label="Team" onClick={() => setActiveTab('chat')} direction="vertical" />
          )}
          <NavButton active={activeTab === 'tasks'} icon={<ListTodo />} label="Tasks" onClick={() => setActiveTab('tasks')} direction="vertical" />
          <NavButton active={activeTab === 'leaderboard'} icon={<Trophy />} label="Ranks" onClick={() => setActiveTab('leaderboard')} direction="vertical" />
          <NavButton active={activeTab === 'wallet'} icon={<Wallet />} label="Wallet" onClick={() => setActiveTab('wallet')} direction="vertical" />
          <NavButton active={activeTab === 'profile'} icon={<UserCircle />} label="Profile" onClick={() => setActiveTab('profile')} direction="vertical" />
        </div>

        {/* Mystery Task Popup */}
        <AnimatePresence>
          {mysteryTask && (
            <MysteryTaskPopup
              task={mysteryTask}
              onAccept={handleAcceptMysteryTask}
              onClose={() => setMysteryTask(null)}
            />
          )}
        </AnimatePresence>

        {/* Level Up Celebration */}
        <AnimatePresence>
          {showCelebration && (
            <LevelUpCelebration
              level={userData?.level || 'Bronze'}
              uid={user.uid}
              onClose={handleDismissCelebration}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function AnnouncementSlider({ announcements }: { announcements: Announcement[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (announcements.length === 0) return null;

  return (
    <div className="relative h-6 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={announcements[index]?.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 px-8 absolute"
        >
          <Bell size={14} className="text-[#E8B84B]" />
          <span className="text-sm font-medium text-gray-300 truncate max-w-[80vw]">
            {announcements[index]?.text}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1A1A1A] rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-4 bg-[#1A1A1A] rounded animate-pulse" />
            <div className="w-20 h-3 bg-[#1A1A1A] rounded animate-pulse" />
          </div>
        </div>
        <div className="w-16 h-6 bg-[#1A1A1A] rounded animate-pulse" />
      </div>
      <div className="w-full h-40 bg-[#1A1A1A] rounded-3xl animate-pulse" />
      <div className="w-full h-20 bg-[#1A1A1A] rounded-3xl animate-pulse" />
      <div className="space-y-4">
        <div className="w-full h-32 bg-[#1A1A1A] rounded-2xl animate-pulse" />
        <div className="w-full h-32 bg-[#1A1A1A] rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
