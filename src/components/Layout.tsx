import { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { LogOut, Home, Calendar, User as UserIcon, Settings, Users, FileText, Bell, CheckCircle2, ClipboardList, CalendarDays, LayoutDashboard, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function Layout() {
  const { currentUser, logout, notifications, markNotificationRead } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!currentUser) {
    return <Outlet />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userNotifications = notifications.filter(n => n.userId === currentUser.id).sort((a, b) => b.timestamp - a.timestamp);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const navItems = {
    student: [
      { path: '/student', label: 'Dashboard', icon: Home },
      { path: '/student/attendance', label: 'Attendance', icon: Calendar },
      { path: '/student/leaves', label: 'Leave Approvals', icon: ClipboardList },
      { path: '/student/id-card', label: 'Virtual ID', icon: UserIcon },
    ],
    faculty: [
      { path: '/faculty', label: 'Dashboard', icon: Home },
      { path: '/faculty/attendance', label: 'Attendance', icon: Calendar },
      { path: '/faculty/leaves', label: 'Leave Approvals', icon: ClipboardList },
      { path: '/faculty/mentees', label: 'My Mentees', icon: Users },
    ],
    admin: [
      { path: '/admin', label: 'Dashboard', icon: Home },
      { path: '/admin/attendance', label: 'Attendance', icon: Calendar },
      { path: '/admin/leaves', label: 'Leave Approvals', icon: ClipboardList },
      { path: '/admin/users', label: 'User Management', icon: Users },
      { path: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
      { path: '/admin/surveys', label: 'Surveys', icon: FileText },
    ],
  };

  const items = navItems[currentUser.role] || [];

  return (
    <div className="min-h-screen bg-violet-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white shadow-md flex flex-col z-20">
        <div className="p-6 border-b border-violet-100 flex items-center justify-center md:justify-start">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3">
            SA
          </div>
          <h1 className="text-xl font-bold text-violet-900 hidden md:block">SmartAttend</h1>
        </div>
        
        <div className="p-4 flex-1">
          <div className="mb-6 px-4 hidden md:block">
            <p className="text-sm text-gray-500">Welcome,</p>
            <p className="font-semibold text-violet-900 truncate">{currentUser.name}</p>
            <p className="text-xs text-violet-500 capitalize">{currentUser.role}</p>
          </div>
          
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap",
                    isActive 
                      ? "bg-violet-600 text-white shadow-md shadow-violet-200" 
                      : "text-gray-600 hover:bg-violet-50 hover:text-violet-900"
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-violet-100 hidden md:block">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-violet-100 px-6 py-4 flex items-center justify-between md:justify-end z-10 relative">
          <div className="md:hidden font-bold text-violet-900">SmartAttend</div>
          
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-600 rounded-full transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-violet-100 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-violet-100 flex items-center justify-between bg-violet-50">
                      <h3 className="font-bold text-violet-950">Notifications</h3>
                      <span className="text-xs font-medium bg-violet-200 text-violet-800 px-2 py-1 rounded-full">{unreadCount} new</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {userNotifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No notifications yet</div>
                      ) : (
                        <div className="divide-y divide-violet-50">
                          {userNotifications.map(notification => (
                            <div 
                              key={notification.id} 
                              className={clsx(
                                "p-4 transition-colors hover:bg-gray-50 flex gap-3",
                                !notification.read ? "bg-violet-50/50" : ""
                              )}
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              <div className={clsx(
                                "w-2 h-2 mt-1.5 rounded-full shrink-0",
                                !notification.read ? "bg-violet-600" : "bg-transparent"
                              )} />
                              <div>
                                <p className={clsx("text-sm", !notification.read ? "font-medium text-gray-900" : "text-gray-600")}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm overflow-hidden border border-violet-200">
                {currentUser.photo ? (
                  <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0)
                )}
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-medium text-gray-900">{currentUser.name}</p>
              </div>
            </div>

            <div className="md:hidden flex justify-end ml-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-violet-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
