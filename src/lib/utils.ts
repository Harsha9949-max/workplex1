/**
 * Centralized error handling utility
 */

export interface AppError {
  message: string;
  code?: string;
  details?: string;
  timestamp: number;
}

/**
 * Safe async handler - prevents unhandled promise rejections
 */
export const safeAsync = async <T>(
  promise: Promise<T>,
  fallback?: T | null
): Promise<{ data: T | null; error: AppError | null }> => {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (err) {
    const error: AppError = {
      message: err instanceof Error ? err.message : 'An unexpected error occurred',
      code: (err as any)?.code,
      timestamp: Date.now()
    };
    console.error('Async error:', error);
    return { data: fallback ?? null, error };
  }
};

/**
 * Debounce utility
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Format UPI ID validation
 */
export const isValidUpiId = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(upiId);
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return phone;
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  try {
    const jsDate = date?.toDate ? date.toDate() : new Date(date);
    return jsDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format timestamp to relative time
 */
export const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
  } catch {
    return 'Unknown';
  }
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (user: any): boolean => {
  return !!user?.uid;
};

/**
 * Role display name converter
 */
export const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
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
  return roleMap[role] || role;
};

/**
 * Level color mapping
 */
export const getLevelColor = (level: string): string => {
  const colorMap: Record<string, string> = {
    'Bronze': '#CD7F32',
    'Silver': '#C0C0C0',
    'Gold': '#FFD700',
    'Platinum': '#E5E4E2',
    'Legend': '#E8B84B'
  };
  return colorMap[level] || '#9CA3AF';
};
