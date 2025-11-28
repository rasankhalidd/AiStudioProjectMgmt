
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { loginWithCredentials, registerUser } from '../services/authService';
import { X, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';

const LoginModal = () => {
  const { login, isLoginModalOpen, setShowLoginModal } = useAuth();
  const navigate = useNavigate();
  
  const [isLoginView, setIsLoginView] = useState(true); // Toggle between Login and Sign Up
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let user;
      if (isLoginView) {
        user = await loginWithCredentials(email, password);
      } else {
        user = await registerUser(name, email, password);
      }

      // Update global auth state
      login(user);
      
      // Close modal and redirect if admin
      setShowLoginModal(false);
      if (user.role === UserRole.ADMIN) {
        navigate('/admin');
      }
      
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setShowLoginModal(false)}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all scale-100 animate-fadeIn">
        
        {/* Close Button */}
        <button 
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 text-white/80 hover:text-white z-10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="bg-auis-600 px-8 py-8 text-center relative">
          <h2 className="text-2xl font-bold text-white">
            {isLoginView ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-auis-100 mt-2">
            {isLoginView ? 'Sign in to access your dashboard' : 'Join AUIS Help Desk today'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!isLoginView && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-auis-500 focus:border-auis-500 outline-none transition-all"
                  placeholder="John Doe"
                  required={!isLoginView}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-auis-500 focus:border-auis-500 outline-none transition-all"
                placeholder="name@auis.edu.krd"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-auis-500 focus:border-auis-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {isLoginView && (
               <div className="flex justify-end mt-1">
                 <button type="button" className="text-xs text-auis-600 hover:text-auis-800">Forgot password?</button>
               </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-auis-600 hover:bg-auis-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auis-500 disabled:opacity-70 transition-all mt-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginView ? 'Sign In' : 'Create Account')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
               Google
             </button>
             <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
               Microsoft
             </button>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">
              {isLoginView ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              type="button"
              onClick={toggleView}
              className="font-medium text-auis-600 hover:text-auis-500"
            >
              {isLoginView ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </form>

        {isLoginView && (
           <div className="bg-gray-50 px-8 py-3 text-xs text-center text-gray-400 border-t border-gray-100">
              <p>Demo Admin: <strong>admin@auis.edu.krd</strong> / <strong>admin123</strong></p>
              <p>Demo User: <strong>student@auis.edu.krd</strong> / <strong>student123</strong></p>
           </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
