import React, { useState } from 'react';
import { useStore } from '../../store';
import { format } from 'date-fns';
import { ClipboardList, Plus, Clock, CheckCircle, X, Check, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export default function StudentLeaves() {
  const { currentUser, addLeaveRequest, leaveRequests } = useStore();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [fromDate, setFromDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [duration, setDuration] = useState('1 day');
  const [remarks, setRemarks] = useState('');

  if (!currentUser) return null;

  const myLeaves = leaveRequests.filter(l => l.userId === currentUser.id);

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addLeaveRequest({
      userId: currentUser.id,
      leaveType,
      fromDate,
      toDate,
      duration,
      remarks,
      appliedBy: currentUser.id
    });
    
    setShowLeaveModal(false);
    setFromDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setToDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setDuration('1 day');
    setRemarks('');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-violet-950">Leave Approvals</h1>
          <p className="text-violet-600 mt-2">Manage and track your leave requests</p>
        </div>
        <button
          onClick={() => setShowLeaveModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
        >
          <Plus size={20} />
          Apply for Leave
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-violet-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-violet-50 bg-violet-50/30 flex items-center justify-between">
          <h3 className="font-bold text-violet-950 flex items-center gap-2">
            <ClipboardList size={20} />
            My Leave History
          </h3>
          <span className="text-sm font-medium text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
            {myLeaves.length} Total Requests
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {myLeaves.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-violet-50 text-violet-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={40} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">No Leave Requests</h4>
              <p className="text-gray-500">You haven't submitted any leave requests yet.</p>
            </div>
          ) : (
            myLeaves.sort((a, b) => b.timestamp - a.timestamp).map(request => (
              <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={clsx(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      request.status === 'pending' ? "bg-amber-100 text-amber-600" :
                      request.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                      request.status === 'completed' ? "bg-blue-100 text-blue-600" :
                      "bg-red-100 text-red-600"
                    )}>
                      {request.status === 'pending' && <Clock size={24} />}
                      {request.status === 'approved' && <CheckCircle size={24} />}
                      {request.status === 'completed' && <CheckCircle size={24} />}
                      {request.status === 'rejected' && <X size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-gray-900 text-lg">{request.leaveType}</h4>
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                          request.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          request.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          request.status === 'completed' ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {request.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {format(new Date(request.fromDate), 'MMM dd, yyyy')} - {format(new Date(request.toDate), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {request.duration}
                        </span>
                      </div>
                      <p className="mt-3 text-gray-600 bg-white p-3 rounded-xl border border-gray-100 text-sm italic">
                        "{request.remarks}"
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Submitted on</p>
                    <p className="text-sm font-medium text-gray-700">{format(request.timestamp, 'MMM dd, yyyy')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(request.timestamp, 'HH:mm')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 p-6 bg-violet-100/50 rounded-3xl border border-violet-200 flex items-start gap-4">
        <div className="p-2 bg-violet-200 text-violet-700 rounded-xl">
          <ClipboardList size={20} />
        </div>
        <div>
          <h4 className="font-bold text-violet-950 mb-1">Important Note</h4>
          <p className="text-sm text-violet-700 leading-relaxed">
            All leave requests are subject to approval by your assigned mentor. Please ensure you submit requests at least 24 hours in advance for planned leaves. For emergency or sick leaves, documentation may be required upon return.
          </p>
        </div>
      </div>

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
                    value={leaveType} 
                    onChange={e => setLeaveType(e.target.value)}
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
                      value={fromDate} 
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={toDate} 
                      onChange={e => setToDate(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (e.g., 2 days)</label>
                  <input 
                    required 
                    type="text" 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Reason</label>
                  <textarea 
                    required 
                    value={remarks} 
                    onChange={e => setRemarks(e.target.value)}
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
                    Submit Request
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
