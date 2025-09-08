import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

function ChatApp({ user, onLogout }) {
  const [activeChat, setActiveChat] = useState(null);
  const [users, setUsers] = useState([]); // For personal chats (invited only)  
  const [groups, setGroups] = useState([]);
  const [messageCounts, setMessageCounts] = useState({});
  const [groupMessageCounts, setGroupMessageCounts] = useState({});
  const [allMessages, setAllMessages] = useState([]);

  useEffect(() => {
    // Fetch all registered users via API
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const allRegisteredUsers = response.data.data.filter(
          (u) => u.id !== user.id
        );
        setUsers(allRegisteredUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUsers();

    const fetchUserGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGroups(response.data.data.groups || []);
      } catch (error) {
        console.error("Failed to fetch user groups:", error);
      }
    };

    fetchUserGroups();

    const socket = user.socket;
    if (!socket) return;
    
    // Join all user groups on login
    const joinUserGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userGroups = response.data.data.groups || [];
        userGroups.forEach(group => {
          socket.emit('joinGroup', group.id);
        });
      } catch (error) {
        console.error("Failed to join user groups:", error);
      }
    };
    
    joinUserGroups();
    socket.on("user:status", (statusData) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === statusData.userId
            ? {
                ...u,
                online:
                  statusData.isOnline ??
                  statusData.online ??
                  statusData.status ??
                  false,
                lastSeen: statusData.lastSeen ?? statusData.lastSeenAt,
              }
            : u
        )
      );
    });
    socket.on("group:created", async (group) => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGroups(response.data.data.groups || []);
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
        setGroups((prev) => {
          const exists = prev.find((g) => g.id === group.id);
          if (!exists) {
            return [...prev, group];
          }
          return prev.map((g) => (g.id === group.id ? group : g));
        });
      }
    });
    socket.on("group:deleted", (data) => {
      setGroups((prev) => prev.filter(g => g.id !== data.groupId));
      
      // Clear active chat if it's the deleted group
      if (activeChat?.type === "group" && activeChat?.group?.id === data.groupId) {
        setActiveChat(null);
      }
    });
    socket.on("group:memberRemoved", async (data) => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGroups(response.data.data.groups || []);
        
        // Update activeChat if it's the same group
        if (activeChat?.type === "group" && activeChat?.group?.id === data.groupId) {
          const updatedGroup = response.data.data.groups.find(g => g.id === data.groupId);
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
      }
    });
    socket.on("group:removed", (data) => {
      setGroups((prev) => prev.filter(g => g.id !== data.groupId));
      
      // Clear active chat if user was removed from this group
      if (activeChat?.type === "group" && activeChat?.group?.id === data.groupId) {
        setActiveChat(null);
      }
    });
    socket.on("group:memberLeft", async (data) => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGroups(response.data.data.groups || []);
        
        // Update activeChat if it's the same group
        if (activeChat?.type === "group" && activeChat?.group?.id === data.groupId) {
          const updatedGroup = response.data.data.groups.find(g => g.id === data.groupId);
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
      }
    });
    socket.on("group:left", (data) => {
      setGroups((prev) => prev.filter(g => g.id !== data.groupId));
      
      // Close chat window if the left group is currently open
      if (activeChat?.type === "group" && activeChat?.group?.id === data.groupId) {
        setActiveChat(null);
      }
    });
    socket.on("group:membersUpdated", async (group) => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setGroups(response.data.data.groups || []);
        
        // Update activeChat if it's the same group
        if (activeChat?.type === "group" && activeChat?.group?.id === group.id) {
          const updatedGroup = response.data.data.groups.find(g => g.id === group.id);
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
        setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
        
        // Update activeChat with fallback data
        if (activeChat?.type === "group" && activeChat?.group?.id === group.id) {
          setActiveChat({ type: "group", group });
        }
      }
    });

    // Listen for personal messages to count unread messages
    socket.on("message:send", (msg) => {
      if (msg.sender !== user.id) {
        const isActiveChat =
          activeChat?.type === "personal" &&
          activeChat?.user?.id === msg.sender;
        if (!isActiveChat) {
          setMessageCounts((prev) => ({
            ...prev,
            [msg.sender]: (prev[msg.sender] || 0) + 1,
          }));
        }
      }
    });
    socket.on("message:receive", (msg) => {
      setAllMessages(prev => [...prev, msg]);
      const senderId = msg.sender?.id || msg.sender;
      if (senderId !== user.id) {
        const isActiveChat =
          activeChat?.type === "personal" &&
          activeChat?.user?.id === senderId;
        if (!isActiveChat) {
          setMessageCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      }
    });
    socket.on("message:send", (msg) => {
      setAllMessages(prev => [...prev, msg]);
      const senderId = msg.sender?.id || msg.sender;
      if (senderId !== user.id) {
        const isActiveChat =
          activeChat?.type === "personal" &&
          activeChat?.user?.id === senderId;
        if (!isActiveChat) {
          setMessageCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      }
    });
    socket.on("message:sent", (msg) => {
      setAllMessages(prev => [...prev, msg]);
    });
    socket.on("group:send", (msg) => {
      setAllMessages(prev => [...prev, msg]);
    });
    socket.on("group:receive", (msg) => {
      setAllMessages(prev => [...prev, msg]);
      const senderId = msg.sender?.id || msg.sender;      
      if (senderId !== user.id && msg.group) {
        const isActiveChat =
          activeChat?.type === "group" &&
          activeChat?.group?.id === msg.group;
        if (!isActiveChat) {
          setGroupMessageCounts((prev) => ({
            ...prev,
            [msg.group]: (prev[msg.group] || 0) + 1,
          }));
        }
      }
    });

    return () => {
      socket.off("user:status");
      socket.off("user:joined");
      socket.off("group:created");
      socket.off("group:deleted");
      socket.off("group:memberRemoved");
      socket.off("group:removed");
      socket.off("group:memberLeft");
      socket.off("group:left");
      socket.off("group:membersUpdated");
      socket.off("message:send");
      socket.off("message:sent");
      socket.off("message:receive");
      socket.off("group:send");
      socket.off("group:receive");
    };
  }, [user.socket, user.id, activeChat]);

  const handleSetActiveChat = (chat) => {
    setActiveChat(chat);
    // Clear message count when chat is opened
    if (chat?.type === "personal") {
      setMessageCounts((prev) => ({
        ...prev,
        [chat.user.id]: 0,
      }));
    } else if (chat?.type === "group") {
      setGroupMessageCounts((prev) => ({
        ...prev,
        [chat.group.id]: 0,
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
        groupMessageCounts={groupMessageCounts}
      />
      <ChatWindow user={user} activeChat={activeChat} users={users} allMessages={allMessages} />
    </div>
  );
}

export default ChatApp;
