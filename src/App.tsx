import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentLeaves from './pages/student/Leaves';
import VirtualID from './pages/student/VirtualID';
import FacultyDashboard from './pages/faculty/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import { useStore } from './store';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const currentUser = useStore(state => state.currentUser);
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  const initialize = useStore(state => state.initialize);
  const isAuthReady = useStore(state => state.isAuthReady);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<Layout />}>
          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/attendance" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAttendance />
            </ProtectedRoute>
          } />
          <Route path="/student/leaves" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLeaves />
            </ProtectedRoute>
          } />
          <Route path="/student/id-card" element={
            <ProtectedRoute allowedRoles={['student']}>
              <VirtualID />
            </ProtectedRoute>
          } />

          {/* Faculty Routes */}
          <Route path="/faculty" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyDashboard initialTab="overview" />
            </ProtectedRoute>
          } />
          <Route path="/faculty/attendance" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyDashboard initialTab="attendance" />
            </ProtectedRoute>
          } />
          <Route path="/faculty/leaves" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyDashboard initialTab="leaves" />
            </ProtectedRoute>
          } />
          <Route path="/faculty/mentees" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyDashboard initialTab="mentees" />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard initialTab="overview" />
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard initialTab="attendance" />
            </ProtectedRoute>
          } />
          <Route path="/admin/leaves" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard initialTab="leaves" />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard initialTab="users" />
            </ProtectedRoute>
          } />
          <Route path="/admin/calendar" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard initialTab="calendar" />
            </ProtectedRoute>
          } />
          <Route path="/admin/surveys" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard initialTab="surveys" />
            </ProtectedRoute>
          } />
          {/* Fallback for unimplemented admin routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <div className="p-8 text-center text-gray-500">
                <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
                <p>This module is under development.</p>
              </div>
            </ProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
