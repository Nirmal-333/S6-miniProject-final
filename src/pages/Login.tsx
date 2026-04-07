import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: new password
  const [successMessage, setSuccessMessage] = useState('');

  const login = useStore((state) => state.login);
  const resetPassword = useStore((state) => state.resetPassword);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(identifier, password);
      if (success) {
        const user = useStore.getState().currentUser;
        if (user?.role === 'student') navigate('/student');
        else if (user?.role === 'faculty') navigate('/faculty');
        else if (user?.role === 'admin') navigate('/admin');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Mock email verification - check if user exists
    const users = useStore.getState().users;
    const user = users.find(u => u.email === resetEmail);
    
    if (user) {
      setResetStep(2);
    } else {
      setError('Email not found in our records');
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await resetPassword(resetEmail, newPassword);
      if (success) {
        setSuccessMessage('Password reset successful! You can now login.');
        setIsResetting(false);
        setResetStep(1);
        setResetEmail('');
        setNewPassword('');
      } else {
        setError('Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isResetting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-violet-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl shadow-violet-200/50 w-full max-w-md border border-violet-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-violet-950">Reset Password</h2>
            <p className="text-violet-600/80 mt-2">
              {resetStep === 1 ? 'Enter your email to verify your account' : 'Set your new secure password'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {resetStep === 1 ? (
            <form onSubmit={handleResetRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-violet-900 mb-2">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-violet-50/50 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                  placeholder="admin@college.edu"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-violet-900 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-violet-50/50 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-600 outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Update Password'}
              </button>
            </form>
          )}

          <button
            onClick={() => {
              setIsResetting(false);
              setResetStep(1);
              setError('');
            }}
            className="w-full mt-4 text-sm text-violet-600 font-medium hover:underline"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl shadow-violet-200/50 w-full max-w-md border border-violet-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-violet-300">
            SA
          </div>
          <h1 className="text-2xl font-bold text-violet-950">Smart Attendance</h1>
          <p className="text-violet-600/80 mt-2">Login to manage your sessions</p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-green-100">
            <AlertCircle size={18} />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-violet-900 mb-2">
              Roll No or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-violet-400">
                <User size={20} />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-violet-50/50 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all text-violet-900 placeholder-violet-300"
                placeholder="e.g. 22CS101 or admin@college.edu"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-violet-900 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-violet-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-violet-50/50 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all text-violet-900 placeholder-violet-300"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setIsResetting(true);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-xs text-violet-600 font-medium hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-violet-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-violet-500">
          <p>Demo Credentials:</p>
          <div className="mt-2 space-y-1">
            <p>Student: 22CS101 / password</p>
            <p>Faculty: kumar@college.edu / password</p>
            <p>Admin: admin@college.edu / password</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
