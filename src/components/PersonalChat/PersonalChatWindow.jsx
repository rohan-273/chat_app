import { useState, useEffect, useRef } from "react";
import { decryptMessage } from '../../utils/encryption';

function PersonalChatWindow({ user, activeChat }) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    setMessageInput("");
    setPage(1);
    setHasMore(true);
    setShowScrollDown(false);
  }, [activeChat]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
        setShowScrollDown(!isAtBottom && messages.length > 0);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeChat, messages]);

  const loadMoreMessages = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    
    const fetchMessages = async (pageNum = 1) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/message/conversation/${activeChat.user.id}?page=${pageNum}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const newMessages = data.data || [];
        
        const container = messagesContainerRef.current;
        const scrollHeightBefore = container.scrollHeight;
        
        setMessages(prev => [...newMessages, ...prev]);
        setHasMore(newMessages.length === 20);
        
        setTimeout(() => {
          const scrollHeightAfter = container.scrollHeight;
          container.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }, 0);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages(nextPage);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!activeChat || !user?.socket) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/message/conversation/${activeChat.user.id}?page=1&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const messages = data.data || [];
        
        messages.forEach(msg => {
          if ((msg.sender?.id || msg.sender) === activeChat.user.id && msg.status !== 'read') {
            user.socket.emit('message:read', { messageId: msg._id });
          }
        });
        
        setMessages(messages);
        setHasMore(messages.length === 20);
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
        
        if ((msg.sender?.id || msg.sender) === activeChat.user.id && (msg.recipient?.id || msg.recipient) === user.id) {
          socket.emit('message:delivered', { messageId: msg._id });
        }
      }
    });
    socket.on("message:sent", (msg) => {
      if ((msg.sender?.id || msg.sender) === user.id && (msg.recipient?.id || msg.recipient) === activeChat.user.id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
    socket.on("message:status", (data) => {
      setMessages((prev) => 
        prev.map(msg => 
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });

    return () => {
      socket?.off("message:send");
      socket?.off("message:receive");
      socket?.off("message:sent");
      socket?.off("message:status");
    };
  }, [activeChat, user.id]);

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat || !user?.socket) return;

    try {
      user.socket.emit("message:send", {
        to: activeChat.user.id,
        content: messageInput,
        type: "text",
      });
      setMessageInput("");
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4">
          <h3 className="font-semibold">{activeChat.user.username}</h3>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {hasMore && messages.length > 0 && (
          <div className="text-center mb-4">
            <button
              onClick={loadMoreMessages}
              className="text-blue-500 hover:text-blue-700 text-sm underline"
            >
              Load more messages
            </button>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`mb-3 flex ${
              (msg.sender?.id || msg.sender) === user.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-full px-3 py-2 rounded-lg break-words ${
                (msg.sender?.id || msg.sender) === user.id
                  ? "bg-green-500 text-white"
                  : "bg-white border"
              }`}
            >
              <div>{decryptMessage(msg.content || msg.message)}</div>
              <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
                <span>{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {(msg.sender?.id || msg.sender) === user.id && (
                  <div className="ml-2">
                    {(!msg.status || msg.status === 'sent') && (
                      <span className="text-white">✓</span>
                    )}
                    {msg.status === 'delivered' && (
                      <span className="text-white">✓✓</span>
                    )}
                    {msg.status === 'read' && (
                      <span className="text-blue-800">✓✓</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 transition-opacity duration-200 z-10 ${showScrollDown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={scrollToBottom}
          className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-blue-600"
        >
          ↓
        </button>
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default PersonalChatWindow;