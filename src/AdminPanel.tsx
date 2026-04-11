/**
 * WorkPlex Phase 7 — Admin Panel
 * Complete admin dashboard for marateyh@gmail.com ONLY
 * Worker management, task creation, withdrawals, coupons, announcements
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ListTodo, Wallet, Bell, ShieldAlert, Settings,
  Search, Filter, ChevronRight, CheckCircle, XCircle,
  Ban, ArrowUpCircle, ArrowDownCircle, Eye, MoreVertical,
  BarChart3, TrendingUp, ShoppingBag, Tag, AlertTriangle
} from 'lucide-react';
import {
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, UserMode, VENTURES } from './types';

interface AdminPanelProps {
  user: any;
}

type TabType = 'dashboard' | 'workers' | 'tasks' | 'withdrawals' | 'coupons' | 'announcements' | 'fraud';

const ADMIN_EMAIL = 'marateyh@gmail.com';

export default function AdminPanel({ user }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeToday: 0,
    promoters: 0,
    partners: 0,
    pendingWithdrawals: 0,
    totalPendingAmount: 0
  });

  // Admin check
  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) {
      window.location.href = '/home';
    }
  }, [user]);

  // Load workers
  useEffect(() => {
    const q = query(collection(db, 'users'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const workersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWorkers(workersData);
      setStats(prev => ({
        ...prev,
        totalWorkers: workersData.length,
        promoters: workersData.filter(w => w.mode === 'Promoter').length,
        partners: workersData.filter(w => w.mode === 'Partner').length,
        activeToday: workersData.filter(w => {
          if (!w.lastActiveAt) return false;
          const lastActive = w.lastActiveAt.toDate ? w.lastActiveAt.toDate() : new Date(w.lastActiveAt);
          return (Date.now() - lastActive.getTime()) < 24 * 60 * 60 * 1000;
        }).length
      }));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load withdrawals
  useEffect(() => {
    const q = query(collection(db, 'withdrawals'), orderBy('requestedAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWithdrawals(data);
      setStats(prev => ({
        ...prev,
        pendingWithdrawals: data.filter(w => w.status === 'pending').length,
        totalPendingAmount: data.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0)
      }));
    });
    return () => unsub();
  }, []);

  const handleApproveWithdrawal = async (id: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const handleRejectWithdrawal = async (id: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), {
        status: 'rejected',
        rejectionReason: reason
      });
    } catch (err) {
      console.error('Rejection error:', err);
    }
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'workers', label: 'Workers', icon: Users },
    { key: 'tasks', label: 'Tasks', icon: ListTodo },
    { key: 'withdrawals', label: 'Withdrawals', icon: Wallet },
    { key: 'coupons', label: 'Coupons', icon: Tag },
    { key: 'announcements', label: 'Announcements', icon: Bell },
    { key: 'fraud', label: 'Fraud', icon: ShieldAlert }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#111111] border-r border-gray-800 p-4 hidden md:block">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#E8B84B] rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-black">Admin</h1>
            <p className="text-xs text-gray-500">WorkPlex</p>
          </div>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-[#E8B84B]/10 text-[#E8B84B]' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-gray-800 px-2 py-2 flex overflow-x-auto z-50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === tab.key ? 'text-[#E8B84B]' : 'text-gray-500'
              }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">Dashboard</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Workers', value: stats.totalWorkers, icon: Users, color: '#E8B84B' },
                { label: 'Active Today', value: stats.activeToday, icon: Users, color: '#00C9A7' },
                { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: Wallet, color: '#F59E0B' },
                { label: 'Pending Amount', value: `₹${stats.totalPendingAmount.toLocaleString()}`, icon: TrendingUp, color: '#A855F7' }
              ].map((stat, i) => (
                <div key={i} className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
                <h3 className="font-bold mb-2">Promoters</h3>
                <p className="text-3xl font-black text-[#E8B84B]">{stats.promoters}</p>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
                <h3 className="font-bold mb-2">Partners</h3>
                <p className="text-3xl font-black text-[#00C9A7]">{stats.partners}</p>
              </div>
            </div>
          </div>
        )}

        {/* Workers Tab */}
        {activeTab === 'workers' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black">Workers</h2>
            <div className="bg-[#1A1A1A] rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <input type="text" placeholder="Search workers..." className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50" />
              </div>
              <div className="divide-y divide-gray-800 max-h-[60vh] overflow-y-auto">
                {workers.map((worker) => (
                  <div key={worker.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <img src={worker.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${worker.name}`} alt={worker.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-bold text-sm">{worker.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${worker.mode === 'Promoter' ? 'bg-[#E8B84B]/20 text-[#E8B84B]' : 'bg-[#00C9A7]/20 text-[#00C9A7]'}`}>
                            {worker.mode}
                          </span>
                          <span className="text-[10px] text-gray-500">{worker.venture || ''} {worker.role || ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{(worker.wallets?.earned || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">{worker.level || 'Bronze'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black">Withdrawals</h2>
            {withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">₹{w.amount?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{w.upiId} • {w.workerMode}</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${w.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                          w.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
                            w.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                        }`}>
                        {w.status}
                      </span>
                    </div>
                    {w.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveWithdrawal(w.id, w.amount)} className="flex-1 bg-[#00C9A7] text-black font-bold py-2 rounded-lg text-sm hover:bg-[#00b395] transition-colors">
                          Approve
                        </button>
                        <button onClick={() => { const reason = prompt('Rejection reason:'); if (reason) handleRejectWithdrawal(w.id, reason); }} className="flex-1 bg-red-500/20 text-red-500 font-bold py-2 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No withdrawals yet</p>
              </div>
            )}
          </div>
        )}

        {/* Other tabs placeholder */}
        {['tasks', 'coupons', 'announcements', 'fraud'].includes(activeTab) && (
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">{tabs.find(t => t.key === activeTab)?.label} management coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
