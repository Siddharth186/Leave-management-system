import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Bell, User as UserIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getNotifications, markAllNotificationsRead } from '../../services/api';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const res = await getNotifications({ read: false, limit: 10 });
        setUnreadCount(res.unreadCount || 0);
        setNotifications(res.notifications || []);
      } catch {
        // Silently fail — non-critical UI element
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const handleBellClick = async () => {
    setIsNotifOpen((prev) => !prev);
    if (!isNotifOpen && unreadCount > 0) {
      try {
        await markAllNotificationsRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // Silently fail
      }
    }
  };

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', show: true },
    { name: 'Apply Leave', to: '/apply-leave', show: user?.role === 'student' },
    { name: 'Leave History', to: '/history', show: user?.role === 'student' },
    { name: 'Approvals', to: '/approvals', show: user?.role === 'admin' },
    { name: 'Profile', to: '/profile', show: true },
  ];

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center space-x-8">
            <h1 
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight select-none cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              Student Portal
            </h1>
          </div>

          <div className="flex items-center space-x-5">
            <button
              onClick={logout}
              className="hidden lg:flex items-center text-[0.95rem] font-medium text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
            
            <div className="flex items-center space-x-3 pl-5 lg:border-l border-slate-800 relative">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={handleBellClick}
                  className="text-slate-400 hover:text-cyan-400 relative focus:outline-none transition-colors"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 rounded-full ring-2 ring-slate-900 flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  <Bell className="w-5 h-5" />
                </button>

                {/* Notification Dropdown */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">Notifications</span>
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`px-4 py-3 text-sm ${n.read ? 'opacity-60' : 'bg-slate-800/40'}`}
                          >
                            <p className="font-medium text-slate-200">{n.title}</p>
                            <p className="text-slate-400 mt-0.5 text-[0.8rem] leading-snug">{n.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-slate-500 text-sm">
                          No notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div 
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/30 shadow-sm cursor-pointer hover:bg-slate-700 transition-colors mx-2"
                onClick={() => navigate('/profile')}
              >
                {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-400 hover:text-cyan-400 focus:outline-none transition-colors ml-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Overlay to close notification dropdown */}
      {isNotifOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsNotifOpen(false)}
        />
      )}

      {/* Vertical Drawer Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col pt-8 px-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col space-y-4 max-w-sm mx-auto w-full">
            {navigation.filter(item => item.show).map(item => (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-center w-full px-6 py-4 text-lg font-medium rounded-xl transition-all ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 border border-slate-800 hover:border-slate-700'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
            
            <div className="pt-8 mt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  logout();
                  handleNavClick();
                }}
                className="flex items-center justify-center w-full px-6 py-4 text-lg font-medium rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
