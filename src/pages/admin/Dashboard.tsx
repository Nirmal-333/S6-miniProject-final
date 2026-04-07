import React, { useState } from 'react';
import { useStore, User } from '../../store';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Users, GraduationCap, Calendar, CheckCircle, XCircle, RefreshCw, Search, Plus, Trash2, FileText, LayoutDashboard, CalendarDays, ClipboardList, Check, X, Download, BellRing, Eye, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard({ initialTab = 'overview' }: { initialTab?: string }) {
  const { users, sessions, attendances, leaveRequests, surveys, transferActivity, createSession, deleteSession, addUser, updateUser, deleteUser, updateLeaveRequestStatus, addNotification, bulkMarkAttendance, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Sync activeTab with initialTab prop when it changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedSessionForTransfer, setSelectedSessionForTransfer] = useState<string | null>(null);
  const [newFacultyId, setNewFacultyId] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'students' | 'faculty'>('all');
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Bulk Attendance State
  const [bulkSessionId, setBulkSessionId] = useState('');
  const [bulkStudentIds, setBulkStudentIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent'>('present');

  // Session Creation State
  const [newSession, setNewSession] = useState({
    activityName: '',
    facultyId: '',
    department: '',
    venue: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    hour: 1
  });

  // User Creation State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'student' as 'student' | 'faculty' | 'admin',
    password: 'password',
    rollNo: '',
    department: '',
    batch: ''
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySessions = sessions.filter(s => s.date?.slice(0, 10) === today);
  const students = users.filter(u => u.role === 'student');
  const faculty = users.filter(u => u.role === 'faculty');

  const totalPresentToday = attendances.filter(a => 
    todaySessions.some(s => s.id === a.sessionId) && a.status === 'present'
  ).length;

  const handleTransfer = async () => {
    if (selectedSessionForTransfer && newFacultyId) {
      await transferActivity(selectedSessionForTransfer, newFacultyId);
      setSelectedSessionForTransfer(null);
      setNewFacultyId('');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSession(newSession);
    setNewSession({ ...newSession, activityName: '', description: '', hour: newSession.hour + 1 });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await addUser(newUser);
    setNewUser({ ...newUser, name: '', email: '', rollNo: '' });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await updateUser(editingUser.id, editingUser);
      setEditingUser(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date & Time', 'Student Name', 'Roll No', 'Department', 'Activity', 'Hour', 'Faculty', 'Status'];
    const csvData = attendances.sort((a,b) => b.timestamp - a.timestamp).map(att => {
      const student = users.find(u => u.id === att.studentId);
      const session = sessions.find(s => s.id === att.sessionId);
      const fac = users.find(u => u.id === session?.facultyId);
      return [
        format(att.timestamp, 'MMM dd yyyy HH:mm'),
        student?.name || '',
        student?.rollNo || '',
        student?.department || '',
        session?.activityName || '',
        session?.hour || '',
        fac?.name || '',
        att.status
      ].map(val => `"${val}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationMessage.trim()) return;

    const targetUsers = users.filter(u => {
      if (notificationTarget === 'all') return true;
      if (notificationTarget === 'students') return u.role === 'student';
      if (notificationTarget === 'faculty') return u.role === 'faculty';
      return false;
    });

    const promises = targetUsers.map(u => 
      addNotification(u.id, notificationMessage)
    );
    await Promise.all(promises);

    setNotificationMessage('');
    alert(`Notification sent to ${targetUsers.length} users.`);
  };

  const handleBulkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSessionId || bulkStudentIds.length === 0) return;
    await bulkMarkAttendance(bulkStudentIds, bulkSessionId, bulkStatus);
    alert(`Attendance marked for ${bulkStudentIds.length} students.`);
    setBulkStudentIds([]);
  };

  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean))) as string[];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.rollNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesDept = filterDepartment === 'all' || user.department === filterDepartment;
    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-violet-950">Admin Dashboard</h1>
        <p className="text-violet-600 mt-2">System overview and management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-violet-100 pb-4 overflow-x-auto">
        {activeTab === 'overview' && (
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap bg-violet-600 text-white shadow-md shadow-violet-200">
            <LayoutDashboard size={18} /> Overview
          </button>
        )}
        
        {activeTab === 'attendance' && (
          <>
            {[
              { id: 'sessions', label: 'Manage Sessions', icon: Calendar },
              { id: 'bulk-attendance', label: 'Bulk Attendance', icon: CheckCircle },
              { id: 'reports', label: 'Attendance Logs', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200" 
                    : "bg-white text-gray-600 hover:bg-violet-50"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </>
        )}

        {(activeTab === 'sessions' || activeTab === 'bulk-attendance' || activeTab === 'reports') && (
          <>
            {[
              { id: 'sessions', label: 'Manage Sessions', icon: Calendar },
              { id: 'bulk-attendance', label: 'Bulk Attendance', icon: CheckCircle },
              { id: 'reports', label: 'Attendance Logs', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200" 
                    : "bg-white text-gray-600 hover:bg-violet-50"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </>
        )}

        {activeTab === 'leaves' && (
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap bg-violet-600 text-white shadow-md shadow-violet-200">
            <ClipboardList size={18} /> Leave Requests
          </button>
        )}

        {activeTab === 'users' && (
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap bg-violet-600 text-white shadow-md shadow-violet-200">
            <Users size={18} /> Manage Users
          </button>
        )}

        {activeTab === 'calendar' && (
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap bg-violet-600 text-white shadow-md shadow-violet-200">
            <CalendarDays size={18} /> Session Calendar
          </button>
        )}

        {activeTab === 'surveys' && (
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap bg-violet-600 text-white shadow-md shadow-violet-200">
            <ClipboardList size={18} /> Survey Results
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users size={28} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Faculty</p>
                  <p className="text-3xl font-bold text-gray-900">{faculty.length}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Calendar size={28} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Today's Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{todaySessions.length}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Present Today</p>
                  <p className="text-3xl font-bold text-gray-900">{totalPresentToday}</p>
                </div>
              </div>
            </div>

            {/* Attendance Chart */}
            <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
              <h3 className="text-lg font-bold text-violet-950 mb-6">Weekly Attendance Overview</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Mon', present: 120, absent: 10 },
                    { name: 'Tue', present: 115, absent: 15 },
                    { name: 'Wed', present: 125, absent: 5 },
                    { name: 'Thu', present: 110, absent: 20 },
                    { name: 'Fri', present: 130, absent: 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ede9fe" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                    <Tooltip cursor={{ fill: '#f5f3ff' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="present" name="Present" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Activity Transfer */}
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="bg-violet-50 px-6 py-4 border-b border-violet-100 flex items-center justify-between">
                  <h3 className="font-bold text-violet-950 flex items-center gap-2">
                    <RefreshCw size={18} />
                    Activity Transfer
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Session</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                      value={selectedSessionForTransfer || ''}
                      onChange={e => setSelectedSessionForTransfer(e.target.value)}
                    >
                      <option value="">-- Choose a session --</option>
                      {todaySessions.map(s => {
                        const currentFaculty = users.find(u => u.id === s.facultyId);
                        return (
                          <option key={s.id} value={s.id}>
                            Hr {s.hour}: {s.activityName} ({currentFaculty?.name})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign New Faculty</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                      value={newFacultyId}
                      onChange={e => setNewFacultyId(e.target.value)}
                      disabled={!selectedSessionForTransfer}
                    >
                      <option value="">-- Choose faculty --</option>
                      {faculty.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={handleTransfer}
                    disabled={!selectedSessionForTransfer || !newFacultyId}
                    className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Transfer Activity
                  </button>
                </div>
              </div>

              {/* Quick Student Search */}
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-violet-50 px-6 py-4 border-b border-violet-100 flex items-center justify-between">
                  <h3 className="font-bold text-violet-950 flex items-center gap-2">
                    <Search size={18} />
                    Student Database
                  </h3>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Search size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name or roll no..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-600 outline-none"
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto max-h-64 border border-gray-100 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 font-medium text-gray-500">Roll No</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                          <th className="px-4 py-3 font-medium text-gray-500">Dept</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {students.filter(s => 
                          s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.rollNo?.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map(student => (
                          <tr key={student.id} className="hover:bg-violet-50 cursor-pointer">
                            <td className="px-4 py-3 font-medium text-violet-900">{student.rollNo}</td>
                            <td className="px-4 py-3">{student.name}</td>
                            <td className="px-4 py-3 text-gray-500">{student.department}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Send Notification */}
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-violet-50 px-6 py-4 border-b border-violet-100 flex items-center justify-between">
                  <h3 className="font-bold text-violet-950 flex items-center gap-2">
                    <BellRing size={18} />
                    Send Announcement
                  </h3>
                </div>
                <form onSubmit={handleSendNotification} className="p-6 flex-1 flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                      value={notificationTarget}
                      onChange={e => setNotificationTarget(e.target.value as any)}
                    >
                      <option value="all">All Users</option>
                      <option value="students">All Students</option>
                      <option value="faculty">All Faculty</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea 
                      required
                      value={notificationMessage}
                      onChange={e => setNotificationMessage(e.target.value)}
                      placeholder="Type your announcement here..."
                      className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!notificationMessage.trim()}
                    className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send Notification
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {(activeTab === 'sessions' || activeTab === 'attendance') && (
          <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden sticky top-8">
                <div className="bg-violet-50 px-6 py-4 border-b border-violet-100">
                  <h3 className="font-bold text-violet-950 flex items-center gap-2">
                    <Plus size={18} />
                    Create New Session
                  </h3>
                </div>
                <form onSubmit={handleCreateSession} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                    <input required type="text" value={newSession.activityName} onChange={e => setNewSession({...newSession, activityName: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                    <select required value={newSession.facultyId} onChange={e => setNewSession({...newSession, facultyId: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none">
                      <option value="">Select Faculty</option>
                      {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input required type="date" value={newSession.date} onChange={e => setNewSession({...newSession, date: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hour (1-7)</label>
                      <input required type="number" min="1" max="7" value={newSession.hour} onChange={e => setNewSession({...newSession, hour: parseInt(e.target.value)})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input required type="time" value={newSession.startTime} onChange={e => setNewSession({...newSession, startTime: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input required type="time" value={newSession.endTime} onChange={e => setNewSession({...newSession, endTime: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input required type="text" value={newSession.department} onChange={e => setNewSession({...newSession, department: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                      <input required type="text" value={newSession.venue} onChange={e => setNewSession({...newSession, venue: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={newSession.description} onChange={e => setNewSession({...newSession, description: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" rows={2} />
                  </div>
                  <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors">
                    Create Session
                  </button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold text-violet-950 mb-4">All Sessions</h3>
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-500">Date/Hour</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Activity</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Faculty</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.hour - a.hour).map(session => {
                        const fac = users.find(u => u.id === session.facultyId);
                        return (
                          <tr key={session.id} className="hover:bg-violet-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{format(parseISO(session.date), 'MMM dd, yyyy')}</div>
                              <div className="text-xs text-gray-500">Hour {session.hour}</div>
                            </td>
                            <td className="px-4 py-3 font-medium text-violet-900">{session.activityName}</td>
                            <td className="px-4 py-3 text-gray-600">{fac?.name}</td>
                            <td className="px-4 py-3">
                              <span className={clsx(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                session.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                                session.status === 'active' ? "bg-amber-100 text-amber-700" :
                                "bg-gray-100 text-gray-700"
                              )}>
                                {session.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setSelectedSessionDetails(session.id)} className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="View Details">
                                  <Eye size={16} />
                                </button>
                                <button onClick={async () => await deleteSession(session.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Session">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden sticky top-8">
                <div className="bg-violet-50 px-6 py-4 border-b border-violet-100">
                  <h3 className="font-bold text-violet-950 flex items-center gap-2">
                    <Plus size={18} />
                    Add New User
                  </h3>
                </div>
                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none">
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                  
                  {newUser.role === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
                        <select value={newUser.mentorId || ''} onChange={e => setNewUser({...newUser, mentorId: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none">
                          <option value="">Select Mentor</option>
                          {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                        <input required type="text" value={newUser.rollNo} onChange={e => setNewUser({...newUser, rollNo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                          <input required type="text" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                          <input required type="text" value={newUser.batch} onChange={e => setNewUser({...newUser, batch: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                        </div>
                      </div>
                    </>
                  )}
                  {newUser.role === 'faculty' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input required type="text" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Password</label>
                    <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                  
                  <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors">
                    Add User
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-violet-950">All Users</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm w-48"
                    />
                  </div>
                  <select 
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm bg-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admins</option>
                  </select>
                  <select 
                    value={filterDepartment}
                    onChange={e => setFilterDepartment(e.target.value)}
                    className="p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none text-sm bg-white"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-medium text-gray-500">Name / Email</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Details</th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-violet-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx(
                              "px-2 py-1 rounded-full text-xs font-medium capitalize",
                              user.role === 'admin' ? "bg-red-100 text-red-700" :
                              user.role === 'faculty' ? "bg-blue-100 text-blue-700" :
                              "bg-emerald-100 text-emerald-700"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {user.role === 'student' ? `${user.rollNo} (${user.department})` : user.department || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingUser(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={async () => await deleteUser(user.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-violet-950 text-xl">Session Calendar</h3>
                <input 
                  type="date" 
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                  className="p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i);
                  const isSelected = isSameDay(date, selectedDate);
                  const daySessions = sessions.filter(s => s.date?.slice(0, 10) === format(date, 'yyyy-MM-dd'));
                  
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={clsx(
                        "p-4 rounded-xl border cursor-pointer transition-all",
                        isSelected ? "border-violet-600 bg-violet-50 shadow-sm" : "border-gray-100 hover:border-violet-300"
                      )}
                    >
                      <div className="text-sm font-medium text-gray-500 mb-1">{format(date, 'EEE')}</div>
                      <div className={clsx("text-2xl font-bold", isSelected ? "text-violet-900" : "text-gray-900")}>
                        {format(date, 'd')}
                      </div>
                      <div className="mt-2 text-xs font-medium text-violet-600 bg-violet-100 px-2 py-1 rounded-md inline-block">
                        {daySessions.length} Sessions
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <h4 className="font-bold text-gray-900 mb-4">Sessions on {format(selectedDate, 'MMMM d, yyyy')}</h4>
                <div className="space-y-3">
                  {sessions.filter(s => s.date?.slice(0, 10) === format(selectedDate, 'yyyy-MM-dd')).sort((a,b) => a.hour - b.hour).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No sessions scheduled for this date.
                    </div>
                  ) : (
                    sessions.filter(s => s.date?.slice(0, 10) === format(selectedDate, 'yyyy-MM-dd')).sort((a,b) => a.hour - b.hour).map(session => {
                      const fac = users.find(u => u.id === session.facultyId);
                      return (
                        <div key={session.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                          <div className="w-12 h-12 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                            H{session.hour}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-900">{session.activityName}</h5>
                            <p className="text-sm text-gray-500">{session.startTime} - {session.endTime} • {session.venue}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{fac?.name}</div>
                            <div className="text-xs text-gray-500">{session.department}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'leaves' && (
          <motion.div key="leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-violet-950 text-xl">Leave Requests</h3>
              </div>
              <div className="space-y-4">
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No leave requests found.
                  </div>
                ) : (
                  leaveRequests
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(request => {
                      const user = users.find(u => u.id === request.userId);
                      const appliedBy = users.find(u => u.id === request.appliedBy);
                      const approvedBy = users.find(u => u.id === request.approvedBy);
                      
                      const canApprove = request.status === 'pending';

                      return (
                        <div key={request.id} className="p-5 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-gray-900">{user?.name}</h4>
                              <span className={clsx(
                                "text-xs font-medium px-2 py-1 rounded-md capitalize",
                                user?.role === 'student' ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                              )}>
                                {user?.role}
                              </span>
                              <span className={clsx(
                                "text-xs font-medium px-2 py-1 rounded-md capitalize",
                                request.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                request.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1"><strong>Date:</strong> {format(new Date(request.fromDate), 'MMM dd, yyyy')} - {format(new Date(request.toDate), 'MMM dd, yyyy')} ({request.duration})</p>
                            <p className="text-sm text-gray-600"><strong>Type:</strong> {request.leaveType}</p>
                            <p className="text-sm text-gray-600"><strong>Remarks:</strong> {request.remarks}</p>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                              <p>Applied by: <span className="font-medium">{appliedBy?.name || 'Unknown'}</span></p>
                              {approvedBy && <p>Approved by: <span className="font-medium">{approvedBy.name}</span></p>}
                            </div>
                          </div>
                          
                          {canApprove && (
                            <div className="flex gap-2 shrink-0">
                              <button 
                                onClick={async () => await updateLeaveRequestStatus(request.id, 'approved', currentUser?.id || 'admin')}
                                className="flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
                              >
                                <Check size={16} /> Approve
                              </button>
                              <button 
                                onClick={async () => await updateLeaveRequestStatus(request.id, 'rejected', currentUser?.id || 'admin')}
                                className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
                              >
                                <X size={16} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'bulk-attendance' && (
          <motion.div key="bulk-attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
              <h3 className="font-bold text-violet-950 text-xl mb-6">Bulk Attendance Management</h3>
              <form onSubmit={handleBulkAttendance} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Session</label>
                    <select 
                      required 
                      value={bulkSessionId} 
                      onChange={e => setBulkSessionId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                    >
                      <option value="">Choose a session...</option>
                      {sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                        <option key={s.id} value={s.id}>
                          {format(parseISO(s.date), 'MMM dd')} - {s.activityName} (H{s.hour})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Status</label>
                    <select 
                      value={bulkStatus} 
                      onChange={e => setBulkStatus(e.target.value as any)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Students (Multi-select)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 border border-gray-100 rounded-xl bg-gray-50">
                    {students.map(student => (
                      <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={bulkStudentIds.includes(student.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setBulkStudentIds([...bulkStudentIds, student.id]);
                            } else {
                              setBulkStudentIds(bulkStudentIds.filter(id => id !== student.id));
                            }
                          }}
                          className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.rollNo}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{bulkStudentIds.length} students selected</p>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setBulkStudentIds(students.map(s => s.id))}
                    className="px-4 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setBulkStudentIds([])}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={!bulkSessionId || bulkStudentIds.length === 0}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark Bulk Attendance
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'surveys' && (
          <motion.div key="surveys" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-violet-100 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Survey Results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-violet-50/50 text-violet-900 border-b border-violet-100">
                      <th className="p-4 font-semibold text-sm">Session</th>
                      <th className="p-4 font-semibold text-sm">Student</th>
                      <th className="p-4 font-semibold text-sm">Rating</th>
                      <th className="p-4 font-semibold text-sm">Clarity</th>
                      <th className="p-4 font-semibold text-sm">Understanding</th>
                      <th className="p-4 font-semibold text-sm">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100">
                    {surveys.map(survey => {
                      const session = sessions.find(s => s.id === survey.sessionId);
                      const student = users.find(u => u.id === survey.studentId);
                      return (
                        <tr key={survey.id} className="hover:bg-violet-50/30 transition-colors">
                          <td className="p-4 text-sm text-gray-900">{session?.activityName} ({session?.date})</td>
                          <td className="p-4 text-sm text-gray-600">{student?.name}</td>
                          <td className="p-4 text-sm text-gray-600">{survey.rating}/5</td>
                          <td className="p-4 text-sm text-gray-600">{survey.clarity}/5</td>
                          <td className="p-4 text-sm text-gray-600">{survey.understanding}/5</td>
                          <td className="p-4 text-sm text-gray-600 truncate max-w-xs" title={survey.comments}>{survey.comments || '-'}</td>
                        </tr>
                      );
                    })}
                    {surveys.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">No surveys found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
              <div className="bg-violet-50 px-6 py-4 border-b border-violet-100 flex items-center justify-between">
                <h3 className="font-bold text-violet-950 flex items-center gap-2">
                  <FileText size={18} />
                  Detailed Attendance Logs
                </h3>
                <button 
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-violet-200 text-violet-700 rounded-lg font-medium hover:bg-violet-50 transition-colors shadow-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-500">Date & Time</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Student</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Session</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Faculty</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendances.sort((a,b) => b.timestamp - a.timestamp).map(att => {
                      const student = users.find(u => u.id === att.studentId);
                      const session = sessions.find(s => s.id === att.sessionId);
                      const fac = users.find(u => u.id === session?.facultyId);
                      
                      return (
                        <tr key={att.id} className="hover:bg-violet-50">
                          <td className="px-4 py-3 text-gray-600">
                            {format(att.timestamp, 'MMM dd, yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{student?.name}</div>
                            <div className="text-xs text-gray-500">{student?.rollNo} • {student?.department}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-violet-900">{session?.activityName}</div>
                            <div className="text-xs text-gray-500">Hr {session?.hour} • {session?.venue}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{fac?.name}</td>
                          <td className="px-4 py-3">
                            <span className={clsx(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              att.status === 'present' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {att.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-violet-50 shrink-0">
                <h2 className="text-xl font-bold text-violet-950 flex items-center gap-2">
                  <Edit2 size={20} /> Edit User
                </h2>
                <button onClick={() => setEditingUser(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input required type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                </div>
                
                {editingUser.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                      <input required type="text" value={editingUser.rollNo || ''} onChange={e => setEditingUser({...editingUser, rollNo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input required type="text" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                        <input required type="text" value={editingUser.batch || ''} onChange={e => setEditingUser({...editingUser, batch: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                      </div>
                    </div>
                  </>
                )}
                {editingUser.role === 'faculty' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input required type="text" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input required type="text" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                </div>
                
                <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors mt-6">
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Details Modal */}
      <AnimatePresence>
        {selectedSessionDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {(() => {
                const session = sessions.find(s => s.id === selectedSessionDetails);
                if (!session) return null;
                const fac = users.find(u => u.id === session.facultyId);
                const sessionAttendances = attendances.filter(a => a.sessionId === session.id);
                
                return (
                  <>
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-violet-50 shrink-0">
                      <div>
                        <h2 className="text-xl font-bold text-violet-950">{session.activityName}</h2>
                        <p className="text-sm text-violet-600 mt-1">{format(parseISO(session.date), 'MMMM dd, yyyy')} • Hour {session.hour}</p>
                      </div>
                      <button onClick={() => setSelectedSessionDetails(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors">
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-500 font-medium mb-1">Faculty</p>
                          <p className="font-semibold text-gray-900">{fac?.name}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-500 font-medium mb-1">Venue</p>
                          <p className="font-semibold text-gray-900">{session.venue}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-500 font-medium mb-1">Time</p>
                          <p className="font-semibold text-gray-900">{session.startTime} - {session.endTime}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-500 font-medium mb-1">Status</p>
                          <span className={clsx(
                            "px-2 py-1 rounded-md text-xs font-bold uppercase inline-block mt-1",
                            session.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                            session.status === 'active' ? "bg-amber-100 text-amber-700" :
                            "bg-gray-200 text-gray-700"
                          )}>
                            {session.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-violet-950 mb-4 flex items-center justify-between">
                        <span>Attendance Record</span>
                        <span className="text-sm font-medium bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                          {sessionAttendances.filter(a => a.status === 'present').length} Present
                        </span>
                      </h3>
                      
                      {sessionAttendances.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          No attendance recorded yet.
                        </div>
                      ) : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">Student Name</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Roll No</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Time</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {sessionAttendances.sort((a,b) => b.timestamp - a.timestamp).map(att => {
                                const student = users.find(u => u.id === att.studentId);
                                return (
                                  <tr key={att.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{student?.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{student?.rollNo}</td>
                                    <td className="px-4 py-3 text-gray-500">{format(att.timestamp, 'HH:mm:ss')}</td>
                                    <td className="px-4 py-3">
                                      <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        att.status === 'present' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                      )}>
                                        {att.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

