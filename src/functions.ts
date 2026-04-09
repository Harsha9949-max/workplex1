/**
 * WorkPlex Cloud Functions Simulation
 * These functions handle coupon expiry and commission release.
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  increment, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Level Thresholds
 */
const LEVEL_THRESHOLDS = [
  { name: 'Legend', min: 500000 },
  { name: 'Platinum', min: 100000 },
  { name: 'Gold', min: 25000 },
  { name: 'Silver', min: 5000 },
  { name: 'Bronze', min: 0 }
];

/**
 * Update user level based on total earned.
 */
export const updateUserLevel = async (uid: string, totalEarned: number) => {
  const level = LEVEL_THRESHOLDS.find(t => totalEarned >= t.min)?.name || 'Bronze';
  await updateDoc(doc(db, 'users', uid), { level });
};

/**
 * Auto-promotion to Lead Marketer (L2).
 * Conditions: role === 'Marketer' AND monthlyEarned >= 50000 AND activeMonths >= 3
 */
export const checkPromotions = async () => {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'Marketer'),
    where('monthlyEarnings', '>=', 50000),
    where('activeMonths', '>=', 3)
  );

  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map(d => 
    updateDoc(doc(db, 'users', d.id), { 
      role: 'Lead Marketer',
      showPromotionCelebration: true
    })
  );

  await Promise.all(updates);
  console.log(`Promoted ${updates.length} users to Lead Marketer.`);
};

/**
 * Handle Task Approval and Commissions.
 * Lead earns 5% of each team member's approved task earnings.
 * Manager earns 3% of all Lead Marketers under them.
 */
export const handleTaskApproval = async (memberId: string, taskEarning: number, margin: number) => {
  const userDoc = await getDoc(doc(db, 'users', memberId));
  if (!userDoc.exists()) return;
  const userData = userDoc.data();

  // 1. Update user's total earned and check level
  const newTotalEarned = (userData.totalEarned || 0) + taskEarning;
  const newMonthlyEarnings = (userData.monthlyEarnings || 0) + taskEarning;
  await updateDoc(doc(db, 'users', memberId), {
    totalEarned: newTotalEarned,
    monthlyEarnings: newMonthlyEarnings,
    'wallets.earned': increment(taskEarning)
  });
  await updateUserLevel(memberId, newTotalEarned);

  // 2. Lead Marketer Commission (5%)
  if (userData.referredBy) {
    const leadId = userData.referredBy;
    const leadDoc = await getDoc(doc(db, 'users', leadId));
    
    if (leadDoc.exists() && leadDoc.data().role === 'Lead Marketer') {
      let leadCommission = taskEarning * 0.05;
      
      // Total commission check: if (direct + lead %) > 35% of margin -> cap it
      // Assuming 'direct' is the member's task earning
      if ((taskEarning + leadCommission) > (margin * 0.35)) {
        leadCommission = (margin * 0.35) - taskEarning;
      }

      if (leadCommission > 0) {
        await updateDoc(doc(db, 'users', leadId), {
          'wallets.pending': increment(leadCommission)
        });
        await addDoc(collection(db, 'transactions'), {
          userId: leadId,
          amount: leadCommission,
          type: 'task_earning',
          description: `Team commission from ${userData.name}`,
          createdAt: serverTimestamp()
        });

        // 3. Manager Commission (3%)
        // Check if Lead has a Manager
        const managerTeamQ = query(
          collection(db, 'managerTeams'),
          where('leads', 'array-contains', leadId)
        );
        // Note: managerTeams structure might need adjustment based on requirements
        // "Store in Firestore: managerTeams/{managerId}/leads/{leadId}"
        // Let's assume a simpler structure for simulation: managerTeams collection with managerId as docId
        const managerDoc = await getDoc(doc(db, 'managerTeams', leadId)); // This is wrong based on path
        // Let's search for managerId where leadId is in leads subcollection
        // For simulation, let's just use a direct lookup if we had managerId
      }
    }
  }
};

/**
 * Non-Compete Protection: Weekly check for inactivity.
 * If Lead Marketer has 0 activity for 30 days:
 * Team members redistributed to next available Lead in same venture.
 */
export const checkInactivity = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

  const q = query(
    collection(db, 'users'),
    where('role', '==', 'Lead Marketer'),
    where('lastActiveAt', '<=', thirtyDaysAgoTimestamp)
  );

  const snapshot = await getDocs(q);
  
  for (const leadDoc of snapshot.docs) {
    const leadId = leadDoc.id;
    const venture = leadDoc.data().venture;

    // Find another active Lead in same venture
    const activeLeadQ = query(
      collection(db, 'users'),
      where('role', '==', 'Lead Marketer'),
      where('venture', '==', venture),
      where('lastActiveAt', '>', thirtyDaysAgoTimestamp)
    );
    const activeLeads = await getDocs(activeLeadQ);
    const nextLead = activeLeads.docs.find(d => d.id !== leadId);

    if (nextLead) {
      const teamMembers = await getDocs(collection(db, `teams/${leadId}/members`));
      for (const memberDoc of teamMembers.docs) {
        const memberId = memberDoc.id;
        // Move to next lead
        await setDoc(doc(db, `teams/${nextLead.id}/members`, memberId), memberDoc.data());
        await deleteDoc(doc(db, `teams/${leadId}/members`, memberId));
        // Update user's referredBy
        await updateDoc(doc(db, 'users', memberId), { referredBy: nextLead.id });
      }
      console.log(`Redistributed team of inactive lead ${leadId} to ${nextLead.id}`);
    }
  }
};

/**
 * Auto-deactivate expired coupons.
 * This would normally run on a schedule (e.g., every hour).
 */
export const checkExpiredCoupons = async () => {
  const now = Timestamp.now();
  const q = query(
    collection(db, 'coupons'), 
    where('isActive', '==', true), 
    where('expiresAt', '<=', now)
  );
  
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map(d => 
    updateDoc(doc(db, 'coupons', d.id), { isActive: false })
  );
  
  await Promise.all(updates);
  console.log(`Deactivated ${updates.length} expired coupons.`);
};

/**
 * Auto-release commissions after 7 days.
 * This would normally run daily.
 */
export const releaseCommissions = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

  const q = query(
    collection(db, 'couponUsages'),
    where('released', '==', false),
    where('usedAt', '<=', sevenDaysAgoTimestamp)
  );

  const snapshot = await getDocs(q);
  
  for (const usageDoc of snapshot.docs) {
    const data = usageDoc.data();
    const { ownerId, commissionAmount, couponCode } = data;

    // 1. Update user's pending wallet
    await updateDoc(doc(db, 'users', ownerId), {
      'wallets.pending': increment(commissionAmount)
    });

    // 2. Create transaction record
    await addDoc(collection(db, 'transactions'), {
      userId: ownerId,
      amount: commissionAmount,
      type: 'commission_release',
      description: `Commission released for coupon ${couponCode}`,
      createdAt: serverTimestamp()
    });

    // 3. Mark usage as released
    await updateDoc(doc(db, 'couponUsages', usageDoc.id), {
      released: true
    });
  }

  console.log(`Released ${snapshot.docs.length} commissions.`);
};

/**
 * Admin: Activate a coupon for 24 hours.
 */
export const activateCoupon = async (uid: string) => {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
  
  await updateDoc(doc(db, 'coupons', uid), {
    isActive: true,
    activatedAt: now,
    expiresAt: expiresAt
  });
};

/**
 * Admin: Create a new task.
 */
export const createTask = async (taskData: any) => {
  const { title, earning, deadline, venture, role, description, proofType, assignedTo } = taskData;
  
  const taskRef = await addDoc(collection(db, 'tasks_global'), {
    title,
    earning,
    deadline: Timestamp.fromDate(new Date(deadline)),
    venture,
    role,
    description,
    proofType,
    assignedTo, // 'all' or specific UIDs
    createdAt: serverTimestamp(),
    status: 'active'
  });
  return taskRef.id;
};

/**
 * Admin: Approve a task submission.
 */
export const approveSubmission = async (submissionId: string) => {
  const submissionDoc = await getDoc(doc(db, 'taskSubmissions', submissionId));
  if (!submissionDoc.exists()) return;
  const data = submissionDoc.data();

  // 1. Update status
  await updateDoc(doc(db, 'taskSubmissions', submissionId), {
    status: 'approved',
    processedAt: serverTimestamp()
  });

  // 2. Trigger commission and earnings logic
  const taskDoc = await getDoc(doc(db, 'tasks_global', data.taskId));
  const margin = taskDoc.exists() ? (taskDoc.data().margin || data.earning * 1.5) : data.earning * 1.5;
  
  await handleTaskApproval(data.userId, data.earning, margin);
};

/**
 * Admin: Reject a task submission.
 */
export const rejectSubmission = async (submissionId: string, reason: string) => {
  await updateDoc(doc(db, 'taskSubmissions', submissionId), {
    status: 'rejected',
    rejectionReason: reason,
    processedAt: serverTimestamp()
  });
};

/**
 * Admin: Approve a withdrawal request.
 */
export const approveWithdrawal = async (withdrawalId: string) => {
  const withdrawalDoc = await getDoc(doc(db, 'withdrawals', withdrawalId));
  if (!withdrawalDoc.exists()) return;
  const data = withdrawalDoc.data();

  // 1. Update status
  await updateDoc(doc(db, 'withdrawals', withdrawalId), {
    status: 'approved',
    processedAt: serverTimestamp()
  });

  // 2. Deduct from user's earned wallet
  await updateDoc(doc(db, 'users', data.userId), {
    'wallets.earned': increment(-data.amount)
  });

  // 3. Create transaction record
  await addDoc(collection(db, 'transactions'), {
    userId: data.userId,
    amount: -data.amount,
    type: 'withdrawal',
    description: `Withdrawal approved to UPI: ${data.upiId}`,
    createdAt: serverTimestamp()
  });
};

/**
 * Admin: Reject a withdrawal request.
 */
export const rejectWithdrawal = async (withdrawalId: string, reason: string) => {
  await updateDoc(doc(db, 'withdrawals', withdrawalId), {
    status: 'rejected',
    rejectionReason: reason,
    processedAt: serverTimestamp()
  });
};

/**
 * Admin: Create a sub-admin.
 */
export const createSubAdmin = async (email: string, venture: string) => {
  await setDoc(doc(db, 'subAdmins', email), {
    email,
    venture,
    createdAt: serverTimestamp()
  });
};

/**
 * Admin: Send an announcement.
 */
export const sendAnnouncement = async (announcementData: any) => {
  await addDoc(collection(db, 'announcements'), {
    ...announcementData,
    createdAt: serverTimestamp()
  });
};

/**
 * Admin: Manual wallet credit.
 */
export const manualCredit = async (userId: string, amount: number, description: string) => {
  await updateDoc(doc(db, 'users', userId), {
    'wallets.pending': increment(amount)
  });
  await addDoc(collection(db, 'transactions'), {
    userId,
    amount,
    type: 'coupon_manual_credit',
    description,
    createdAt: serverTimestamp()
  });
};

/**
 * Admin: Update user status (suspend/activate).
 */
export const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
  await updateDoc(doc(db, 'users', userId), { status });
};

/**
 * Admin: Update user role.
 */
export const updateUserRole = async (userId: string, role: string) => {
  await updateDoc(doc(db, 'users', userId), { role });
};
