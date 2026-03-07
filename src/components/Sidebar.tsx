import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import * as authService from '../services/authService';
import type { UserProfile } from '../types/types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  navItems: NavItem[];
  activePage: string;
  setActivePage: (id: string) => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, activePage, setActivePage, onLogout }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Load user profile from localStorage
    const profile = authService.getStoredProfile();
    setUserProfile(profile);
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const getInitials = (username: string) => {
    return username.substring(0, 1).toUpperCase();
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col items-center space-y-3">
          <img 
            src="/logo system tek.png" 
            alt="NurseCall Logo" 
            className="h-16 w-auto object-contain rounded-lg shadow-sm" 
          />
          <h1 className="text-lg font-semibold text-gray-800 text-center leading-tight">
            Nurse Call System
          </h1>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left ${
                  activePage === item.id
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {userProfile?.username ? getInitials(userProfile.username) : 'A'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{userProfile?.username || 'Admin User'}</p>
            <p className="text-xs text-gray-500">{userProfile?.user_type || 'admin'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium gap-2"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;