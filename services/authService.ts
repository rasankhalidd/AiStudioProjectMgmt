
import { User, UserRole } from '../types';

// Mock database storage key
const USERS_STORAGE_KEY = 'auis_users_db_v1';
const SESSION_KEY = 'auis_session_token';

// Seed initial users if empty
const seedUsers = () => {
  const existing = localStorage.getItem(USERS_STORAGE_KEY);
  if (!existing) {
    const defaultUsers = [
      {
        id: 'u-admin-001',
        name: 'System Administrator',
        email: 'admin@auis.edu.krd',
        password: 'admin123', // In a real app, this would be hashed (e.g. bcrypt)
        role: UserRole.ADMIN,
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
      },
      {
        id: 'u-student-001',
        name: 'Jane Student',
        email: 'student@auis.edu.krd',
        password: 'student123',
        role: UserRole.USER,
        avatar: 'https://ui-avatars.com/api/?name=Jane+Student&background=random'
      }
    ];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
  }
};

// Initialize DB
seedUsers();

const getUsers = (): any[] => {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const loginWithCredentials = async (email: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // In real backend: await bcrypt.compare(password, user.passwordHash)
  if (user.password !== password) {
    throw new Error('Invalid email or password');
  }

  // Determine user object to return (exclude password)
  const sessionUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar
  };

  // Persist session
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
};

export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('User already exists with this email');
  }

  // Simple rule: if email contains 'admin', make them admin (FOR DEMO ONLY)
  // In reality, admin registration should be restricted.
  const role = email.toLowerCase().includes('admin') ? UserRole.ADMIN : UserRole.USER;

  const newUser = {
    id: `u-${Date.now()}`,
    name,
    email,
    password, // Should be hashed
    role,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  const sessionUser: User = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    avatar: newUser.avatar
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};
