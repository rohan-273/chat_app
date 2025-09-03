import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';

function ChatApp({ user, onLogout }) {
  const [activeChat, setActiveChat] = useState(null);
  const [users, setUsers] = useState([]); // For personal chats (invited only)
  const [allUsers, setAllUsers] = useState([]); // For group functionality
  const [groups, setGroups] = useState([]);
  const [messageCounts, setMessageCounts] = useState({}); // Track unread message counts

  useEffect(() => {
    // Fetch all registered users via API
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allRegisteredUsers = response.data.data.filter(u => u.id !== user.id).map(u => ({
          ...u,
          online: false
        }));
        setUsers(allRegisteredUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();

    const socket = user.socket;
    if (!socket) return; // Skip if no socket (token-only user)

    const token = localStorage.getItem('token');
    socket.emit('getGroups', { token });
    
    // Request status for all users after connection
    socket.on('connect', () => {
      console.log('Socket connected, requesting all user statuses');
      socket.emit('getAllUserStatuses', { token });
    });
    
    // Listen for all user statuses response
    socket.on('allUserStatuses', (allStatuses) => {
      console.log('Received all user statuses:', allStatuses);
      setUsers(prev => prev.map(u => {
        const userStatus = allStatuses.find(s => s.userId === u.id);
        if (userStatus) {
          console.log(`Setting ${u.username} online status to:`, userStatus.isOnline);
          return { ...u, online: userStatus.isOnline, lastSeen: userStatus.lastSeen };
        }
        return u;
      }));
    });

    socket.on('usersList', setAllUsers);
    socket.on('groupsList', setGroups);
    socket.on('user:status', (statusData) => {
      console.log('Full status data:', statusData);
      console.log('Available keys:', Object.keys(statusData));
      setUsers(prev => {
        const updated = prev.map(u => {
          if (u.id === statusData.userId) {
            const onlineStatus = statusData.isOnline ?? statusData.online ?? statusData.status ?? false;
            console.log(`Updating user ${u.username}: online=${onlineStatus}`);
            return {
              ...u, 
              online: onlineStatus, 
              lastSeen: statusData.lastSeen ?? statusData.lastSeenAt
            };
          }
          return u;
        });
        console.log('Users after update:', updated.map(u => ({id: u.id, username: u.username, online: u.online})));
        return updated;
      });
    });
    socket.on('groupCreated', (group) => {
      setGroups(prev => [...prev, group]);
    });
    socket.on('userAddedToGroup', ({ group }) => {
      setGroups(prev => prev.map(g => g.id === group.id ? group : g));
    });
    socket.on('addedToGroup', (group) => {
      setGroups(prev => {
        const exists = prev.find(g => g.id === group.id);
        if (!exists) {
          return [...prev, group];
        }
        return prev;
      });
    });
    socket.on('groupUpdated', (group) => {
      setGroups(prev => prev.map(g => g.id === group.id ? group : g));
    });
    socket.on('leftGroup', (groupId) => {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeChat?.type === 'group' && activeChat?.group?.id === groupId) {
        setActiveChat(null);
      }
    });



    // Listen for personal messages to count unread messages
    socket.on('message:send', (msg) => {
      if (msg.from.id !== user.id) {
        const isActiveChat = activeChat?.type === 'personal' && activeChat?.user?.id === msg.from.id;
        if (!isActiveChat) {
          setMessageCounts(prev => ({
            ...prev,
            [msg.from.id]: (prev[msg.from.id] || 0) + 1
          }));
        }
      }
    });

    return () => {
      socket.off('usersList');
      socket.off('groupsList');
      socket.off('connect');
      socket.off('allUserStatuses');
      socket.off('user:status');
      socket.off('groupCreated');
      socket.off('userAddedToGroup');
      socket.off('addedToGroup');
      socket.off('groupUpdated');
      socket.off('leftGroup');

      socket.off('message:send');
    };
  }, [user.socket, user.id, activeChat]);



  const handleSetActiveChat = (chat) => {
    setActiveChat(chat);
    // Clear message count when chat is opened
    if (chat?.type === 'personal') {
      setMessageCounts(prev => ({
        ...prev,
        [chat.user.id]: 0
      }));
    }
  };

  return (
    <div className="flex h-full">
      <Sidebar
        user={user}
        users={users}
        groups={groups}
        activeChat={activeChat}
        setActiveChat={handleSetActiveChat}
        onLogout={onLogout}
        messageCounts={messageCounts}
      />
      <ChatWindow
        user={user}
        activeChat={activeChat}
        users={allUsers}
      />
    </div>
  );
}

export default ChatApp;