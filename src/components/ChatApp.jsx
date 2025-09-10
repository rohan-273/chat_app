import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

function ChatApp({ user, onLogout }) {
  const [activeChat, setActiveChat] = useState(null);
  const [users, setUsers] = useState([]);
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

    // Join all user groups only on first login
    const joinUserGroups = async () => {
      // Check if groups have already been joined
      const hasJoinedGroups = localStorage.getItem("hasJoinedGroups");
      if (hasJoinedGroups === "true") {
        console.log("Groups already joined, skipping joinGroup event");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userGroups = response.data.data.groups || [];
        userGroups.forEach((group) => {
          socket.emit("joinGroup", group.id);
        });
        // Set flag to indicate groups have been joined
        localStorage.setItem("hasJoinedGroups", "true");
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
        // Join the newly created group
        socket.emit("joinGroup", group.id);
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
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
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
        if (
          activeChat?.type === "group" &&
          activeChat?.group?.id === data.groupId
        ) {
          const updatedGroup = response.data.data.groups.find(
            (g) => g.id === data.groupId
          );
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
      }
    });

    socket.on("group:removed", (data) => {
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
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
        if (
          activeChat?.type === "group" &&
          activeChat?.group?.id === data.groupId
        ) {
          const updatedGroup = response.data.data.groups.find(
            (g) => g.id === data.groupId
          );
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
      }
    });

    socket.on("group:left", (data) => {
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
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
        if (activeChat?.type === "group" && activeChat?.group?.id === group.id) {
          const updatedGroup = response.data.data.groups.find(
            (g) => g.id === group.id
          );
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated groups:", error);
        setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
        if (activeChat?.type === "group" && activeChat?.group?.id === group.id) {
          setActiveChat({ type: "group", group });
        }
      }
    });

    socket.on("group:nameUpdated", (data) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === data.groupId ? { ...g, name: data.name } : g))
      );
      if (activeChat?.type === "group" && activeChat?.group?.id === data.groupId) {
        setActiveChat((prev) => ({
          ...prev,
          group: { ...prev.group, name: data.name },
        }));
      }
    });

    socket.on("message:send", (msg) => {
      setAllMessages((prev) => [...prev, msg]);
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

    socket.on("message:receive", (msg) => {
      setAllMessages((prev) => [...prev, msg]);
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
      setAllMessages((prev) => [...prev, msg]);
    });

    socket.on("group:send", (msg) => {
      setAllMessages((prev) => [...prev, msg]);
    });

    socket.on("group:receive", (msg) => {
      setAllMessages((prev) => [...prev, msg]);
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
      socket.off("group:created");
      socket.off("group:deleted");
      socket.off("group:memberRemoved");
      socket.off("group:removed");
      socket.off("group:memberLeft");
      socket.off("group:left");
      socket.off("group:membersUpdated");
      socket.off("group:nameUpdated");
      socket.off("message:send");
      socket.off("message:sent");
      socket.off("message:receive");
      socket.off("group:send");
      socket.off("group:receive");
    };
  }, [user.socket, user.id, activeChat]);

  // Reset hasJoinedGroups flag on logout
  const handleLogout = () => {
    localStorage.removeItem("hasJoinedGroups");
    onLogout();
  };

  const handleSetActiveChat = (chat) => {
    setActiveChat(chat);
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
        onLogout={handleLogout}
        messageCounts={messageCounts}
        groupMessageCounts={groupMessageCounts}
      />
      <ChatWindow
        user={user}
        activeChat={activeChat}
        users={users}
        allMessages={allMessages}
        setMessageCounts={setMessageCounts}
        setGroupMessageCounts={setGroupMessageCounts}
      />
    </div>
  );
}

export default ChatApp;