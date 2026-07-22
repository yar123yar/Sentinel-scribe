import api from './api';
import { User } from './types';

export interface AuthState {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthState> {
  const res = await api.post('/auth/login', { email, password });
  const { access_token, user } = res.data;
  localStorage.setItem('auth_token', access_token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  return { token: access_token, user };
}

export async function signup(name: string, role: string, email: string, phone_number: string, password: string): Promise<AuthState> {
  const res = await api.post('/auth/signup', { name, role, email, phone_number, password });
  const { access_token, user } = res.data;
  localStorage.setItem('auth_token', access_token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  return { token: access_token, user };
}

export async function loginDemo(): Promise<AuthState> {
  const res = await api.post('/auth/login-demo');
  const { access_token, user } = res.data;
  localStorage.setItem('auth_token', access_token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  return { token: access_token, user };
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/login';
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user');
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('auth_token');
}
