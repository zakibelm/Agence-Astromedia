// services/authService.ts
import { User, AuthSession } from '../types';
import { uuidv4 } from '../utils/uuid';

const USERS_KEY = 'astromedia_users';
const SESSION_KEY = 'astromedia_current_session';

// Helper to load users from localStorage (Mock DB)
const loadUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

const saveUser = (user: User) => {
  const users = loadUsers();
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
};

export const getCurrentSession = (): AuthSession => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : { user: null };
};

export const signUp = async (email: string, password: string, fullName?: string): Promise<User> => {
  // Simulate delay
  await new Promise(r => setTimeout(r, 1000));

  const users = loadUsers();
  if (users.some(u => u.email === email)) {
    throw new Error('Cet email est déjà utilisé.');
  }

  const newUser: User = {
    id: uuidv4(),
    email,
    fullName,
    createdAt: new Date().toISOString()
  };

  saveUser(newUser);
  
  // Auto-login
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user: newUser, token: 'mock-jwt-token' }));
  
  return newUser;
};

export const signIn = async (email: string, password: string): Promise<User> => {
  await new Promise(r => setTimeout(r, 800));

  const users = loadUsers();
  const user = users.find(u => u.email === email);
  
  // In a real app, we'd check the password hash
  if (!user) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token: 'mock-jwt-token' }));
  return user;
};

export const signOut = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const resetPassword = async (email: string): Promise<void> => {
  await new Promise(r => setTimeout(r, 1000));
  const users = loadUsers();
  if (!users.some(u => u.email === email)) {
    throw new Error('Aucun compte associé à cet email.');
  }
  // Simulate sending email
  console.log(`Reset link sent to ${email}`);
};
