import React, { createContext, useState, useEffect } from 'react';
import { loginAPI, getProfileAPI } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: check if token exists and validate it by fetching fresh profile
  useEffect(() => {
    const token = localStorage.getItem('lms_token');
    
    if (token) {
      // Token exists — verify it's still valid by calling /api/auth/profile
      getProfileAPI()
        .then((response) => {
          const userData = response.user;
          setUser(userData);
          localStorage.setItem('lms_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token invalid/expired — clear everything
          localStorage.removeItem('lms_user');
          localStorage.removeItem('lms_token');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // No token — user not logged in
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginAPI({ email, password });
      
      // Backend returns { success: true, token, user }
      const userData = response.user;
      
      setUser(userData);
      localStorage.setItem('lms_user', JSON.stringify(userData));
      localStorage.setItem('lms_token', response.token);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lms_user');
    localStorage.removeItem('lms_token');
  };

  // Allows components (e.g. Register) to push fresh user data into context
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('lms_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
