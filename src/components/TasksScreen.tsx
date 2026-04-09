/**
 * WorkPlex — Enhanced Tasks Screen
 * Better task cards, filters, submission flow, and empty states
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListTodo,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Upload,
  Link,
  FileText,
  ChevronRight,
  Flame,
  X,
  Image as ImageIcon,
  Search,
  Filter,
  Star,
  Zap,
  Calendar,
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
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { UserData, OperationType, handleFirestoreError, TaskData } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import type { FirebaseUser as FirebaseUserType } from '../types';

type TabType = 'all' | 'pending' | 'submitted' | 'approved' | 'rejected';

const STATUS_CONFIG: Record<string, { color: string, bg: string, border: string, label: string }> = {
  assigned: { color: 'text-[#E8B84B]', bg: 'bg-[#E8B84B]/10', border: 'border-[#E8B84B]/20', label: 'Available' },
  accepted: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', label: 'In Progress' },
  submitted: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', label: 'Submitted' },
  completed: { color: 'text-[#00C9A7]', bg: 'bg-[#00C9A7]/10', border: 'border-[#00C9A7]/20', label: 'Completed' },
  approved: { color: 'text-[#00C9A7]', bg: 'bg-[#00C9A7]/10', border: 'border-[#00C9A7]/20', label: 'Approved' },
  skipped: { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20', label: 'Skipped' },
  rejected: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: 'Rejected' },
};

const DIFFICULTY_CONFIG: Record<string, { color: string, icon: React.ReactNode }> = {
  Easy: { color: 'text-[#00C9A7]', icon: <Star size={12} className="text-[#00C9A7]" /> },
  Medium: { color: 'text-[#E8B84B]', icon: <Zap size={12} className="text-[#E8B84B]" /> },
  Hard: { color: 'text-red-400', icon: <Flame size={12} className="text-red-400" /> },
};

interface Task {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  earnAmount: number;
  earning?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  deadline?: any;
  status?: string;
  venture?: string;
  type?: string;
  submissionCount?: number;
}

interface TaskDetailModalProps {
  task: Task;
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function TaskDetailModal({ task, userId, userName, onClose, onSuccess }: TaskDetailModalProps) {
  const [proofLink, setProofLink] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!proofLink && !proofFile) {
      setError('Please provide a proof link or upload a screenshot.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      let fileUrl = '';
      if (proofFile) {
        const storageRef = ref(storage, `proofs/${userId}/${task.id}_${Date.now()}`);
        await uploadBytes(storageRef, proofFile);
        fileUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'taskSubmissions'), {
        userId,
        userName,
        taskId: task.id,
        taskTitle: task.title,
        proofLink: proofLink || fileUrl,
        proofNote,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'tasks', userId, 'assigned', task.id), {
        status: 'submitted',
      });

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const earning = task.earnAmount || task.earning || 0;
  const difficulty = task.difficulty || 'Easy';
  const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG['Easy'];
  const timeLeft = getTimeRemaining(task.deadline);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-[#111111] rounded-t-[2.5rem] md:rounded-[2.5rem] border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-2 md:hidden">
          <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
        </div>

        <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${diffConfig.color}`}>
                  {diffConfig.icon}
                  {difficulty}
                </span>
                {task.type && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {task.type}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white">{task.title}</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-[#00C9A7]">₹{earning}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Reward</p>
            </div>
          </div>

          {/* Time Left */}
          {timeLeft && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/30 p-3 rounded-xl">
              <Clock size={14} className="text-[#E8B84B]" />
              <span>Time remaining: <span className="font-bold text-white">{timeLeft}</span></span>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Instructions */}
          {task.instructions && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <FileText size={12} /> Instructions
              </p>
              <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-gray-800">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                  {task.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Success state */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 p-6 bg-[#00C9A7]/10 border border-[#00C9A7]/20 rounded-2xl text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <CheckCircle size={48} className="text-[#00C9A7]" />
                </motion.div>
                <p className="font-black text-[#00C9A7] text-lg">Proof Submitted!</p>
                <p className="text-gray-400 text-sm">
                  Your submission is under review. You'll be notified once approved.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Proof Submission */}
          {!success && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Submit Proof
              </p>

              {/* Proof Link */}
              <div className="relative">
                <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="url"
                  placeholder="Paste proof link (Google Drive, Screenshot URL...)"
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  className="w-full bg-black/50 border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-[#E8B84B] transition-all"
                />
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-[10px] font-bold text-gray-600 uppercase">or upload</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* File Upload */}
              <label className="flex items-center gap-3 p-4 bg-black/50 border border-gray-800 border-dashed rounded-xl cursor-pointer hover:border-[#E8B84B]/50 transition-all group">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-[#E8B84B]/10 transition-colors">
                  <ImageIcon size={18} className="text-gray-500 group-hover:text-[#E8B84B] transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-400">
                    {proofFile ? proofFile.name : 'Upload screenshot'}
                  </p>
                  <p className="text-[10px] text-gray-600">JPG, PNG, PDF up to 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </label>

              {/* Proof Note */}
              <textarea
                placeholder="Add any notes about your submission (optional)..."
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                rows={3}
                className="w-full bg-black/50 border border-gray-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#E8B84B] transition-all resize-none"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleSubmit}
                disabled={uploading || (!proofLink && !proofFile)}
                className="w-full bg-[#00C9A7] text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#00b395] transition-all active:scale-[0.98]"
              >
                {uploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Upload size={18} /> Submit Proof
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function getTimeRemaining(deadline: any): string | null {
  if (!deadline) return null;
  const end = typeof deadline === 'object' && deadline.seconds ? deadline.seconds * 1000 : new Date(deadline).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

interface TasksScreenProps {
  user: FirebaseUser;
  userData: UserData;
}

export default function TasksScreen({ user, userData }: TasksScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'tasks'),
      where('venture', '==', userData.venture),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task)));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
    );
    return () => unsub();
  }, [userData.venture]);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <ListTodo size={14} /> },
    { key: 'pending', label: 'Pending', icon: <Clock size={14} /> },
    { key: 'submitted', label: 'Submitted', icon: <Upload size={14} /> },
    { key: 'approved', label: 'Approved', icon: <CheckCircle size={14} /> },
    { key: 'rejected', label: 'Rejected', icon: <XCircle size={14} /> },
  ];

  const filterTasks = (tab: TabType) => {
    let filtered = tasks;
    if (tab === 'pending') filtered = tasks.filter((t) => !t.status || t.status === 'assigned' || t.status === 'accepted');
    else if (tab === 'submitted') filtered = tasks.filter((t) => t.status === 'submitted');
    else if (tab === 'approved') filtered = tasks.filter((t) => t.status === 'approved' || t.status === 'completed');
    else if (tab === 'rejected') filtered = tasks.filter((t) => t.status === 'rejected');

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const filteredTasks = filterTasks(activeTab);

  const handleTaskSuccess = () => {
    // Refresh tasks after successful submission
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 sm:h-40 bg-[#111111] rounded-2xl sm:rounded-3xl animate-pulse border border-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8 pb-36 space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-black">Tasks</h2>
            <p className="text-gray-500 text-xs mt-1">{userData.venture} · {userData.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#E8B84B]/10 text-[#E8B84B] px-3 py-1.5 rounded-xl text-xs font-bold border border-[#E8B84B]/20">
              {tasks.length} total
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111111] border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#E8B84B] transition-all"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => {
            const count = filterTasks(tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${activeTab === tab.key
                  ? 'bg-[#E8B84B] text-black border-[#E8B84B]'
                  : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab.key ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Task Cards */}
        <AnimatePresence mode="wait">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 bg-[#1A1A1A] rounded-3xl flex items-center justify-center mb-4 border border-dashed border-gray-700">
                <ListTodo size={32} className="text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium">No {activeTab !== 'all' ? activeTab : ''} tasks right now</p>
              <p className="text-gray-700 text-sm mt-1">New tasks are assigned by your admin every day.</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {filteredTasks.map((task, idx) => {
                const earning = task.earnAmount || task.earning || 0;
                const timeLeft = getTimeRemaining(task.deadline);
                const statusConfig = STATUS_CONFIG[task.status || 'assigned'] || STATUS_CONFIG.assigned;
                const difficulty = task.difficulty || 'Easy';
                const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG['Easy'];

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#111111] p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-800 hover:border-gray-600 transition-all group cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-[#E8B84B]/10 transition-colors">
                          <ListTodo size={18} className="text-gray-400 group-hover:text-[#E8B84B] transition-colors" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${diffConfig.color}`}>
                              {diffConfig.icon}
                              {difficulty}
                            </span>
                          </div>
                          {timeLeft && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-500">
                              <Clock size={10} />
                              {timeLeft}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-[#00C9A7]">₹{earning}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-white mb-1 line-clamp-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">
                        {task.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center">
                      {task.venture && (
                        <span className="text-[10px] text-gray-600 font-bold bg-gray-800/50 px-2 py-1 rounded-lg">
                          {task.venture}
                        </span>
                      )}
                      <span className="text-[11px] text-[#E8B84B] font-bold flex items-center gap-1 ml-auto group-hover:gap-2 transition-all">
                        View Details <ChevronRight size={12} />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            userId={user.uid}
            userName={userData.name}
            onClose={() => setSelectedTask(null)}
            onSuccess={handleTaskSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}
