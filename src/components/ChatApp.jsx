import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

function ChatApp({ user, onLogout }) {
  const [activeChat, setActiveChat] = useState(null);
  const [users, setUsers] = useState([]); // For personal chats (invited only)
  const [allUsers, setAllUsers] = useState([]); // For group functionality
  const [groups, setGroups] = useState([]);
  const [messageCounts, setMessageCounts] = useState({});
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

    const socket = user.socket;
    if (!socket) return; // Skip if no socket (token-only user)

    const token = localStorage.getItem("token");
    socket.emit("getGroups", { token });

    socket.on("usersList", setAllUsers);
    socket.on("groupsList", setGroups);
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
    socket.on("groupCreated", (group) => {
      setGroups((prev) => [...prev, group]);
    });
    socket.on("userAddedToGroup", ({ group }) => {
      setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
    });
    socket.on("addedToGroup", (group) => {
      setGroups((prev) => {
        const exists = prev.find((g) => g.id === group.id);
        if (!exists) {
          return [...prev, group];
        }
        return prev;
      });
    });
    socket.on("groupUpdated", (group) => {
      setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
    });
    socket.on("leftGroup", (groupId) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeChat?.type === "group" && activeChat?.group?.id === groupId) {
        setActiveChat(null);
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
    socket.on("message:send", (msg) => {
      setAllMessages(prev => [...prev, msg]);
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
    socket.on("message:sent", (msg) => {
      setAllMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off("usersList");
      socket.off("groupsList");

      socket.off("user:status");
      socket.off("groupCreated");
      socket.off("userAddedToGroup");
      socket.off("addedToGroup");
      socket.off("groupUpdated");
      socket.off("leftGroup");

      socket.off("message:send");
      socket.off("message:sent");
      socket.off("message:receive");
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
      <ChatWindow user={user} activeChat={activeChat} users={allUsers} allMessages={allMessages} />
    </div>
  );
}

export default ChatApp;
