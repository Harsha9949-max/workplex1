/**
 * WorkPlex — Security Utilities
 * AES-256 encryption, device fingerprinting, input validators
 * Production-ready security layer for sensitive data handling
 */
import CryptoJS from 'crypto-js';

// AES Secret Key (from environment variable, fallback for dev only)
const AES_SECRET = import.meta.env.VITE_AES_SECRET || 'workplex-secure-key-2026';

// ============================================================
// AES-256 Encryption / Decryption
// ============================================================

/**
 * Encrypt sensitive data using AES-256 (via CryptoJS)
 * Data is encrypted before being stored in Firestore
 */
export const encrypt = (text: string): string => {
  if (!text || text.trim() === '') return '';
  return CryptoJS.AES.encrypt(text.trim(), AES_SECRET).toString();
};

/**
 * Decrypt sensitive data using AES-256
 * Returns empty string if decryption fails (never throws)
 */
export const decrypt = (ciphertext: string): string => {
  if (!ciphertext || ciphertext.trim() === '') return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, AES_SECRET);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || '';
  } catch {
    console.warn('[Security] Decryption failed — data may be corrupted');
    return '';
  }
};

// ============================================================
// Device Fingerprinting
// ============================================================

/**
 * Generate a deterministic device fingerprint using SHA-256
 * Combines navigator properties to create a unique but non-PII identifier
 * Used for: one-account-per-device enforcement, fraud detection
 */
export const getDeviceFingerprint = (): string => {
  const components = [
    navigator.userAgent || '',
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth || 24),
    navigator.language || 'en',
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency || 1),
    String(navigator.maxTouchPoints || 0),
  ].join('|');

  return CryptoJS.SHA256(components).toString();
};

// ============================================================
// Input Validators
// ============================================================

/**
 * Validate Aadhaar number (exactly 12 digits)
 * Accepts formats: "123456789012", "1234 5678 9012"
 */
export const isValidAadhaar = (aadhaar: string): boolean => {
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
};

/**
 * Validate PAN number (format: ABCDE1234F)
 * 5 letters + 4 digits + 1 letter, case-insensitive
 */
export const isValidPAN = (pan: string): boolean => {
  const cleaned = pan.toUpperCase().trim();
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned);
};

/**
 * Validate UPI ID format (e.g., name@upi, name@paytm, 9876543210@upi)
 */
export const isValidUPI = (upi: string): boolean => {
  return /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9]+$/.test(upi.trim());
};

/**
 * Validate Indian phone number (10 digits starting with 6-9)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^[6-9]/.test(cleaned);
};

/**
 * Validate email format (basic RFC 5322 subset)
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Validate age (must be 18+)
 */
export const isValidAge = (age: number | string): boolean => {
  const numAge = typeof age === 'string' ? parseInt(age, 10) : age;
  return !isNaN(numAge) && numAge >= 18 && numAge <= 120;
};

/**
 * Validate name (at least 2 characters, letters/spaces/basic punctuation)
 */
export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s.'-]+$/.test(name.trim());
};

// ============================================================
// Phone Number Normalization
// ============================================================

/**
 * Normalize phone number to E.164 format (+91XXXXXXXXXX)
 * Handles: "9876543210", "+919876543210", "09876543210"
 */
export const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  // Already has country code +91 (13 digits)
  if (cleaned.length === 13 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  // Leading zero (e.g., "09876543210" -> 11 digits, strip leading 0)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `+91${cleaned.slice(1)}`;
  }

  // Indian number without country code (10 digits)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // Return as-is if format is unexpected
  return `+${cleaned}`;
};

// ============================================================
// Slug Generation
// ============================================================

/**
 * Generate a URL-safe slug from a name
 * e.g., "Trendy Fashion Hub" -> "trendy-fashion-hub-a1b2c"
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 7);
};

// ============================================================
// Coupon Code Generation
// ============================================================

/**
 * Generate a unique coupon code with venture prefix
 * e.g., BuyRix -> "BX-A1B2C3"
 */
export const generateCouponCode = (venture: string): string => {
  const prefixes: Record<string, string> = {
    BuyRix: 'BX',
    Vyuma: 'VY',
    TrendyVerse: 'TV',
    Growplex: 'GX',
  };
  const prefix = prefixes[venture] || 'WP';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
};

// ============================================================
// Password Strength Checker (for future use)
// ============================================================

/**
 * Check password strength (returns 0-4 score)
 * 0: very weak, 1: weak, 2: fair, 3: strong, 4: very strong
 */
export const getPasswordStrength = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
};

// ============================================================
// Data Sanitization
// ============================================================

/**
 * Sanitize user input by removing HTML tags and trimming
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
};

/**
 * Truncate text to max length with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

// ============================================================
// Default Export
// ============================================================

export default {
  encrypt,
  decrypt,
  getDeviceFingerprint,
  isValidAadhaar,
  isValidPAN,
  isValidUPI,
  isValidPhone,
  isValidEmail,
  isValidAge,
  isValidName,
  normalizePhone,
  generateSlug,
  generateCouponCode,
  getPasswordStrength,
  sanitizeInput,
  truncate,
};
