/**
 * WorkPlex — Main App with Complete Routing & Auth State Management
 * All Phases 1-10 integrated: Auth, Onboarding, Dashboard, Tasks, Wallet, Profile, 
 * Partner Setup, Admin Panel, Gamification, Partner Shop, Viral Layer
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ShieldCheck, Home, ListTodo, Wallet, UserCircle, ShoppingBag, Trophy } from 'lucide-react';

import { auth, db } from './firebase';
import { UserProfile, isAdminEmail } from './types';
import { getDeviceFingerprint } from './lib/security';

// Components
import PhoneAuth from './components/PhoneAuth';
import OnboardingFlow from './components/OnboardingFlow';
import HomeDashboard from './components/HomeDashboard';
import TasksScreen from './components/TasksScreen';
import WalletScreen from './components/WalletScreen';
import ProfileScreen from './components/ProfileScreen';
import PartnerShopSetup from './components/PartnerShopSetup';
import PartnerShopPublic from './components/PartnerShop';
import AdminPanel from './AdminPanel';
import GamificationEngine from './components/Gamification';
import { PublicProfile, TeamChat } from './ViralLayer';

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-6">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="bg-[#E8B84B] text-black font-bold px-8 py-3 rounded-xl">Refresh App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main App Component
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (isAdminEmail(firebaseUser.email || '')) {
          setUser(firebaseUser);
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(firebaseUser);
          setUserData(userDoc.data() as UserProfile);
          await setDoc(doc(db, 'users', firebaseUser.uid), { lastActiveAt: serverTimestamp() }, { merge: true });
        } else {
          setUser(firebaseUser);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleOnboardingComplete = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      setLoading(true);
      const username = `${data.name?.split(' ')[0].toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
      const finalProfile: UserProfile = {
        ...data,
        uid: user.uid,
        phone: user.phoneNumber || data.phone || '',
        username,
        deviceFingerprint: getDeviceFingerprint(),
        joinedAt: serverTimestamp() as any,
        lastActiveAt: serverTimestamp() as any,
        kycDone: true,
        contractSigned: true,
        firstTaskDone: false,
        onboardingStatus: 'completed',
        onboardingStep: 8,
        level: 'Bronze',
        streak: 0,
        wallets: { earned: 0, pending: 27, bonus: 0, savings: 0 },
        savingsPercent: 10,
        badges: []
      } as UserProfile;

      await setDoc(doc(db, 'users', user.uid), finalProfile);
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid, type: 'signup_bonus', amount: 27, status: 'pending',
        description: 'Welcome bonus', createdAt: serverTimestamp()
      });
      setUserData(finalProfile);
      setLoading(false);
    } catch (err) {
      console.error('Onboarding error:', err);
      setLoading(false);
    }
  };

  const handlePartnerSetupComplete = async () => {
    if (!user || !userData) return;
    const updatedData = { ...userData, shopPublished: true, onboardingStatus: 'completed' };
    setUserData(updatedData as UserProfile);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setActiveTab('home');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full" />
      </div>
    );
  }

  if (user && isAdminEmail(user.email || '')) {
    return <AdminPanel user={user} />;
  }

  if (!user) {
    return <PhoneAuth />;
  }

  if (!userData || userData.onboardingStatus !== 'completed') {
    return <OnboardingFlow user={user} onComplete={handleOnboardingComplete} />;
  }

  if (userData.mode === 'Partner' && !userData.shopPublished) {
    return <PartnerShopSetup user={user} userData={userData} onComplete={handlePartnerSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && <HomeDashboard key="home" user={user} userData={userData} />}
        {activeTab === 'tasks' && userData.mode === 'Promoter' && <TasksScreen key="tasks" user={user} userData={userData} onBack={() => setActiveTab('home')} />}
        {activeTab === 'wallet' && <WalletScreen key="wallet" user={user} userData={userData} />}
        {activeTab === 'profile' && <ProfileScreen key="profile" user={user} userData={userData} onLogout={handleLogout} />}
        {activeTab === 'gamification' && <GamificationEngine key="gamification" user={user} userData={userData} />}
        {activeTab === 'shop' && userData.mode === 'Partner' && (
          <div key="shop" className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-gray-600" />
            <p className="text-gray-500 ml-4">Shop management coming soon</p>
          </div>
        )}
      </AnimatePresence>

      {activeTab !== 'tasks' && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-gray-800 px-4 py-3 flex items-center justify-around z-40">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#E8B84B]' : 'text-gray-500'}`}>
            <Home className="w-5 h-5" /><span className="text-[10px] font-bold">Home</span>
          </button>
          {userData.mode === 'Promoter' && (
            <button onClick={() => setActiveTab('tasks')} className={`flex flex-col items-center gap-1 ${activeTab === 'tasks' ? 'text-[#E8B84B]' : 'text-gray-500'}`}>
              <ListTodo className="w-5 h-5" /><span className="text-[10px] font-bold">Tasks</span>
            </button>
          )}
          {userData.mode === 'Partner' && (
            <button onClick={() => setActiveTab('shop')} className={`flex flex-col items-center gap-1 ${activeTab === 'shop' ? 'text-[#E8B84B]' : 'text-gray-500'}`}>
              <ShoppingBag className="w-5 h-5" /><span className="text-[10px] font-bold">Shop</span>
            </button>
          )}
          <button onClick={() => setActiveTab('gamification')} className={`flex flex-col items-center gap-1 ${activeTab === 'gamification' ? 'text-[#E8B84B]' : 'text-gray-500'}`}>
            <Trophy className="w-5 h-5" /><span className="text-[10px] font-bold">Ranks</span>
          </button>
          <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 ${activeTab === 'wallet' ? 'text-[#E8B84B]' : 'text-gray-500'}`}>
            <Wallet className="w-5 h-5" /><span className="text-[10px] font-bold">Wallet</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-[#E8B84B]' : 'text-gray-500'}`}>
            <UserCircle className="w-5 h-5" /><span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/shop/:shopSlug" element={<PartnerShopPublic />} />
          <Route path="/:username" element={<PublicProfile />} />
          <Route path="/admin" element={<AdminPanel user={null as any} />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
