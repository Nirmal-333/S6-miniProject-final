import { create } from 'zustand';
import { format, addDays, subDays } from 'date-fns';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export type Role = 'student' | 'faculty' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone?: string;
  password?: string;
  rollNo?: string;
  department?: string;
  batch?: string;
  photo?: string;
  mentorId?: string;
}

export interface Session {
  id: string;
  activityName: string;
  facultyId: string;
  department: string;
  batch?: string;
  venue: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  hour: number;
  status: 'scheduled' | 'active' | 'completed';
  otp?: string;
  otpExpiresAt?: number;
  facultyName?: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent';
  timestamp: number;
  activityName?: string;
  date?: string;
  studentName?: string;
}

export interface Survey {
  id: string;
  sessionId: string;
  studentId: string;
  rating: number;
  clarity: number;
  understanding: number;
  comments: string;
  activityName?: string;
  studentName?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  duration: string;
  remarks: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  appliedBy: string;
  approvedBy?: string;
  timestamp: number;
  userName?: string;
  userRole?: string;
  approverName?: string;
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
  loadData: () => Promise<void>;
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

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
};

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  isAuthReady: false,
  users: [],
  sessions: [],
  attendances: [],
  surveys: [],
  leaveRequests: [],
  notifications: [],

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const data = await apiRequest('/auth/me');
        set({ currentUser: data.user, isAuthReady: true });
        get().loadData();
      } catch (error) {
        localStorage.removeItem('token');
        set({ isAuthReady: true });
      }
    } else {
      set({ isAuthReady: true });
    }
  },

  loadData: async () => {
    try {
      const [usersData, sessionsData, attendanceData, surveysData, leavesData, notificationsData] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/sessions'),
        apiRequest('/attendance'),
        apiRequest('/surveys'),
        apiRequest('/leaves'),
        apiRequest('/notifications'),
      ]);

      set({
        users: usersData.users || [],
        sessions: sessionsData.sessions || [],
        attendances: attendanceData.attendance || [],
        surveys: surveysData.surveys || [],
        leaveRequests: leavesData.leaveRequests || [],
        notifications: notificationsData.notifications || [],
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  },

  login: async (rollNoOrEmail, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: rollNoOrEmail, password }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Login failed [${response.status}]:`, errText);
        return false;
      }

      const { token, user } = await response.json();
      localStorage.setItem('token', token);
      set({ currentUser: user });
      await get().loadData();
      return true;
    } catch (error) {
      console.error('Login network error:', error);
      return false;
    }
  },

  logout: async () => {
    localStorage.removeItem('token');
    set({
      currentUser: null,
      users: [],
      sessions: [],
      attendances: [],
      surveys: [],
      leaveRequests: [],
      notifications: [],
    });
  },

  markAttendance: async (studentId, sessionId, code) => {
    try {
      await apiRequest('/attendance', {
        method: 'POST',
        body: JSON.stringify({ sessionId, code }),
      });
      await get().loadData(); 
      return true;
    } catch (error) {
      console.error('Mark attendance error:', error);
      return false;
    }
  },

  submitSurvey: async (survey) => {
    try {
      await apiRequest('/surveys', {
        method: 'POST',
        body: JSON.stringify(survey),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Submit survey error:', error);
      throw error;
    }
  },

  generateOtp: async (sessionId) => {
    try {
      const data = await apiRequest(`/sessions/${sessionId}/generate-otp`, {
        method: 'POST',
      });
      await get().loadData(); 
      return data.otp;
    } catch (error) {
      console.error('Generate OTP error:', error);
      throw error;
    }
  },

  endSession: async (sessionId) => {
    try {
      await apiRequest(`/sessions/${sessionId}/end`, {
        method: 'POST',
      });
      await get().loadData(); 
    } catch (error) {
      console.error('End session error:', error);
      throw error;
    }
  },

  transferActivity: async (sessionId, newFacultyId) => {
    try {
      await apiRequest(`/sessions/${sessionId}/transfer`, {
        method: 'PUT',
        body: JSON.stringify({ newFacultyId }),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Transfer activity error:', error);
      throw error;
    }
  },

  createSession: async (session) => {
    try {
      await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Create session error:', error);
      throw error;
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Delete session error:', error);
      throw error;
    }
  },

  addUser: async (user) => {
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Add user error:', error);
      throw error;
    }
  },

  updateUser: async (id, user) => {
    try {
      await apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'DELETE',
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  resetPassword: async (email, newPassword) => {
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, newPassword }),
      });
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      return false;
    }
  },

  addLeaveRequest: async (request) => {
    try {
      await apiRequest('/leaves', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Add leave request error:', error);
      throw error;
    }
  },

  updateLeaveRequestStatus: async (id, status, approvedBy) => {
    try {
      await apiRequest(`/leaves/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Update leave request status error:', error);
      throw error;
    }
  },

  bulkMarkAttendance: async (studentIds, sessionId, status) => {
    try {
      await apiRequest('/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({ studentIds, sessionId, status }),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Bulk mark attendance error:', error);
      throw error;
    }
  },

  addNotification: async (userId, message) => {
    try {
      await apiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify({ userId, message }),
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Add notification error:', error);
      throw error;
    }
  },

  markNotificationRead: async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: 'PUT',
      });
      await get().loadData(); 
    } catch (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }
  },
}));
