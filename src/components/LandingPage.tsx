import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ShieldCheck, ChevronRight, TrendingUp, Smartphone, Globe,
  Briefcase, PlayCircle, Star, CheckCircle, ArrowRight, Zap,
  X, Users, Award, Clock, Target, Wallet, BarChart3,
  ArrowUpRight, ChevronDown, Menu, Sparkles, Rocket, Gift, ShoppingBag
} from 'lucide-react';
import { PhoneInput, OtpInput } from '../App';

interface LandingPageProps {
  handleGoogleSignIn?: () => void;
  phoneAuthStep?: string;
  handlePhoneSignIn?: (phoneNumber: string) => void;
  verifyOtp?: (otp: string) => void;
  setPhoneAuthStep?: (step: string) => void;
  recaptchaRef?: React.RefObject<HTMLDivElement | null>;
}

export default function LandingPage({
  handleGoogleSignIn,
  phoneAuthStep,
  handlePhoneSignIn,
  verifyOtp,
  setPhoneAuthStep,
  recaptchaRef
}: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  // Focus trap for mobile menu
  useEffect(() => {
    if (mobileMenuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (showAuthModal) setShowAuthModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, showAuthModal]);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-10 h-10 border-2 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full animate-spin" />
        <span className="sr-only">Loading WorkPlex...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden relative selection:bg-[#E8B84B]/30 font-sans">

      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#E8B84B]/8 blur-[120px] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-[#00C9A7]/8 blur-[120px] rounded-full"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Navbar */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 shadow-lg'
          : 'bg-transparent'
          }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <motion.div
              className="flex items-center gap-2 sm:gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(232,184,75,0.4)]">
                <ShieldCheck size={20} className="text-black" aria-hidden="true" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">WORKPLEX</span>
            </motion.div>

            <div className="hidden lg:flex gap-8 items-center">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors" aria-label="Navigate to Features section">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors" aria-label="Navigate to How It Works section">How It Works</button>
              <button onClick={() => scrollToSection('ventures')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors" aria-label="Navigate to Ventures section">Ventures</button>
              <button onClick={() => scrollToSection('testimonials')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors" aria-label="Navigate to Testimonials section">Testimonials</button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-full transition-all border border-white/10 backdrop-blur-md text-white font-bold text-sm"
                aria-label="Sign in to your account"
              >
                Sign In
              </button>
            </div>

            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-[#E8B84B] text-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(232,184,75,0.3)]"
                aria-label="Login to your account"
              >
                Login
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                <Menu size={24} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5"
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="px-6 py-6 space-y-4">
                <button ref={firstMenuItemRef} onClick={() => scrollToSection('features')} className="block w-full text-left text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">Features</button>
                <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">How It Works</button>
                <button onClick={() => scrollToSection('ventures')} className="block w-full text-left text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">Ventures</button>
                <button onClick={() => scrollToSection('testimonials')} className="block w-full text-left text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">Testimonials</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 md:pt-40 pb-16 md:pb-24 flex flex-col lg:flex-row items-center gap-8 lg:gap-16" aria-labelledby="hero-heading">
        <motion.div
          className="flex-1 text-center lg:text-left"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-[#E8B84B]/10 to-[#00C9A7]/10 border border-[#E8B84B]/20 mb-6 sm:mb-8"
          >
            <Sparkles size={14} className="text-[#E8B84B]" aria-hidden="true" />
            <span className="text-gray-300">By HVRS Innovations</span>
            <span className="px-2 py-0.5 bg-[#E8B84B]/20 rounded-full text-[#E8B84B] text-[10px]">NEW</span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] mb-6 sm:mb-8 tracking-tight"
          >
            Earn From{' '}
            <span className="bg-gradient-to-r from-[#E8B84B] via-[#F5D08A] to-[#00C9A7] bg-clip-text text-transparent">
              Anywhere
            </span>
            <br />
            <span className="text-white">Work Smarter</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-gray-400 text-base sm:text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-8 sm:mb-10 leading-relaxed"
          >
            Join a growing community of professionals earning through our AI-powered gig platform. Complete tasks, build teams, and grow your income on your own terms.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
          >
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 shadow-[0_10px_40px_rgba(232,184,75,0.3)] hover:shadow-[0_15px_50px_rgba(232,184,75,0.4)] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
              aria-label="Get started and start earning"
            >
              <Rocket size={20} aria-hidden="true" />
              Get Started
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <button
              className="bg-white/5 border border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-white/10 transition-all backdrop-blur-sm w-full sm:w-auto group"
              aria-label="Learn more about WorkPlex"
            >
              <PlayCircle size={20} className="group-hover:text-[#E8B84B] transition-colors" aria-hidden="true" />
              <span>Learn More</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-8 sm:mt-10 flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00C9A7]" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-gray-400">Free to Join</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00C9A7]" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-gray-400">Fast Payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00C9A7]" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-gray-400">Support Available</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 w-full max-w-lg lg:max-w-none relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          role="img"
          aria-label="Illustration showing task completion and earnings dashboard"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8B84B]/20 to-[#00C9A7]/20 blur-3xl rounded-full" aria-hidden="true" />
            <motion.div
              className="relative bg-gradient-to-br from-[#1A1A1A] to-[#111111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Sample Dashboard</p>
                    <p className="text-2xl sm:text-3xl font-black text-[#00C9A7]">Track Your Progress</p>
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#00C9A7]/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 size={24} className="text-[#00C9A7]" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {[
                    { task: 'Task Completed', status: 'Done' },
                    { task: 'Task In Progress', status: 'Active' },
                    { task: 'New Task Available', status: 'New' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${item.status === 'Done' ? 'bg-[#00C9A7]/20' : item.status === 'Active' ? 'bg-[#E8B84B]/20' : 'bg-blue-400/20'
                          }`}>
                          <CheckCircle size={16} className={item.status === 'Done' ? 'text-[#00C9A7]' : item.status === 'Active' ? 'text-[#E8B84B]' : 'text-blue-400'} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold">{item.task}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{item.status}</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-gray-500" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <motion.section
        className="relative z-10 border-y border-white/5 bg-gradient-to-r from-[#111111] via-[#0F0F0F] to-[#111111] py-12 sm:py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        aria-label="Platform highlights"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { label: 'Secure Payouts', icon: Wallet, color: 'text-[#E8B84B]' },
              { label: 'Growing Community', icon: Users, color: 'text-white' },
              { label: 'Protected Data', icon: ShieldCheck, color: 'text-[#00C9A7]' },
              { label: 'Positive Feedback', icon: Star, color: 'text-[#E8B84B]' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 ${stat.color}/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} className={stat.color} aria-hidden="true" />
                </div>
                <p className={`text-base sm:text-lg lg:text-xl font-black ${stat.color}`}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-16 sm:py-24" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E8B84B]/10 border border-[#E8B84B]/20 mb-4 sm:mb-6">
              <Zap size={14} className="text-[#E8B84B]" aria-hidden="true" />
              <span className="text-gray-300">Powerful Features</span>
            </div>
            <h2 id="features-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">Why Choose WorkPlex?</h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">Everything you need to succeed in the gig economy, all in one platform.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: <Wallet className="text-[#00C9A7]" size={28} aria-hidden="true" />,
                title: 'Convenient Withdrawals',
                desc: 'Request payouts directly to your UPI or bank account. Quick processing times.',
                gradient: 'from-[#00C9A7]/10 to-transparent'
              },
              {
                icon: <BarChart3 className="text-[#E8B84B]" size={28} aria-hidden="true" />,
                title: 'Smart Task Matching',
                desc: 'Receive task suggestions based on your skills, location, and activity history.',
                gradient: 'from-[#E8B84B]/10 to-transparent'
              },
              {
                icon: <Users className="text-purple-400" size={28} aria-hidden="true" />,
                title: 'Team Building',
                desc: 'Invite others to join your team and earn commissions from their completed work.',
                gradient: 'from-purple-400/10 to-transparent'
              },
              {
                icon: <ShieldCheck className="text-blue-400" size={28} aria-hidden="true" />,
                title: 'Strong Security',
                desc: 'Encryption for all sensitive data. Your information is protected with industry-standard practices.',
                gradient: 'from-blue-400/10 to-transparent'
              },
              {
                icon: <Smartphone className="text-pink-400" size={28} aria-hidden="true" />,
                title: 'Mobile First',
                desc: 'Complete tasks anywhere, anytime from your smartphone. Work on your terms.',
                gradient: 'from-pink-400/10 to-transparent'
              },
              {
                icon: <Award className="text-yellow-400" size={28} aria-hidden="true" />,
                title: 'Progressive Rewards',
                desc: 'Level up as you complete more tasks. Unlock access to higher-value opportunities.',
                gradient: 'from-yellow-400/10 to-transparent'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/5 hover:border-[#E8B84B]/30 transition-all group`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-16 sm:py-24 bg-[#111111]" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#00C9A7]/10 border border-[#00C9A7]/20 mb-4 sm:mb-6">
              <Target size={14} className="text-[#00C9A7]" aria-hidden="true" />
              <span className="text-gray-300">Simple Process</span>
            </div>
            <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">How WorkPlex Works</h2>
            <p className="text-gray-400 text-base sm:text-lg">Get started in three straightforward steps</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#E8B84B]/0 via-[#E8B84B]/30 to-[#00C9A7]/0 -translate-y-1/2" aria-hidden="true" />

            {[
              {
                step: 1,
                title: 'Create Your Profile',
                desc: 'Sign up with your phone number and complete quick verification to unlock all features.',
                color: 'text-[#E8B84B]',
                bg: 'bg-[#E8B84B]/10'
              },
              {
                step: 2,
                title: 'Browse Available Tasks',
                desc: 'Explore tasks from partner ventures. Pick what matches your skills and interests.',
                color: 'text-white',
                bg: 'bg-white/5'
              },
              {
                step: 3,
                title: 'Complete & Earn',
                desc: 'Finish tasks, submit your work, and track your earnings. Request payouts when ready.',
                color: 'text-[#00C9A7]',
                bg: 'bg-[#00C9A7]/10'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                className="relative bg-[#0A0A0A] p-6 sm:p-8 rounded-3xl border border-white/5 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${item.bg} rounded-full flex items-center justify-center text-xl sm:text-2xl font-black ${item.color} mb-4 sm:mb-6 mx-auto border-2 border-white/10`}>
                  {item.step}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ventures Section */}
      <section id="ventures" className="relative z-10 py-16 sm:py-24" aria-labelledby="ventures-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-purple-400/10 border border-purple-400/20 mb-4 sm:mb-6">
              <Briefcase size={14} className="text-purple-400" aria-hidden="true" />
              <span className="text-gray-300">Partner Ventures</span>
            </div>
            <h2 id="ventures-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">Partner Ventures</h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">Explore opportunities across our partner platforms.</p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { name: 'BuyRix', desc: 'E-commerce Marketing', color: 'from-blue-500/20 to-blue-900/20', border: 'border-blue-500/30', icon: ShoppingBag },
              { name: 'Vyuma', desc: 'Content Creation', color: 'from-purple-500/20 to-purple-900/20', border: 'border-purple-500/30', icon: PlayCircle },
              { name: 'TrendyVerse', desc: 'Lifestyle & Trends', color: 'from-pink-500/20 to-pink-900/20', border: 'border-pink-500/30', icon: TrendingUp },
              { name: 'Growplex', desc: 'Social Growth', color: 'from-green-500/20 to-green-900/20', border: 'border-green-500/30', icon: Users },
            ].map((venture, i) => (
              <motion.div
                key={i}
                className={`bg-gradient-to-br ${venture.color} backdrop-blur-md p-6 sm:p-8 rounded-3xl border ${venture.border} flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-lg hover:shadow-xl`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                role="button"
                tabIndex={0}
                aria-label={`Learn more about ${venture.name}: ${venture.desc}`}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                  <venture.icon size={24} className="text-white" aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mb-1 sm:mb-2">{venture.name}</h3>
                <p className="text-xs sm:text-sm text-gray-400 text-center">{venture.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 py-16 sm:py-24 bg-[#111111]" aria-labelledby="testimonials-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E8B84B]/10 border border-[#E8B84B]/20 mb-4 sm:mb-6">
              <Star size={14} className="text-[#E8B84B]" aria-hidden="true" />
              <span className="text-gray-300">User Experiences</span>
            </div>
            <h2 id="testimonials-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">What Users Say</h2>
            <p className="text-gray-400 text-base sm:text-lg">Hear from people using WorkPlex</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                role: "Freelance Marketer",
                text: "WorkPlex gives me the flexibility to work on my own schedule. The platform is easy to use and payouts are reliable.",
                avatar: "RM"
              },
              {
                role: "Content Creator",
                text: "I appreciate how straightforward the task system is. Tracking my progress and leveling up keeps me motivated.",
                avatar: "SK"
              },
              {
                role: "Team Lead",
                text: "Building a team here has been a great experience. The commission structure is clear and the tools make management simple.",
                avatar: "AP"
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                className="bg-[#0A0A0A] p-6 sm:p-8 rounded-3xl border border-white/5 hover:border-[#E8B84B]/20 transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-start mb-4 sm:mb-6" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} sm:size={16} fill="currentColor" className="text-[#E8B84B]" aria-hidden="true" />)}
                </div>
                <blockquote className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
                  "{testimonial.text}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-full flex items-center justify-center text-black font-black text-sm sm:text-base">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">WorkPlex User</h4>
                    <span className="text-xs text-gray-500">{testimonial.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8" aria-labelledby="cta-heading">
        <motion.div
          className="max-w-4xl sm:max-w-5xl mx-auto bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-8 sm:p-12 md:p-16 rounded-3xl border border-[#E8B84B]/20 shadow-[0_0_60px_rgba(232,184,75,0.1)] text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 sm:mb-8 bg-[#E8B84B]/10 rounded-3xl flex items-center justify-center"
          >
            <Gift size={32} sm:size={40} className="text-[#E8B84B]" aria-hidden="true" />
          </motion.div>
          <h2 id="cta-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
            Start exploring available tasks and grow your income on your own terms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black px-6 sm:px-10 py-3.5 sm:py-5 rounded-2xl font-black text-base sm:text-xl hover:scale-105 active:scale-95 transition-transform shadow-[0_10px_40px_rgba(232,184,75,0.3)] flex items-center justify-center gap-2 sm:gap-3"
              aria-label="Create your account"
            >
              Create Your Account
              <ChevronRight size={20} sm:size={24} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6">Free to join. Fast payouts. Support available.</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#111111] pt-12 sm:pt-16 pb-6 sm:pb-8 border-t border-white/5 px-4 sm:px-6 lg:px-8" role="contentinfo">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-lg flex items-center justify-center">
                <ShieldCheck size={16} sm:size={18} className="text-black" aria-hidden="true" />
              </div>
              <span className="text-lg sm:text-xl font-black text-white">WorkPlex</span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              The premier gig work platform powering seamless task execution, transparent commissions, and secure payouts.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Platform</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
              <li><button onClick={() => scrollToSection('features')} className="hover:text-[#E8B84B] transition-colors">Features</button></li>
              <li><button onClick={() => scrollToSection('ventures')} className="hover:text-[#E8B84B] transition-colors">Ventures</button></li>
              <li><button onClick={() => scrollToSection('testimonials')} className="hover:text-[#E8B84B] transition-colors">Testimonials</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
              <li><span className="text-gray-600">Help Center</span></li>
              <li><span className="text-gray-600">Contact Us</span></li>
              <li><span className="text-gray-600">FAQ</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
              <li><span className="text-gray-600">Terms of Service</span></li>
              <li><span className="text-gray-600">Privacy Policy</span></li>
              <li><span className="text-gray-600">KYC Guidelines</span></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/5 pt-4 sm:pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} HVRS Innovations. All rights reserved.</p>
          <div className="flex gap-3 sm:gap-4 font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1"><ShieldCheck size={12} sm:size={14} aria-hidden="true" /> Secure</span>
            <span className="flex items-center gap-1"><Zap size={12} sm:size={14} aria-hidden="true" /> Fast</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} sm:size={14} aria-hidden="true" /> Trusted</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6"
            onClick={() => setShowAuthModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to your account"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="w-full max-w-md bg-[#111111] md:rounded-[2rem] rounded-t-[2rem] p-6 sm:p-8 border border-white/10 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors text-white"
                aria-label="Close sign in modal"
              >
                <X size={18} aria-hidden="true" />
              </button>

              <div className="flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(232,184,75,0.3)]">
                  <ShieldCheck size={28} sm:size={32} className="text-black" aria-hidden="true" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400 mb-6 sm:mb-8 text-center text-sm">Sign in securely to access your dashboard</p>

                <div className="w-full space-y-3 sm:space-y-4">
                  {handleGoogleSignIn && (
                    <button
                      onClick={() => {
                        setShowAuthModal(false);
                        handleGoogleSignIn();
                      }}
                      className="w-full bg-white text-black font-bold py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 sm:gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] text-sm sm:text-base"
                      aria-label="Sign in with Google"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 sm:w-6 sm:h-6" alt="" aria-hidden="true" />
                      Continue with Google
                    </button>
                  )}

                  <div className="flex items-center gap-3 sm:gap-4 py-2">
                    <div className="h-px bg-gray-800 flex-1" aria-hidden="true" />
                    <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">Or</span>
                    <div className="h-px bg-gray-800 flex-1" aria-hidden="true" />
                  </div>

                  <div className="bg-[#0A0A0A] p-4 sm:p-6 rounded-2xl border border-gray-800">
                    {phoneAuthStep === 'number' && handlePhoneSignIn ? (
                      <PhoneInput onSubmit={handlePhoneSignIn} />
                    ) : phoneAuthStep && verifyOtp && setPhoneAuthStep ? (
                      <OtpInput onSubmit={(otp: string) => {
                        setShowAuthModal(false);
                        verifyOtp(otp);
                      }} onBack={() => setPhoneAuthStep('number')} />
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-4">Phone authentication is being set up. Please try again shortly.</p>
                    )}
                  </div>
                </div>
                {recaptchaRef && <div ref={recaptchaRef} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
