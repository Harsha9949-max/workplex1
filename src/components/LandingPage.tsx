/**
 * WorkPlex — Professional Landing Page
 * Clean, modern, and responsive design
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ChevronRight, TrendingUp, Smartphone, Globe,
  Briefcase, PlayCircle, Star, CheckCircle, ArrowRight, Zap,
  X, Users, Award, Clock, Target, Wallet, BarChart3,
  Menu, Sparkles, Rocket, Gift
} from 'lucide-react';

interface LandingPageProps {
  handleGoogleSignIn?: () => void;
  phoneAuthStep?: string;
  handlePhoneSignIn?: (phoneNumber: string) => void;
  verifyOtp?: (otp: string) => void;
  setPhoneAuthStep?: (step: string) => void;
}

export default function LandingPage({
  handleGoogleSignIn,
  phoneAuthStep,
  handlePhoneSignIn,
  verifyOtp,
  setPhoneAuthStep
}: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll handler with cleanup
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowAuthModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-gray-800 shadow-lg'
            : 'bg-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-black" />
              </div>
              <span className="text-2xl font-black tracking-tight">WORKPLEX</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">
                How It Works
              </button>
              <button onClick={() => scrollToSection('ventures')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">
                Ventures
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="text-sm font-medium text-gray-300 hover:text-[#E8B84B] transition-colors">
                Testimonials
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-[#E8B84B] hover:bg-[#D4A743] text-black px-6 py-2.5 rounded-full font-bold text-sm transition-all"
              >
                Sign In
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-[#E8B84B] text-black px-4 py-2 rounded-full font-bold text-sm"
              >
                Login
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-gray-800 overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-300 hover:text-[#E8B84B]">
                  Features
                </button>
                <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left py-2 text-gray-300 hover:text-[#E8B84B]">
                  How It Works
                </button>
                <button onClick={() => scrollToSection('ventures')} className="block w-full text-left py-2 text-gray-300 hover:text-[#E8B84B]">
                  Ventures
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="block w-full text-left py-2 text-gray-300 hover:text-[#E8B84B]">
                  Testimonials
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-[#E8B84B]" />
                <span className="text-sm font-medium">By HVRS Innovations</span>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6">
                Earn From{' '}
                <span className="bg-gradient-to-r from-[#E8B84B] to-[#00C9A7] bg-clip-text text-transparent">
                  Anywhere
                </span>
                <br />
                Work Smarter
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-lg text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0">
                Join a growing community of professionals earning through our AI-powered gig platform. Complete tasks, build teams, and grow your income on your own terms.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <Rocket className="w-5 h-5" />
                  Get Started
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors">
                  Learn More
                </button>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00C9A7]" />
                  <span className="text-sm text-gray-400">Free to Join</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00C9A7]" />
                  <span className="text-sm text-gray-400">Fast Payouts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00C9A7]" />
                  <span className="text-sm text-gray-400">24/7 Support</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] rounded-3xl border border-gray-800 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Sample Dashboard</p>
                    <p className="text-3xl font-black text-[#00C9A7]">Track Your Progress</p>
                  </div>
                  <div className="w-14 h-14 bg-[#00C9A7]/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-[#00C9A7]" />
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { task: 'Task Completed', status: 'Done', color: '#00C9A7' },
                    { task: 'Task In Progress', status: 'Active', color: '#E8B84B' },
                    { task: 'New Task Available', status: 'New', color: '#3B82F6' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                          <CheckCircle className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <div>
                          <p className="font-bold">{item.task}</p>
                          <p className="text-xs text-gray-500">{item.status}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-500" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-800 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Secure Payouts', icon: Wallet, color: '#E8B84B' },
              { label: 'Growing Community', icon: Users, color: '#FFFFFF' },
              { label: 'Protected Data', icon: ShieldCheck, color: '#00C9A7' },
              { label: 'Positive Feedback', icon: Star, color: '#E8B84B' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}10` }}>
                  <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <p className="text-lg font-black" style={{ color: stat.color }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-full mb-4">
              <Zap className="w-4 h-4 text-[#E8B84B]" />
              <span className="text-sm font-medium">Powerful Features</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">Why Choose WorkPlex?</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to succeed in the gig economy, all in one platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Wallet, title: 'Convenient Withdrawals', desc: 'Request payouts directly to your UPI or bank account with quick processing.', color: '#00C9A7' },
              { icon: BarChart3, title: 'Smart Task Matching', desc: 'Receive task suggestions based on your skills, location, and activity history.', color: '#E8B84B' },
              { icon: Users, title: 'Team Building', desc: 'Invite others to join your team and earn commissions from their completed work.', color: '#A855F7' },
              { icon: ShieldCheck, title: 'Strong Security', desc: 'Industry-standard encryption for all sensitive data. Your information is protected.', color: '#3B82F6' },
              { icon: Smartphone, title: 'Mobile First', desc: 'Complete tasks anywhere, anytime from your smartphone. Work on your terms.', color: '#EC4899' },
              { icon: Award, title: 'Progressive Rewards', desc: 'Level up as you complete more tasks. Unlock access to higher-value opportunities.', color: '#F59E0B' }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-3xl border border-white/5 hover:border-[#E8B84B]/30 transition-all"
              >
                <div className="w-14 h-14 mb-6 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${feature.color}10` }}>
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#111111]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00C9A7]/10 border border-[#00C9A7]/20 rounded-full mb-4">
              <Target className="w-4 h-4 text-[#00C9A7]" />
              <span className="text-sm font-medium">Simple Process</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">How WorkPlex Works</h2>
            <p className="text-gray-400 text-lg">Get started in three straightforward steps</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: 'Create Your Profile', desc: 'Sign up with your phone number and complete quick verification.', color: '#E8B84B' },
              { step: 2, title: 'Browse Available Tasks', desc: 'Explore tasks from partner ventures. Pick what matches your skills.', color: '#FFFFFF' },
              { step: 3, title: 'Complete & Earn', desc: 'Finish tasks, submit your work, and track your earnings.', color: '#00C9A7' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-[#0A0A0A] p-8 rounded-3xl border border-gray-800 text-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mb-6 mx-auto"
                  style={{ backgroundColor: `${item.color}10`, color: item.color }}
                >
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ventures Section */}
      <section id="ventures" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Partner Ventures</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">Our Partner Ecosystem</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Multiple ventures to choose from, each offering unique opportunities
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'BuyRix', desc: 'E-commerce & retail opportunities', color: '#E8B84B' },
              { name: 'Vyuma', desc: 'Content creation & marketing', color: '#00C9A7' },
              { name: 'TrendyVerse', desc: 'Lifestyle & social commerce', color: '#A855F7' },
              { name: 'Growplex', desc: 'Social growth & networking', color: '#3B82F6' }
            ].map((venture, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-white/5 to-transparent p-6 rounded-3xl border border-white/5 text-center"
              >
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl font-black"
                  style={{ backgroundColor: `${venture.color}20`, color: venture.color }}
                >
                  {venture.name[0]}
                </div>
                <h3 className="text-xl font-bold mb-2">{venture.name}</h3>
                <p className="text-sm text-gray-400">{venture.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#111111]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-4">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">User Stories</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">What Our Users Say</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'RM', role: 'Freelance Marketer', text: 'WorkPlex has given me the flexibility to earn on my own schedule. The platform is intuitive and payouts are reliable.' },
              { name: 'SK', role: 'Content Creator', text: 'I love how easy it is to find tasks that match my skills. The team building feature has helped me grow my income significantly.' },
              { name: 'AP', role: 'Team Lead', text: 'The progressive reward system keeps me motivated. Every level unlocked brings better opportunities and higher earnings.' }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0A0A0A] p-8 rounded-3xl border border-gray-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E8B84B] to-[#00C9A7] flex items-center justify-center text-black font-bold">
                    {testimonial.name}
                  </div>
                  <div>
                    <p className="font-bold">{testimonial.role}</p>
                    <p className="text-sm text-gray-500">WorkPlex User</p>
                  </div>
                </div>
                <p className="text-gray-400">{testimonial.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-black mb-6">Ready to Start Earning?</h2>
            <p className="text-xl text-gray-400 mb-8">Join thousands of professionals already earning on WorkPlex</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-[#E8B84B] to-[#F5D08A] text-black px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-transform"
            >
              Get Started Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-black">WORKPLEX</span>
              </div>
              <p className="text-sm text-gray-400">By HVRS Innovations</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollToSection('ventures')} className="hover:text-white transition-colors">Ventures</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><span className="cursor-not-allowed">Help Center</span></li>
                <li><span className="cursor-not-allowed">Contact Us</span></li>
                <li><span className="cursor-not-allowed">FAQ</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><span className="cursor-not-allowed">Terms of Service</span></li>
                <li><span className="cursor-not-allowed">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>© 2026 WorkPlex by HVRS Innovations. All rights reserved.</p>
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] rounded-3xl p-8 max-w-md w-full border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black">Welcome Back</h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {handleGoogleSignIn && (
                  <button
                    onClick={() => {
                      handleGoogleSignIn();
                      setShowAuthModal(false);
                    }}
                    className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                  >
                    Continue with Google
                  </button>
                )}

                {handlePhoneSignIn && phoneAuthStep === 'number' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-4 py-3 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          handlePhoneSignIn(e.currentTarget.value);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[type="tel"]') as HTMLInputElement;
                        if (input?.value) handlePhoneSignIn(input.value);
                      }}
                      className="w-full mt-3 bg-[#E8B84B] text-black py-3 rounded-xl font-bold hover:bg-[#D4A743] transition-colors"
                    >
                      Send OTP
                    </button>
                  </div>
                )}

                {verifyOtp && phoneAuthStep === 'otp' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Enter OTP</label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      className="w-full bg-[#0A0A0A] border border-gray-700 rounded-xl px-4 py-3 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          verifyOtp(e.currentTarget.value);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                        if (input?.value) verifyOtp(input.value);
                      }}
                      className="w-full mt-3 bg-[#E8B84B] text-black py-3 rounded-xl font-bold hover:bg-[#D4A743] transition-colors"
                    >
                      Verify OTP
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
