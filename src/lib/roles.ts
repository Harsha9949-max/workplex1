/**
 * Role normalization and level management utilities
 * Centralized source of truth for roles and levels
 */

import { UserRole } from '../types';

/**
 * Normalize role to lowercase snake_case format
 * Handles: 'Lead Marketer', 'lead_marketer', 'LeadMarketer', etc.
 */
export const normalizeRole = (role: string | undefined): UserRole => {
  if (!role) return 'marketer';
  
  // Convert to lowercase and replace spaces with underscores
  const normalized = role.toLowerCase().replace(/\s+/g, '_');
  
  // Validate against known roles
  const validRoles: UserRole[] = [
    'marketer',
    'content_creator',
    'reseller',
    'lead_marketer',
    'manager',
    'client_acquirer',
    'support_agent',
    'social_promoter',
    'sub_admin',
    'admin'
  ];
  
  return validRoles.includes(normalized as UserRole) 
    ? (normalized as UserRole) 
    : 'marketer';
};

/**
 * Check if role is a team lead role
 */
export const isTeamLead = (role: string | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'lead_marketer' || normalized === 'manager';
};

/**
 * Check if role is a partner role
 */
export const isPartner = (role: string | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'reseller';
};

/**
 * Check if role is an admin role
 */
export const isAdmin = (role: string | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'sub_admin';
};

/**
 * Get display name for role (for UI)
 */
export const getRoleDisplayName = (role: string | undefined): string => {
  const normalized = normalizeRole(role);
  const displayNames: Record<UserRole, string> = {
    'marketer': 'Marketer',
    'content_creator': 'Content Creator',
    'reseller': 'Reseller',
    'lead_marketer': 'Lead Marketer',
    'manager': 'Manager',
    'client_acquirer': 'Client Acquirer',
    'support_agent': 'Support Agent',
    'social_promoter': 'Social Promoter',
    'sub_admin': 'Sub-Admin',
    'admin': 'Admin'
  };
  return displayNames[normalized] || 'User';
};

/**
 * Level thresholds - SINGLE SOURCE OF TRUTH
 */
export const LEVEL_THRESHOLDS = {
  Bronze: 0,
  Silver: 5000,
  Gold: 25000,
  Platinum: 100000,
  Legend: 500000
} as const;

export type Level = keyof typeof LEVEL_THRESHOLDS;

export const LEVELS: Array<{ name: Level; min: number; color: string }> = [
  { name: 'Bronze', min: 0, color: '#CD7F32' },
  { name: 'Silver', min: 5000, color: '#C0C0C0' },
  { name: 'Gold', min: 25000, color: '#FFD700' },
  { name: 'Platinum', min: 100000, color: '#E5E4E2' },
  { name: 'Legend', min: 500000, color: '#E8B84B' }
];

/**
 * Get current level based on total earnings
 */
export const getCurrentLevel = (totalEarnings: number): Level => {
  if (totalEarnings >= LEVEL_THRESHOLDS.Legend) return 'Legend';
  if (totalEarnings >= LEVEL_THRESHOLDS.Platinum) return 'Platinum';
  if (totalEarnings >= LEVEL_THRESHOLDS.Gold) return 'Gold';
  if (totalEarnings >= LEVEL_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
};

/**
 * Get next level info
 */
export const getNextLevel = (currentLevel: Level): { name: Level; min: number } | null => {
  const currentIndex = LEVELS.findIndex(l => l.name === currentLevel);
  return currentIndex < LEVELS.length - 1 
    ? { name: LEVELS[currentIndex + 1].name, min: LEVELS[currentIndex + 1].min }
    : null;
};

/**
 * Calculate progress to next level (0-100)
 */
export const getLevelProgress = (totalEarnings: number): number => {
  const currentLevel = getCurrentLevel(totalEarnings);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 100; // Max level
  
  const currentMin = LEVEL_THRESHOLDS[currentLevel];
  const nextMin = nextLevel.min;
  
  return Math.min(100, ((totalEarnings - currentMin) / (nextMin - currentMin)) * 100);
};

/**
 * Badge definitions - SINGLE SOURCE OF TRUTH
 */
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
