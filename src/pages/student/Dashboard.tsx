import React, { useState } from 'react';
import { useStore } from '../../store';
import { format } from 'date-fns';
import { MapPin, Clock, User as UserIcon, CheckCircle, XCircle, QrCode, KeyRound, Star, BookOpen, GraduationCap, CalendarDays, Library, ClipboardList, Plus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export default function StudentDashboard() {
  const { currentUser, sessions, users, markAttendance, attendances, submitSurvey, addLeaveRequest } = useStore();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [attendanceMethod, setAttendanceMethod] = useState<'qr' | 'otp' | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyData, setSurveyData] = useState({ rating: 5, clarity: 5, understanding: 5, comments: '' });
  const [error, setError] = useState('');
  const [view, setView] = useState<'schedule' | 'assignments' | 'grades' | 'library' | 'events' | 'leaves'>('schedule');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Sick Leave',
    fromDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    toDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration: '1 day',
    remarks: ''
  });

  const { leaveRequests } = useStore();
  const myLeaves = leaveRequests.filter(l => l.userId === currentUser?.id);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySessions = sessions.filter(s => s.date?.slice(0, 10) === today).sort((a, b) => a.hour - b.hour);

  // Mock data for new features
  const mockAssignments = [
    { id: 1, title: 'Data Structures Project', subject: 'Data Structures', dueDate: '2026-03-15', status: 'pending' },
    { id: 2, title: 'Database Design Document', subject: 'DBMS', dueDate: '2026-03-10', status: 'submitted' },
    { id: 3, title: 'Network Topology Lab', subject: 'Computer Networks', dueDate: '2026-03-18', status: 'pending' },
  ];

  const mockGrades = [
    { id: 1, subject: 'Data Structures', grade: 'A', score: 92 },
    { id: 2, subject: 'DBMS', grade: 'A+', score: 98 },
    { id: 3, subject: 'Computer Networks', grade: 'B+', score: 85 },
    { id: 4, subject: 'Operating Systems', grade: 'A-', score: 89 },
  ];

  const mockLibrary = [
    { id: 1, book: 'Introduction to Algorithms', author: 'Thomas H. Cormen', dueDate: '2026-03-14', status: 'borrowed' },
    { id: 2, book: 'Database System Concepts', author: 'Abraham Silberschatz', dueDate: '2026-03-01', status: 'overdue' },
  ];

  const mockEvents = [
    { id: 1, title: 'Tech Symposium 2026', date: '2026-03-20', venue: 'Main Auditorium', type: 'Technical' },
    { id: 2, title: 'Inter-College Sports Meet', date: '2026-03-25', venue: 'College Ground', type: 'Sports' },
    { id: 3, title: 'Guest Lecture on AI', date: '2026-03-18', venue: 'Seminar Hall B', type: 'Academic' },
  ];

  const handleMarkAttendance = async () => {
    if (!selectedSession || !currentUser) return;
    
    const success = await markAttendance(currentUser.id, selectedSession, otpInput);
    if (success) {
      setShowSurvey(true);
      setAttendanceMethod(null);
      setError('');
    } else {
      setError('Invalid or expired code. Please try again.');
    }
  };

  const handleSurveySubmit = async () => {
    if (!selectedSession || !currentUser) return;
    await submitSurvey({
      sessionId: selectedSession,
      studentId: currentUser.id,
      ...surveyData
    });
    setShowSurvey(false);
    setSelectedSession(null);
    setOtpInput('');
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    await addLeaveRequest({
      userId: currentUser.id,
      ...leaveForm,
      appliedBy: currentUser.id
    });
    
    setShowLeaveModal(false);
    setLeaveForm({
      leaveType: 'Sick Leave',
      fromDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      toDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duration: '1 day',
      remarks: ''
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-violet-950">Student Dashboard</h1>
        <p className="text-violet-600 mt-2">Welcome back, {currentUser?.name}</p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-violet-100 pb-4 overflow-x-auto">
        {[
          { id: 'schedule', label: 'Today\'s Schedule', icon: Clock },
          { id: 'assignments', label: 'Assignments', icon: BookOpen },
          { id: 'grades', label: 'Grades', icon: GraduationCap },
          { id: 'library', label: 'Library', icon: Library },
          { id: 'events', label: 'Events', icon: CalendarDays },
          { id: 'leaves', label: 'My Leaves', icon: ClipboardList }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap",
              view === tab.id 
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
        {view === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
          {todaySessions.map((session) => {
            const faculty = users.find(u => u.id === session.facultyId);
            const isAttended = attendances.some(a => a.sessionId === session.id && a.studentId === currentUser?.id);
            const isActive = session.status === 'active';

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
                    {isAttended ? (
                      <span className="mt-2 flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                        <CheckCircle size={16} /> Present
                      </span>
                    ) : isActive ? (
                      <span className="mt-2 flex items-center gap-1 text-amber-600 text-sm font-semibold animate-pulse">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div> Active Now
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-violet-400" />
                    <span>{faculty?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-violet-400" />
                    <span>{session.venue}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
                  const faculty = users.find(u => u.id === session?.facultyId);
                  const isAttended = attendances.some(a => a.sessionId === session?.id && a.studentId === currentUser?.id);
                  
                  if (!session) return null;

                  if (showSurvey) {
                    return (
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-violet-950">Session Feedback</h3>
                        <p className="text-sm text-gray-600">Please rate your experience for {session.activityName}</p>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                            <div className="flex gap-2">
                              {[1,2,3,4,5].map(star => (
                                <button key={star} onClick={() => setSurveyData({...surveyData, rating: star})}>
                                  <Star size={24} className={star <= surveyData.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Clarity</label>
                            <input type="range" min="1" max="5" value={surveyData.clarity} onChange={e => setSurveyData({...surveyData, clarity: parseInt(e.target.value)})} className="w-full accent-violet-600" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Topic Understanding</label>
                            <input type="range" min="1" max="5" value={surveyData.understanding} onChange={e => setSurveyData({...surveyData, understanding: parseInt(e.target.value)})} className="w-full accent-violet-600" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                            <textarea 
                              value={surveyData.comments}
                              onChange={e => setSurveyData({...surveyData, comments: e.target.value})}
                              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                              rows={3}
                              placeholder="Any feedback?"
                            />
                          </div>
                          <button onClick={handleSurveySubmit} className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700">
                            Submit Feedback
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <h3 className="text-xl font-bold text-violet-950 mb-4">Action Center</h3>
                      
                      <div className="space-y-3 mb-8">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Activity</span>
                          <span className="font-medium text-gray-900">{session.activityName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Faculty</span>
                          <span className="font-medium text-gray-900">{faculty?.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status</span>
                          <span className={`font-medium ${session.status === 'active' ? 'text-amber-600' : session.status === 'completed' ? 'text-emerald-600' : 'text-gray-600'}`}>
                            {session.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {isAttended ? (
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100">
                          <CheckCircle size={24} />
                          <div>
                            <p className="font-bold">Attendance Marked</p>
                            <p className="text-sm opacity-80">You are present for this session.</p>
                          </div>
                        </div>
                      ) : session.status === 'active' ? (
                        <div className="space-y-4">
                          {!attendanceMethod ? (
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setAttendanceMethod('qr')}
                                className="flex flex-col items-center justify-center p-4 border-2 border-violet-200 rounded-xl hover:border-violet-600 hover:bg-violet-50 transition-colors"
                              >
                                <QrCode size={32} className="text-violet-600 mb-2" />
                                <span className="font-semibold text-violet-900">Scan QR</span>
                              </button>
                              <button 
                                onClick={() => setAttendanceMethod('otp')}
                                className="flex flex-col items-center justify-center p-4 border-2 border-violet-200 rounded-xl hover:border-violet-600 hover:bg-violet-50 transition-colors"
                              >
                                <KeyRound size={32} className="text-violet-600 mb-2" />
                                <span className="font-semibold text-violet-900">Enter OTP</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <button onClick={() => setAttendanceMethod(null)} className="text-sm text-violet-600 hover:underline mb-2 block">
                                &larr; Back to methods
                              </button>
                              
                              {error && <p className="text-red-500 text-sm">{error}</p>}
                              
                              {attendanceMethod === 'otp' ? (
                                <div>
                                  <input 
                                    type="text" 
                                    placeholder="Enter 6-digit OTP" 
                                    value={otpInput}
                                    onChange={e => setOtpInput(e.target.value)}
                                    className="w-full text-center text-2xl tracking-widest p-4 border-2 border-violet-200 rounded-xl focus:border-violet-600 outline-none mb-4 font-mono"
                                    maxLength={6}
                                  />
                                  <button onClick={handleMarkAttendance} className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700">
                                    Verify OTP
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center p-6 border-2 border-dashed border-violet-300 rounded-xl bg-violet-50">
                                  <QrCode size={48} className="mx-auto text-violet-400 mb-4 animate-pulse" />
                                  <p className="text-sm text-violet-800 font-medium mb-4">Camera scanning simulated.</p>
                                  <input 
                                    type="text" 
                                    placeholder="Simulate QR Code Data" 
                                    value={otpInput}
                                    onChange={e => setOtpInput(e.target.value)}
                                    className="w-full text-center p-3 border border-violet-200 rounded-lg focus:border-violet-600 outline-none mb-4 text-sm"
                                  />
                                  <button onClick={handleMarkAttendance} className="w-full py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700">
                                    Simulate Scan
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 text-gray-500 p-4 rounded-xl flex items-center gap-3 border border-gray-200">
                          <XCircle size={24} />
                          <div>
                            <p className="font-bold">Not Available</p>
                            <p className="text-sm opacity-80">Attendance is currently closed.</p>
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

      {view === 'assignments' && (
        <motion.div key="assignments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-2xl font-bold text-violet-950 mb-6 flex items-center gap-2">
            <BookOpen className="text-violet-600" /> My Assignments
          </h2>
          <div className="space-y-4">
            {mockAssignments.map(assignment => (
              <div key={assignment.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{assignment.title}</h4>
                  <p className="text-sm text-gray-600">{assignment.subject}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    assignment.status === 'submitted' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {assignment.status}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">Due: {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {view === 'grades' && (
        <motion.div key="grades" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-2xl font-bold text-violet-950 mb-6 flex items-center gap-2">
            <GraduationCap className="text-violet-600" /> Academic Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockGrades.map(grade => (
              <div key={grade.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900">{grade.subject}</h4>
                  <p className="text-sm text-gray-500">Score: {grade.score}/100</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xl">
                  {grade.grade}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {view === 'library' && (
        <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-2xl font-bold text-violet-950 mb-6 flex items-center gap-2">
            <Library className="text-violet-600" /> Library Dues
          </h2>
          <div className="space-y-4">
            {mockLibrary.map(item => (
              <div key={item.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{item.book}</h4>
                  <p className="text-sm text-gray-600">by {item.author}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    item.status === 'borrowed' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700 animate-pulse"
                  )}>
                    {item.status}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {view === 'events' && (
        <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
          <h2 className="text-2xl font-bold text-violet-950 mb-6 flex items-center gap-2">
            <CalendarDays className="text-violet-600" /> Upcoming Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockEvents.map(event => (
              <div key={event.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-violet-50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-md">
                    {event.type}
                  </span>
                  <span className="text-sm font-bold text-gray-500">{format(new Date(event.date), 'MMM dd')}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-1">{event.title}</h4>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin size={14} /> {event.venue}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {view === 'leaves' && (
        <motion.div key="leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
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
            <div className="mt-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
              <p className="text-sm text-violet-700">
                <strong>Note:</strong> Student leave will be reviewed and approved by your allocated mentor staff.
              </p>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-violet-50 shrink-0">
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
                    value={leaveForm.leaveType} 
                    onChange={e => setLeaveForm({...leaveForm, leaveType: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none bg-white"
                  >
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="OD (On Duty)">OD (On Duty)</option>
                    <option value="Personal Work">Personal Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={leaveForm.fromDate} 
                      onChange={e => setLeaveForm({...leaveForm, fromDate: e.target.value})}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={leaveForm.toDate} 
                      onChange={e => setLeaveForm({...leaveForm, toDate: e.target.value})}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (e.g., 2 days)</label>
                  <input 
                    required 
                    type="text" 
                    value={leaveForm.duration} 
                    onChange={e => setLeaveForm({...leaveForm, duration: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Reason</label>
                  <textarea 
                    required 
                    value={leaveForm.remarks} 
                    onChange={e => setLeaveForm({...leaveForm, remarks: e.target.value})}
                    placeholder="Enter reason for leave..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none resize-none bg-gray-50" 
                    rows={3}
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
                    className="flex-1 py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                  >
                    Submit Leave Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
