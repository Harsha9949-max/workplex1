/**
 * WorkPlex — Complete Type Definitions
 * TypeScript interfaces for all data structures across the platform
 * Phase 1: Auth + Onboarding with dual-mode selection
 */
import { DocumentData, Timestamp, FieldValue } from 'firebase/firestore';

// ============================================================
// Constants & Enums
// ============================================================

export const VENTURES = ['BuyRix', 'Vyuma', 'TrendyVerse', 'Growplex'] as const;
export type Venture = typeof VENTURES[number];

export type UserMode = 'Promoter' | 'Partner';

export type UserRole =
  | 'Marketer'
  | 'Content Creator'
  | 'Reseller'
  | 'Lead Marketer'
  | 'Manager'
  | 'Client Acquiring'
  | 'Support Agent'
  | 'Social Promoter';

export type UserLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Legend';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export type TransactionStatus = 'pending' | 'completed' | 'rejected';
export type TransactionType =
  | 'earning'
  | 'withdrawal'
  | 'bonus'
  | 'streak'
  | 'referral'
  | 'coupon_commission'
  | 'shop_margin'
  | 'signup_bonus'
  | 'commission_release'
  | 'task_earning'
  | 'coupon_manual_credit';

export type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected';

export type TaskProofType = 'image' | 'link' | 'text';
export type TaskStatus = 'active' | 'assigned' | 'approved' | 'rejected' | 'expired';

export type CouponStatus = 'inactive' | 'active' | 'expired';

export type MarginReleaseStatus = 'holding' | 'pending' | 'earned' | 'cancelled';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export const SHOP_CATEGORIES = ['Fashion', 'Electronics', 'Home', 'Beauty', 'Sports'] as const;
export type ShopCategory = typeof SHOP_CATEGORIES[number];

// ============================================================
// Venture Role Map
// ============================================================

export const VentureRoleMap: Record<Venture, string[]> = {
  BuyRix: ['Marketer', 'Content Creator', 'Reseller', 'Lead Marketer', 'Manager'],
  Vyuma: ['Marketer', 'Content Creator', 'Reseller', 'Lead Marketer', 'Manager'],
  TrendyVerse: ['Marketer', 'Content Creator', 'Reseller', 'Lead Marketer', 'Manager'],
  Growplex: ['Reseller', 'Client Acquiring', 'Support Agent', 'Social Promoter'],
};

export function getVentureRoles(venture: Venture): string[] {
  return VentureRoleMap[venture] || [];
}

// ============================================================
// Level System
// ============================================================

export const LEVELS: Array<{ name: UserLevel; min: number; color: string }> = [
  { name: 'Bronze', min: 0, color: '#CD7F32' },
  { name: 'Silver', min: 5000, color: '#C0C0C0' },
  { name: 'Gold', min: 25000, color: '#FFD700' },
  { name: 'Platinum', min: 100000, color: '#E5E4E2' },
  { name: 'Legend', min: 500000, color: '#E8B84B' },
];

export const getCurrentLevel = (totalEarned: number): UserLevel => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalEarned >= LEVELS[i].min) return LEVELS[i].name;
  }
  return 'Bronze';
};

export const getNextLevel = (currentLevel: UserLevel): { name: UserLevel; min: number } | null => {
  const currentIdx = LEVELS.findIndex((l) => l.name === currentLevel);
  return currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
};

export const getLevelProgress = (totalEarned: number): number => {
  const currentLevel = getCurrentLevel(totalEarned);
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) return 100;
  const currentMin = LEVELS.find((l) => l.name === currentLevel)?.min || 0;
  return Math.min(100, ((totalEarned - currentMin) / (nextLevel.min - currentMin)) * 100);
};

// ============================================================
// Wallet
// ============================================================

export interface Wallet {
  earned: number;
  pending: number;
  bonus: number;
  savings: number;
}

export const defaultWallet = (): Wallet => ({
  earned: 0,
  pending: 27, // Rs.27 signup bonus (PENDING wallet)
  bonus: 0,
  savings: 0,
});

// ============================================================
// User Profile
// ============================================================

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  age: number;

  // Mode (CRITICAL — determines onboarding flow and feature access)
  mode: UserMode;

  // --- Promoter fields ---
  venture?: Venture;
  role?: UserRole;

  // --- Partner fields ---
  shopName?: string;
  shopSlug?: string;
  shopLogo?: string;
  categories?: ShopCategory[];
  defaultCommission?: number;
  shopPublished?: boolean;

  // --- Financial ---
  upiId: string;
  bankAccount: string;
  aadhaar: string; // AES encrypted
  pan: string; // AES encrypted

  // --- System ---
  deviceFingerprint: string;
  level: UserLevel;
  streak: number;
  contractSigned: boolean;
  kycDone: boolean;
  firstTaskDone: boolean;

  // --- Wallets ---
  wallets: Wallet;
  savingsPercent: number;

  // --- Timestamps ---
  joinedAt: Timestamp | FieldValue;
  lastActiveAt: Timestamp | FieldValue;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;

  // --- Optional ---
  username?: string;
  referredBy?: string;
  badges?: string[];
}

// ============================================================
// Onboarding Data (intermediate, before Firestore write)
// ============================================================

export interface OnboardingData {
  // Step 1: Phone OTP (handled by auth)
  phoneVerified: boolean;

  // Step 2: Basic Info
  name: string;
  age: number;
  photoURL?: string;

  // Step 3: Mode Selection
  mode: UserMode;

  // Promoter Steps (4-8)
  venture?: Venture;
  role?: UserRole;
  upiId?: string;
  bankAccount?: string;
  aadhaar?: string;
  pan?: string;

  // Partner Steps (4-5)
  shopName?: string;
  shopSlug?: string;
  shopLogo?: string;
  categories?: ShopCategory[];
  defaultCommission?: number;

  // Common
  savingsPercent: number;
  contractSigned: boolean;
}

// ============================================================
// Task Types
// ============================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  venture: Venture;
  role: UserRole[];
  earnAmount: number;
  deadline: Timestamp;
  proofType: TaskProofType;
  assignedTo: string[] | 'all';
  status: TaskStatus;
  isCrossVenture: boolean;
  isMystery: boolean;
  mysteryWindow?: number; // minutes
  createdAt: Timestamp | FieldValue;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  workerId: string;
  proofUrl?: string;
  proofText?: string;
  proofLink?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp | FieldValue;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  resubmissionCount: number;
  earnAmount: number;
}

// ============================================================
// Wallet & Transaction Types
// ============================================================

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  createdAt: Timestamp | FieldValue;
}

export interface Withdrawal {
  id: string;
  workerId: string;
  workerMode: UserMode;
  amount: number;
  upiId: string;
  status: WithdrawalStatus;
  requestedAt: Timestamp | FieldValue;
  approvedAt?: Timestamp;
  paidAt?: Timestamp;
  rejectionReason?: string;
  razorpayPayoutId?: string;
}

// ============================================================
// Coupon Types (Promoters only)
// ============================================================

export interface Coupon {
  id: string;
  code: string;
  venture: Venture;
  ownerId: string;
  isActive: boolean;
  activatedAt?: Timestamp;
  expiresAt?: Timestamp;
  usageCount: number;
  totalEarned: number;
}

export interface CouponUsage {
  id: string;
  couponCode: string;
  ownerId: string;
  buyerId: string;
  productId: string;
  productPrice: number;
  margin: number;
  commissionAmount: number;
  usedAt: Timestamp | FieldValue;
  released: boolean;
}

// ============================================================
// Partner Store Types
// ============================================================

export interface PartnerShop {
  shopName: string;
  shopSlug: string;
  logo?: string;
  bannerImage?: string;
  description?: string;
  primaryColor?: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  whatsappNumber?: string;
  categories: ShopCategory[];
  isActive: boolean;
  totalSales: number;
  totalOrders: number;
  totalMarginEarned: number;
  createdAt: Timestamp | FieldValue;
  lastActiveAt: Timestamp | FieldValue;
}

export interface PartnerProduct {
  productId: string;
  hvrsBasePrice: number;
  partnerSellingPrice: number;
  partnerMargin: number;
  productName: string;
  category: ShopCategory;
  description: string;
  images: string[];
  isActive: boolean;
  addedAt: Timestamp | FieldValue;
  totalSold: number;
}

export interface PartnerOrder {
  orderId: string;
  partnerId: string;
  partnerShopName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    hvrsBasePrice: number;
    partnerSellingPrice: number;
    partnerMargin: number;
    subtotal: number;
  }>;
  totalAmount: number;
  totalPartnerMargin: number;
  totalHVRSAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  orderedAt: Timestamp | FieldValue;
  deliveredAt?: Timestamp;
  marginReleaseAt: Timestamp;
  marginStatus: MarginReleaseStatus;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}

// ============================================================
// Gamification Types
// ============================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Badge[] = [
  { id: 'first_sale', name: 'First Sale', description: 'Complete first approved task or shop order', icon: '🏆' },
  { id: 'streak_7', name: '7-Day Streak', description: 'Maintain 7-day work streak', icon: '🔥' },
  { id: 'coupon_king', name: 'Coupon King', description: '100 coupon uses by others', icon: '🎫' },
  { id: 'top_earner', name: 'Top Earner', description: 'Rank #1 on weekly leaderboard', icon: '👑' },
  { id: 'club_10k', name: 'Rs.10K Club', description: 'Earn Rs.10,000 total', icon: '💰' },
  { id: 'club_50k', name: 'Rs.50K Legend', description: 'Earn Rs.50,000 total', icon: '🌟' },
  { id: 'team_builder', name: 'Team Builder', description: 'Recruit 10 workers', icon: '👥' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete mystery task in <30 mins', icon: '⚡' },
  { id: 'perfect_month', name: 'Perfect Month', description: 'Complete all tasks for 30 days', icon: '📅' },
  { id: 'venture_master', name: 'Venture Master', description: 'Work across 2+ ventures', icon: '🌐' },
  { id: 'early_bird', name: 'Early Bird', description: 'Join in first 1000 users', icon: '🐦' },
  { id: 'platinum_worker', name: 'Platinum Worker', description: 'Reach Platinum level', icon: '💎' },
  { id: 'shop_master', name: 'Shop Master', description: 'Add 100 products to shop', icon: '🏪' },
  { id: 'sales_champion', name: 'Sales Champion', description: 'Complete 50 shop orders', icon: '🏅' },
];

// ============================================================
// Firestore Collection Types (raw document data)
// ============================================================

export interface UserData extends DocumentData {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  age: number;
  mode: UserMode;
  venture?: Venture;
  role?: UserRole;
  shopName?: string;
  shopSlug?: string;
  shopLogo?: string;
  categories?: ShopCategory[];
  defaultCommission?: number;
  shopPublished?: boolean;
  upiId: string;
  bankAccount: string;
  aadhaar: string;
  pan: string;
  deviceFingerprint: string;
  level: UserLevel;
  streak: number;
  contractSigned: boolean;
  kycDone: boolean;
  firstTaskDone: boolean;
  wallets: Wallet;
  savingsPercent: number;
  joinedAt: Timestamp;
  lastActiveAt: Timestamp;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  username?: string;
  referredBy?: string;
  badges?: string[];
}

export interface TaskData extends DocumentData {
  id: string;
  title: string;
  description: string;
  venture: Venture;
  role: UserRole[];
  earnAmount: number;
  deadline: Timestamp;
  proofType: TaskProofType;
  assignedTo: string[] | 'all';
  status: TaskStatus;
  isCrossVenture: boolean;
  isMystery: boolean;
  mysteryWindow?: number;
}

export interface CouponData extends DocumentData {
  id: string;
  code: string;
  venture: Venture;
  ownerId: string;
  isActive: boolean;
  activatedAt?: Timestamp;
  expiresAt?: Timestamp;
  usageCount: number;
  totalEarned: number;
}

export interface Announcement extends DocumentData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// ============================================================
// Utility Functions
// ============================================================

export const generateSlug = (name: string): string => {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 7)
  );
};

export const generateCouponCode = (venture: Venture): string => {
  const prefixes: Record<Venture, string> = {
    BuyRix: 'BX',
    Vyuma: 'VY',
    TrendyVerse: 'TV',
    Growplex: 'GX',
  };
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefixes[venture]}-${random}`;
};

export const calculateCommission = (productPrice: number): { margin: number; commission: number } => {
  const margin = Math.round(productPrice * 0.15 * 100) / 100; // 15% margin
  const commission = Math.round(productPrice * 0.05 * 100) / 100; // 5% commission
  return { margin, commission };
};

export const formatCurrency = (amount: number): string => {
  return `Rs.${amount.toLocaleString('en-IN')}`;
};

// ============================================================
// Firestore Error Handling
// ============================================================

export enum OperationType {
  GET = 'get',
  LIST = 'list',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export const handleFirestoreError = (
  error: unknown,
  operation: OperationType,
  resource: string
): void => {
  const err = error as { code?: string; message?: string };
  console.error(`Firestore ${operation} error on ${resource}:`, err.code, err.message);

  switch (err.code) {
    case 'permission-denied':
      console.warn(`Permission denied for ${operation} on ${resource}`);
      break;
    case 'not-found':
      console.warn(`Resource not found: ${resource}`);
      break;
    case 'unavailable':
      console.warn(`Firestore unavailable, check network connection`);
      break;
    case 'deadline-exceeded':
      console.warn(`Operation ${operation} timed out on ${resource}`);
      break;
    default:
      console.error(`Unknown Firestore error:`, err.message);
  }
};

// ============================================================
// Auth Method Type
// ============================================================

export type AuthMethod = 'phone' | 'google';

// ============================================================
// Admin Configuration
// ============================================================

export const ADMIN_EMAILS = ['marateyh@gmail.com'] as const;

export const isAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email as (typeof ADMIN_EMAILS)[number]);
};
