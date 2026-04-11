/**
 * WorkPlex Phase 4 — Wallet System + Razorpay Withdrawal + Family UPI Transfer (Phase 10)
 * Complete wallet management for BOTH Promoters and Partners
 * 4 wallet cards, withdrawal flow, transaction history, auto-savings, family transfer
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, Clock,
  CheckCircle, XCircle, AlertCircle, ChevronRight, Search,
  Copy, Share2, Zap, PiggyBank, CreditCard, DollarSign, Users, QrCode
} from 'lucide-react';
import {
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, UserMode, formatCurrency } from '../types';
import { isValidUPI } from '../lib/security';
import { ShareUtils } from '../ViralLayer';
import QRCode from 'qrcode.react';

interface WalletScreenProps {
  user: any;
  userData: UserProfile;
}

type TransactionType = 'earning' | 'withdrawal' | 'bonus' | 'streak' | 'referral' | 'coupon_commission' | 'shop_margin' | 'family_transfer';

interface TransactionDoc {
  id: string;
  type: TransactionType;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  description: string;
  createdAt: any;
}

export default function WalletScreen({ user, userData }: WalletScreenProps) {
  const [mode] = useState<UserMode>(userData.mode || 'Promoter');
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showFamilyTransfer, setShowFamilyTransfer] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [familyUpi, setFamilyUpi] = useState('');
  const [familyAmount, setFamilyAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [familyError, setFamilyError] = useState('');
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [wallets, setWallets] = useState({
    earned: userData.wallets?.earned || 0,
    pending: userData.wallets?.pending || 0,
    bonus: userData.wallets?.bonus || 0,
    savings: userData.wallets?.savings || 0
  });
  const [savingsPercent, setSavingsPercent] = useState(userData.savingsPercent || 0);
  const [showBonusCelebration, setShowBonusCelebration] = useState(false);
  const [bonusUnlocked, setBonusUnlocked] = useState(false);

  // Real-time listener for user wallet data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setWallets(data.wallets || { earned: 0, pending: 0, bonus: 0, savings: 0 });
        setSavingsPercent(data.savingsPercent || 0);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [user.uid]);

  // Real-time listener for transactions
  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionDoc)));
      if (snap.docs.length < 10) setHasMore(false);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    });
    return () => unsub();
  }, [user.uid]);

  // Real-time listener for withdrawals
  useEffect(() => {
    const q = query(
      collection(db, 'withdrawals'),
      where('workerId', '==', user.uid),
      orderBy('requestedAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user.uid]);

  // Bonus unlock check
  useEffect(() => {
    if (!bonusUnlocked && wallets.earned >= 200 && wallets.bonus > 0) {
      setBonusUnlocked(true);
      setShowBonusCelebration(true);
      setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            'wallets.earned': wallets.earned + wallets.bonus,
            'wallets.bonus': 0
          });
        } catch (err) {
          console.error('Error unlocking bonus:', err);
        }
      }, 2000);
    }
  }, [wallets.earned, wallets.bonus, bonusUnlocked, user.uid]);

  const handleWithdraw = async () => {
    setWithdrawError('');
    if (!userData.kycDone) {
      setWithdrawError('KYC verification required. Please complete your profile.');
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 200) {
      setWithdrawError('Minimum withdrawal amount is Rs.200');
      return;
    }
    if (amount > wallets.earned) {
      setWithdrawError('Insufficient balance in earned wallet');
      return;
    }
    if (!userData.upiId || !isValidUPI(userData.upiId)) {
      setWithdrawError('Invalid UPI ID. Please update your UPI ID in profile.');
      return;
    }
    try {
      await addDoc(collection(db, 'withdrawals'), {
        workerId: user.uid,
        workerMode: mode,
        amount,
        upiId: userData.upiId,
        status: 'pending',
        requestedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        'wallets.earned': wallets.earned - amount,
        'wallets.pending': wallets.pending + amount
      });
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'withdrawal',
        amount: -amount,
        status: 'pending',
        description: `Withdrawal request - ${formatCurrency(amount)}`,
        createdAt: serverTimestamp()
      });
      setShowWithdrawForm(false);
      setWithdrawAmount('');
    } catch (error) {
      console.error('Withdrawal error:', error);
      setWithdrawError('Failed to process withdrawal. Please try again.');
    }
  };

  const handleFamilyTransfer = async () => {
    setFamilyError('');
    const amount = parseFloat(familyAmount);
    if (isNaN(amount) || amount < 100) {
      setFamilyError('Minimum transfer amount is Rs.100');
      return;
    }
    if (amount > 10000) {
      setFamilyError('Maximum transfer amount is Rs.10,000');
      return;
    }
    if (amount > wallets.earned) {
      setFamilyError('Insufficient balance');
      return;
    }
    if (!isValidUPI(familyUpi)) {
      setFamilyError('Invalid UPI ID format');
      return;
    }
    try {
      await addDoc(collection(db, 'withdrawals'), {
        workerId: user.uid,
        workerMode: mode,
        amount,
        upiId: familyUpi,
        status: 'pending',
        type: 'family_transfer',
        requestedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        'wallets.earned': wallets.earned - amount,
        'wallets.pending': wallets.pending + amount
      });
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'family_transfer',
        amount: -amount,
        status: 'pending',
        description: `Sent to ${familyUpi}`,
        createdAt: serverTimestamp()
      });
      setShowFamilyTransfer(false);
      setFamilyUpi('');
      setFamilyAmount('');
    } catch (error) {
      console.error('Family transfer error:', error);
      setFamilyError('Failed to process transfer. Please try again.');
    }
  };

  const getTransactionColor = (type: TransactionType, status: string): string => {
    if (status === 'rejected') return 'text-red-500';
    if (status === 'pending') return 'text-yellow-500';
    if (type === 'withdrawal' || type === 'family_transfer') return 'text-red-500';
    return 'text-green-500';
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'earning': return <ArrowDownCircle className="w-5 h-5 text-green-500" />;
      case 'withdrawal': return <ArrowUpCircle className="w-5 h-5 text-red-500" />;
      case 'family_transfer': return <Users className="w-5 h-5 text-purple-500" />;
      case 'bonus': return <Zap className="w-5 h-5 text-purple-500" />;
      case 'streak': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'referral': return <Share2 className="w-5 h-5 text-teal-500" />;
      case 'coupon_commission': return <CreditCard className="w-5 h-5 text-orange-500" />;
      case 'shop_margin': return <DollarSign className="w-5 h-5 text-[#00C9A7]" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getModeDescription = (type: TransactionType): string => {
    if (mode === 'Promoter') {
      switch (type) {
        case 'earning': return 'Task approved';
        case 'coupon_commission': return 'Coupon commission';
        case 'streak': return 'Streak bonus';
        case 'referral': return 'Referral bonus';
        case 'bonus': return 'Signup bonus';
        case 'family_transfer': return 'Family transfer';
        default: return type;
      }
    } else {
      switch (type) {
        case 'earning': return 'Shop order margin';
        case 'shop_margin': return 'Product sale';
        case 'streak': return 'Streak bonus';
        case 'bonus': return 'Signup bonus';
        case 'family_transfer': return 'Family transfer';
        default: return type;
      }
    }
  };

  const walletCards = [
    { label: 'Earned', amount: wallets.earned, color: '#00C9A7', icon: Wallet, description: mode === 'Promoter' ? 'From tasks & coupons' : 'From shop margins', withdrawable: true },
    { label: 'Pending', amount: wallets.pending, color: '#F59E0B', icon: Clock, description: 'Awaiting confirmation', withdrawable: false },
    { label: 'Bonus', amount: wallets.bonus, color: '#A855F7', icon: Zap, description: 'Unlocks at Rs.200 earned', withdrawable: false },
    { label: 'Savings', amount: wallets.savings, color: '#3B82F6', icon: PiggyBank, description: `${savingsPercent}% auto-save`, withdrawable: true }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* ===== HEADER ===== */}
      <div className="bg-[#111111] border-b border-gray-800 p-4">
        <h1 className="text-xl font-black mb-1">My Wallet</h1>
        <p className="text-xs text-gray-500">{mode === 'Promoter' ? 'Task & Commission Earnings' : 'Shop Margin Earnings'}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* ===== WALLET CARDS ===== */}
        <div className="grid grid-cols-2 gap-3">
          {walletCards.map((wallet, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-2xl p-4 border" style={{ backgroundColor: `${wallet.color}10`, borderColor: `${wallet.color}30` }}>
              <div className="flex items-center justify-between mb-3">
                <wallet.icon className="w-5 h-5" style={{ color: wallet.color }} />
                {wallet.withdrawable && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">Withdrawable</span>}
              </div>
              <p className="text-2xl font-black" style={{ color: wallet.color }}>{formatCurrency(wallet.amount)}</p>
              <p className="text-xs text-gray-500 mt-1">{wallet.label}</p>
              <p className="text-[10px] text-gray-600">{wallet.description}</p>
            </motion.div>
          ))}
        </div>

        {/* ===== BONUS PROGRESS ===== */}
        {!bonusUnlocked && wallets.bonus > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#A855F7]" />
                <h3 className="font-bold text-[#A855F7]">Bonus Progress</h3>
              </div>
              <span className="text-xs text-gray-400">{formatCurrency(wallets.earned)} / Rs.200</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#A855F7]" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (wallets.earned / 200) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Earn Rs.{200 - wallets.earned} more to unlock your bonus wallet</p>
          </motion.div>
        )}

        {/* ===== AUTO-SAVINGS TOGGLE ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1A1A1A] rounded-2xl p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-[#3B82F6]" />
              <h3 className="font-bold">Auto-Savings</h3>
            </div>
            <span className="text-sm text-[#3B82F6] font-bold">{savingsPercent}%</span>
          </div>
          <input type="range" min="0" max="50" value={savingsPercent} onChange={async (e) => {
            const newPercent = parseInt(e.target.value);
            setSavingsPercent(newPercent);
            try {
              await updateDoc(doc(db, 'users', user.uid), { savingsPercent: newPercent });
            } catch (err) {
              console.error('Error updating savings percent:', err);
            }
          }} className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer" style={{ accentColor: '#3B82F6' }} />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">0%</span>
            <span className="text-xs text-gray-600">50%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Automatically save {savingsPercent}% of every earning to your savings wallet</p>
        </motion.div>

        {/* ===== ACTION BUTTONS ===== */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={() => setShowWithdrawForm(true)} className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
            <ArrowUpCircle className="w-5 h-5" /> Withdraw
          </motion.button>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onClick={() => setShowFamilyTransfer(true)} className="bg-gradient-to-r from-[#A855F7] to-[#C084FC] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
            <Users className="w-5 h-5" /> Family Transfer
          </motion.button>
        </div>

        {/* ===== RECENT WITHDRAWALS ===== */}
        {withdrawals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="font-bold text-lg mb-3">Recent Withdrawals</h3>
            <div className="space-y-3">
              {withdrawals.slice(0, 5).map((w) => (
                <div key={w.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {w.type === 'family_transfer' ? <Users className="w-5 h-5 text-purple-500" /> : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
                      <div>
                        <p className="font-bold text-sm">{formatCurrency(w.amount)}</p>
                        <p className="text-xs text-gray-500">{w.upiId} {w.type === 'family_transfer' && '• Family'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${w.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                        w.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
                          w.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                      }`}>
                      {w.status}
                    </span>
                  </div>
                  {w.status === 'rejected' && w.rejectionReason && <p className="text-xs text-red-400 mt-2">Reason: {w.rejectionReason}</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===== TRANSACTION HISTORY ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="font-bold text-lg mb-3">Transaction History</h3>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800 flex items-center gap-3">
                  {getTransactionIcon(tx.type)}
                  <div className="flex-1">
                    <p className="text-sm font-bold">{getModeDescription(tx.type)}</p>
                    <p className="text-xs text-gray-500">{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(tx.type, tx.status)}`}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        tx.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                      }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1A1A1A] rounded-xl p-8 border border-gray-800 text-center">
              <Wallet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No transactions yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ===== WITHDRAW MODAL ===== */}
      <AnimatePresence>
        {showWithdrawForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowWithdrawForm(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="bg-[#1A1A1A] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-gray-800" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-4">Withdraw to UPI</h3>
              {withdrawError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4"><p className="text-sm text-red-400">{withdrawError}</p></div>}
              {!userData.kycDone ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">KYC verification required</p>
                  <button onClick={() => setShowWithdrawForm(false)} className="bg-[#E8B84B] text-black font-bold px-6 py-3 rounded-xl">Complete KYC</button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Amount (Rs.)</label>
                      <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Enter amount (min Rs.200)" className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50" />
                      <p className="text-xs text-gray-500 mt-2">Available: {formatCurrency(wallets.earned)} | Minimum: Rs.200</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">UPI ID</label>
                      <div className="bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-white">{userData.upiId || 'Not set'}</span>
                        <button className="text-[#E8B84B] text-sm font-bold">Edit</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowWithdrawForm(false)} className="flex-1 bg-gray-800 text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors">Cancel</button>
                    <button onClick={handleWithdraw} className="flex-1 bg-[#E8B84B] text-black font-bold py-3 rounded-xl hover:bg-[#D4A743] transition-colors">Submit Request</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FAMILY TRANSFER MODAL ===== */}
      <AnimatePresence>
        {showFamilyTransfer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowFamilyTransfer(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="bg-[#1A1A1A] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-gray-800" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-black mb-4">Send to Family</h3>
              {familyError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4"><p className="text-sm text-red-400">{familyError}</p></div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Recipient UPI ID</label>
                  <input type="text" value={familyUpi} onChange={(e) => setFamilyUpi(e.target.value)} placeholder="family@upi" className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#A855F7]/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Amount (Rs.)</label>
                  <input type="number" value={familyAmount} onChange={(e) => setFamilyAmount(e.target.value)} placeholder="Rs.100 - Rs.10,000" className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#A855F7]/50" />
                  <p className="text-xs text-gray-500 mt-2">Available: {formatCurrency(wallets.earned)}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowFamilyTransfer(false)} className="flex-1 bg-gray-800 text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={handleFamilyTransfer} className="flex-1 bg-[#A855F7] text-white font-bold py-3 rounded-xl hover:bg-[#9333EA] transition-colors">Send Now</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BONUS CELEBRATION ===== */}
      <AnimatePresence>
        {showBonusCelebration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="text-center">
              <div className="w-32 h-32 bg-[#A855F7]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-16 h-16 text-[#A855F7]" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Bonus Unlocked!</h2>
              <p className="text-gray-400 mb-6">Your Rs.{wallets.bonus} bonus has been moved to your earned wallet!</p>
              <button onClick={() => setShowBonusCelebration(false)} className="bg-[#A855F7] text-white font-bold px-8 py-4 rounded-2xl">Claim Now</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
