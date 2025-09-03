import { useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Login from './Login';
import Register from './Register';

function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  
  const handleRegister = async (userData) => {
    setError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, userData);
      setIsLogin(true);
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogin = async (credentials) => {
    setError('');
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, credentials);
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('username', user.username);
      localStorage.setItem('userId', user.id);
      
      const socket = io('http://192.168.1.60:3001', {
        auth: { token }
      });
      
      socket.on('connect', () => {
        onAuth({ ...user, socket });
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <>
      {isLogin ? (
        <Login 
          onLogin={handleLogin}
          switchToRegister={() => setIsLogin(false)}
          error={error}
        />
      ) : (
        <Register 
          onRegister={handleRegister}
          switchToLogin={() => setIsLogin(true)}
          error={error}
        />
      )}
    </>
  );
}

export default Auth;