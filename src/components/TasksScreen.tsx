/**
 * WorkPlex Phase 3 — Complete Task System + Proof Submission (Promoters Only)
 * Full task management with tabs, proof upload to Firebase Storage, real-time listeners,
 * rejection/resubmission handling, earning credit on approval, and cross-venture tasks.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ListTodo, Clock, CheckCircle, XCircle, AlertCircle,
  Upload, Image as ImageIcon, Link as LinkIcon, FileText,
  ChevronRight, ArrowLeft, Zap, Search, AlertTriangle,
  X, ExternalLink, RotateCcw, Award, Timer
} from 'lucide-react';
import {
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, doc, serverTimestamp, Timestamp, DocumentData,
  QuerySnapshot, updateDoc, getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import {
  UserProfile, Task, TaskSubmission, TaskProofType,
  VENTURES, Venture, UserRole
} from '../types';

// ============================================================
// Types
// ============================================================

interface TasksScreenProps {
  user: any;
  userData: UserProfile;
  onBack: () => void;
}

type TabType = 'all' | 'pending' | 'submitted' | 'approved' | 'rejected';

interface TaskDoc extends DocumentData {
  id: string;
  title: string;
  description: string;
  venture: Venture;
  role: UserRole[];
  earnAmount: number;
  deadline: Timestamp;
  proofType: TaskProofType;
  assignedTo: string[] | 'all';
  status: string;
  isCrossVenture: boolean;
  isMystery: boolean;
  instructions?: string;
  proofRequirements?: string;
  createdAt: Timestamp;
}

interface SubmissionDoc extends DocumentData {
  id: string;
  taskId: string;
  workerId: string;
  proofUrl?: string;
  proofText?: string;
  proofLink?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  resubmissionCount: number;
  earnAmount: number;
}

// ============================================================
// Constants
// ============================================================

const TABS: { key: TabType; label: string; icon: React.ReactNode; color: string; activeBg: string }[] = [
  { key: 'all', label: 'All', icon: <ListTodo className="w-3.5 h-3.5" />, color: '#E8B84B', activeBg: '#E8B84B' },
  { key: 'pending', label: 'Pending', icon: <Clock className="w-3.5 h-3.5" />, color: '#F59E0B', activeBg: '#F59E0B' },
  { key: 'submitted', label: 'Submitted', icon: <ExternalLink className="w-3.5 h-3.5" />, color: '#3B82F6', activeBg: '#3B82F6' },
  { key: 'approved', label: 'Approved', icon: <CheckCircle className="w-3.5 h-3.5" />, color: '#00C9A7', activeBg: '#00C9A7' },
  { key: 'rejected', label: 'Rejected', icon: <XCircle className="w-3.5 h-3.5" />, color: '#EF4444', activeBg: '#EF4444' },
];

const MAX_RESUBMISSIONS = 3;

// ============================================================
// Main Component
// ============================================================

export default function TasksScreen({ user, userData, onBack }: TasksScreenProps) {
  // --- Partner guard ---
  if (userData.mode === 'Partner') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6 border border-gray-700">
          <AlertTriangle className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-2xl font-black mb-3">Tasks Not Available</h2>
        <p className="text-gray-400 text-center text-sm max-w-xs">
          Tasks are not available for Partner mode. Switch to Promoter mode to access tasks and earn.
        </p>
        <button
          onClick={onBack}
          className="mt-6 bg-[#E8B84B] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#D4A743] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [crossVentureTasks, setCrossVentureTasks] = useState<TaskDoc[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDoc | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  // Proof submission state
  const [proofType, setProofType] = useState<TaskProofType>('image');
  const [proofValue, setProofValue] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Tick timer for countdowns ---
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Fetch user's own venture tasks ---
  useEffect(() => {
    if (!userData.venture || !userData.role) return;

    const q = query(
      collection(db, 'tasks'),
      where('venture', '==', userData.venture),
      where('role', 'array-contains', userData.role),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(q, (snap: QuerySnapshot) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TaskDoc[];
      setTasks(docs);
      setLoading(false);
    }, (err) => {
      console.error('[Tasks] Error fetching tasks:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [userData.venture, userData.role]);

  // --- Fetch cross-venture tasks (shown when user has 0 tasks today in own venture) ---
  useEffect(() => {
    if (tasks.length > 0) return;

    const otherVentures = VENTURES.filter((v) => v !== userData.venture);
    if (otherVentures.length === 0) return;

    const q = query(
      collection(db, 'tasks'),
      where('venture', 'in', otherVentures.slice(0, 10)),
      where('isCrossVenture', '==', true),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap: QuerySnapshot) => {
      setCrossVentureTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TaskDoc[]);
    }, (err) => {
      console.error('[Tasks] Error fetching cross-venture tasks:', err);
    });

    return () => unsub();
  }, [tasks.length, userData.venture]);

  // --- Fetch user's submissions ---
  useEffect(() => {
    const q = query(
      collection(db, 'taskSubmissions'),
      where('workerId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap: QuerySnapshot) => {
      setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SubmissionDoc[]);
    }, (err) => {
      console.error('[Tasks] Error fetching submissions:', err);
    });

    return () => unsub();
  }, [user.uid]);

  // --- Real-time listener for submission status changes (approval → earning credit) ---
  useEffect(() => {
    if (submissions.length === 0) return;

    const submissionIds = submissions.map((s) => s.id);
    const chunks: string[][] = [];
    for (let i = 0; i < submissionIds.length; i += 10) {
      chunks.push(submissionIds.slice(i, i + 10));
    }

    const unsubs: (() => void)[] = [];

    chunks.forEach((chunk) => {
      const q = query(
        collection(db, 'taskSubmissions'),
        where('__name__', 'in', chunk)
      );

      const unsub = onSnapshot(q, (snap: QuerySnapshot) => {
        snap.docChanges().forEach((change) => {
          const data = change.doc.data() as SubmissionDoc | undefined;
          if (!data) return;

          // Check if submission was just approved
          if (data.status === 'approved' && data.reviewedAt) {
            const existing = submissions.find((s) => s.id === change.doc.id);
            if (existing && existing.status !== 'approved') {
              // Credit the earning to pending wallet
              creditEarning(data);

              // Check if this is the first task approval
              if (!userData.firstTaskDone) {
                handleFirstTaskApproval();
              }
            }
          }
        });
      });

      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [submissions.length, userData.firstTaskDone]);

  // ============================================================
  // Helpers
  // ============================================================

  const creditEarning = useCallback(async (submission: SubmissionDoc) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentWallet = userData.wallets || { earned: 0, pending: 0, bonus: 0, savings: 0 };

      // Add to earned wallet
      await updateDoc(userRef, {
        'wallets.earned': (currentWallet.earned || 0) + submission.earnAmount,
      });

      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: submission.earnAmount,
        type: 'task_earning',
        status: 'completed',
        description: `Task earning: ${submission.taskId}`,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[Tasks] Error crediting earning:', err);
    }
  }, [user.uid, userData.wallets]);

  const handleFirstTaskApproval = useCallback(async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentWallet = userData.wallets || { earned: 0, pending: 0, bonus: 0, savings: 0 };

      // Move Rs.27 from pending to earned
      await updateDoc(userRef, {
        'wallets.pending': Math.max(0, (currentWallet.pending || 27) - 27),
        'wallets.earned': (currentWallet.earned || 0) + 27,
        firstTaskDone: true,
      });

      // Update transaction status
      const txnQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('type', '==', 'signup_bonus'),
        where('status', '==', 'pending'),
        limit(1)
      );
      const txnSnap = await getDocs(txnQuery);
      txnSnap.forEach(async (txnDoc) => {
        await updateDoc(doc(db, 'transactions', txnDoc.id), {
          status: 'completed',
          description: 'Signup Bonus — Released after first task approval!',
        });
      });

      // Show celebration
      setShowCelebration(true);
      confetti({
        particleCount: 120,
        spread: 70,
        startVelocity: 40,
        colors: ['#E8B84B', '#00C9A7', '#FFD700', '#00B396'],
        gravity: 0.8,
        ticks: 180,
      });

      setTimeout(() => setShowCelebration(false), 4000);
    } catch (err) {
      console.error('[Tasks] Error handling first task approval:', err);
    }
  }, [user.uid, userData.wallets]);

  const getTaskSubmission = useCallback(
    (taskId: string): SubmissionDoc | undefined => {
      return submissions.find((s) => s.taskId === taskId);
    },
    [submissions]
  );

  const getTaskTabStatus = useCallback(
    (task: TaskDoc): TabType => {
      const sub = getTaskSubmission(task.id);
      if (!sub) return 'pending';
      if (sub.status === 'approved') return 'approved';
      if (sub.status === 'rejected') return 'rejected';
      return 'submitted';
    },
    [getTaskSubmission]
  );

  const getTimeRemaining = useCallback((deadline: Timestamp | undefined): string => {
    if (!deadline) return 'Expired';
    const end = deadline.toDate ? deadline.toDate().getTime() : (deadline as any).seconds * 1000;
    const diff = end - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [now]);

  const isExpired = useCallback((deadline: Timestamp | undefined): boolean => {
    if (!deadline) return true;
    const end = deadline.toDate ? deadline.toDate().getTime() : (deadline as any).seconds * 1000;
    return now > end;
  }, [now]);

  const canSubmit = useCallback((task: TaskDoc): boolean => {
    const sub = getTaskSubmission(task.id);
    if (!sub) return true; // never submitted
    if (sub.status === 'rejected' && sub.resubmissionCount < MAX_RESUBMISSIONS) {
      return true; // can resubmit
    }
    return false;
  }, [getTaskSubmission]);

  // ============================================================
  // Filtering
  // ============================================================

  const allTasks = [...tasks, ...crossVentureTasks];

  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch =
      searchQuery.length === 0 ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;

    const tabStatus = getTaskTabStatus(task);

    if (activeTab === 'pending') {
      return matchesSearch && (tabStatus === 'pending' || (tabStatus === 'submitted' && isExpired(task.deadline)));
    }

    return matchesSearch && tabStatus === activeTab;
  });

  // Remove duplicate tasks (by id)
  const uniqueFilteredTasks = filteredTasks.filter(
    (task, index, self) => index === self.findIndex((t) => t.id === task.id)
  );

  // ============================================================
  // Handlers
  // ============================================================

  const handleTaskTap = (task: TaskDoc) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    setShowSubmitModal(false);
  };

  const handleOpenSubmit = () => {
    if (!selectedTask) return;
    const sub = getTaskSubmission(selectedTask.id);
    setProofType(selectedTask.proofType || 'image');
    setProofValue('');
    setProofFile(null);
    setUploadProgress(0);
    setSubmitSuccess(false);

    if (sub?.status === 'rejected') {
      // Pre-fill rejection info
    }

    setShowSubmitModal(true);
    setShowTaskDetail(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setProofFile(file);
    setProofValue('');
  };

  const handleSubmitProof = async () => {
    if (!selectedTask) return;

    const hasProof =
      (proofType === 'image' && proofFile) ||
      (proofType === 'link' && proofValue.trim().length > 0) ||
      (proofType === 'text' && proofValue.trim().length > 0);

    if (!hasProof) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      let proofUrl = '';
      let proofText: string | undefined;
      let proofLink: string | undefined;

      if (proofType === 'image' && proofFile) {
        // Upload image to Firebase Storage
        const fileRef = ref(
          storage,
          `proofs/${user.uid}/${selectedTask.id}/${Date.now()}_${proofFile.name}`
        );

        // Simulate progress (uploadBytes doesn't have progress callback)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + Math.random() * 15, 90));
        }, 200);

        const snapshot = await uploadBytes(fileRef, proofFile);
        clearInterval(progressInterval);
        setUploadProgress(100);

        proofUrl = await getDownloadURL(snapshot.ref);
      } else if (proofType === 'link') {
        proofLink = proofValue.trim();
        proofUrl = proofValue.trim();
      } else {
        proofText = proofValue.trim();
        proofUrl = 'text://' + proofValue.trim();
      }

      // Get current resubmission count
      const existingSub = getTaskSubmission(selectedTask.id);
      const resubCount = (existingSub?.resubmissionCount || 0) + 1;

      // Create taskSubmissions document
      await addDoc(collection(db, 'taskSubmissions'), {
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        taskVenture: selectedTask.venture,
        workerId: user.uid,
        workerName: userData.name,
        workerVenture: userData.venture,
        proofUrl,
        proofType,
        proofText,
        proofLink,
        status: 'pending' as const,
        submittedAt: serverTimestamp(),
        resubmissionCount: resubCount,
        earnAmount: selectedTask.earnAmount,
      });

      // Show success
      setSubmitSuccess(true);
      setShowSubmitModal(false);

      // Reset after delay
      setTimeout(() => {
        setSelectedTask(null);
        setShowTaskDetail(false);
        setSubmitSuccess(false);
      }, 2500);
    } catch (error) {
      console.error('[Tasks] Error submitting proof:', error);
      alert('Failed to submit proof. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // Render: Loading
  // ============================================================

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

  // ============================================================
  // Render: Main
  // ============================================================

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* ===== HEADER ===== */}
      <div className="bg-[#111111] border-b border-gray-800/50 p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight">Tasks</h1>
            <p className="text-xs text-gray-500">
              {userData.venture} &middot; {userData.role}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#E8B84B]/10 px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5 text-[#E8B84B]" />
            <span className="text-xs font-bold text-[#E8B84B]">
              {submissions.filter((s) => s.status === 'pending').length} pending
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-gray-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50 transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((tab) => {
            const count =
              tab.key === 'all'
                ? allTasks.length
                : allTasks.filter((t) => getTaskTabStatus(t) === tab.key).length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 ${activeTab === tab.key
                  ? 'text-black shadow-lg'
                  : 'bg-[#1A1A1A] text-gray-500 hover:text-gray-300'
                  }`}
                style={
                  activeTab === tab.key
                    ? { backgroundColor: tab.activeBg, boxShadow: `0 4px 12px ${tab.activeBg}33` }
                    : undefined
                }
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.key ? 'bg-black/20' : 'bg-gray-800'
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== CROSS-VENTURE BANNER ===== */}
      <AnimatePresence>
        {crossVentureTasks.length > 0 && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-purple-300 mb-1">
                    Earn from Other Ventures Today
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    No tasks available in {userData.venture}. Try these cross-venture tasks — earn Rs.15-25 each.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== TASK LIST ===== */}
      <div className="p-4 space-y-3">
        {uniqueFilteredTasks.length > 0 ? (
          uniqueFilteredTasks.map((task) => {
            const tabStatus = getTaskTabStatus(task);
            const submission = getTaskSubmission(task.id);
            const expired = isExpired(task.deadline);
            const isCross = task.isCrossVenture;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleTaskTap(task)}
                className={`bg-[#1A1A1A] rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] hover:bg-[#1f1f1f] ${isCross ? 'border-purple-500/30' : 'border-gray-800/50'
                  }`}
              >
                <div className="p-4">
                  {/* Top row: title + earning */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isCross && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            Cross-Venture
                          </span>
                        )}
                        {task.isMystery && (
                          <span className="px-2 py-0.5 bg-[#E8B84B]/20 text-[#E8B84B] text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Timer className="w-3 h-3" /> Mystery
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm leading-snug truncate">{task.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCross
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                          {task.venture}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {Array.isArray(task.role) ? task.role.join(', ') : task.role}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-[#00C9A7]">₹{task.earnAmount}</p>
                    </div>
                  </div>

                  {/* Bottom row: deadline + status + action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className={expired ? 'text-red-400' : ''}>
                          {expired ? 'Expired' : getTimeRemaining(task.deadline)}
                        </span>
                      </div>

                      {/* Status badge */}
                      <StatusBadge status={tabStatus} />
                    </div>

                    {/* Action button */}
                    {tabStatus === 'pending' && !expired && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskTap(task);
                        }}
                        className="bg-[#E8B84B] text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#D4A743] transition-colors active:scale-95"
                      >
                        Submit Proof
                      </button>
                    )}
                    {tabStatus === 'rejected' && submission && submission.resubmissionCount < MAX_RESUBMISSIONS && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskTap(task);
                        }}
                        className="bg-[#00C9A7] text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#00b395] transition-colors active:scale-95 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Resubmit
                      </button>
                    )}
                    {tabStatus === 'rejected' && submission && submission.resubmissionCount >= MAX_RESUBMISSIONS && (
                      <span className="text-xs text-red-400 font-bold">Max resubmits reached</span>
                    )}
                    {tabStatus === 'submitted' && (
                      <span className="text-xs text-blue-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Awaiting review
                      </span>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {tabStatus === 'rejected' && submission?.rejectionReason && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-red-400 font-bold mb-0.5">Rejection Reason</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{submission.rejectionReason}</p>
                          <p className="text-[10px] text-gray-600 mt-1">
                            Resubmission {submission.resubmissionCount}/{MAX_RESUBMISSIONS}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-4">
              <ListTodo className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 font-bold text-sm mb-1">No tasks found</p>
            <p className="text-gray-600 text-xs">
              {searchQuery ? 'Try a different search' : 'Check back later for new tasks'}
            </p>
          </div>
        )}
      </div>

      {/* ===== TASK DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedTask && showTaskDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => {
              setShowTaskDetail(false);
              setSelectedTask(null);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#111111] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto border border-gray-800/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#111111]/95 backdrop-blur-sm border-b border-gray-800/50 p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-black">Task Details</h3>
                <button
                  onClick={() => {
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Task title + badges */}
                <div>
                  <h4 className="text-lg font-black mb-2">{selectedTask.title}</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-[#E8B84B]/10 text-[#E8B84B] text-xs font-bold rounded-full">
                      {selectedTask.venture}
                    </span>
                    {selectedTask.isCrossVenture && (
                      <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded-full">
                        Cross-Venture
                      </span>
                    )}
                    {selectedTask.isMystery && (
                      <span className="px-2.5 py-1 bg-[#00C9A7]/10 text-[#00C9A7] text-xs font-bold rounded-full flex items-center gap-1">
                        <Timer className="w-3 h-3" /> Mystery
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                    <Zap className="w-5 h-5 text-[#E8B84B] mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Earning</p>
                    <p className="text-base font-black text-[#E8B84B]">₹{selectedTask.earnAmount}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                    <Clock className="w-5 h-5 text-[#00C9A7] mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Time Left</p>
                    <p className={`text-base font-black ${isExpired(selectedTask.deadline) ? 'text-red-400' : 'text-[#00C9A7]'}`}>
                      {isExpired(selectedTask.deadline) ? 'Expired' : getTimeRemaining(selectedTask.deadline)}
                    </p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                    <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Proof</p>
                    <p className="text-base font-black text-blue-400 capitalize">{selectedTask.proofType}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#1A1A1A] rounded-xl p-4">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h5>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedTask.description}</p>
                </div>

                {/* Instructions */}
                {selectedTask.instructions && (
                  <div className="bg-[#1A1A1A] rounded-xl p-4">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Instructions</h5>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedTask.instructions}</p>
                  </div>
                )}

                {/* Proof requirements */}
                {selectedTask.proofRequirements && (
                  <div className="bg-[#1A1A1A] rounded-xl p-4">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Proof Requirements</h5>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedTask.proofRequirements}</p>
                  </div>
                )}

                {/* Existing submission info */}
                {(() => {
                  const sub = getTaskSubmission(selectedTask.id);
                  if (!sub) return null;

                  return (
                    <div className="bg-[#1A1A1A] rounded-xl p-4">
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Submission</h5>
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge status={sub.status} />
                        <span className="text-xs text-gray-500">
                          {sub.resubmissionCount}/{MAX_RESUBMISSIONS} resubmits
                        </span>
                      </div>
                      {sub.rejectionReason && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-red-400 font-bold">Rejected</p>
                              <p className="text-xs text-gray-400 mt-0.5">{sub.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Submit / Resubmit button */}
                {canSubmit(selectedTask) && !isExpired(selectedTask.deadline) && (
                  <button
                    onClick={handleOpenSubmit}
                    className="w-full bg-[#E8B84B] text-black font-bold py-4 rounded-xl hover:bg-[#D4A743] transition-colors active:scale-[0.98] flex items-center justify-center gap-2 text-base"
                  >
                    <Upload className="w-5 h-5" />
                    {getTaskSubmission(selectedTask.id)?.status === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                  </button>
                )}

                {/* Disabled state */}
                {!canSubmit(selectedTask) && (
                  <div className="text-center py-3">
                    {getTaskSubmission(selectedTask.id)?.status === 'rejected' &&
                      getTaskSubmission(selectedTask.id)!.resubmissionCount >= MAX_RESUBMISSIONS && (
                        <p className="text-red-400 text-sm font-bold">
                          This task is permanently closed (max resubmissions reached)
                        </p>
                      )}
                    {getTaskSubmission(selectedTask.id)?.status === 'submitted' && (
                      <p className="text-blue-400 text-sm font-bold flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" /> Submitted — Awaiting review
                      </p>
                    )}
                    {getTaskSubmission(selectedTask.id)?.status === 'approved' && (
                      <p className="text-[#00C9A7] text-sm font-bold flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Approved — ₹{selectedTask.earnAmount} earned
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SUBMIT PROOF MODAL ===== */}
      <AnimatePresence>
        {selectedTask && showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => {
              if (!uploading) {
                setShowSubmitModal(false);
                setShowTaskDetail(true);
              }
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#111111] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto border border-gray-800/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#111111]/95 backdrop-blur-sm border-b border-gray-800/50 p-4 flex items-center justify-between z-10">
                <h3 className="text-lg font-black">
                  {getTaskSubmission(selectedTask.id)?.status === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                </h3>
                <button
                  onClick={() => {
                    if (!uploading) {
                      setShowSubmitModal(false);
                      setShowTaskDetail(true);
                    }
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                  disabled={uploading}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Task summary */}
                <div className="bg-[#1A1A1A] rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-1">{selectedTask.title}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#E8B84B]" />
                      <span className="text-sm font-bold text-[#E8B84B]">₹{selectedTask.earnAmount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{isExpired(selectedTask.deadline) ? 'Expired' : getTimeRemaining(selectedTask.deadline)}</span>
                    </div>
                  </div>
                </div>

                {/* Proof type selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Proof Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'image' as TaskProofType, label: 'Image', icon: ImageIcon },
                      { key: 'link' as TaskProofType, label: 'Link', icon: LinkIcon },
                      { key: 'text' as TaskProofType, label: 'Text', icon: FileText },
                    ].map((type) => (
                      <button
                        key={type.key}
                        onClick={() => {
                          setProofType(type.key);
                          setProofValue('');
                          setProofFile(null);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${proofType === type.key
                          ? 'border-[#E8B84B] bg-[#E8B84B]/10 text-[#E8B84B]'
                          : 'border-gray-800 bg-[#1A1A1A] text-gray-500 hover:text-gray-300 hover:border-gray-700'
                          }`}
                      >
                        <type.icon className="w-5 h-5" />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proof input */}
                {proofType === 'image' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Upload Image
                    </label>
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${uploading
                        ? 'border-gray-700 cursor-not-allowed'
                        : proofFile
                          ? 'border-[#00C9A7]/50 bg-[#00C9A7]/5 hover:border-[#00C9A7]'
                          : 'border-gray-700 hover:border-[#E8B84B]/50'
                        }`}
                    >
                      {proofFile ? (
                        <div className="space-y-2">
                          <CheckCircle className="w-8 h-8 text-[#00C9A7] mx-auto" />
                          <p className="text-sm font-bold text-white">{proofFile.name}</p>
                          <p className="text-xs text-gray-500">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProofFile(null);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 text-gray-600 mx-auto" />
                          <p className="text-sm text-gray-400">Tap to upload screenshot</p>
                          <p className="text-xs text-gray-600">PNG, JPG up to 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />

                    {/* Upload progress bar */}
                    {uploading && (
                      <div className="mt-3">
                        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#E8B84B] to-[#00C9A7]"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5 text-center">
                          Uploading... {Math.round(uploadProgress)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {proofType === 'link' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Enter URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/your-work"
                      value={proofValue}
                      onChange={(e) => setProofValue(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-gray-800/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50 transition-colors"
                    />
                  </div>
                )}

                {proofType === 'text' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Enter Description
                    </label>
                    <textarea
                      placeholder="Describe your completed work in detail..."
                      value={proofValue}
                      onChange={(e) => setProofValue(e.target.value)}
                      rows={5}
                      maxLength={1000}
                      className="w-full bg-[#1A1A1A] border border-gray-800/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8B84B]/50 transition-colors resize-none"
                    />
                    <p className="text-xs text-gray-600 mt-1.5 text-right">{proofValue.length}/1000</p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmitProof}
                  disabled={
                    uploading ||
                    (proofType === 'image' && !proofFile) ||
                    ((proofType === 'link' || proofType === 'text') && proofValue.trim().length === 0)
                  }
                  className="w-full bg-[#E8B84B] text-black font-bold py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D4A743] transition-colors active:scale-[0.98] text-base flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      {getTaskSubmission(selectedTask.id)?.status === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SUBMISSION SUCCESS TOAST ===== */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-50"
          >
            <div className="bg-[#00C9A7]/10 border border-[#00C9A7]/30 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00C9A7]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-[#00C9A7]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#00C9A7]">Submitted!</p>
                  <p className="text-xs text-gray-400">Awaiting review. You'll be notified when it's approved.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CELEBRATION OVERLAY (First task approval) ===== */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-gradient-to-br from-[#E8B84B]/20 to-[#00C9A7]/10 border border-[#E8B84B]/30 rounded-3xl p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-[#E8B84B]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <Award className="w-10 h-10 text-[#E8B84B]" />
              </div>
              <h2 className="text-2xl font-black mb-2">First Task Approved!</h2>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Congratulations! Your Rs.27 signup bonus has been moved from pending to earned.
                Keep completing tasks to earn more!
              </p>
              <div className="bg-[#00C9A7]/10 rounded-xl p-4 mb-5">
                <p className="text-3xl font-black text-[#00C9A7]">+₹27</p>
                <p className="text-xs text-gray-400 mt-1">Signup Bonus Released</p>
              </div>
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full bg-[#E8B84B] text-black font-bold py-3 rounded-xl hover:bg-[#D4A743] transition-colors"
              >
                Keep Earning!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface StatusBadgeProps {
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', label: 'Pending' },
    submitted: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Submitted' },
    approved: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Approved' },
    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Rejected' },
  };

  const c = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
      {status === 'approved' && <CheckCircle className="w-3 h-3" />}
      {status === 'rejected' && <XCircle className="w-3 h-3" />}
      {status === 'submitted' && <Clock className="w-3 h-3" />}
      {status === 'pending' && <Clock className="w-3 h-3" />}
      {c.label}
    </span>
  );
}
