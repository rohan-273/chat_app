import { useState, useEffect, useRef } from "react";
import GroupInfoPopup from './GroupInfoPopup';
import { decryptMessage } from '../utils/encryption';

const LABELS = {
  WELCOME_TITLE: "Welcome to Chat App",
  WELCOME_MESSAGE: "Select a chat or group to start messaging",
  ADD_USER: "Add User",
  TYPE_MESSAGE: "Type a message...",
  SEND: "Send",
};

function ChatWindow({ user, activeChat, users, allMessages }) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    if (activeChat.type === "personal" && activeChat.user?.id && user?.socket) {
      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${import.meta.env.VITE_API_URL}/message/conversation/${activeChat.user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          setMessages(data.data || []);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
          console.error('Failed to fetch messages:', error);
        }
      };
      fetchMessages();

      const socket = user.socket;
      socket.on("message:send", (msg) => {
        if (
          ((msg.sender?.id || msg.sender) === activeChat.user.id && (msg.recipient?.id || msg.recipient) === user.id) ||
          ((msg.sender?.id || msg.sender) === user.id && (msg.recipient?.id || msg.recipient) === activeChat.user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      });
      socket.on("message:receive", (msg) => {
        if (
          ((msg.sender?.id || msg.sender) === activeChat.user.id && (msg.recipient?.id || msg.recipient) === user.id) ||
          ((msg.sender?.id || msg.sender) === user.id && (msg.recipient?.id || msg.recipient) === activeChat.user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      });
      socket.on("message:sent", (msg) => {
        if ((msg.sender?.id || msg.sender) === user.id && (msg.recipient?.id || msg.recipient) === activeChat.user.id) {
          setMessages((prev) => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      });

      return () => {
        socket?.off("message:send");
        socket?.off("message:receive");
        socket?.off("message:sent");
      };
    } else if (activeChat.type === "group" && activeChat.group?.id && user?.socket) {
      console.log('Setting up group chat for:', activeChat.group.id);
      setMessages([]);
      
      const socket = user.socket;
      socket.emit('joinGroup', activeChat.group.id);
      socket.on("group:send", (msg) => {
        console.log('ChatWindow received group:send:', msg);
        console.log('Message group:', msg?.group);
        console.log('Active group id:', activeChat.group.id);
        console.log('Group match:', msg?.group === activeChat.group.id);
        if (msg?.group === activeChat.group.id) {
          console.log('Adding message to chat');
          setMessages((prev) => {
            console.log('Previous messages:', prev);
            const newMessages = [...prev, msg];
            console.log('New messages:', newMessages);
            return newMessages;
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          console.log('Message not for this group');
        }
      });
      socket.on("group:receive", (msg) => {
        console.log('ChatWindow received group:receive:', msg);
        console.log('Message group:', msg?.group);
        console.log('Active group id:', activeChat.group.id);
        console.log('Group match:', msg?.group === activeChat.group.id);
        if (msg?.group === activeChat.group.id) {
          console.log('Adding received message to chat');
          setMessages((prev) => {
            console.log('Previous messages:', prev);
            const newMessages = [...prev, msg];
            console.log('New messages:', newMessages);
            return newMessages;
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else {
          console.log('Received message not for this group');
        }
      });

      return () => {
        socket?.off("group:send");
        socket?.off("group:receive");
      };
    } else {
      setMessages([]);
    }
  }, [activeChat, allMessages, user.id]);

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat || !user?.socket) return;

    const token = localStorage.getItem("token");

    try {
      if (activeChat.type === "personal" && activeChat.user?.id) {
        user.socket.emit("message:send", {
          to: activeChat.user.id,
          content: messageInput,
          type: "text",
        });

        user.socket.emit("message:sent", {
          to: activeChat.user.id,
          content: messageInput,
          type: "text",
        });
      } else if (activeChat.type === "group" && activeChat.group?.id) {
        user.socket.emit("group:send", {
          groupId: activeChat.group.id,
          content: messageInput,
          type: "text"
        });
      }
      setMessageInput("");
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h3 className="text-xl mb-2">{LABELS.WELCOME_TITLE}</h3>
          <p>{LABELS.WELCOME_MESSAGE}</p>
        </div>
      </div>
    );
  }

  const isGroupCreator =
    activeChat.type === "group" && activeChat.group.creator === user.id;

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 bg-white">
        {activeChat.type === "personal" ? (
          <div className="p-4">
            <h3 className="font-semibold">{activeChat.user.username}</h3>
          </div>
        ) : (
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => setShowGroupInfo(true)}
          >
            <h3 className="font-semibold">{activeChat.group.name}</h3>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`mb-3 flex ${
              (msg.sender?.id || msg.sender) === user.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                (msg.sender?.id || msg.sender) === user.id
                  ? "bg-blue-500 text-white"
                  : "bg-white border"
              }`}
            >
              {activeChat.type === "group" && (msg.sender?.id || msg.sender) !== user.id && (
                <div className="text-xs font-medium mb-1 opacity-70">User</div>
              )}
              <div>{decryptMessage(msg.content || msg.message)}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showGroupInfo && activeChat.type === 'group' && (
        <GroupInfoPopup
          group={activeChat.group}
          user={user}
          users={users}
          onClose={() => setShowGroupInfo(false)}
          onAddUsers={(groupId, selectedUsers) => {
            if (user.socket) {
              const token = localStorage.getItem('token');
              user.socket.emit('group:addMembers', {
                groupId,
                members: selectedUsers,
                token
              });
            }
          }}
        />
      )}

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder={LABELS.TYPE_MESSAGE}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {LABELS.SEND}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
