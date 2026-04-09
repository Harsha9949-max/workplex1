import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ShieldCheck, ChevronRight, TrendingUp, Smartphone, Globe,
  Briefcase, PlayCircle, Star, CheckCircle, ArrowRight, Zap,
  X, Users, Award, Clock, Target, Wallet, BarChart3,
  ArrowUpRight, ChevronDown, Menu, Sparkles, Rocket, Gift, ShoppingBag
} from 'lucide-react';
import { PhoneInput, OtpInput } from '../App';

export default function LandingPage({
  handleGoogleSignIn,
  phoneAuthStep,
  handlePhoneSignIn,
  verifyOtp,
  setPhoneAuthStep,
  recaptchaRef
}: any) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden relative selection:bg-[#E8B84B]/30 font-sans">

      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
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
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <motion.div
              className="flex items-center gap-2 sm:gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(232,184,75,0.4)]">
                <ShieldCheck size={20} className="text-black" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">WORKPLEX</span>
            </motion.div>

            <div className="hidden lg:flex gap-8 items-center">
              <a href="#features" className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">How It Works</a>
              <a href="#ventures" className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">Ventures</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">Testimonials</a>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-full transition-all border border-white/10 backdrop-blur-md text-white font-bold text-sm"
              >
                Sign In
              </button>
            </div>

            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-[#E8B84B] text-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(232,184,75,0.3)]"
              >
                Login
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/5"
            >
              <div className="px-6 py-6 space-y-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">Features</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">How It Works</a>
                <a href="#ventures" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">Ventures</a>
                <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block text-base font-medium text-gray-300 hover:text-[#E8B84B] py-2">Testimonials</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 md:pt-40 pb-16 md:pb-24 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
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
            <Sparkles size={14} className="text-[#E8B84B]" />
            <span className="text-gray-300">By HVRS Innovations</span>
            <span className="px-2 py-0.5 bg-[#E8B84B]/20 rounded-full text-[#E8B84B] text-[10px]">NEW</span>
          </motion.div>

          <motion.h1
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
            Join 50,000+ professionals earning real money through our AI-powered gig platform. Complete tasks, build teams, and grow your income on your own terms.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
          >
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 shadow-[0_10px_40px_rgba(232,184,75,0.3)] hover:shadow-[0_15px_50px_rgba(232,184,75,0.4)] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
            >
              <Rocket size={20} />
              Start Earning Now
              <ChevronRight size={20} />
            </button>
            <button className="bg-white/5 border border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-white/10 transition-all backdrop-blur-sm w-full sm:w-auto group">
              <PlayCircle size={20} className="group-hover:text-[#E8B84B] transition-colors" />
              <span>Watch Demo</span>
            </button>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-8 sm:mt-10 flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00C9A7]" />
              <span className="text-xs sm:text-sm text-gray-400">Free to Join</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00C9A7]" />
              <span className="text-xs sm:text-sm text-gray-400">Instant Payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00C9A7]" />
              <span className="text-xs sm:text-sm text-gray-400">24/7 Support</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex-1 w-full max-w-lg lg:max-w-none relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8B84B]/20 to-[#00C9A7]/20 blur-3xl rounded-full" />
            <motion.div
              className="relative bg-gradient-to-br from-[#1A1A1A] to-[#111111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-1">Today's Earnings</p>
                    <p className="text-3xl sm:text-4xl font-black text-[#00C9A7]">₹2,450</p>
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#00C9A7]/10 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} className="text-[#00C9A7]" />
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {[
                    { task: 'Product Review', amount: '₹450', status: 'Completed' },
                    { task: 'Social Share', amount: '₹200', status: 'Pending' },
                    { task: 'Survey', amount: '₹150', status: 'Completed' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${item.status === 'Completed' ? 'bg-[#00C9A7]/20' : 'bg-[#E8B84B]/20'
                          }`}>
                          <CheckCircle size={16} className={item.status === 'Completed' ? 'text-[#00C9A7]' : 'text-[#E8B84B]'} />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold">{item.task}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{item.status}</p>
                        </div>
                      </div>
                      <p className="text-sm sm:text-base font-black text-[#00C9A7]">{item.amount}</p>
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
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: '₹5M+', label: 'Paid Out Daily', icon: Wallet, color: 'text-[#E8B84B]' },
              { value: '50K+', label: 'Active Workers', icon: Users, color: 'text-white' },
              { value: '100%', label: 'Secure Payouts', icon: ShieldCheck, color: 'text-[#00C9A7]' },
              { value: '4.9/5', label: 'User Rating', icon: Star, color: 'text-[#E8B84B]' },
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
                  <stat.icon size={20} className={stat.color} />
                </div>
                <p className={`text-2xl sm:text-3xl lg:text-4xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 sm:mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E8B84B]/10 border border-[#E8B84B]/20 mb-4 sm:mb-6">
              <Zap size={14} className="text-[#E8B84B]" />
              <span className="text-gray-300">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">Why Choose WorkPlex?</h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">Everything you need to succeed in the gig economy, all in one platform.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: <Wallet className="text-[#00C9A7]" size={28} />,
                title: 'Instant Withdrawals',
                desc: 'Get paid directly to your UPI or bank account within minutes. No waiting periods.',
                gradient: 'from-[#00C9A7]/10 to-transparent'
              },
              {
                icon: <BarChart3 className="text-[#E8B84B]" size={28} />,
                title: 'AI-Powered Tasks',
                desc: 'Smart task matching based on your skills, location, and earning history.',
                gradient: 'from-[#E8B84B]/10 to-transparent'
              },
              {
                icon: <Users className="text-purple-400" size={28} />,
                title: 'Team Building',
                desc: 'Build your team and earn commissions from their work. Grow together.',
                gradient: 'from-purple-400/10 to-transparent'
              },
              {
                icon: <ShieldCheck className="text-blue-400" size={28} />,
                title: 'Bank-Grade Security',
                desc: 'AES-256 encryption for all sensitive data. Your information is always protected.',
                gradient: 'from-blue-400/10 to-transparent'
              },
              {
                icon: <Smartphone className="text-pink-400" size={28} />,
                title: 'Mobile First',
                desc: 'Complete tasks anywhere, anytime from your smartphone. Work on your terms.',
                gradient: 'from-pink-400/10 to-transparent'
              },
              {
                icon: <Award className="text-yellow-400" size={28} />,
                title: 'Rewards & Levels',
                desc: 'Level up as you earn. Unlock higher commissions and exclusive perks.',
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
      <section id="how-it-works" className="relative z-10 py-16 sm:py-24 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#00C9A7]/10 border border-[#00C9A7]/20 mb-4 sm:mb-6">
              <Target size={14} className="text-[#00C9A7]" />
              <span className="text-gray-300">Simple Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">How WorkPlex Works</h2>
            <p className="text-gray-400 text-base sm:text-lg">Start earning in three easy steps</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#E8B84B]/0 via-[#E8B84B]/30 to-[#00C9A7]/0 -translate-y-1/2" />

            {[
              {
                step: 1,
                title: 'Create Your Profile',
                desc: 'Sign up with your phone number and complete quick KYC verification to unlock all features.',
                color: 'text-[#E8B84B]',
                bg: 'bg-[#E8B84B]/10'
              },
              {
                step: 2,
                title: 'Choose Your Tasks',
                desc: 'Browse available tasks from top ventures. Pick what matches your skills and interests.',
                color: 'text-white',
                bg: 'bg-white/5'
              },
              {
                step: 3,
                title: 'Submit & Get Paid',
                desc: 'Complete tasks, submit proof, and watch your earnings grow. Withdraw instantly.',
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
      <section id="ventures" className="relative z-10 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-purple-400/10 border border-purple-400/20 mb-4 sm:mb-6">
              <Briefcase size={14} className="text-purple-400" />
              <span className="text-gray-300">Partner Ventures</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">Elite Ventures Inside</h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">Choose your path and grow with our premium partner platforms.</p>
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
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                  <venture.icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mb-1 sm:mb-2">{venture.name}</h3>
                <p className="text-xs sm:text-sm text-gray-400 text-center">{venture.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 py-16 sm:py-24 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#E8B84B]/10 border border-[#E8B84B]/20 mb-4 sm:mb-6">
              <Star size={14} className="text-[#E8B84B]" />
              <span className="text-gray-300">Success Stories</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">They Earned It</h2>
            <p className="text-gray-400 text-base sm:text-lg">Join thousands of high-earning professionals</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                name: "Rahul S.",
                role: "BuyRix Lead Marketer",
                amount: "₹45,000/mo",
                text: "WorkPlex transformed my side hustle. The wallet system is transparent, and payouts are blazing fast.",
                avatar: "RS"
              },
              {
                name: "Priya M.",
                role: "Vyuma Content Creator",
                amount: "₹20,000/mo",
                text: "I love the UI! Claiming tasks and tracking my level progress feels like a game where I get paid real money.",
                avatar: "PM"
              },
              {
                name: "Amit K.",
                role: "Manager",
                amount: "₹85,000/mo",
                text: "Building my team on WorkPlex was easy. The commission tracking system does all the heavy lifting automatically.",
                avatar: "AK"
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
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div className="flex text-[#E8B84B]">
                    {[...Array(5)].map((_, j) => <Star key={j} size={14} sm:size={16} fill="currentColor" className="text-[#E8B84B]" />)}
                  </div>
                  <span className="text-[#00C9A7] font-black text-sm sm:text-base">{testimonial.amount}</span>
                </div>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-full flex items-center justify-center text-black font-black text-sm sm:text-base">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">{testimonial.name}</h4>
                    <span className="text-xs text-gray-500">{testimonial.role}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
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
            <Gift size={32} sm:size={40} className="text-[#E8B84B]" />
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">Ready to Take Control?</h2>
          <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto">
            Stop waiting. Start earning your worth securely and instantly today. Join now and get ₹27 bonus!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black px-6 sm:px-10 py-3.5 sm:py-5 rounded-2xl font-black text-base sm:text-xl hover:scale-105 active:scale-95 transition-transform shadow-[0_10px_40px_rgba(232,184,75,0.3)] flex items-center justify-center gap-2 sm:gap-3"
            >
              Create Your Account
              <ChevronRight size={20} sm:size={24} />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6">✓ Free to join  ✓ Instant payouts  ✓ 24/7 support</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#111111] pt-12 sm:pt-16 pb-6 sm:pb-8 border-t border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-lg flex items-center justify-center">
                <ShieldCheck size={16} sm:size={18} className="text-black" />
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
              <li><a href="#features" className="hover:text-[#E8B84B] transition-colors">Features</a></li>
              <li><a href="#ventures" className="hover:text-[#E8B84B] transition-colors">Ventures</a></li>
              <li><a href="#testimonials" className="hover:text-[#E8B84B] transition-colors">Testimonials</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#E8B84B] transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-[#E8B84B] transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-[#E8B84B] transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
              <li><a href="#" className="hover:text-[#E8B84B] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#E8B84B] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#E8B84B] transition-colors">KYC Guidelines</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/5 pt-4 sm:pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} HVRS Innovations. All rights reserved.</p>
          <div className="flex gap-3 sm:gap-4 font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1"><ShieldCheck size={12} sm:size={14} /> Secure</span>
            <span className="flex items-center gap-1"><Zap size={12} sm:size={14} /> Fast</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} sm:size={14} /> Trusted</span>
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
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(232,184,75,0.3)]">
                  <ShieldCheck size={28} sm:size={32} className="text-black" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400 mb-6 sm:mb-8 text-center text-sm">Sign in securely to access your dashboard</p>

                <div className="w-full space-y-3 sm:space-y-4">
                  <button
                    onClick={() => {
                      setShowAuthModal(false);
                      handleGoogleSignIn();
                    }}
                    className="w-full bg-white text-black font-bold py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 sm:gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] text-sm sm:text-base"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 sm:w-6 sm:h-6" alt="Google" />
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 sm:gap-4 py-2">
                    <div className="h-px bg-gray-800 flex-1" />
                    <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">Or</span>
                    <div className="h-px bg-gray-800 flex-1" />
                  </div>

                  <div className="bg-[#0A0A0A] p-4 sm:p-6 rounded-2xl border border-gray-800">
                    {phoneAuthStep === 'number' ? (
                      <PhoneInput onSubmit={handlePhoneSignIn} />
                    ) : (
                      <OtpInput onSubmit={(otp: string) => {
                        setShowAuthModal(false);
                        verifyOtp(otp);
                      }} onBack={() => setPhoneAuthStep('number')} />
                    )}
                  </div>
                </div>
                <div ref={recaptchaRef} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
