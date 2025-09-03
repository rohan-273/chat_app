import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Auth from './Auth/Auth';
import ChatApp from './components/ChatApp';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const username = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');
      
      const socket = io('http://192.168.1.60:3001', {
        auth: { token }
      });
      
      socket.on('connect', () => {
        setUser({ 
          token, 
          username, 
          id: userId,
          socket,
          isTokenUser: true 
        });
      });
    }
  }, []);

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
