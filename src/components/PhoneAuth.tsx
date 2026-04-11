/**
 * WorkPlex — PhoneAuth Component
 * Phone OTP authentication with Firebase + Google Sign-In fallback
 * Production-ready with reCAPTCHA, device fingerprinting, error handling
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithPopup,
  AuthError,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { normalizePhone, isValidPhone, getDeviceFingerprint } from '../lib/security';
import { isAdminEmail } from '../types';

// ============================================================
// Props
// ============================================================

export interface PhoneAuthProps {
  onAuthComplete: (user: FirebaseUser, method: 'phone' | 'google') => void;
  onError: (error: string) => void;
  onGoogleSignIn?: () => Promise<void>;
}

type AuthStep = 'phone' | 'otp' | 'verifying';

// ============================================================
// Component
// ============================================================

export default function PhoneAuth({ onAuthComplete, onError, onGoogleSignIn }: PhoneAuthProps) {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ============================================================
  // Effects
  // ============================================================

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Initialize reCAPTCHA when component mounts
  useEffect(() => {
    if (recaptchaReady || !recaptchaContainerRef.current) return;
    if (recaptchaVerifierRef.current) return;

    let verifier: RecaptchaVerifier | null = null;

    try {
      verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        'expired-callback': () => {
          setRecaptchaReady(false);
          recaptchaVerifierRef.current = null;
          setError('Security session expired. Please refresh and try again.');
        },
        'error-callback': () => {
          setRecaptchaReady(false);
          recaptchaVerifierRef.current = null;
          setError('Security check failed. Please refresh the page.');
        },
      });

      verifier.render().then(() => {
        setRecaptchaReady(true);
        recaptchaVerifierRef.current = verifier;
      }).catch((err: Error) => {
        console.error('[PhoneAuth] reCAPTCHA render error:', err);
        setError('Failed to initialize security check. Please refresh.');
      });
    } catch (e: unknown) {
      console.error('[PhoneAuth] reCAPTCHA init error:', e);
      setError('Failed to initialize security check. Please refresh.');
    }
  }, [recaptchaReady]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Clear error on step change
  useEffect(() => {
    setError(null);
  }, [step]);

  // ============================================================
  // Helpers
  // ============================================================

  const handleError = useCallback((message: string) => {
    setError(message);
    onError(message);
  }, [onError]);

  // ============================================================
  // Phone OTP Flow
  // ============================================================

  const handleSendOTP = async () => {
    setError(null);

    if (!isValidPhone(phoneNumber)) {
      handleError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (!recaptchaVerifierRef.current) {
      handleError('Security check not ready. Please wait a moment and try again.');
      return;
    }

    const formattedPhone = normalizePhone(phoneNumber);

    try {
      setLoading(true);
      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current
      );
      setConfirmationResult(result);
      setStep('otp');
      // Focus first OTP input after transition
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const firebaseError = err as AuthError;
      console.error('[PhoneAuth] Phone sign-in error:', firebaseError);

      switch (firebaseError.code) {
        case 'auth/invalid-phone-number':
          handleError('Invalid phone number. Please check and try again.');
          break;
        case 'auth/too-many-requests':
          handleError('Too many attempts. Please wait a few minutes and try again.');
          break;
        case 'auth/captcha-check-failed':
          handleError('Security verification failed. Please refresh and try again.');
          break;
        case 'auth/operation-not-allowed':
          handleError('Phone authentication is not enabled. Please contact support.');
          break;
        case 'auth/quotas-exceeded':
          handleError('SMS quota exceeded. Please try Google sign-in instead.');
          break;
        default:
          handleError(firebaseError.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  const handlePasteOTP = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    setError(null);
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      handleError('Please enter the complete 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      setStep('verifying');

      if (confirmationResult) {
        const credential = await confirmationResult.confirm(otpCode);
        const user = credential.user;

        // Admin detection
        if (isAdminEmail(user.email)) {
          onAuthComplete(user, 'phone');
          return;
        }

        // Store device fingerprint for one-device-one-account enforcement
        const fingerprint = getDeviceFingerprint();
        localStorage.setItem('workplex_device_fp', fingerprint);

        onAuthComplete(user, 'phone');
      } else {
        handleError('Verification session expired. Please request a new OTP.');
        setStep('phone');
      }
    } catch (err: unknown) {
      const firebaseError = err as AuthError;
      console.error('[PhoneAuth] OTP verification error:', firebaseError);

      if (firebaseError.code === 'auth/invalid-verification-code') {
        handleError('Invalid OTP. Please check and try again.');
      } else if (firebaseError.code === 'auth/code-expired') {
        handleError('OTP has expired. Please request a new one.');
        setStep('phone');
      } else if (firebaseError.code === 'auth/session-expired') {
        handleError('Session expired. Please request a new OTP.');
        setStep('phone');
      } else {
        handleError(firebaseError.message || 'Verification failed. Please try again.');
      }
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    setOtp(new Array(6).fill(''));
    setStep('phone');

    if (!recaptchaVerifierRef.current) {
      // Re-initialize reCAPTCHA
      setRecaptchaReady(false);
      recaptchaVerifierRef.current = null;
      return;
    }

    const formattedPhone = normalizePhone(phoneNumber);

    try {
      setLoading(true);
      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current
      );
      setConfirmationResult(result);
      setStep('otp');
      setResendCooldown(30);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const firebaseError = err as AuthError;
      handleError(firebaseError.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Google Sign-In
  // ============================================================

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setLoading(true);

      if (onGoogleSignIn) {
        await onGoogleSignIn();
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Admin detection
        if (isAdminEmail(user.email)) {
          onAuthComplete(user, 'google');
          return;
        }

        onAuthComplete(user, 'google');
      }
    } catch (err: unknown) {
      const firebaseError = err as AuthError;
      console.error('[PhoneAuth] Google sign-in error:', firebaseError);

      if (firebaseError.code === 'auth/popup-closed-by-user') {
        return; // User closed popup, no error needed
      }
      if (firebaseError.code === 'auth/popup-blocked') {
        handleError('Pop-up was blocked. Please allow pop-ups for this site and try again.');
      } else if (firebaseError.code === 'auth/account-exists-with-different-credential') {
        handleError('An account already exists with this email. Please use the original sign-in method.');
      } else {
        handleError(firebaseError.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Render: Phone Input
  // ============================================================

  const renderPhoneInput = () => (
    <motion.div
      key="phone"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#E8B84B]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#E8B84B]/20">
          <Smartphone size={32} className="text-[#E8B84B]" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Verify Your Phone</h2>
        <p className="text-gray-400 text-sm">
          Enter your 10-digit mobile number to receive a verification code
        </p>
      </div>

      {/* Phone Input */}
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Phone size={18} className="text-gray-500" />
              <span className="text-white font-bold text-sm">+91</span>
              <div className="w-px h-5 bg-gray-700" />
            </div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(cleaned);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendOTP();
              }}
              placeholder="Enter 10-digit number"
              className="w-full bg-[#111111] border border-white/10 rounded-2xl pl-24 pr-4 py-4 focus:border-[#E8B84B] outline-none transition-all placeholder:text-gray-700 text-white"
              maxLength={10}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 p-4 bg-[#E8B84B]/5 border border-[#E8B84B]/20 rounded-2xl">
          <ShieldCheck size={18} className="text-[#E8B84B] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            We&apos;ll send a 6-digit verification code via SMS. Standard messaging rates may apply.
            One phone number = one account.
          </p>
        </div>

        {/* Send OTP Button */}
        <button
          onClick={handleSendOTP}
          disabled={phoneNumber.length !== 10 || loading}
          className="w-full bg-[#E8B84B] text-black font-black py-4 rounded-2xl shadow-lg shadow-[#E8B84B]/20 disabled:opacity-20 disabled:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Sending OTP...
            </>
          ) : (
            <>
              Send Verification Code
              <CheckCircle size={20} />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-white/5 flex-1" />
          <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">or</span>
          <div className="h-px bg-white/5 flex-1" />
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-[#111111] border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#1A1A1A] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-phone-container" ref={recaptchaContainerRef} className="hidden" />
    </motion.div>
  );

  // ============================================================
  // Render: OTP Input
  // ============================================================

  const renderOTPInput = () => (
    <motion.div
      key="otp"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <button
          onClick={() => {
            setStep('phone');
            setOtp(new Array(6).fill(''));
          }}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold"
          disabled={loading}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="w-16 h-16 bg-[#00C9A7]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#00C9A7]/20">
          <ShieldCheck size={32} className="text-[#00C9A7]" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Enter Verification Code</h2>
        <p className="text-gray-400 text-sm">
          We sent a 6-digit code to{' '}
          <span className="text-white font-medium">+91 {phoneNumber}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="space-y-6">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                otpInputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOTPChange(index, e.target.value)}
              onKeyDown={(e) => handleOTPKeyDown(index, e)}
              onPaste={index === 0 ? handlePasteOTP : undefined}
              className="w-12 h-14 text-center text-xl font-bold bg-[#111111] border border-white/10 rounded-xl focus:border-[#00C9A7] outline-none transition-all text-white"
              disabled={loading}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerifyOTP}
          disabled={otp.join('').length !== 6 || loading}
          className="w-full bg-[#00C9A7] text-black font-black py-4 rounded-2xl shadow-lg shadow-[#00C9A7]/20 disabled:opacity-20 disabled:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {loading && step === 'verifying' ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify &amp; Continue
              <CheckCircle size={20} />
            </>
          )}
        </button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Didn&apos;t receive the code?</p>
          {resendCooldown > 0 ? (
            <p className="text-gray-600 font-bold text-sm">
              Resend available in {resendCooldown}s
            </p>
          ) : (
            <button
              onClick={handleResendOTP}
              disabled={loading}
              className="text-[#E8B84B] font-bold text-sm hover:underline disabled:opacity-50"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {step === 'phone' && renderPhoneInput()}
        {step === 'otp' && renderOTPInput()}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
