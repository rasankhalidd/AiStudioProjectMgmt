
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TicketSubmit from './pages/TicketSubmit';
import AdminDashboard from './pages/AdminDashboard';
import TicketDetail from './pages/TicketDetail';
import { User, UserRole } from './types';
import { getCurrentUser, logoutUser } from './services/authService';
import NotificationToast from './components/NotificationToast';

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  setShowLoginModal: (isOpen: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    login: () => {}, 
    logout: () => {},
    isLoginModalOpen: false,
    setShowLoginModal: () => {}
});

export const useAuth = () => useContext(AuthContext);

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Check localStorage for persisted session via authService
  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    // Persistence is now handled by authService inside loginWithCredentials
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const setShowLoginModal = (isOpen: boolean) => {
    setIsLoginModalOpen(isOpen);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoginModalOpen, setShowLoginModal }}>
      <HashRouter>
        <Layout>
          <NotificationToast />
          <Routes>
            <Route path="/" element={<TicketSubmit />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole={UserRole.ADMIN}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/ticket/:id" element={<TicketDetail />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
