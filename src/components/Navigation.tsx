/**
 * WorkPlex — Enhanced Navigation Component
 * Desktop sidebar + Mobile bottom nav with improved UX
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  ListTodo,
  Wallet,
  UserCircle,
  ShoppingBag,
  Users,
  Trophy,
  Bell,
} from 'lucide-react';

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  direction?: 'horizontal' | 'vertical';
  badge?: number;
}

export function NavButton({ active, icon, label, onClick, direction, badge }: NavButtonProps) {
  const isHorizontal = direction === 'horizontal';
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 transition-all duration-200 ${isHorizontal
          ? 'flex-row w-full px-4 py-3 rounded-xl'
          : 'flex-col gap-1 p-2'
        }`}
    >
      {active && (
        <motion.div
          layoutId="activeNav"
          className={`absolute inset-0 ${isHorizontal ? 'rounded-xl' : 'rounded-lg'} ${isHorizontal ? 'bg-[#E8B84B]/10' : 'bg-[#E8B84B]/5'
            }`}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <div className={`relative transition-all duration-200 ${active ? 'text-[#E8B84B]' : 'text-gray-500 hover:text-gray-400'}`}>
        {React.cloneElement(icon as React.ReactElement, {
          size: isHorizontal ? 20 : 24,
          strokeWidth: active ? 2.5 : 2,
        })}
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span
        className={`font-bold uppercase tracking-wider relative ${active ? 'text-[#E8B84B]' : 'text-gray-500'
          } ${isHorizontal ? 'text-xs' : 'text-[9px] sm:text-[10px]'}`}
      >
        {label}
      </span>
    </button>
  );
}

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userData: any;
  notifications?: number;
}

export function DesktopSidebar({ activeTab, setActiveTab, userData, notifications = 0 }: NavigationProps) {
  return (
    <div className="hidden md:flex flex-col fixed top-0 left-0 w-72 h-full bg-[#0F0F0F] border-r border-gray-800/50 p-6 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 bg-gradient-to-br from-[#E8B84B] to-[#F5D08A] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(232,184,75,0.3)]">
          <svg viewBox="0 0 64 64" className="w-7 h-7 fill-black">
            <path d="M32 4L8 18v28l24 14 24-14V18L32 4zm0 6.5L50 21.5v21L32 53.5 14 42.5v-21L32 10.5z" />
            <path d="M32 20l-12 7v14l12 7 12-7V27L32 20zm0 5l7 4v8l-7 4-7-4v-8l7-4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">WorkPlex</h1>
          {userData && (
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {userData.venture}
            </span>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      {userData && (
        <div className="mb-6 p-4 bg-[#1A1A1A] rounded-2xl border border-gray-800/50 hover:border-[#E8B84B]/30 transition-all cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={userData.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userData.name}`}
                className="w-11 h-11 rounded-xl object-cover border-2 border-gray-700 group-hover:border-[#E8B84B] transition-colors"
                alt="Profile"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00C9A7] rounded-full border-2 border-[#1A1A1A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{userData.name}</p>
              <p className="text-[10px] text-[#E8B84B] font-bold">{userData.level} · {userData.role}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Earned</p>
              <p className="text-sm font-black text-[#00C9A7]">₹{(userData.wallets?.earned || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Streak</p>
              <p className="text-sm font-black text-[#E8B84B]">{userData.streak || 0} days</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <div className="flex-1 space-y-1">
        <NavButton active={activeTab === 'home'} icon={<Home />} label="Home" onClick={() => setActiveTab('home')} direction="horizontal" />
        {userData?.role === 'Reseller' && (
          <NavButton active={activeTab === 'catalog'} icon={<ShoppingBag />} label="Catalog" onClick={() => setActiveTab('catalog')} direction="horizontal" />
        )}
        {(userData?.role === 'Lead Marketer' || userData?.role === 'Manager') && (
          <NavButton active={activeTab === 'chat'} icon={<Users />} label="Team" onClick={() => setActiveTab('chat')} direction="horizontal" badge={notifications} />
        )}
        <NavButton active={activeTab === 'tasks'} icon={<ListTodo />} label="Tasks" onClick={() => setActiveTab('tasks')} direction="horizontal" />
        <NavButton active={activeTab === 'leaderboard'} icon={<Trophy />} label="Ranks" onClick={() => setActiveTab('leaderboard')} direction="horizontal" />
        <NavButton active={activeTab === 'wallet'} icon={<Wallet />} label="Wallet" onClick={() => setActiveTab('wallet')} direction="horizontal" />
        <NavButton active={activeTab === 'profile'} icon={<UserCircle />} label="Profile" onClick={() => setActiveTab('profile')} direction="horizontal" />
      </div>

      {/* Notifications */}
      <button className="mt-4 w-full flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-2xl border border-gray-800/50 hover:border-[#E8B84B]/30 transition-all group">
        <div className="relative">
          <Bell size={18} className="text-gray-400 group-hover:text-[#E8B84B] transition-colors" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
        </div>
        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Notifications</span>
        {notifications > 0 && (
          <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {notifications} new
          </span>
        )}
      </button>
    </div>
  );
}

export function MobileBottomNav({ activeTab, setActiveTab, userData, notifications = 0 }: NavigationProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-gray-800/50 px-1 py-2 z-40 safe-area-bottom">
      <div className="flex justify-around items-center">
        <NavButton active={activeTab === 'home'} icon={<Home />} label="Home" onClick={() => setActiveTab('home')} />
        <NavButton active={activeTab === 'tasks'} icon={<ListTodo />} label="Tasks" onClick={() => setActiveTab('tasks')} />
        {userData?.role === 'Reseller' && (
          <NavButton active={activeTab === 'catalog'} icon={<ShoppingBag />} label="Catalog" onClick={() => setActiveTab('catalog')} />
        )}
        {(userData?.role === 'Lead Marketer' || userData?.role === 'Manager') && (
          <NavButton active={activeTab === 'chat'} icon={<Users />} label="Team" onClick={() => setActiveTab('chat')} badge={notifications} />
        )}
        <NavButton active={activeTab === 'leaderboard'} icon={<Trophy />} label="Ranks" onClick={() => setActiveTab('leaderboard')} />
        <NavButton active={activeTab === 'wallet'} icon={<Wallet />} label="Wallet" onClick={() => setActiveTab('wallet')} />
        <NavButton active={activeTab === 'profile'} icon={<UserCircle />} label="Profile" onClick={() => setActiveTab('profile')} />
      </div>
    </div>
  );
}
