import React, { useState } from 'react';
import { useStore } from '../../store';
import { format, parseISO, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { CheckCircle, XCircle, Calendar as CalendarIcon, Clock, User as UserIcon, MapPin, Plus, FileText, CalendarDays, ClipboardList, Check, X, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentAttendance() {
  const { currentUser, sessions, users, attendances, addLeaveRequest, leaveRequests } = useStore();
  const [view, setView] = useState<'summary' | 'daily' | 'calendar' | 'absent' | 'leaves'>('summary');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [duration, setDuration] = useState('1 day');
  const [remarks, setRemarks] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (!currentUser) return null;

  const today = format(new Date(), 'yyyy-MM-dd');

  // ── All attendance records for this student ───────────────────────────────
  const studentAttendances = attendances.filter(a => a.studentId === currentUser.id);
  // Present session IDs
  const presentSessionIds = studentAttendances.filter(a => a.status === 'present').map(a => a.sessionId);
  // All session IDs this student has any record for (present or absent)
  const recordedSessionIds = new Set(studentAttendances.map(a => a.sessionId));

  // ── My sessions (filtered by department + batch) for Daily / Calendar / Missed ──
  const mySessions = sessions.filter(s => {
    const matchesDept = !s.department || s.department.toLowerCase() === currentUser.department?.toLowerCase();
    const matchesBatch = !s.batch || s.batch === currentUser.batch;
    return matchesDept && matchesBatch;
  });

  // ── Stats: use completed sessions where the student has an attendance record ──
  // This is reliable because backend auto-inserts absent when faculty ends session.
  // We use actual DB records rather than dept/batch filter which may not match from older data.
  const sessionsWithRecord = sessions.filter(
    s => s.status === 'completed' && recordedSessionIds.has(s.id)
  );
  const totalClasses = sessionsWithRecord.length;
  const present = presentSessionIds.filter(id => sessionsWithRecord.some(s => s.id === id)).length;
  const absent = totalClasses - present;
  const percentage = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0;

  // ── Subject-wise breakdown (based on actual records) ─────────────────────
  const subjectStats = sessionsWithRecord.reduce((acc, session) => {
    if (!acc[session.activityName]) {
      acc[session.activityName] = { name: session.activityName, present: 0, absent: 0, total: 0 };
    }
    acc[session.activityName].total += 1;
    if (presentSessionIds.includes(session.id)) {
      acc[session.activityName].present += 1;
    } else {
      acc[session.activityName].absent += 1;
    }
    return acc;
  }, {} as Record<string, { name: string; present: number; absent: number; total: number }>);

  const pieData = Object.values(subjectStats).map(stat => ({
    name: stat.name,
    value: stat.present,
    absent: stat.absent,
    total: stat.total,
  }));

  // ── Daily View: today's sessions only ────────────────────────────────────
  const todaySessions = mySessions
    .filter(s => s.date?.slice(0, 10) === today)
    .sort((a, b) => a.hour - b.hour);

  // ── Calendar: sessions for selected date ─────────────────────────────────
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const calendarDaySessions = mySessions
    .filter(s => s.date?.slice(0, 10) === selectedDateStr)
    .sort((a, b) => a.hour - b.hour);

  // ── Missed Classes: ALL completed sessions student was absent in ──────────
  const missedSessions = sessionsWithRecord
    .filter(s => !presentSessionIds.includes(s.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  const myLeaves = leaveRequests.filter(l => l.userId === currentUser.id);

  const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#6366f1', '#14b8a6'];

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await addLeaveRequest({
      userId: currentUser.id,
      leaveType,
      fromDate,
      toDate,
      duration,
      remarks,
      appliedBy: currentUser.id,
    });
    setShowLeaveModal(false);
    setFromDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setToDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setDuration('1 day');
    setRemarks('');
  };

  // colour helper for attendance percentage indicator ring
  const ringColor = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  // ── Status badge helper ───────────────────────────────────────────────────
  const StatusBadge = ({ session }: { session: typeof sessions[0] }) => {
    if (presentSessionIds.includes(session.id)) {
      return (
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-1">
          <CheckCircle size={12} /> Present
        </span>
      );
    }
    if (session.status === 'completed') {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-bold flex items-center gap-1">
          <XCircle size={12} /> Absent
        </span>
      );
    }
    if (session.status === 'active') {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-bold animate-pulse flex items-center gap-1">
          <AlertCircle size={12} /> Active
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium">
        Scheduled
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-violet-950">Attendance Record</h1>
        <p className="text-violet-600 mt-2">Track your presence and history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-8 border-b border-violet-100 pb-4 overflow-x-auto">
        {[
          { id: 'summary',  label: 'Summary',        icon: FileText },
          { id: 'daily',    label: 'Daily View',      icon: Clock },
          { id: 'calendar', label: 'Calendar',        icon: CalendarDays },
          { id: 'absent',   label: 'Missed Classes',  icon: XCircle },
          { id: 'leaves',   label: 'My Leaves',       icon: ClipboardList },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={clsx(
              'flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap',
              view === tab.id
                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                : 'bg-white text-gray-600 hover:bg-violet-50',
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── SUMMARY ──────────────────────────────────────────────────────── */}
        {view === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Percentage ring */}
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex flex-col items-center justify-center">
                <div className="w-28 h-28 rounded-full flex items-center justify-center relative mb-3">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#ede9fe" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={ringColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(percentage / 100) * 263.9} 263.9`}
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <span className="text-2xl font-bold text-violet-950 z-10">{percentage}%</span>
                </div>
                <p className="text-gray-500 font-medium text-sm">Overall Attendance</p>
                {percentage < 75 && (
                  <p className="text-xs text-red-500 mt-1 font-medium">⚠ Below 75% threshold</p>
                )}
              </div>

              {/* Total classes */}
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CalendarIcon size={24} /></div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{totalClasses}</p>
                    <p className="text-sm text-gray-500 font-medium">Total Classes</p>
                  </div>
                </div>
              </div>

              {/* Present */}
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={24} /></div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{present}</p>
                    <p className="text-sm text-gray-500 font-medium">Present</p>
                  </div>
                </div>
              </div>

              {/* Absent */}
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl"><XCircle size={24} /></div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{absent}</p>
                    <p className="text-sm text-gray-500 font-medium">Absent</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Subject-wise pie */}
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <h3 className="text-lg font-bold text-violet-950 mb-6">Subject-wise Attendance</h3>
                <div className="h-64">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, _name: string, props: any) => [
                            `${value} present / ${props.payload.total} total (${props.payload.total > 0 ? Math.round((value / props.payload.total) * 100) : 0}%)`,
                            props.payload.name,
                          ]}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No attendance data yet</div>
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm">
                <h3 className="text-lg font-bold text-violet-950 mb-6">Recent Activity</h3>
                <div className="space-y-3">
                  {studentAttendances
                    .filter(a => a.status === 'present')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 6)
                    .map(att => {
                      const session = sessions.find(s => s.id === att.sessionId);
                      return (
                        <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{session?.activityName}</p>
                            <p className="text-xs text-gray-500">{format(att.timestamp, 'MMM dd, yyyy • HH:mm')}</p>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Present</span>
                        </div>
                      );
                    })}
                  {studentAttendances.filter(a => a.status === 'present').length === 0 && (
                    <div className="text-center py-8 text-gray-400">No recent activity</div>
                  )}
                </div>
              </div>
            </div>

            {/* Subject detail table */}
            {Object.values(subjectStats).length > 0 && (
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-violet-50">
                  <h3 className="font-bold text-violet-950">Attendance by Subject</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left font-medium text-gray-500">Subject</th>
                        <th className="px-5 py-3 text-center font-medium text-gray-500">Total</th>
                        <th className="px-5 py-3 text-center font-medium text-gray-500">Present</th>
                        <th className="px-5 py-3 text-center font-medium text-gray-500">Absent</th>
                        <th className="px-5 py-3 text-center font-medium text-gray-500">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.values(subjectStats).map(stat => {
                        const pct = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
                        return (
                          <tr key={stat.name} className="hover:bg-violet-50">
                            <td className="px-5 py-3 font-medium text-gray-900">{stat.name}</td>
                            <td className="px-5 py-3 text-center text-gray-600">{stat.total}</td>
                            <td className="px-5 py-3 text-center text-emerald-600 font-semibold">{stat.present}</td>
                            <td className="px-5 py-3 text-center text-red-600 font-semibold">{stat.absent}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-bold',
                                pct >= 75 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
                              )}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── DAILY VIEW: today's sessions only ────────────────────────────── */}
        {view === 'daily' && (
          <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="bg-violet-50 px-6 py-4 rounded-2xl border border-violet-100 flex items-center gap-2">
              <CalendarIcon size={18} className="text-violet-600" />
              <span className="font-bold text-violet-950">{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
              <span className="ml-auto text-xs text-violet-500 font-medium bg-violet-100 px-3 py-1 rounded-full">Today</span>
            </div>

            {todaySessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
                <CalendarDays size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No sessions scheduled for today</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {todaySessions.map(session => {
                    const faculty = users.find(u => u.id === session.facultyId);
                    return (
                      <div key={session.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-800 flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs font-medium opacity-70">Hr</span>
                            <span className="font-bold text-lg leading-none">{session.hour}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{session.activityName}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1"><UserIcon size={14} /> {faculty?.name}</span>
                              <span className="flex items-center gap-1"><MapPin size={14} /> {session.venue}</span>
                              <span className="flex items-center gap-1"><Clock size={14} /> {session.startTime} – {session.endTime}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge session={session} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── CALENDAR ─────────────────────────────────────────────────────── */}
        {view === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-violet-950 text-xl">Class Calendar</h3>
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={e => setSelectedDate(parseISO(e.target.value))}
                  className="p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                />
              </div>

              {/* Week strip */}
              <div className="grid grid-cols-7 gap-2 mb-8">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i);
                  const isSelected = isSameDay(date, selectedDate);
                  const dayStr = format(date, 'yyyy-MM-dd');
                  const daySessions = mySessions.filter(s => s.date?.slice(0, 10) === dayStr);
                  const presentCount = daySessions.filter(s => presentSessionIds.includes(s.id)).length;
                  const hasSession = daySessions.length > 0;
                  const allCompleted = daySessions.length > 0 && daySessions.every(s => s.status === 'completed');

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={clsx(
                        'p-3 rounded-xl border cursor-pointer transition-all text-center',
                        isSelected ? 'border-violet-600 bg-violet-50 shadow-sm' : 'border-gray-100 hover:border-violet-300',
                        isToday(date) && !isSelected && 'border-violet-300',
                      )}
                    >
                      <div className="text-xs font-medium text-gray-500 mb-1">{format(date, 'EEE')}</div>
                      <div className={clsx('text-xl font-bold', isSelected ? 'text-violet-900' : isToday(date) ? 'text-violet-600' : 'text-gray-900')}>
                        {format(date, 'd')}
                      </div>
                      {hasSession && (
                        <div className={clsx(
                          'mt-1 text-xs font-semibold px-1 py-0.5 rounded-md inline-block',
                          allCompleted
                            ? presentCount === daySessions.length ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                            : 'bg-violet-100 text-violet-700',
                        )}>
                          {allCompleted ? `${presentCount}/${daySessions.length}` : `${daySessions.length} cls`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Detail list for selected date */}
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CalendarDays size={16} className="text-violet-500" />
                Classes on {format(selectedDate, 'MMMM d, yyyy')}
              </h4>
              <div className="space-y-3">
                {calendarDaySessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No classes scheduled for this date.
                  </div>
                ) : (
                  calendarDaySessions.map(session => {
                    const fac = users.find(u => u.id === session.facultyId);
                    return (
                      <div key={session.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                        <div className="w-12 h-12 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                          H{session.hour}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-gray-900">{session.activityName}</h5>
                          <p className="text-sm text-gray-500 truncate">{session.startTime} – {session.endTime} • {session.venue} • {fac?.name}</p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge session={session} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── MISSED CLASSES ───────────────────────────────────────────────── */}
        {view === 'absent' && (
          <motion.div key="absent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
                <h3 className="font-bold text-red-900 flex items-center gap-2">
                  <XCircle size={18} />
                  Missed Classes History
                </h3>
                <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {missedSessions.length} missed
                </span>
              </div>

              {missedSessions.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                  <p className="text-lg font-medium">Perfect attendance!</p>
                  <p className="text-sm">You haven't missed any sessions.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {missedSessions.map(session => {
                    const faculty = users.find(u => u.id === session.facultyId);
                    return (
                      <div key={session.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-red-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex flex-col items-center justify-center shrink-0 text-center">
                            <span className="text-xs font-medium opacity-70">Hr</span>
                            <span className="font-bold text-lg leading-none">{session.hour}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                                {format(parseISO(session.date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900">{session.activityName}</h4>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <UserIcon size={13} /> {faculty?.name}
                              <span className="mx-1">•</span>
                              <MapPin size={13} /> {session.venue}
                              <span className="mx-1">•</span>
                              {session.startTime} – {session.endTime}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                          {session.department}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── MY LEAVES ────────────────────────────────────────────────────── */}
        {view === 'leaves' && (
          <motion.div key="leaves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-violet-950 text-xl">My Leave Requests</h3>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg font-medium hover:bg-violet-200 transition-colors"
                >
                  <Plus size={16} /> New Request
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
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">{request.leaveType}</span>
                          <h4 className="font-bold text-gray-900">
                            {format(new Date(request.fromDate), 'MMM dd, yyyy')} – {format(new Date(request.toDate), 'MMM dd, yyyy')}
                          </h4>
                          <span className={clsx(
                            'text-xs font-bold px-2 py-1 rounded-md capitalize flex items-center gap-1',
                            request.status === 'pending'   ? 'bg-amber-100 text-amber-700'   :
                            request.status === 'approved'  ? 'bg-emerald-100 text-emerald-700' :
                            request.status === 'completed' ? 'bg-blue-100 text-blue-700'      :
                            'bg-red-100 text-red-700',
                          )}>
                            {request.status === 'approved'  && <Check size={12} />}
                            {request.status === 'completed' && <CheckCircle size={12} />}
                            {request.status === 'rejected'  && <X size={12} />}
                            {request.status === 'pending'   && <Clock size={12} />}
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{request.remarks}</p>
                        <p className="text-xs text-gray-500 mt-1">Duration: {request.duration}</p>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        Submitted {format(request.timestamp, 'MMM dd, yyyy')}
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

      {/* ── Apply Leave Modal ─────────────────────────────────────────────── */}
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
                  <select required value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none bg-white">
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>OD (On Duty)</option>
                    <option>Personal Work</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input required type="datetime-local" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input required type="datetime-local" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (e.g., 2 days)</label>
                  <input required type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Reason</label>
                  <textarea required value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter reason for leave..." className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none resize-none bg-gray-50" rows={3} />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors">Submit Request</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
