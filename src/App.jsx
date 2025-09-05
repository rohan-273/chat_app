import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Auth from './Auth/Auth';
import ChatApp from './components/ChatApp';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const username = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');
      
      const socket = io('http://192.168.1.60:3001', {
        auth: { token }
      });
      
      socket.on('connect', () => {
        // Emit message:fetch to get unread messages info
        socket.emit('message:fetch', { userId: userId });
        
        setUser({ 
          token, 
          username, 
          id: userId,
          socket,
          isTokenUser: true 
        });
        setIsLoading(false);
      });
      
      socket.on('connect_error', () => {
        setIsLoading(false);
      });
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

  return (
    <div className="h-screen bg-gray-100">
      {!user ? (
        <Auth onAuth={setUser} />
      ) : (
        <ChatApp user={user} onLogout={() => setUser(null)} />
      )}
    </div>
  );
}

export default App;
