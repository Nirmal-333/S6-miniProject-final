import { create } from 'zustand';
import { format, addDays, subDays } from 'date-fns';

export type Role = 'student' | 'faculty' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone?: string;
  password?: string;
  // Student specific
  rollNo?: string;
  department?: string;
  batch?: string;
  photo?: string;
  mentorId?: string; // Faculty ID who is the mentor
}

export interface Session {
  id: string;
  activityName: string;
  facultyId: string;
  department: string;
  venue: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hour: number; // 1 to 7
  status: 'scheduled' | 'active' | 'completed';
  otp?: string;
  otpExpiresAt?: number;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  timestamp: number;
}

export interface Survey {
  id: string;
  sessionId: string;
  studentId: string;
  rating: number;
  clarity: number;
  understanding: number;
  comments: string;
}

export interface LeaveRequest {
  id: string;
  userId: string; // ID of the person taking leave (student or faculty)
  leaveType: string;
  fromDate: string;
  toDate: string;
  duration: string;
  remarks: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  appliedBy: string; // ID of the person who created the request
  approvedBy?: string; // ID of the person who approved/rejected
  timestamp: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}

interface AppState {
  currentUser: User | null;
  isAuthReady: boolean;
  users: User[];
  sessions: Session[];
  attendances: Attendance[];
  surveys: Survey[];
  leaveRequests: LeaveRequest[];
  notifications: Notification[];
  login: (rollNoOrEmail: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  markAttendance: (studentId: string, sessionId: string, code: string) => Promise<boolean>;
  submitSurvey: (survey: Omit<Survey, 'id'>) => Promise<void>;
  generateOtp: (sessionId: string) => Promise<string>;
  endSession: (sessionId: string) => Promise<void>;
  createSession: (session: Omit<Session, 'id' | 'status'>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  transferActivity: (sessionId: string, newFacultyId: string) => Promise<void>;
  addLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'timestamp'>) => Promise<void>;
  updateLeaveRequestStatus: (id: string, status: 'approved' | 'rejected' | 'completed', approvedBy: string) => Promise<void>;
  bulkMarkAttendance: (studentIds: string[], sessionId: string, status: 'present' | 'absent') => Promise<void>;
  addNotification: (userId: string, message: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  initialize: () => void;
}

// Mock Data
const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', role: 'admin', email: 'admin@college.edu', password: 'password' },
  { id: '2', name: 'Kumar', role: 'faculty', email: 'kumar@college.edu', password: 'password', department: 'CSE' },
  { id: '3', name: 'Student User', role: 'student', email: 'student@college.edu', password: 'password', rollNo: '22CS101', department: 'CSE', batch: '2022-26', mentorId: '2' },
];

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  isAuthReady: true,
  users: MOCK_USERS,
  sessions: [],
  attendances: [],
  surveys: [],
  leaveRequests: [],
  notifications: [],

  initialize: () => {
    // No-op for local state
  },

  login: async (rollNoOrEmail, password) => {
    const user = get().users.find(u => (u.email === rollNoOrEmail || u.rollNo === rollNoOrEmail) && u.password === password);
    if (user) {
      set({ currentUser: user });
      return true;
    }
    return false;
  },

  logout: async () => {
    set({ currentUser: null });
  },

  markAttendance: async (studentId, sessionId, code) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'active') return false;
    if (session.otp !== code) return false;

    const id = Math.random().toString(36).substring(7);
    const newAttendance: Attendance = {
      id,
      sessionId,
      studentId,
      status: 'present',
      timestamp: Date.now(),
    };
    set(state => ({ attendances: [...state.attendances, newAttendance] }));
    return true;
  },

  submitSurvey: async (survey) => {
    const id = Math.random().toString(36).substring(7);
    const newSurvey: Survey = { ...survey, id };
    set(state => ({ surveys: [...state.surveys, newSurvey] }));
  },

  generateOtp: async (sessionId) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 20000;
    set(state => ({
      sessions: state.sessions.map(s => s.id === sessionId ? { ...s, status: 'active', otp, otpExpiresAt: expiresAt } : s)
    }));
    return otp;
  },

  endSession: async (sessionId) => {
    set(state => ({
      sessions: state.sessions.map(s => s.id === sessionId ? { ...s, status: 'completed', otp: undefined, otpExpiresAt: undefined } : s)
    }));
  },

  transferActivity: async (sessionId, newFacultyId) => {
    set(state => ({
      sessions: state.sessions.map(s => s.id === sessionId ? { ...s, facultyId: newFacultyId } : s)
    }));
  },

  createSession: async (session) => {
    const id = Math.random().toString(36).substring(7);
    const newSession: Session = { ...session, id, status: 'scheduled' };
    set(state => ({ sessions: [...state.sessions, newSession] }));
  },

  deleteSession: async (sessionId) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      attendances: state.attendances.filter(a => a.sessionId !== sessionId),
      surveys: state.surveys.filter(s => s.sessionId !== sessionId)
    }));
  },

  addUser: async (user) => {
    const id = Math.random().toString(36).substring(7);
    const newUser: User = { ...user, id };
    set(state => ({ users: [...state.users, newUser] }));
  },

  updateUser: async (id, user) => {
    set(state => ({
      users: state.users.map(u => u.id === id ? { ...u, ...user } : u)
    }));
  },

  deleteUser: async (userId) => {
    set(state => ({ users: state.users.filter(u => u.id !== userId) }));
  },

  resetPassword: async (email, newPassword) => {
    const user = get().users.find(u => u.email === email);
    if (user) {
      set(state => ({
        users: state.users.map(u => u.email === email ? { ...u, password: newPassword } : u)
      }));
      return true;
    }
    return false;
  },

  addLeaveRequest: async (request) => {
    const id = Math.random().toString(36).substring(7);
    const newRequest: LeaveRequest = { ...request, id, status: 'pending', timestamp: Date.now() };
    set(state => ({ leaveRequests: [...state.leaveRequests, newRequest] }));
    
    const user = get().users.find(u => u.id === request.userId);
    if (user?.role === 'student' && user.mentorId) {
      get().addNotification(user.mentorId, `Your mentee ${user.name} has submitted a leave request.`);
    } else if (user?.role === 'faculty') {
      // Notify admin
      const admins = get().users.filter(u => u.role === 'admin');
      admins.forEach(admin => {
        get().addNotification(admin.id, `Faculty member ${user.name} has submitted a leave request.`);
      });
    }
  },

  updateLeaveRequestStatus: async (id, status, approvedBy) => {
    set(state => ({
      leaveRequests: state.leaveRequests.map(r => r.id === id ? { ...r, status, approvedBy } : r)
    }));
    const request = get().leaveRequests.find(r => r.id === id);
    if (request) {
      get().addNotification(request.userId, `Your leave request has been ${status}.`);
    }
  },

  bulkMarkAttendance: async (studentIds, sessionId, status) => {
    const newAttendances = studentIds.map(studentId => ({
      id: Math.random().toString(36).substring(7),
      sessionId,
      studentId,
      status,
      timestamp: Date.now()
    }));
    set(state => ({
      attendances: [...state.attendances.filter(a => a.sessionId !== sessionId || !studentIds.includes(a.studentId)), ...newAttendances]
    }));
  },

  addNotification: async (userId, message) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification: Notification = { id, userId, message, read: false, timestamp: Date.now() };
    set(state => ({ notifications: [...state.notifications, newNotification] }));
  },

  markNotificationRead: async (id) => {
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  }
}));
