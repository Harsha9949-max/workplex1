/**
 * WorkPlex — Enhanced Wallet Screen
 * Improved wallet cards, withdrawal flow, savings slider, transaction history
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ArrowUpCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Banknote,
  Sparkles,
  Send,
  ArrowDownLeft,
  Clock,
  Filter,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserData, OperationType, handleFirestoreError } from '../types';

interface WalletCardProps {
  label: string;
  amount: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  subtitle?: string;
  gradient: string;
}

function WalletCard({ label, amount, color, bgColor, borderColor, icon, subtitle, gradient }: WalletCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={`${bgColor} p-4 sm:p-5 rounded-2xl sm:rounded-3xl border ${borderColor} flex flex-col gap-3 relative overflow-hidden group cursor-pointer`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${color} bg-white/10 backdrop-blur-sm`}>
            {icon}
          </div>
          <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${color}/70`}>{label}</span>
        </div>
        <div>
          <p className={`text-xl sm:text-2xl font-black ${color}`}>₹{amount.toLocaleString()}</p>
          {subtitle && <p className="text-[9px] sm:text-[10px] text-white/50 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}

interface WalletScreenProps {
  userData: UserData;
}

export default function WalletScreen({ userData }: WalletScreenProps) {
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [savingsPercent, setSavingsPercent] = useState(userData?.savingsPercent || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeWithdrawTab, setActiveWithdrawTab] = useState<'normal' | 'family'>('normal');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Bonus conversion milestone - ₹200 threshold
  const bonusToEarnedProgress = Math.min(100, ((userData.wallets?.bonus || 0) / 200) * 100);
  const canConvertBonus = (userData.wallets?.bonus || 0) >= 200;

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );
    return () => unsub();
  }, []);

  const handleWithdraw = async (type: 'normal' | 'family_transfer') => {
    setError(null);
    if (!userData.kycDone) {
      setError('Complete KYC verification first to withdraw funds.');
      return;
    }
    const amt = parseFloat(amount);
    if (!amount || amt < 200) {
      setError('Minimum withdrawal amount is ₹200.');
      return;
    }
    if (type === 'family_transfer' && !upiId.trim()) {
      setError('Please enter the recipient UPI ID.');
      return;
    }
    if (amt > (userData.wallets?.earned || 0)) {
      setError('Insufficient earned balance.');
      return;
    }

    try {
      setLoading(true);
      const targetUpi = type === 'family_transfer' ? upiId.trim() : userData.upiId;

      await addDoc(collection(db, 'withdrawals'), {
        userId: auth.currentUser?.uid,
        userName: userData.name,
        amount: amt,
        type,
        upiId: targetUpi,
        status: 'pending',
        requestedAt: serverTimestamp(),
        description: type === 'family_transfer' ? `Family Transfer to ${targetUpi}` : 'Standard Withdrawal',
      });

      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        'wallets.earned': increment(-amt),
      });

      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser?.uid,
        amount: -amt,
        type: 'withdrawal',
        description: type === 'family_transfer' ? `Sent to ${targetUpi}` : 'Withdrawal requested',
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      setAmount('');
      setUpiId('');
      setTimeout(() => {
        setSuccess(false);
        setShowWithdrawForm(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertBonus = async () => {
    if (!canConvertBonus || !auth.currentUser) return;
    try {
      setLoading(true);
      const bonusAmt = userData.wallets?.bonus || 0;
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        'wallets.bonus': 0,
        'wallets.earned': increment(bonusAmt),
      });
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        amount: bonusAmt,
        type: 'bonus',
        description: 'Bonus converted to earned wallet',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavingsUpdate = async (pct: number) => {
    setSavingsPercent(pct);
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      savingsPercent: pct,
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'credit') return tx.amount > 0;
    if (transactionFilter === 'debit') return tx.amount < 0;
    return true;
  });

  const totalBalance = (userData.wallets?.earned || 0) +
    (userData.wallets?.pending || 0) +
    (userData.wallets?.bonus || 0) +
    (userData.wallets?.savings || 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 pb-36 max-w-3xl mx-auto">
      {/* Header with Total Balance */}
      <motion.div
        className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E8B84B]/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <Wallet className="text-[#E8B84B]" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">My Wallet</h2>
              <p className="text-gray-500 text-xs font-medium">
                {userData.kycDone ? 'KYC Verified' : 'KYC Pending'}
              </p>
            </div>
          </div>
          {!showWithdrawForm && userData.kycDone && (
            <button
              onClick={() => setShowWithdrawForm(true)}
              className="bg-[#E8B84B] text-black px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#F5D08A] transition-colors"
            >
              <ArrowUpCircle size={14} />
              Withdraw
            </button>
          )}
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Balance</p>
          <p className="text-3xl sm:text-4xl font-black text-white">₹{totalBalance.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* KYC Banner */}
      <AnimatePresence>
        {!userData.kycDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.97, height: 0 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-4"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="text-amber-400" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-300 text-sm">KYC Verification Pending</p>
              <p className="text-amber-400/70 text-xs mt-1">
                Submit your Aadhaar & PAN to unlock withdrawals and higher earning limits.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Wallet Cards */}
      <div className="grid grid-cols-2 gap-3">
        <WalletCard
          label="Earned"
          amount={userData.wallets?.earned || 0}
          color="text-[#00C9A7]"
          bgColor="bg-gradient-to-br from-[#00C9A7]/10 to-[#00C9A7]/5"
          borderColor="border-[#00C9A7]/20"
          icon={<TrendingUp size={20} className="text-[#00C9A7]" />}
          subtitle="Withdrawable"
          gradient="bg-gradient-to-br from-[#00C9A7]/20 to-transparent"
        />
        <WalletCard
          label="Pending"
          amount={userData.wallets?.pending || 0}
          color="text-[#E8B84B]"
          bgColor="bg-gradient-to-br from-[#E8B84B]/10 to-[#E8B84B]/5"
          borderColor="border-[#E8B84B]/20"
          icon={<Clock size={20} className="text-[#E8B84B]" />}
          subtitle="Awaiting approval"
          gradient="bg-gradient-to-br from-[#E8B84B]/20 to-transparent"
        />
        <WalletCard
          label="Bonus"
          amount={userData.wallets?.bonus || 0}
          color="text-purple-400"
          bgColor="bg-gradient-to-br from-purple-500/10 to-purple-500/5"
          borderColor="border-purple-500/20"
          icon={<Sparkles size={20} className="text-purple-400" />}
          subtitle="Convert at ₹200"
          gradient="bg-gradient-to-br from-purple-500/20 to-transparent"
        />
        <WalletCard
          label="Savings"
          amount={userData.wallets?.savings || 0}
          color="text-blue-400"
          bgColor="bg-gradient-to-br from-blue-500/10 to-blue-500/5"
          borderColor="border-blue-500/20"
          icon={<Banknote size={20} className="text-blue-400" />}
          subtitle={`${savingsPercent}% auto-save`}
          gradient="bg-gradient-to-br from-blue-500/20 to-transparent"
        />
      </div>

      {/* Withdraw Form */}
      <AnimatePresence>
        {showWithdrawForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#111111] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-800/50 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-200 flex items-center gap-2">
                <ArrowUpCircle size={18} className="text-[#E8B84B]" />
                Withdraw Funds
              </h3>
              <button
                onClick={() => setShowWithdrawForm(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tab switch */}
            <div className="grid grid-cols-2 gap-2 bg-black/50 p-1 rounded-xl">
              {(['normal', 'family'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveWithdrawTab(tab)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${activeWithdrawTab === tab
                      ? 'bg-[#E8B84B] text-black'
                      : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {tab === 'normal' ? 'To My UPI' : 'Family Transfer'}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Enter amount (Min ₹200)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 sm:py-4 text-lg font-bold focus:outline-none focus:border-[#E8B84B] transition-all"
            />

            {/* My UPI display */}
            {activeWithdrawTab === 'normal' && userData.upiId && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-black/50 rounded-xl border border-gray-800/50">
                <CheckCircle size={14} className="text-[#00C9A7]" />
                <span className="text-xs text-gray-400">Sending to: </span>
                <span className="text-xs font-bold text-white">{userData.upiId}</span>
              </div>
            )}

            {/* Family UPI input */}
            <AnimatePresence>
              {activeWithdrawTab === 'family' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <input
                    type="text"
                    placeholder="Recipient UPI ID (e.g. name@upi)"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-black/50 border border-gray-800 rounded-xl px-4 py-3 sm:py-4 text-sm focus:outline-none focus:border-[#E8B84B] transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error / Success */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 bg-[#00C9A7]/10 border border-[#00C9A7]/20 rounded-xl text-[#00C9A7] text-sm font-bold"
                >
                  <CheckCircle size={16} />
                  Withdrawal request submitted! Processing within 24-48 hours.
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => handleWithdraw(activeWithdrawTab === 'normal' ? 'normal' : 'family_transfer')}
              disabled={loading || !userData.kycDone}
              className="w-full bg-[#E8B84B] text-black font-black py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#f0c55a] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(232,184,75,0.2)] text-sm sm:text-base"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : activeWithdrawTab === 'family' ? (
                <>
                  <Send size={18} /> Send to Family
                </>
              ) : (
                <>
                  <ArrowUpCircle size={18} /> Withdraw Now
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bonus Conversion Progress */}
      <div className="bg-[#111111] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-800/50 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm font-bold text-gray-300">Bonus → Earned Conversion</span>
          </div>
          <span className="text-xs font-bold text-purple-400">
            ₹{userData.wallets?.bonus || 0} / ₹200
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${bonusToEarnedProgress}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
        <p className="text-[10px] text-gray-600">
          {canConvertBonus
            ? 'Milestone reached! Convert your bonus to earned wallet.'
            : `Earn ₹${200 - (userData.wallets?.bonus || 0)} more in bonus to unlock conversion.`}
        </p>
        {canConvertBonus && (
          <button
            onClick={handleConvertBonus}
            disabled={loading}
            className="w-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles size={16} /> Convert ₹{userData.wallets?.bonus} Bonus to Earned
          </button>
        )}
      </div>

      {/* Auto-Savings Slider */}
      <div className="bg-[#111111] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-800/50 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-gray-300">Auto-Save Percentage</span>
          </div>
          <span className="text-sm font-black text-blue-400">{savingsPercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={savingsPercent}
          onChange={(e) => handleSavingsUpdate(Number(e.target.value))}
          className="w-full accent-blue-400"
        />
        <div className="flex justify-between text-[10px] text-gray-600 font-bold">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
        <p className="text-[10px] text-gray-600">
          {savingsPercent > 0
            ? `${savingsPercent}% of all future earnings will auto-save to your Savings wallet.`
            : 'Set a percentage to auto-save from every earning.'}
        </p>
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            Transaction History
            <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full">{transactions.length}</span>
          </h3>
          <div className="flex gap-2">
            {(['all', 'credit', 'debit'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTransactionFilter(filter)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${transactionFilter === filter
                    ? 'bg-[#E8B84B] text-black'
                    : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
              >
                {filter === 'all' ? 'All' : filter === 'credit' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 bg-[#111111] rounded-2xl border border-dashed border-gray-800 text-center">
            <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet className="text-gray-600" size={24} />
            </div>
            <p className="text-gray-600 text-sm italic">No transactions yet. Start earning!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-[#111111] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-800/60 flex justify-between items-center hover:border-gray-700 transition-colors"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.amount > 0 ? 'bg-[#00C9A7]/10' : 'bg-red-500/10'
                      }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft size={16} className="text-[#00C9A7]" />
                      ) : (
                        <ArrowUpCircle size={16} className="text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white truncate">{tx.description}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {tx.createdAt
                          ? new Date(tx.createdAt.seconds * 1000).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-black text-base sm:text-lg ml-4 ${tx.amount > 0 ? 'text-[#00C9A7]' : 'text-red-400'
                      }`}
                  >
                    {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
