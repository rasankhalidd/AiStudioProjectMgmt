
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Ticket, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../App';
import LoginModal from './LoginModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, setShowLoginModal } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavLink = ({ to, label, icon: Icon }: any) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-auis-100 text-auis-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        onClick={() => setIsMenuOpen(false)}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <LoginModal />
      
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-auis-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    A
                </div>
                <span className="font-bold text-xl text-slate-800">AUIS <span className="text-auis-600">Help Desk</span></span>
              </Link>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <NavLink to="/" label="Submit Ticket" icon={Ticket} />
              {user && user.role === UserRole.ADMIN && (
                <NavLink to="/admin" label="Admin Dashboard" icon={LayoutDashboard} />
              )}
              
              <div className="ml-4 flex items-center border-l pl-4 border-gray-200">
                {user ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-700">Hi, {user.name}</span>
                    <button
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-100"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-auis-600 hover:bg-auis-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auis-500"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-auis-500"
              >
                {isMenuOpen ? <X className="block w-6 h-6" /> : <Menu className="block w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1 px-2">
              <NavLink to="/" label="Submit Ticket" icon={Ticket} />
              {user && user.role === UserRole.ADMIN && (
                <NavLink to="/admin" label="Admin Dashboard" icon={LayoutDashboard} />
              )}
              {user ? (
                <div className="border-t border-gray-200 pt-4 pb-3">
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-auis-100 flex items-center justify-center text-auis-600">
                        <UserIcon />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{user.name}</div>
                      <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 px-2">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-2 pt-4">
                  <button
                    onClick={() => {
                        setShowLoginModal(true);
                        setIsMenuOpen(false);
                    }}
                    className="block w-full text-center px-5 py-3 rounded-md font-medium text-white bg-auis-600 hover:bg-auis-700"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} American University of Iraq, Sulaimani. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
