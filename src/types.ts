/**
 * WorkPlex — Shared Types & Constants
 */
import CryptoJS from 'crypto-js';
import { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

// Re-export Timestamp for other files
export { Timestamp };
export type { FirebaseUser };

// --- Constants ---
export const AES_SECRET = (import.meta as any).env?.VITE_AES_SECRET || 'fallback-secret';
export const VENTURES = ['BuyRix', 'Vyuma', 'TrendyVerse', 'Growplex'] as const;

export type Venture = 'BuyRix' | 'Vyuma' | 'TrendyVerse' | 'Growplex';

export type UserRole =
  | 'marketer'
  | 'content_creator'
  | 'reseller'
  | 'lead_marketer'
  | 'manager'
  | 'client_acquirer'
  | 'support_agent'
  | 'social_promoter'
  | 'sub_admin'
  | 'admin';

export const VentureRoleMap: Record<Venture, UserRole[]> = {
  'BuyRix': ['marketer', 'content_creator', 'reseller', 'lead_marketer', 'manager'],
  'Vyuma': ['marketer', 'content_creator', 'reseller', 'lead_marketer', 'manager'],
  'TrendyVerse': ['marketer', 'content_creator', 'reseller', 'lead_marketer', 'manager'],
  'Growplex': ['reseller', 'client_acquirer', 'support_agent', 'social_promoter']
};

// --- Interfaces ---
export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  username: string;
  age: number;
  venture?: Venture;
  role?: UserRole;
  mode?: UserMode;
  shopPublished?: boolean;
  shopSlug?: string;
  upiId: string;
  bankAccount: string;
  aadhaar: string; // AES Encrypted
  pan: string;     // AES Encrypted
  deviceFingerprint: string;
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Legend';
  streak: number;
  joinedAt: Timestamp;
  contractSigned: boolean;
  kycDone: boolean;
  firstTaskDone: boolean;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed';
  onboardingStep: number;
  wallets: {
    earned: number;
    pending: number;
    bonus: number;
    savings: number;
  };
  savingsPercent: number;
  referredBy?: string;
  lastActiveDate?: Timestamp;
  badges: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string;
  venture: Venture;
  role: UserRole[];
  earnAmount: number;
  deadline: Timestamp;
  proofType: 'image' | 'link' | 'text';
  proofRequirements: string;
  assignedTo: string[] | 'all';
  isCrossVenture: boolean;
  isMystery: boolean;
  mysteryWindow?: number; // in hours
  createdAt: Timestamp;
}

export interface TaskSubmission {
  id: string;
  userId: string;
  userName: string;
  taskId: string;
  taskTitle: string;
  proofLink: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  rejectionReason?: string;
}

export interface FraudAlert {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  flaggedAt: any;
  status: 'active' | 'dismissed' | 'action_taken';
}

export interface SubAdmin {
  id: string;
  email: string;
  venture: string;
  createdAt: any;
}

// --- Additional types used across components ---
export interface UserData {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  username: string;
  age: number;
  venture?: Venture;
  role?: UserRole;
  mode?: UserMode;
  shopPublished?: boolean;
  shopSlug?: string;
  upiId?: string;
  bankAccount?: string;
  level?: string;
  streak?: number;
  wallets?: {
    earned: number;
    pending: number;
    bonus: number;
    savings: number;
  };
  onboardingStatus?: string;
  onboardingStep?: number;
  contractSigned?: boolean;
  kycDone?: boolean;
  firstTaskDone?: boolean;
  badges?: string[];
  [key: string]: any;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  earnAmount: number;
  earning?: number;
  difficulty?: string;
  deadline?: any;
  status?: string;
  venture?: string;
  type?: string;
  createdAt?: any;
  [key: string]: any;
}

export interface CouponData {
  id: string;
  code: string;
  ownerId: string;
  isActive: boolean;
  usageCount?: number;
  totalEarned?: number;
  expiresAt?: any;
  [key: string]: any;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  link?: string;
  venture?: string;
  createdAt?: any;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'earning' | 'withdrawal' | 'bonus' | 'streak' | 'referral';
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  description?: string;
  createdAt?: any;
  [key: string]: any;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: 'upi' | 'bank';
  upiId?: string;
  bankAccount?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt?: any;
  processedAt?: any;
  [key: string]: any;
}

// --- Partner Store Types ---

export type UserMode = 'Promoter' | 'Partner';

export interface PartnerShop {
  shopName: string;
  shopSlug: string;
  logo?: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  isActive: boolean;
  totalSales: number;
  totalOrders: number;
  totalMarginEarned: number;
  createdAt: any;
  lastActiveAt: any;
}

export interface PartnerProduct {
  productId: string;
  hvrsBasePrice: number;
  partnerSellingPrice: number;
  partnerMargin: number;
  productName: string;
  category: string;
  images: string[];
  description: string;
  isActive: boolean;
  addedAt: any;
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
  products: {
    productId: string;
    productName: string;
    quantity: number;
    hvrsBasePrice: number;
    partnerSellingPrice: number;
    partnerMargin: number;
    subtotal: number;
  }[];
  totalAmount: number;
  totalPartnerMargin: number;
  totalHVRSAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderedAt: any;
  deliveredAt: any;
  marginReleaseAt: any;
  marginStatus: 'holding' | 'pending' | 'earned' | 'cancelled';
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

export interface PartnerMargin {
  orderId: string;
  amount: number;
  status: 'holding' | 'pending' | 'earned';
  orderedAt: any;
  releaseAt: any;
  releasedAt: any;
}

export interface PartnerWallet {
  pendingMargin: number;
  availableMargin: number;
  totalWithdrawn: number;
}

export interface PartnerWithdrawalRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerShopName: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any;
  processedAt?: any;
  rejectionReason?: string;
}

export interface CatalogProduct {
  id: string;
  skuId: string;
  productName: string;
  category: string;
  hvrsBasePrice: number;
  suggestedRetailPrice: number;
  description: string;
  images: string[];
  stockStatus: 'in_stock' | 'out_of_stock';
  venture: Venture;
  isActive: boolean;
  createdAt: any;
}

export interface Coupon {
  id: string;
  code: string;
  ownerId: string;
  isActive: boolean;
  usageCount?: number;
  totalEarned?: number;
  [key: string]: any;
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
  usedAt: any;
  released: boolean;
}

// --- Enums ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// --- Utility Functions ---
export const encrypt = (text: string) => CryptoJS.AES.encrypt(text, AES_SECRET).toString();

export const getDeviceFingerprint = () => {
  const data = navigator.userAgent + screen.width + screen.height + screen.colorDepth;
  return CryptoJS.SHA256(data).toString();
};

export const generateCouponCode = (venture: Venture) => {
  const prefixes: Record<Venture, string> = {
    BuyRix: 'BX',
    Vyuma: 'VY',
    TrendyVerse: 'TV',
    Growplex: 'GX'
  };
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefixes[venture]}-${randomPart}`;
};

export const shareOnWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

export const calculateCommission = (productPrice: number) => {
  const margin = productPrice * 0.175;
  const commission = margin * 0.10;
  return { margin, commission };
};

export const getNextLevel = (currentLevel: string): { name: string; min: number } | null => {
  const levels = [
    { name: 'Bronze', min: 0 },
    { name: 'Silver', min: 5000 },
    { name: 'Gold', min: 25000 },
    { name: 'Platinum', min: 100000 },
    { name: 'Legend', min: 500000 }
  ];
  const currentIdx = levels.findIndex(l => l.name === currentLevel);
  return currentIdx < levels.length - 1 ? levels[currentIdx + 1] : null;
};

export const STREAK_BONUS_AMOUNT = 50;
export const STREAK_BONUS_INTERVAL = 7;
export const MIN_WITHDRAWAL = 200;
export const BONUS_CONVERSION_THRESHOLD = 200;
export const DAILY_WITHDRAWAL_LIMIT = 50000;

export const BADGE_DEFINITIONS = [
  { id: 'first_sale', name: 'First Sale', description: 'Completed your first approved task!' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintained a 7-day streak!' },
  { id: 'coupon_king', name: 'Coupon King', description: 'Used 100+ coupons!' },
  { id: 'top_earner', name: 'Top Earner', description: 'Reached #1 on weekly leaderboard!' },
  { id: 'club_10k', name: '10K Club', description: 'Earned over ₹10,000 total!' },
  { id: 'club_50k', name: '50K Club', description: 'Earned over ₹50,000 total!' },
  { id: 'team_builder', name: 'Team Builder', description: 'Built a team of 10+ members!' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Completed a mystery task within 30 mins!' },
  { id: 'early_bird', name: 'Early Bird', description: 'One of the first 1,000 users!' },
  { id: 'venture_master', name: 'Venture Master', description: 'Worked across 2+ ventures!' },
  { id: 'perfect_month', name: 'Perfect Month', description: 'Completed all tasks for 30 days!' },
  { id: 'platinum_worker', name: 'Platinum Worker', description: 'Reached Platinum level!' },
];

// --- Firestore Error Handler ---
import { auth } from './firebase';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log error with context
  console.error(`Firestore Error [${operationType}] at ${path}:`, errorMessage);

  // Log auth state for debugging
  if (auth.currentUser) {
    console.error('Auth state:', {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified
    });
  } else {
    console.error('No authenticated user');
  }

  // Don't throw - just log. This prevents crashes in snapshot listeners.
  return null;
}
