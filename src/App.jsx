import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Auth from './Auth/Auth';
import ChatApp from './components/ChatApp';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.success) {
        const userData = response.data.data;
        localStorage.setItem('userData', JSON.stringify(userData));
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (token && userId) {
      const storedUserData = localStorage.getItem('userData');
      let initialUserData = null;
      
      if (storedUserData) {
        try {
          initialUserData = JSON.parse(storedUserData);
        } catch (e) {
          console.error('Error parsing stored user data:', e);
        }
      }
      
      const socket = io('http://192.168.1.60:3001', {
        auth: { token }
      });
      
      socket.on('connect', async () => {
        const userData = await fetchUserProfile(token, userId) || initialUserData;
        
        if (userData) {
          setUser({ 
            ...userData,
            token,
            id: userId,
            socket,
            isTokenUser: true 
          });
        } else {
          setUser({ 
            username: localStorage.getItem('username') || 'User',
            token, 
            id: userId,
            socket,
            isTokenUser: true 
          });
        }
        
        socket.emit('message:fetch', { userId });
        setIsLoading(false);
      });
      
      socket.on('connect_error', () => {
        setIsLoading(false);
      });
      
      socket.on('user:profileUpdated', (updatedUser) => {
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        localStorage.setItem('username', updatedUser.username);
        setUser(prev => ({
          ...prev,
          ...updatedUser,
          socket: prev.socket
        }));
      });
      
      return () => {
        socket.off('user:profileUpdated');
      };
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    if (user?.socket) {
      user.socket.disconnect();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userData');
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    // Update the user state with the new data
    setUser(prev => ({
      ...prev,
      ...updatedUser,
      socket: prev.socket
    }));
    
    // Update localStorage
    localStorage.setItem('userData', JSON.stringify(updatedUser));
    if (updatedUser.username) {
      localStorage.setItem('username', updatedUser.username);
    }
  };

  return (
    <div className="h-screen bg-gray-100">
      {!user ? (
        <Auth onAuth={setUser} />
      ) : (
        <ChatApp 
          user={user} 
          onLogout={handleLogout} 
          onUserUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
}

export default App;
