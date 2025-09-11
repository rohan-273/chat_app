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
    try {
      const mc = localStorage.getItem('messageCounts');
      if (mc) {
        const parsed = JSON.parse(mc);
        if (parsed && typeof parsed === 'object') setMessageCounts(parsed);
      }
    } catch (e) {
      console.warn('Failed to parse messageCounts from localStorage', e);
    }
    try {
      const gmc = localStorage.getItem('groupMessageCounts');
      if (gmc) {
        const parsed = JSON.parse(gmc);
        if (parsed && typeof parsed === 'object') setGroupMessageCounts(parsed);
      }
    } catch (e) {
      console.warn('Failed to parse groupMessageCounts from localStorage', e);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('messageCounts', JSON.stringify(messageCounts)); } catch {}
  }, [messageCounts]);
  useEffect(() => {
    try { localStorage.setItem('groupMessageCounts', JSON.stringify(groupMessageCounts)); } catch {}
  }, [groupMessageCounts]);

  useEffect(() => {
    const s = user.socket;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchInitialData = async () => {
      try {
        const [userRes, groupRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/users`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/users/${user.id}`, { headers })
        ]);
        setUsers(userRes.data.data.filter(u => u.id !== user.id));
        setGroups(groupRes.data.data.groups || []);
      } catch (e) {
        console.error("Failed to fetch initial data:", e);
      }
    };

    fetchInitialData();

    if (!s) return;

    if (localStorage.getItem("hasJoinedGroups") !== "true") {
      axios.get(`${import.meta.env.VITE_API_URL}/users/${user.id}`, { headers })
        .then(res => {
          (res.data.data.groups || []).forEach(g => s.emit("joinGroup", g.id));
          localStorage.setItem("hasJoinedGroups", "true");
        })
        .catch(e => console.error("Failed to join groups:", e));
    }

    s.on("user:status", ({ userId, isOnline, online, status, lastSeen, lastSeenAt }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, online: isOnline ?? online ?? status ?? false, lastSeen: lastSeen ?? lastSeenAt } : u));
    });

    s.on("group:created", async group => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${user.id}`, { headers });
        setGroups(res.data.data.groups || []);
        s.emit("joinGroup", group.id);
      } catch (e) {
        console.error("Failed to fetch updated groups:", e);
        setGroups(prev => prev.some(g => g.id === group.id) ? prev.map(g => g.id === group.id ? group : g) : [...prev, group]);
      }
    });

    const handleGroupUpdate = async (event, data) => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/${user.id}`, { headers });
        const newGroups = res.data.data.groups || [];
        setGroups(newGroups);
        if (activeChat?.type === "group" && activeChat.group.id === (data.groupId || data.id)) {
          if (["group:deleted", "group:removed", "group:left"].includes(event)) {
            setActiveChat(null);
          } else {
            const updatedGroup = newGroups.find(g => g.id === (data.groupId || data.id));
            if (updatedGroup) setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (e) {
        console.error("Failed to fetch updated groups:", e);
        if (["group:deleted", "group:removed", "group:left"].includes(event)) {
          setGroups(prev => prev.filter(g => g.id !== data.groupId));
          if (activeChat?.type === "group" && activeChat.group.id === data.groupId) setActiveChat(null);
        } else if (event === "group:membersUpdated") {
          setGroups(prev => prev.map(g => g.id === data.id ? data : g));
          if (activeChat?.type === "group" && activeChat.group.id === data.id) setActiveChat({ type: "group", group: data });
        }
      }
    };

    s.on("group:deleted", data => handleGroupUpdate("group:deleted", data));
    s.on("group:removed", data => handleGroupUpdate("group:removed", data));
    s.on("group:left", data => handleGroupUpdate("group:left", data));
    s.on("group:memberRemoved", data => handleGroupUpdate("group:memberRemoved", data));
    s.on("group:memberLeft", data => handleGroupUpdate("group:memberLeft", data));
    s.on("group:membersUpdated", data => handleGroupUpdate("group:membersUpdated", data));

    s.on("group:nameUpdated", ({ groupId, name }) => {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));
      if (activeChat?.type === "group" && activeChat.group.id === groupId) {
        setActiveChat(prev => ({ ...prev, group: { ...prev.group, name } }));
      }
    });

    const handleMessage = (event, msg) => {
      setAllMessages(prev => [...prev, msg]);
      const senderId = msg.sender?.id || msg.sender;
      if (event.includes("group")) {
        if (senderId !== user.id && msg.group && !(activeChat?.type === "group" && activeChat.group.id === msg.group)) {
          setGroupMessageCounts(prev => ({ ...prev, [msg.group]: (prev[msg.group] || 0) + 1 }));
        }
      } else if (senderId !== user.id && !(activeChat?.type === "personal" && activeChat.user.id === senderId)) {
        setMessageCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
      }
    };

    s.on("message:send", msg => handleMessage("message:send", msg));
    s.on("message:receive", msg => handleMessage("message:receive", msg));
    s.on("message:sent", msg => setAllMessages(prev => [...prev, msg]));
    s.on("group:send", msg => handleMessage("group:send", msg));
    s.on("group:receive", msg => handleMessage("group:receive", msg));

    return () => {
      s.off("user:status");
      s.off("group:created");
      s.off("group:deleted");
      s.off("group:removed");
      s.off("group:memberRemoved");
      s.off("group:memberLeft");
      s.off("group:left");
      s.off("group:membersUpdated");
      s.off("group:nameUpdated");
      s.off("message:send");
      s.off("message:sent");
      s.off("message:receive");
      s.off("group:send");
      s.off("group:receive");
    };
  }, [user.socket, user.id, activeChat]);

  return (
    <div className="flex h-full">
      <Sidebar
        user={user}
        users={users}
        groups={groups}
        activeChat={activeChat}
        setActiveChat={chat => {
          setActiveChat(chat);
          if (chat?.type === "personal") setMessageCounts(prev => ({ ...prev, [chat.user.id]: 0 }));
          else if (chat?.type === "group") setGroupMessageCounts(prev => ({ ...prev, [chat.group.id]: 0 }));
        }}
        onLogout={() => { localStorage.removeItem("hasJoinedGroups"); onLogout(); }}
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