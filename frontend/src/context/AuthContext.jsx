import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const { setAuthUser } = useTheme();

  // Initialize auth check on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('socialsync_user', JSON.stringify({ id: res.data.user.id, email: res.data.user.email }));
          if (setAuthUser) setAuthUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Initial session validation failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const setSession = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser(userData);
    localStorage.setItem('socialsync_user', JSON.stringify({ id: userData.id, email: userData.email }));
    if (setAuthUser) setAuthUser(userData);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data?.token) {
      setSession(res.data.user, res.data.token);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const loginWithGoogle = async (idToken, linkPassword = null) => {
    const payload = { idToken };
    if (linkPassword) payload.linkPassword = linkPassword;

    const res = await api.post('/auth/google', payload);
    if (res.requiresLinking) {
      return { requiresLinking: true, email: res.email, message: res.message };
    }
    if (res.success && res.data?.token) {
      setSession(res.data.user, res.data.token);
      return { success: true, user: res.data.user };
    }
    throw new Error(res.message || 'Google sign-in failed');
  };

  const register = async (nameOrPayload, email, password, confirmPassword, plan, cardData) => {
    let payload;
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      payload = {
        name: nameOrPayload.name,
        email: nameOrPayload.email,
        password: nameOrPayload.password,
        confirmPassword: nameOrPayload.confirmPassword,
        plan: nameOrPayload.plan,
        cardData: nameOrPayload.cardData
      };
    } else {
      payload = {
        name: nameOrPayload,
        email,
        password,
        confirmPassword,
        plan,
        cardData
      };
    }

    const res = await api.post('/auth/register', payload);
    if (res.success && res.data?.token) {
      setSession(res.data.user, res.data.token);
      return res.data.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('socialsync_user');
      if (setAuthUser) setAuthUser(null);
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (data) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...data } : data;
      if (setAuthUser) setAuthUser(updated);
      return updated;
    });
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        if (setAuthUser) setAuthUser(res.data.user);
        return res.data.user;
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err.message);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        loginWithGoogle,
        setSession,
        register,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
