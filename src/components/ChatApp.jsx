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
        const groupId = data.groupId || data.id;
    
        if (activeChat?.type === "group" && activeChat.group.id === groupId) {
          if (["group:deleted", "group:removed", "group:left", "group:memberRemoved", "group:memberLeft"].includes(event)) {
            const stillInGroup = newGroups.some(g => g.id === groupId);
            if (!stillInGroup) {
              setActiveChat(null);
              return;
            }
          }
    
          const updatedGroup = newGroups.find(g => g.id === groupId);
          if (updatedGroup) {
            setActiveChat({ type: "group", group: updatedGroup });
          }
        }
      } catch (e) {
        const groupId = data.groupId || data.id;
    
        if (["group:deleted", "group:removed", "group:left", "group:memberRemoved", "group:memberLeft"].includes(event)) {
          setGroups(prev => prev.filter(g => g.id !== groupId));
          if (activeChat?.type === "group" && activeChat.group.id === groupId) {
            setActiveChat(null);
          }
        } else if (event === "group:membersUpdated") {
          setGroups(prev => prev.map(g => g.id === groupId ? data : g));
          if (activeChat?.type === "group" && activeChat.group.id === groupId) {
            setActiveChat({ type: "group", group: data });
          }
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
    s.on("message:receive", msg => handleMessage("message:receive", msg))

    s.on("messages:unread-counts", (payload) => {
      let data = payload;
      if (Array.isArray(payload) && payload.length === 2 && payload[0] === 'messages:unread-counts') {
        data = payload[1];
      }

      if (data && Array.isArray(data.counts)) {
        setMessageCounts(prev => {
          const next = { ...prev };
          data.counts.forEach(item => {
            if (item?.type && item.type !== 'direct') return;
            const sid = item?.senderId ?? item?.senderid ?? item?.sender ?? item?.userId ?? item?.user_id;
            const cnt = item?.count ?? item?.unreadCount ?? item?.unread;
            if (sid != null && Number.isFinite(Number(cnt))) {
              next[String(sid)] = Number(cnt);
            }
          });
          return next;
        });
        return;
      }

      if (Array.isArray(data)) {
        setMessageCounts(prev => {
          const next = { ...prev };
          data.forEach(item => {
            const sid = item?.senderId ?? item?.senderid ?? item?.sender ?? item?.userId ?? item?.user_id;
            const cnt = item?.count ?? item?.unreadCount ?? item?.unread ?? item?.counts;
            if (sid != null && Number.isFinite(Number(cnt))) {
              next[String(sid)] = Number(cnt);
            }
          });
          return next;
        });
        return;
      }

      if (data && typeof data === 'object') {
        setMessageCounts(prev => {
          const next = { ...prev };
          Object.entries(data).forEach(([key, val]) => {
            if (key != null && Number.isFinite(Number(val))) {
              next[String(key)] = Number(val);
            }
          });
          return next;
        });
      }
    });
    s.on("message:sent", msg => setAllMessages(prev => [...prev, msg]));
    s.on("group:send", msg => handleMessage("group:send", msg));
    s.on("group:receive", msg => handleMessage("group:receive", msg));
    s.on("group:unread-counts", (payload) => {
      let data = payload;
      if (Array.isArray(payload) && payload.length === 2 && payload[0] === 'group:unread-counts') {
        data = payload[1];
      }

      if (data && Array.isArray(data.counts)) {
        setGroupMessageCounts(prev => {
          const next = { ...prev };
          data.counts.forEach(item => {
            if (item?.type && item.type !== 'group') return;
            const gid = item?.groupId ?? item?.groupID ?? item?.group ?? item?.id ?? item?.group_id;
            const cnt = item?.count ?? item?.unreadCount ?? item?.unread;
            if (gid != null && Number.isFinite(Number(cnt))) {
              next[String(gid)] = Number(cnt);
            }
          });
          return next;
        });
        return;
      }

      if (Array.isArray(data)) {
        setGroupMessageCounts(prev => {
          const next = { ...prev };
          data.forEach(item => {
            const gid = item?.groupId ?? item?.groupID ?? item?.group ?? item?.id ?? item?.group_id;
            const cnt = item?.count ?? item?.unreadCount ?? item?.unread ?? item?.counts;
            if (gid != null && Number.isFinite(Number(cnt))) {
              next[String(gid)] = Number(cnt);
            }
          });
          return next;
        });
        return;
      }

      if (data && typeof data === 'object') {
        setGroupMessageCounts(prev => {
          const next = { ...prev };
          Object.entries(data).forEach(([key, val]) => {
            if (key != null && Number.isFinite(Number(val))) {
              next[String(key)] = Number(val);
            }
          });
          return next;
        });
      }
    });
    
    const getTargetId = (data) => (data?.messageId ?? data?._id ?? data?.id ?? data?.message?._id ?? data?.message?.id);
    const handlePersonalDelete = (data) => {
      const messageId = getTargetId(data);
      if (!messageId) return;      
      setAllMessages(prevAll => {
        const msg = prevAll.find(m => (m?._id || m?.id) === messageId);
        if (!msg) return prevAll;
        const senderId = msg.sender?.id || msg.sender;
        const recipientId = msg.recipient?.id || msg.recipient;        
        if (recipientId === user.id && senderId && senderId !== user.id) {
          setMessageCounts(prev => ({
            ...prev,
            [senderId]: Math.max(0, (prev[senderId] || 0) - 1)
          }));
        }
        return prevAll;
      });
    };

    s.on("message:deleted", handlePersonalDelete);
    s.on("message:delete", (data) => {
      if (data?.forEveryone) handlePersonalDelete(data);
    });
    
    s.on("message:hidden", (data) => {
      const messageId = data?.messageId || data?._id || data?.id;
      if (!messageId) return;
    
      setAllMessages(prevAll =>
        prevAll.filter(m => (m?._id || m?.id) !== messageId)
      );
    });

    const handleGroupDelete = (data) => {
      const groupId = data?.groupId || data?.group || data?.group_id;
      if (!groupId) return;
      if (!(activeChat?.type === 'group' && activeChat.group.id === groupId)) {
        setGroupMessageCounts(prev => ({
          ...prev,
          [groupId]: Math.max(0, (prev[groupId] || 0) - 1)
        }));
      }
    };

    s.on('group:messageDeleted', handleGroupDelete);
    s.on('group:message:delete', (data) => {
      if (data?.forEveryone) handleGroupDelete(data);
    });

    s.on("message:status", (data) => {
      setAllMessages(prev =>
        prev.map(msg =>
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    
      if (data.status === "read") {
        const senderId = data.sender?.id || data.sender;
        const recipientId = data.recipient?.id || data.recipient;
        const otherUserId = senderId === user.id ? recipientId : senderId;
    
        if (otherUserId) {
          setMessageCounts(prev => ({
            ...prev,
            [otherUserId]: 0,
          }));
        }
      }
    });

    s.on("group:status", (data) => {
      const { groupId, messageId, status, updatedAt } = data;
      setAllMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== messageId) return msg;
    
          const statusData = {
            ...msg.statusData,
            ...status,
          };
          const recipients = Object.keys(statusData).filter(
            (id) => id !== (msg.sender?.id || msg.sender)
          );
          const allRead =
            recipients.length > 0 &&
            recipients.every((id) => statusData[id]?.status === "read");
          const allDelivered =
            recipients.length > 0 &&
            recipients.every((id) =>
              ["read", "delivered"].includes(statusData[id]?.status)
            );
    
          return {
            ...msg,
            statusData,
            status: allRead ? "read" : allDelivered ? "delivered" : "sent",
            updatedAt: updatedAt || msg.updatedAt,
          };
        })
      );

      const currentUserId = user.id;
      const currentUserStatus = status?.[currentUserId];
  
      if (currentUserStatus?.status === "read") {
        setGroupMessageCounts((prev) => ({
          ...prev,
          [groupId]: 0,
        }));
      }
    });
        
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
      s.off("messages:unread-counts");
      s.off("group:send");
      s.off("group:receive");
      s.off("group:unread-counts");
      s.off("message:deleted");
      s.off("message:delete");
      s.off('group:messageDeleted');
      s.off('group:message:delete');
      s.off("message:status");
      s.off("message:hidden");
      s.off("group:status");
    };
  }, [user.socket, user.id, activeChat]);

  useEffect(() => {
    const s = user.socket;
    if (!s) return;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${import.meta.env.VITE_API_URL}/users/${user.id}`, { headers })
      .then(res => {
        (res.data.data.groups || []).forEach(g => s.emit("joinGroup", g.id));
      })
      .catch(e => console.error("Failed to join groups:", e));
  }, [user.socket, user.id]);
  
  useEffect(() => {
    const s = user.socket;
    if (!s) return;
    s.emit("messages:sync");
    s.emit("group:sync");
  }, [user.socket]);

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