import { useState, useEffect } from "react";
import { encryptMessage, decryptMessage } from '../../utils/encryption';
import { useChatWindow, useClickOutside, useMessageSearch } from '../../hooks/useChatWindow';
import SearchBar from '../../common/SearchBar';
import MessageInput from '../../common/MessageInput';

const LABELS = {
  TYPE_MESSAGE: "Type a message...",
  SEND: "Send",
};

// Hardcoded key for testing (REMOVE IN PRODUCTION)
const TEST_ENCRYPTION_KEY = 'test-key-1234567890abcdef12345678';

function PersonalChatWindow({ user, activeChat, users, setMessageCounts }) {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(TEST_ENCRYPTION_KEY);

  const {
    messageInput,
    setMessageInput,
    showDropdown,
    setShowDropdown,
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    currentSearchIndex,
    setCurrentSearchIndex,
    showEmojiPicker,
    setShowEmojiPicker,
    messagesEndRef,
    dropdownRef,
    messagesContainerRef,
    searchInputRef,
    emojiPickerRef
  } = useChatWindow(activeChat);

  const { searchMessages, navigateToMessage, handleSearchNavigation } = useMessageSearch(activeChat);

  useClickOutside(
    [dropdownRef, emojiPickerRef],
    [() => setShowDropdown(false), () => setShowEmojiPicker(false)]
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setShowScrollDown(false);
    setEncryptionKey(TEST_ENCRYPTION_KEY);
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
  }, [messages]);

  const loadMoreMessages = () => {
    const nextPage = page + 1;
    setPage(nextPage);

    const fetchMessages = async (pageNum = 1, isLoadMore = false) => {
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
        setHasMore(data.pagination?.hasNext || false);

        setTimeout(() => {
          const scrollHeightAfter = container.scrollHeight;
          container.scrollTop = scrollHeightAfter - scrollHeightBefore;
        }, 0);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages(nextPage, true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = async () => {
    const results = await searchMessages(searchQuery);
    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  useEffect(() => {
    if (!activeChat?.user?.id || !user?.socket) {
      setMessages([]);
      return;
    }

    const fetchMessages = async (pageNum = 1, isLoadMore = false) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/message/conversation/${activeChat.user.id}?page=${pageNum}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const newMessages = data.data || [];

        if (isLoadMore) {
          setMessages(prev => [...newMessages, ...prev]);
          setHasMore(data.pagination?.hasNext || false);
        } else {
          setMessages(newMessages);
          setHasMore(data.pagination?.hasNext || false);
          setPage(1);

          newMessages.forEach(msg => {
            if ((msg.sender?.id || msg.sender) === activeChat.user.id && msg.status !== 'read') {
              user.socket.emit('message:read', { messageId: msg._id });
            }
          });

          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
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
          socket.emit('message:read', { messageId: msg._id });
          if (setMessageCounts) {
            setMessageCounts(prev => ({ ...prev, [activeChat.user.id]: 0 }));
          }
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
    socket.on("chat:clear", () => {
      setMessages([]);
      setPage(1);
      setHasMore(false);
    });

    return () => {
      socket?.off("message:send");
      socket?.off("message:receive");
      socket?.off("message:sent");
      socket?.off("message:status");
      socket?.off("chat:clear");
    };
  }, [activeChat, user.id]);

  const handleClearChat = () => {
    if (!activeChat || !user?.socket) return;
    user.socket.emit("chat:clear", { withUserId: activeChat.user.id });
    setShowDropdown(false);
    setMessages([]);
    setPage(1);
    setHasMore(false);
    setShowScrollDown(false);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat || !user?.socket || !encryptionKey) {
      console.warn('Cannot send message: missing input, chat, socket, or encryption key');
      return;
    }

    try {
      const encryptedContent = encryptMessage(messageInput, encryptionKey);
      console.log('Sending encrypted content:', encryptedContent); // Debugging
      user.socket.emit("message:send", {
        to: activeChat.user.id,
        content: encryptedContent,
        type: "text",
      });

      user.socket.emit("message:sent", {
        to: activeChat.user.id,
        content: encryptedContent,
        type: "text",
      });
      setMessageInput("");
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  return (
    <>
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 flex justify-between items-center">
          <h3 className="font-semibold">{activeChat.user.username}</h3>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-gray-500 hover:text-gray-700 p-2 text-lg font-bold"
            >
              ⋮
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowSearch(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Search Messages
                </button>
                <button
                  onClick={handleClearChat}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                >
                  Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSearch && (
        <SearchBar
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          searchResults={searchResults}
          currentSearchIndex={currentSearchIndex}
          onNavigateUp={() => handleSearchNavigation('up', searchResults, currentSearchIndex, setCurrentSearchIndex)}
          onNavigateDown={() => handleSearchNavigation('down', searchResults, currentSearchIndex, setCurrentSearchIndex)}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
            setSearchResults([]);
            setCurrentSearchIndex(-1);
          }}
        />
      )}

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
            data-message-id={msg._id || msg.id}
            className={`mb-3 flex ${
              (msg.sender?.id || msg.sender) === user.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg ${
                (msg.sender?.id || msg.sender) === user.id
                  ? "bg-green-500 text-white"
                  : "bg-white border"
              }`}
              style={{ maxWidth: '75%', minWidth: '80px' }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {(() => {
                  const decrypted = decryptMessage(msg.content || msg.message, encryptionKey);
                  console.log('Decrypting message:', msg.content || msg.message, 'to:', decrypted); // Debugging
                  return decrypted;
                })()}
              </div>
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

      <MessageInput
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        onSendMessage={sendMessage}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiPickerRef={emojiPickerRef}
      />
    </>
  );
}

export default PersonalChatWindow;