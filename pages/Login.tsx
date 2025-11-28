import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { ShieldCheck, User } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    if (role === UserRole.ADMIN) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-auis-600 px-8 py-6 text-center">
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-auis-100 mt-2">Sign in to AUIS Help Desk</p>
        </div>
        
        <div className="px-8 py-8 space-y-6">
          <div className="space-y-4">
            <button
              onClick={() => handleLogin(UserRole.USER)}
              className="w-full group relative flex items-center justify-center px-4 py-4 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              <span className="absolute left-4">
                <User className="h-5 w-5 text-gray-400 group-hover:text-auis-600" />
              </span>
              <span className="font-medium">Continue as Student / Faculty</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Admin Access</span>
              </div>
            </div>

            <button
              onClick={() => handleLogin(UserRole.ADMIN)}
              className="w-full group relative flex items-center justify-center px-4 py-4 border border-transparent rounded-lg text-white bg-slate-800 hover:bg-slate-900 transition-all duration-200 shadow-md"
            >
              <span className="absolute left-4">
                <ShieldCheck className="h-5 w-5 text-slate-400 group-hover:text-white" />
              </span>
              <span className="font-medium">Sign in as Administrator</span>
            </button>
          </div>

          <div className="text-center text-xs text-gray-400 mt-6">
            <p>Authentication is simulated for this MVP demo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
