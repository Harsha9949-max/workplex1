import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { 
  createTask, 
  approveSubmission, 
  rejectSubmission, 
  approveWithdrawal, 
  rejectWithdrawal, 
  createSubAdmin, 
  sendAnnouncement, 
  manualCredit, 
  updateUserStatus, 
  updateUserRole,
  activateCoupon
} from './functions';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Ticket, 
  Banknote, 
  Megaphone, 
  ShieldAlert, 
  Settings, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Ban, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Send, 
  Trash2, 
  Calendar, 
  Info, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  LogOut,
  CheckCircle,
  X,
  Menu,
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';

// --- Types ---
// (Re-defining here for clarity, though they should be shared)
interface UserData {
  uid: string;
  name: string;
  phone: string;
  photoURL: string;
  venture: string;
  role: string;
  level: string;
  totalEarned: number;
  joinedAt: any;
  status: 'active' | 'suspended';
  lastActiveAt: any;
  wallets: {
    earned: number;
    pending: number;
  };
}

interface AdminStats {
  totalWorkers: number;
  activeToday: number;
  pendingWithdrawals: number;
  totalPendingAmount: number;
  totalPaidMonth: number;
  fraudAlerts: number;
}

interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any;
  processedAt?: any;
  rejectionReason?: string;
}

export default function AdminPanel({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subAdminData, setSubAdminData] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalWorkers: 0,
    activeToday: 0,
    pendingWithdrawals: 0,
    totalPendingAmount: 0,
    totalPaidMonth: 0,
    fraudAlerts: 0
  });

  useEffect(() => {
    const fetchSubAdmin = async () => {
      if (!user.email) return;
      const docRef = doc(db, 'subAdmins', user.email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSubAdminData(docSnap.data());
      }
    };
    if (user.email !== 'marateyh@gmail.com') {
      fetchSubAdmin();
    }
  }, [user.uid, user.email]);

  useEffect(() => {
    // Real-time stats
    let usersQuery = query(collection(db, 'users'));
    if (subAdminData?.venture) {
      usersQuery = query(collection(db, 'users'), where('venture', '==', subAdminData.venture));
    }

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const docs = snapshot.docs;
      const total = docs.length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const active = docs.filter(d => {
        const lastActive = d.data().lastActiveAt?.toDate();
        return lastActive && lastActive >= today;
      }).length;
      setStats(prev => ({ ...prev, totalWorkers: total, activeToday: active }));
    });

    const unsubWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), where('status', '==', 'pending')), (snapshot) => {
      let docs = snapshot.docs;
      // If subAdmin, we still need to filter by venture if withdrawals don't have it
      // For now, keeping it simple but server-side where possible
      const count = docs.length;
      const total = docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
      setStats(prev => ({ ...prev, pendingWithdrawals: count, totalPendingAmount: total }));
    });

    const unsubFraud = onSnapshot(query(collection(db, 'fraudAlerts'), where('status', '==', 'active')), (snapshot) => {
      setStats(prev => ({ ...prev, fraudAlerts: snapshot.size }));
    });

    return () => {
      unsubUsers();
      unsubWithdrawals();
      unsubFraud();
    };
  }, [subAdminData]);

  const isMaster = user.email === 'marateyh@gmail.com';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'workers', label: 'Workers', icon: <Users size={20} /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={20} /> },
    { id: 'coupons', label: 'Coupons', icon: <Ticket size={20} /> },
    { id: 'withdrawals', label: 'Withdrawals', icon: <Banknote size={20} />, badge: stats.pendingWithdrawals },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-[#111111] border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50">
        <h1 className="text-xl font-black text-[#E8B84B]">WORKPLEX</h1>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-400"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-0 z-40 md:relative md:inset-auto
        w-full md:w-64 bg-[#111111] border-r border-gray-800 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-black text-[#E8B84B]">WORKPLEX</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Admin Console</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 md:mt-0">
          {navItems.map(item => (
            <SidebarItem 
              key={item.id}
              icon={item.icon} 
              label={item.label} 
              active={activeTab === item.id} 
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }} 
              badge={item.badge}
            />
          ))}
          {isMaster && <SidebarItem icon={<ShieldAlert size={20} />} label="Fraud Alerts" active={activeTab === 'fraud'} onClick={() => { setActiveTab('fraud'); setIsSidebarOpen(false); }} badge={stats.fraudAlerts} badgeColor="bg-red-500" />}
          {isMaster && <SidebarItem icon={<Settings size={20} />} label="Sub-Admins" active={activeTab === 'subadmins'} onClick={() => { setActiveTab('subadmins'); setIsSidebarOpen(false); }} />}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-bold">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-gray-800 hidden md:flex items-center justify-between px-8 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold">{user.email}</p>
              <p className="text-[10px] text-[#E8B84B] font-black uppercase">{isMaster ? 'Master Admin' : `Sub-Admin (${subAdminData?.venture})`}</p>
            </div>
            <div className="w-10 h-10 bg-[#E8B84B] rounded-full flex items-center justify-center text-black font-black">
              {isMaster ? 'M' : 'S'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView stats={stats} setActiveTab={setActiveTab} />}
            {activeTab === 'workers' && <WorkersView subAdminData={subAdminData} />}
            {activeTab === 'tasks' && <TasksView subAdminData={subAdminData} />}
            {activeTab === 'coupons' && <CouponsView subAdminData={subAdminData} />}
            {activeTab === 'withdrawals' && <WithdrawalsView subAdminData={subAdminData} />}
            {activeTab === 'announcements' && <AnnouncementsView />}
            {activeTab === 'fraud' && isMaster && <FraudView />}
            {activeTab === 'subadmins' && isMaster && <SubAdminsView />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, badge, badgeColor = 'bg-[#E8B84B]' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${active ? 'bg-[#E8B84B] text-black' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold">{label}</span>
      </div>
      {badge > 0 && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-black text-white' : `${badgeColor} text-white`}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// --- Sub-Views ---

function DashboardView({ stats, setActiveTab }: any) {
  const chartData = [
    { name: 'Mon', earnings: 4000 },
    { name: 'Tue', earnings: 3000 },
    { name: 'Wed', earnings: 5000 },
    { name: 'Thu', earnings: 2780 },
    { name: 'Fri', earnings: 1890 },
    { name: 'Sat', earnings: 2390 },
    { name: 'Sun', earnings: 3490 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Workers" value={stats.totalWorkers} icon={<Users className="text-blue-500" />} />
        <StatCard title="Active Today" value={stats.activeToday} icon={<TrendingUp className="text-green-500" />} />
        <StatCard title="Pending Payouts" value={`₹${stats.totalPendingAmount.toLocaleString()}`} subValue={`${stats.pendingWithdrawals} requests`} icon={<Banknote className="text-[#E8B84B]" />} />
        <StatCard title="Fraud Alerts" value={stats.fraudAlerts} icon={<ShieldAlert className="text-red-500" />} color="border-red-500/20" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#111111] p-6 rounded-3xl border border-gray-800">
          <h3 className="text-lg font-bold mb-6">Earnings Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8B84B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E8B84B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#555" fontSize={12} />
                <YAxis stroke="#555" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ color: '#E8B84B' }}
                />
                <Area type="monotone" dataKey="earnings" stroke="#E8B84B" fillOpacity={1} fill="url(#colorEarnings)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 space-y-4">
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <QuickActionButton label="Approve Withdrawals" icon={<Banknote size={20} />} onClick={() => setActiveTab('withdrawals')} />
          <QuickActionButton label="Create New Task" icon={<Plus size={20} />} onClick={() => setActiveTab('tasks')} />
          <QuickActionButton label="Send Announcement" icon={<Megaphone size={20} />} onClick={() => setActiveTab('announcements')} />
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, subValue, icon, color = 'border-gray-800' }: any) {
  return (
    <div className={`bg-[#111111] p-6 rounded-3xl border ${color} space-y-2`}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title}</p>
        <div className="p-2 bg-white/5 rounded-xl">{icon}</div>
      </div>
      <h4 className="text-3xl font-black">{value}</h4>
      {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
    </div>
  );
}

function QuickActionButton({ label, icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-[#1A1A1A] hover:bg-[#222] border border-gray-800 rounded-2xl transition-all group"
    >
      <div className="p-2 bg-[#E8B84B]/10 text-[#E8B84B] rounded-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="font-bold">{label}</span>
    </button>
  );
}

function WorkersView({ subAdminData }: { subAdminData?: any }) {
  const [workers, setWorkers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [filterVenture, setFilterVenture] = useState(subAdminData?.venture || 'all');
  const [selectedWorker, setSelectedWorker] = useState<UserData | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'users'));
    if (subAdminData?.venture) {
      q = query(collection(db, 'users'), where('venture', '==', subAdminData.venture));
    }
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserData));
      setWorkers(data);
    });
    return unsub;
  }, [subAdminData]);

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || w.phone.includes(search);
    const matchesVenture = filterVenture === 'all' || w.venture === filterVenture;
    return matchesSearch && matchesVenture;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Search workers by name or phone..."
            className="w-full bg-[#111111] border border-gray-800 rounded-2xl py-4 pl-12 pr-4 focus:border-[#E8B84B] outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-[#111111] border border-gray-800 rounded-2xl px-6 outline-none focus:border-[#E8B84B]"
          value={filterVenture}
          onChange={(e) => setFilterVenture(e.target.value)}
        >
          <option value="all">All Ventures</option>
          <option value="BuyRix">BuyRix</option>
          <option value="Vyuma">Vyuma</option>
          <option value="TrendyVerse">TrendyVerse</option>
          <option value="Growplex">Growplex</option>
        </select>
      </div>

      <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-white/5">
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Worker</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Venture/Role</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Level</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Earned</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredWorkers.map(w => (
              <tr key={w.uid} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedWorker(w)}>
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <img src={w.photoURL || 'https://picsum.photos/seed/user/100'} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold">{w.name}</p>
                      <p className="text-xs text-gray-500">{w.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <p className="font-bold">{w.venture}</p>
                  <p className="text-xs text-gray-500">{w.role}</p>
                </td>
                <td className="p-6">
                  <span className="px-3 py-1 bg-[#E8B84B]/10 text-[#E8B84B] text-[10px] font-black rounded-full uppercase">
                    {w.level}
                  </span>
                </td>
                <td className="p-6 font-bold text-[#00C9A7]">₹{w.totalEarned?.toLocaleString() || 0}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${w.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {w.status || 'active'}
                  </span>
                </td>
                <td className="p-6">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <MoreVertical size={20} className="text-gray-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Worker Details Drawer */}
      <AnimatePresence>
        {selectedWorker && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWorker(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-[500px] bg-[#111111] border-l border-gray-800 z-[101] shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold">Worker Profile</h3>
                <button onClick={() => setSelectedWorker(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col items-center text-center mb-8">
                <img src={selectedWorker.photoURL || 'https://picsum.photos/seed/user/200'} className="w-24 h-24 rounded-3xl object-cover border-2 border-[#E8B84B] mb-4" alt="" referrerPolicy="no-referrer" />
                <h4 className="text-2xl font-bold">{selectedWorker.name}</h4>
                <p className="text-gray-500">{selectedWorker.phone}</p>
                <div className="flex gap-2 mt-4">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold">{selectedWorker.venture}</span>
                  <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold">{selectedWorker.role}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-black p-4 rounded-2xl border border-gray-800">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Earned Wallet</p>
                  <p className="text-xl font-bold text-[#E8B84B]">₹{selectedWorker.wallets?.earned?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-black p-4 rounded-2xl border border-gray-800">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Pending Wallet</p>
                  <p className="text-xl font-bold text-[#00C9A7]">₹{selectedWorker.wallets?.pending?.toLocaleString() || 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Admin Actions</h5>
                <div className="grid grid-cols-2 gap-3">
                  <ActionButton 
                    label={selectedWorker.status === 'suspended' ? 'Activate' : 'Suspend'} 
                    icon={selectedWorker.status === 'suspended' ? <CheckCircle size={18} /> : <Ban size={18} />} 
                    color={selectedWorker.status === 'suspended' ? 'bg-green-500' : 'bg-red-500'}
                    onClick={async () => {
                      await updateUserStatus(selectedWorker.uid, selectedWorker.status === 'suspended' ? 'active' : 'suspended');
                      setSelectedWorker(prev => prev ? ({ ...prev, status: selectedWorker.status === 'suspended' ? 'active' : 'suspended' }) : null);
                    }}
                  />
                  <ActionButton 
                    label="Upgrade Role" 
                    icon={<ArrowUpCircle size={18} />} 
                    color="bg-blue-500"
                    onClick={() => {
                      const roles = ['Marketer', 'Lead Marketer', 'Manager', 'Sub-Admin', 'Admin'];
                      const currentIndex = roles.indexOf(selectedWorker.role);
                      if (currentIndex < roles.length - 1) {
                        updateUserRole(selectedWorker.uid, roles[currentIndex + 1]);
                        setSelectedWorker(prev => prev ? ({ ...prev, role: roles[currentIndex + 1] }) : null);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-12">
                <h5 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Transaction History</h5>
                <TransactionList userId={selectedWorker.uid} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionButton({ label, icon, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white ${color} hover:opacity-90 transition-opacity`}
    >
      {icon}
      {label}
    </button>
  );
}

function TransactionList({ userId }: { userId: string }) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      setTxs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  if (loading) return <Loader2 className="animate-spin text-gray-600 mx-auto" />;
  if (txs.length === 0) return <p className="text-center text-gray-600 text-sm py-8">No transactions found.</p>;

  return (
    <div className="space-y-3">
      {txs.map(tx => (
        <div key={tx.id} className="flex justify-between items-center p-4 bg-black rounded-xl border border-gray-800">
          <div>
            <p className="text-sm font-bold">{tx.description}</p>
            <p className="text-[10px] text-gray-500">{tx.createdAt?.toDate().toLocaleString()}</p>
          </div>
          <p className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {tx.amount > 0 ? '+' : ''}₹{tx.amount}
          </p>
        </div>
      ))}
    </div>
  );
}

function TasksView({ subAdminData }: { subAdminData?: any }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'taskSubmissions'), orderBy('submittedAt', 'desc')), (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      if (subAdminData) {
        data = data.filter((s: any) => s.venture === subAdminData.venture);
      }
      setSubmissions(data);
    });
    return unsub;
  }, [subAdminData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Task Submissions</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#E8B84B] text-black font-black px-6 py-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus size={20} /> Create Task
        </button>
      </div>

      <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-white/5">
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Worker</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Task</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Submitted At</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Proof</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {submissions.map(s => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="p-6 font-bold">{s.userName}</td>
                <td className="p-6">
                  <p className="font-bold">{s.taskTitle}</p>
                  <p className="text-xs text-gray-500">ID: {s.taskId}</p>
                </td>
                <td className="p-6 text-sm text-gray-400">{s.submittedAt?.toDate().toLocaleString()}</td>
                <td className="p-6">
                  <a href={s.proofLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                    View Proof <ExternalLink size={14} />
                  </a>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    s.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                    s.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                    'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-6">
                  {s.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => approveSubmission(s.id)}
                        className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500 transition-colors hover:text-white"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason) rejectSubmission(s.id, reason);
                        }}
                        className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 transition-colors hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && <CreateTaskModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

function CreateTaskModal({ onClose }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    earning: 0,
    venture: 'BuyRix',
    role: 'Marketer',
    deadline: '',
    proofType: 'image',
    assignedTo: 'all'
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await createTask(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#111111] border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold">Create New Task</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Task Title</label>
            <input 
              type="text" required
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
            <textarea 
              required
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none h-24"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Earning (₹)</label>
            <input 
              type="number" required
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={formData.earning}
              onChange={e => setFormData({...formData, earning: Number(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Deadline</label>
            <input 
              type="datetime-local" required
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Venture</label>
            <select 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={formData.venture}
              onChange={e => setFormData({...formData, venture: e.target.value})}
            >
              {['BuyRix', 'Vyuma', 'TrendyVerse', 'Growplex'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Proof Type</label>
            <select 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={formData.proofType}
              onChange={e => setFormData({...formData, proofType: e.target.value})}
            >
              <option value="image">Image Upload</option>
              <option value="link">Link/URL</option>
              <option value="text">Text Proof</option>
            </select>
          </div>
          <div className="col-span-2 pt-4">
            <button type="submit" className="w-full bg-[#E8B84B] text-black font-black py-4 rounded-2xl hover:scale-[1.02] transition-transform">
              Publish Task
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CouponsView({ subAdminData }: { subAdminData?: any }) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      setCoupons(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubWorkers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      if (subAdminData) {
        data = data.filter((w: any) => w.venture === subAdminData.venture);
      }
      setWorkers(data);
    });
    return () => { unsubCoupons(); unsubWorkers(); };
  }, [subAdminData]);

  return (
    <div className="space-y-6">
      <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-white/5">
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Worker</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Coupon Code</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Usages</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Total Commission</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {workers.map(w => {
              const c = coupons.find(cp => cp.ownerId === w.id);
              return (
                <tr key={w.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-bold">{w.name}</td>
                  <td className="p-6 font-mono text-[#E8B84B]">{c?.code || 'N/A'}</td>
                  <td className="p-6 font-bold">{c?.usageCount || 0}</td>
                  <td className="p-6 font-bold text-[#00C9A7]">₹{c?.totalEarned?.toLocaleString() || 0}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c?.isActive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                      {c?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => activateCoupon(w.id)}
                        className={`p-2 rounded-lg transition-colors ${c?.isActive ? 'bg-gray-500/20 text-gray-500' : 'bg-[#E8B84B]/20 text-[#E8B84B] hover:bg-[#E8B84B] hover:text-black'}`}
                        disabled={c?.isActive}
                      >
                        <Zap size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const amount = prompt('Enter credit amount:');
                          if (amount) manualCredit(w.id, Number(amount), 'Manual Admin Credit');
                        }}
                        className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        <Banknote size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WithdrawalsView({ subAdminData }: { subAdminData?: any }) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const dailyLimit = 50000;
  const [dailyTotal, setDailyTotal] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'withdrawals'), orderBy('requestedAt', 'desc')), (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal));
      // Note: Withdrawals might need venture info to filter for sub-admins
      // For now, we'll assume they see all if venture info is missing on withdrawal doc
      setWithdrawals(data);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const total = data
        .filter(w => w.status === 'approved' && w.processedAt?.toDate() >= today)
        .reduce((acc, w) => acc + w.amount, 0);
      setDailyTotal(total);
    });
    return unsub;
  }, []);

  const canApprove = (amount: number) => {
    if (!subAdminData) return true; // Master admin
    return amount <= 500;
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Daily Payout Tracker</p>
            <h4 className="text-2xl font-black">₹{dailyTotal.toLocaleString()} <span className="text-gray-600 text-sm font-bold">/ ₹{dailyLimit.toLocaleString()}</span></h4>
          </div>
          {dailyTotal >= 45000 && (
            <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl border border-red-500/20 flex items-center gap-2 text-sm font-bold animate-pulse">
              <AlertCircle size={18} /> Approaching Daily Limit!
            </div>
          )}
        </div>
        <div className="h-2 bg-black rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(dailyTotal / dailyLimit) * 100}%` }}
            className={`h-full transition-all ${dailyTotal > 45000 ? 'bg-red-500' : 'bg-[#E8B84B]'}`}
          />
        </div>
      </div>

      <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-white/5">
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Worker</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Amount</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">UPI ID</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Requested At</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {withdrawals.map(w => (
              <tr key={w.id} className="hover:bg-white/5 transition-colors">
                <td className="p-6 font-bold">{w.userName}</td>
                <td className="p-6 font-black text-[#E8B84B]">₹{w.amount.toLocaleString()}</td>
                <td className="p-6 font-mono text-xs text-gray-400">{w.upiId}</td>
                <td className="p-6 text-sm text-gray-500">{w.requestedAt?.toDate().toLocaleString()}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    w.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                    w.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                    'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {w.status}
                  </span>
                </td>
                <td className="p-6">
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (canApprove(w.amount)) {
                            approveWithdrawal(w.id);
                          } else {
                            alert('Sub-admins can only approve withdrawals up to ₹500.');
                          }
                        }}
                        className={`p-2 rounded-lg transition-colors ${canApprove(w.amount) ? 'bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason) rejectWithdrawal(w.id, reason);
                        }}
                        className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<'all' | 'venture' | 'role'>('all');
  const [target, setTarget] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snapshot) => {
      setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!text) return;
    await sendAnnouncement({ text, audience, target });
    setText('');
    setTarget('');
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-1 space-y-6">
        <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 space-y-6">
          <h3 className="text-lg font-bold">New Announcement</h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Message</label>
            <textarea 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none h-32"
              placeholder="Type your announcement here..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Audience</label>
            <select 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={audience}
              onChange={e => setAudience(e.target.value as any)}
            >
              <option value="all">All Workers</option>
              <option value="venture">By Venture</option>
              <option value="role">By Role</option>
            </select>
          </div>
          {audience !== 'all' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Target {audience}</label>
              <input 
                type="text"
                className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
                placeholder={`Enter ${audience} name...`}
                value={target}
                onChange={e => setTarget(e.target.value)}
              />
            </div>
          )}
          <button 
            onClick={handleSend}
            className="w-full bg-[#E8B84B] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Send size={20} /> Broadcast Now
          </button>
        </div>
      </div>

      <div className="col-span-2 space-y-4">
        <h3 className="text-lg font-bold">Recent Broadcasts</h3>
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-[#111111] p-6 rounded-3xl border border-gray-800">
              <div className="flex justify-between items-start mb-2">
                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase text-gray-400">
                  Target: {a.audience} {a.target ? `(${a.target})` : ''}
                </span>
                <span className="text-[10px] text-gray-500 font-bold">{a.createdAt?.toDate().toLocaleString()}</span>
              </div>
              <p className="text-gray-300">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FraudView() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'fraudAlerts'), orderBy('flaggedAt', 'desc')), (snapshot) => {
      setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-white/5">
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Worker</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Reason</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Flagged At</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {alerts.map(a => (
              <tr key={a.id} className="hover:bg-white/5 transition-colors">
                <td className="p-6 font-bold">{a.userName}</td>
                <td className="p-6 text-red-400 font-bold">{a.reason}</td>
                <td className="p-6 text-sm text-gray-500">{a.flaggedAt?.toDate().toLocaleString()}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    a.status === 'active' ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-6">
                  {a.status === 'active' && (
                    <div className="flex gap-2">
                      <button className="p-2 bg-gray-500/20 text-gray-500 rounded-lg hover:bg-gray-500 hover:text-white transition-colors">
                        <CheckCircle size={18} />
                      </button>
                      <button className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                        <Ban size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubAdminsView() {
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [venture, setVenture] = useState('BuyRix');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'subAdmins'), (snapshot) => {
      setSubAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!email) return;
    await createSubAdmin(email, venture);
    setEmail('');
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-1">
        <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 space-y-6">
          <h3 className="text-lg font-bold">Add Sub-Admin</h3>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
            <input 
              type="email"
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Assigned Venture</label>
            <select 
              className="w-full bg-black border border-gray-800 rounded-xl p-4 focus:border-[#E8B84B] outline-none"
              value={venture}
              onChange={e => setVenture(e.target.value)}
            >
              {['BuyRix', 'Vyuma', 'TrendyVerse', 'Growplex'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <button 
            onClick={handleCreate}
            className="w-full bg-[#E8B84B] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Plus size={20} /> Create Sub-Admin
          </button>
        </div>
      </div>

      <div className="col-span-2">
        <div className="bg-[#111111] rounded-3xl border border-gray-800 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-white/5">
                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Email</th>
                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Venture</th>
                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Created At</th>
                <th className="p-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {subAdmins.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-6 font-bold">{s.email}</td>
                  <td className="p-6 font-bold text-[#E8B84B]">{s.venture}</td>
                  <td className="p-6 text-sm text-gray-500">{s.createdAt?.toDate().toLocaleString()}</td>
                  <td className="p-6">
                    <button className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
