import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { format, parseISO } from 'date-fns';
import { Clock, MapPin, Users, QrCode, KeyRound, Play, Square, CheckCircle, RefreshCw, Eye, X, Plus, ArrowRightLeft, ClipboardList, Check, LayoutDashboard, TrendingUp, Award, BookOpen } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function FacultyDashboard({ initialTab }: { initialTab?: string }) {
  const { currentUser, sessions, users, attendances, surveys, leaveRequests, generateOtp, endSession, createSession, transferActivity, updateLeaveRequestStatus } = useStore();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  // Refs to track auto-regen loop — using refs avoids stale closure issues
  const activeAttendanceSessionRef = useRef<string | null>(null);
  const isAttendanceRunningRef = useRef(false);
  
  // Determine initial module and tab from initialTab prop
  const getInitialState = () => {
    if (!initialTab) return { module: 'overview', tab: 'stats' };
    
    if (initialTab === 'overview') {
      return { module: 'overview', tab: 'stats' };
    }
    if (initialTab === 'attendance') {
      return { module: 'attendance', tab: 'schedule' };
    }
    if (initialTab === 'leaves') {
      return { module: 'leaves', tab: 'mentee-leaves' };
    }
    if (initialTab === 'mentees') {
      return { module: 'mentees', tab: 'list' };
    }
    
    if (['schedule', 'create', 'transfer'].includes(initialTab)) {
      return { module: 'attendance', tab: initialTab };
    }
    if (['mentee-leaves', 'my-leaves'].includes(initialTab)) {
      return { module: 'leaves', tab: initialTab };
    }
    return { module: 'overview', tab: 'stats' };
  };

  const initialState = getInitialState();
  const [activeModule, setActiveModule] = useState(initialState.module);
  const [activeTab, setActiveTab] = useState(initialState.tab);

  useEffect(() => {
    const state = getInitialState();
    setActiveModule(state.module);
    setActiveTab(state.tab);
  }, [initialTab]);

  // Create Activity State
  const [newActivity, setNewActivity] = useState({
    activityName: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    venue: '',
    department: 'CSE',
    hour: 1
  });

  // Transfer Activity State
  const [transferSessionId, setTransferSessionId] = useState('');
  const [transferFacultyId, setTransferFacultyId] = useState('');
  const [showTransferConfirmModal, setShowTransferConfirmModal] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  // Faculty Leave Request State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Leave');
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [duration, setDuration] = useState('1 day');
  const [remarks, setRemarks] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const mySessions = sessions
    .filter(s => s.facultyId === currentUser?.id && s.date?.slice(0, 10) === today)
    .sort((a, b) => a.hour - b.hour);

  // Auto-regen loop: counts down 20s, then re-generates OTP/QR automatically
  // until the faculty clicks End Session (isAttendanceRunningRef becomes false)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isAttendanceRunningRef.current && activeAttendanceSessionRef.current) {
      // Timer expired — auto-regenerate OTP and QR
      const sid = activeAttendanceSessionRef.current;
      generateOtp(sid).then(() => {
        if (isAttendanceRunningRef.current) {
          // Still active → restart 20-second countdown
          setTimeLeft(20);
        }
      });
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Cleanup refs on unmount so no stale regen fires
  useEffect(() => {
    return () => {
      isAttendanceRunningRef.current = false;
      activeAttendanceSessionRef.current = null;
    };
  }, []);

  const handleStartAttendance = async (sessionId: string) => {
    activeAttendanceSessionRef.current = sessionId;
    isAttendanceRunningRef.current = true;
    await generateOtp(sessionId);
    setTimeLeft(20);
  };

  const handleEndSession = async (sessionId: string) => {
    // Stop auto-regen loop before calling endSession
    isAttendanceRunningRef.current = false;
    activeAttendanceSessionRef.current = null;
    setTimeLeft(0);
    await endSession(sessionId);
    setSelectedSession(null);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await createSession({
      ...newActivity,
      facultyId: currentUser.id
    });
    setNewActivity({
      activityName: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      venue: '',
      department: 'CSE',
      hour: 1
    });
    setActiveTab('schedule');
  };

  const handleTransferActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferSessionId && transferFacultyId) {
      setConfirmCheckbox(false);
      setShowTransferConfirmModal(true);
    }
  };

  const confirmTransferActivity = async () => {
    if (transferSessionId && transferFacultyId && confirmCheckbox) {
      await transferActivity(transferSessionId, transferFacultyId);
      setTransferSessionId('');
      setTransferFacultyId('');
      setConfirmCheckbox(false);
      setShowTransferConfirmModal(false);
      setActiveTab('schedule');
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await useStore.getState().addLeaveRequest({
      userId: currentUser.id,
      leaveType,
      fromDate,
      toDate,
      duration,
      remarks,
      appliedBy: currentUser.id
    });
    setShowLeaveModal(false);
    setRemarks('');
  };

  const facultyUsers = users.filter(u => u.role === 'faculty' && u.id !== currentUser?.id);
  const myMentees = users.filter(u => u.role === 'student' && u.mentorId === currentUser?.id);
  const menteeLeaveRequests = leaveRequests.filter(l => myMentees.some(m => m.id === l.userId));
  const myLeaves = leaveRequests.filter(l => l.userId === currentUser?.id);

  // Stats calculations
  const myTotalSessions = sessions.filter(s => s.facultyId === currentUser?.id);
  const myCompletedSessions = myTotalSessions.filter(s => s.status === 'completed');
  const facultyAttendanceRate = myTotalSessions.length > 0 
    ? Math.round((myCompletedSessions.length / myTotalSessions.length) * 100) 
    : 100;

  const menteeStats = myMentees.map(mentee => {
    const menteeAttendances = attendances.filter(a => a.studentId === mentee.id);
    const presentCount = menteeAttendances.filter(a => a.status === 'present').length;
    const totalCount = menteeAttendances.length;
    const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    return { name: mentee.name, rate };
  });

  const avgMenteeAttendance = menteeStats.length > 0
    ? Math.round(menteeStats.reduce((acc, curr) => acc + curr.rate, 0) / menteeStats.length)
    : 0;

  const modules = {
    overview: [
      { id: 'stats', label: 'Overview', icon: LayoutDashboard },
    ],
    attendance: [
      { id: 'schedule', label: 'Today\'s Schedule', icon: Clock },
      { id: 'create', label: 'Create Activity', icon: Plus },
      { id: 'transfer', label: 'Transfer Activity', icon: ArrowRightLeft },
    ],
    leaves: [
      { id: 'mentee-leaves', label: 'Mentee Leaves', icon: ClipboardList },
      { id: 'my-leaves', label: 'My Leaves', icon: ClipboardList },
    ],
    mentees: [
      { id: 'list', label: 'My Mentees', icon: Users },
    ]
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-violet-950">
          {activeModule === 'attendance' && 'Attendance Management'}
          {activeModule === 'leaves' && 'Leave Approvals'}
          {activeModule === 'mentees' && 'Mentee Management'}
        </h1>
        <p className="text-violet-600 mt-2">
          {activeModule === 'attendance' && `Manage your sessions for ${format(new Date(), 'EEEE, MMMM do, yyyy')}`}
          {activeModule === 'leaves' && 'Review and manage leave requests'}
          {activeModule === 'mentees' && 'View students assigned to you for mentorship'}
        </p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-violet-100 pb-4 overflow-x-auto">
        {modules[activeModule as keyof typeof modules].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-violet-600 text-white shadow-md shadow-violet-200" 
                : "bg-white text-gray-600 hover:bg-violet-50 hover:text-violet-700 border border-gray-200"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeModule === 'overview' && activeTab === 'stats' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Session Completion</p>
                    <h3 className="text-2xl font-bold text-violet-950">{facultyAttendanceRate}%</h3>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-violet-600 h-full transition-all duration-1000" style={{ width: `${facultyAttendanceRate}%` }} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Works</p>
                    <h3 className="text-2xl font-bold text-violet-950">{myTotalSessions.length} Sessions</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{myCompletedSessions.length} completed, {myTotalSessions.length - myCompletedSessions.length} pending</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Award size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Mentee Attendance</p>
                    <h3 className="text-2xl font-bold text-violet-950">{avgMenteeAttendance}%</h3>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${avgMenteeAttendance}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <h3 className="text-lg font-bold text-violet-950 mb-6">Mentee Attendance Overview</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={menteeStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} unit="%" />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={30}>
                        {menteeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.rate >= 75 ? '#10b981' : entry.rate >= 60 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <h3 className="text-lg font-bold text-violet-950 mb-6">Recent Works (Sessions)</h3>
                <div className="space-y-4">
                  {myTotalSessions.slice(0, 5).sort((a, b) => b.hour - a.hour).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                      <div>
                        <h4 className="font-bold text-gray-900">{session.activityName}</h4>
                        <p className="text-xs text-gray-500">{session.date} • Hour {session.hour}</p>
                      </div>
                      <span className={clsx(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                        session.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                        session.status === 'active' ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {session.status}
                      </span>
                    </div>
                  ))}
                  {myTotalSessions.length === 0 && (
                    <p className="text-center py-8 text-gray-500">No sessions assigned yet.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeModule === 'attendance' && activeTab === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
          {mySessions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-violet-100 text-center">
              <p className="text-gray-500">No sessions scheduled for today.</p>
            </div>
          ) : (
            mySessions.map((session) => {
              const sessionAttendances = attendances.filter(a => a.sessionId === session.id && a.status === 'present');
              
              return (
                <motion.div 
                  key={session.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedSession(session.id)}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                    selectedSession === session.id 
                      ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100' 
                      : 'border-gray-200 bg-white hover:border-violet-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-3 py-1 bg-violet-100 text-violet-800 text-xs font-bold rounded-full">
                          Hour {session.hour}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{session.activityName}</h3>
                      </div>
                      <p className="text-gray-500 text-sm">{session.description}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-gray-600 font-mono bg-gray-100 px-3 py-1 rounded-lg">
                        <Clock size={16} />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                      <span className={`mt-2 text-sm font-semibold ${
                        session.status === 'active' ? 'text-amber-600 animate-pulse' : 
                        session.status === 'completed' ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        {session.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 border-t border-gray-100 pt-4 mt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-violet-400" />
                        <span>{session.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-violet-400" />
                        <span>{session.department}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-violet-700 bg-violet-100 px-3 py-1 rounded-lg">
                        {sessionAttendances.length} Present
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSessionDetails(session.id);
                        }}
                        className="p-1.5 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedSession && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-2xl border border-violet-200 shadow-xl shadow-violet-100 sticky top-8"
              >
                {(() => {
                  const session = sessions.find(s => s.id === selectedSession);
                  if (!session) return null;

                  const sessionAttendances = attendances.filter(a => a.sessionId === session.id && a.status === 'present');

                  return (
                    <>
                      <h3 className="text-xl font-bold text-violet-950 mb-6">Session Controls</h3>
                      
                      {session.status === 'scheduled' && (
                        <div className="text-center py-8">
                          <button 
                            onClick={() => handleStartAttendance(session.id)}
                            className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg hover:bg-violet-700 shadow-lg shadow-violet-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                          >
                            <Play size={24} /> Start Attendance
                          </button>
                          <p className="text-sm text-gray-500 mt-4">This will generate a QR code and OTP valid for 20 seconds.</p>
                        </div>
                      )}

                      {session.status === 'active' && (
                        <div className="space-y-6">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <p className="text-amber-800 font-bold text-lg mb-1">Attendance is Active</p>
                            <div className="text-4xl font-mono font-black text-amber-600 mb-2">
                              00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                            <p className="text-sm text-amber-700">Seconds remaining</p>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white border-2 border-violet-100 rounded-xl p-6 text-center shadow-sm">
                              <p className="text-sm font-bold text-violet-900 uppercase tracking-wider mb-4">Scan QR Code</p>
                              <div className="flex justify-center mb-2">
                                <QRCodeSVG value={session.otp || ''} size={160} level="H" />
                              </div>
                            </div>
                            
                            <div className="bg-white border-2 border-violet-100 rounded-xl p-6 text-center shadow-sm">
                              <p className="text-sm font-bold text-violet-900 uppercase tracking-wider mb-2">Or Enter OTP</p>
                              <div className="text-5xl font-mono font-black tracking-widest text-violet-600 bg-violet-50 py-4 rounded-lg">
                                {session.otp}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <button 
                              onClick={() => handleStartAttendance(session.id)}
                              className="w-full py-4 bg-violet-100 text-violet-700 rounded-xl font-bold text-lg hover:bg-violet-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                              <RefreshCw size={24} /> Regenerate
                            </button>
                            <button 
                              onClick={() => handleEndSession(session.id)}
                              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 shadow-lg shadow-red-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                              <Square size={24} /> End Session
                            </button>
                          </div>
                        </div>
                      )}

                      {session.status === 'completed' && (
                        <div className="text-center py-8">
                          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Session Completed</h4>
                          <p className="text-gray-500 mb-6">Attendance has been recorded and survey sent to students.</p>
                          
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Total Present</p>
                            <p className="text-3xl font-bold text-violet-900">{sessionAttendances.length}</p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      )}

      {activeModule === 'attendance' && activeTab === 'create' && (
        <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-8 rounded-2xl border border-violet-100 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-violet-950 mb-6 flex items-center gap-2">
            <Plus className="text-violet-600" /> Create New Activity
          </h2>
          <form onSubmit={handleCreateActivity} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                <input type="text" required value={newActivity.activityName} onChange={e => setNewActivity({...newActivity, activityName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" placeholder="e.g., Data Structures Lecture" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none resize-none" rows={3} placeholder="Brief description of the activity..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={newActivity.date} onChange={e => setNewActivity({...newActivity, date: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hour</label>
                <input type="number" min="1" max="8" required value={newActivity.hour} onChange={e => setNewActivity({...newActivity, hour: parseInt(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" required value={newActivity.startTime} onChange={e => setNewActivity({...newActivity, startTime: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" required value={newActivity.endTime} onChange={e => setNewActivity({...newActivity, endTime: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input type="text" required value={newActivity.venue} onChange={e => setNewActivity({...newActivity, venue: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" placeholder="e.g., Room 301" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select required value={newActivity.department} onChange={e => setNewActivity({...newActivity, department: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none bg-white">
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
              Create Activity
            </button>
          </form>
        </motion.div>
      )}

      {activeModule === 'attendance' && activeTab === 'transfer' && (
        <motion.div key="transfer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-8 rounded-2xl border border-violet-100 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-violet-950 mb-6 flex items-center gap-2">
            <ArrowRightLeft className="text-violet-600" /> Transfer Activity
          </h2>
          <form onSubmit={handleTransferActivity} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Your Session</label>
              <select required value={transferSessionId} onChange={e => setTransferSessionId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none bg-white">
                <option value="">-- Select a session --</option>
                {sessions.filter(s => s.facultyId === currentUser?.id && s.status === 'scheduled').map(session => (
                  <option key={session.id} value={session.id}>
                    {session.activityName} ({format(parseISO(session.date), 'MMM dd')} - Hour {session.hour})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Faculty to Transfer To</label>
              <select required value={transferFacultyId} onChange={e => setTransferFacultyId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none bg-white">
                <option value="">-- Select faculty --</option>
                {facultyUsers.map(faculty => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name} ({faculty.department})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
              Transfer Activity
            </button>
          </form>
        </motion.div>
      )}

      {activeModule === 'leaves' && activeTab === 'mentee-leaves' && (
        <motion.div key="mentee-leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-violet-950 text-xl mb-6">Mentee Leave Requests</h3>
            <div className="space-y-4">
              {menteeLeaveRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No leave requests from your mentees.
                </div>
              ) : (
                menteeLeaveRequests.sort((a, b) => b.timestamp - a.timestamp).map(request => {
                  const student = users.find(u => u.id === request.userId);
                  const approvedBy = users.find(u => u.id === request.approvedBy);
                  return (
                    <div key={request.id} className="p-5 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-gray-900">{student?.name}</h4>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{student?.rollNo}</span>
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
                        {approvedBy && <p className="mt-2 text-xs text-gray-500">Approved by: <span className="font-medium">{approvedBy.name}</span></p>}
                      </div>
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={async () => await updateLeaveRequestStatus(request.id, 'approved', currentUser?.id || '')}
                            className="flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button 
                            onClick={async () => await updateLeaveRequestStatus(request.id, 'rejected', currentUser?.id || '')}
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

      {activeModule === 'leaves' && activeTab === 'my-leaves' && (
        <motion.div key="my-leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-violet-950 text-xl">My Leave Requests</h3>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg font-medium hover:bg-violet-200 transition-colors"
            >
              <Plus size={16} />
              New Request
            </button>
          </div>
          <div className="space-y-4">
            {myLeaves.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                You haven't submitted any leave requests yet.
              </div>
            ) : (
              myLeaves.sort((a, b) => b.timestamp - a.timestamp).map(request => (
                <div key={request.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
                        {request.leaveType}
                      </span>
                      <h4 className="font-bold text-gray-900">
                        {format(new Date(request.fromDate), 'MMM dd, yyyy')} - {format(new Date(request.toDate), 'MMM dd, yyyy')}
                      </h4>
                      <span className={clsx(
                        "text-xs font-bold px-2 py-1 rounded-md capitalize flex items-center gap-1",
                        request.status === 'pending' ? "bg-amber-100 text-amber-700" :
                        request.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                        request.status === 'completed' ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {request.status === 'approved' && <Check size={12} />}
                        {request.status === 'completed' && <CheckCircle size={12} />}
                        {request.status === 'rejected' && <X size={12} />}
                        {request.status === 'pending' && <Clock size={12} />}
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{request.remarks}</p>
                    <p className="text-xs text-gray-500 mt-1">Duration: {request.duration}</p>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    Submitted on {format(request.timestamp, 'MMM dd, yyyy')}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {activeModule === 'mentees' && activeTab === 'list' && (
        <motion.div key="mentees" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
          <h3 className="font-bold text-violet-950 text-xl mb-6">My Mentees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myMentees.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No students assigned to you as mentees.
              </div>
            ) : (
              myMentees.map(mentee => (
                <div key={mentee.id} className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:border-violet-300 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-lg">
                      {mentee.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{mentee.name}</h4>
                      <p className="text-sm text-gray-500">{mentee.rollNo}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Department</span>
                      <span className="font-medium text-gray-900">{mentee.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-gray-900">{mentee.email}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {showTransferConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50">
                <h2 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                  <ArrowRightLeft className="text-amber-600" /> Confirm Transfer
                </h2>
                <button onClick={() => setShowTransferConfirmModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-amber-900 text-sm leading-relaxed">
                    You are about to transfer the following session. This action cannot be undone once confirmed.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session to Transfer</p>
                    <p className="font-bold text-gray-900">
                      {sessions.find(s => s.id === transferSessionId)?.activityName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(() => {
                        const s = sessions.find(s => s.id === transferSessionId);
                        return s ? `${format(parseISO(s.date), 'MMM dd')} • Hour ${s.hour}` : '';
                      })()}
                    </p>
                  </div>
                  
                  <div className="flex justify-center py-2">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                      <ArrowRightLeft size={16} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transfer To</p>
                    <p className="font-bold text-gray-900">
                      {users.find(u => u.id === transferFacultyId)?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {users.find(u => u.id === transferFacultyId)?.department} Department
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center mt-1">
                      <input 
                        type="checkbox" 
                        checked={confirmCheckbox}
                        onChange={e => setConfirmCheckbox(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:border-violet-600 checked:bg-violet-600 focus:outline-none"
                      />
                      <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={4} />
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                      I confirm that I want to transfer this session to the selected faculty member.
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowTransferConfirmModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmTransferActivity}
                    disabled={!confirmCheckbox}
                    className={clsx(
                      "flex-1 py-3 rounded-xl font-bold transition-all shadow-lg",
                      confirmCheckbox 
                        ? "bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    )}
                  >
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-violet-50">
                <h2 className="text-xl font-bold text-violet-950">Apply for Leave</h2>
                <button onClick={() => setShowLeaveModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    required
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none bg-white"
                  >
                    <option value="Leave">Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="OnDuty - Events">OnDuty - Events</option>
                    <option value="OnDuty - Project Competition">OnDuty - Project Competition</option>
                    <option value="OnDuty - Internship">OnDuty - Internship</option>
                    <option value="OnDuty - Paper Presentation">OnDuty - Paper Presentation</option>
                    <option value="OnDuty - Technical Competition">OnDuty - Technical Competition</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input 
                    type="text" 
                    required
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="e.g., 1 day, 2 hours"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea 
                    required
                    rows={3}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter reason for leave..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none resize-none bg-gray-50"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 px-4 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-600 transition-colors shadow-sm shadow-violet-200"
                  >
                    Submit Leave Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
                const sessionAttendances = attendances.filter(a => a.sessionId === session.id);
                const sessionSurveys = surveys.filter(s => s.sessionId === session.id);
                
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
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-sm text-gray-500 font-medium mb-1">Total Attendance</p>
                          <p className="font-semibold text-gray-900">{sessionAttendances.filter(a => a.status === 'present').length} Present</p>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-violet-950 mb-4">Attendance Record</h3>
                      
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
                      <h3 className="text-lg font-bold text-violet-950 mb-4 mt-8">Survey Results</h3>
                      
                      {sessionSurveys.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          No surveys recorded yet.
                        </div>
                      ) : (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">Student Name</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Rating</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Clarity</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Understanding</th>
                                <th className="px-4 py-3 font-medium text-gray-500">Comments</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {sessionSurveys.map(survey => {
                                const student = users.find(u => u.id === survey.studentId);
                                return (
                                  <tr key={survey.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{student?.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{survey.rating}/5</td>
                                    <td className="px-4 py-3 text-gray-500">{survey.clarity}/5</td>
                                    <td className="px-4 py-3 text-gray-500">{survey.understanding}/5</td>
                                    <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={survey.comments}>{survey.comments || '-'}</td>
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
