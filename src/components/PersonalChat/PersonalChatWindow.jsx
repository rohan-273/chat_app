import { useState, useEffect } from "react";
import { encryptMessage, decryptMessage } from '../../utils/encryption';
import { useChatWindow, useClickOutside, useMessageSearch } from '../../hooks/useChatWindow';
import SearchBar from '../../common/SearchBar';
import MessageInput from '../../common/MessageInput';
import { Eraser, MoreVertical, Search } from "lucide-react";

const TEST_ENCRYPTION_KEY = 'test-key-1234567890abcdef12345678';

function PersonalChatWindow({ user, activeChat, setMessageCounts }) {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(TEST_ENCRYPTION_KEY);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const { searchMessages, handleSearchNavigation } = useMessageSearch(activeChat);

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
      setMessages(prev =>
        prev.map(msg =>
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });
    
    const removeByMessageId = (data) => {
      const targetId = (data?.messageId ?? data?._id ?? data?.id ?? data?.message?._id ?? data?.message?.id);
      if (!targetId) return;
      setMessages(prev => prev.filter(m => {
        const mid = (m?._id ?? m?.id);
        return String(mid) !== String(targetId);
      }));
    };

    socket.on("message:delete", removeByMessageId);
    socket.on("message:deleted", removeByMessageId);
    socket.on("message:hidden", removeByMessageId);
    
    socket.on("chat:cleared", () => {
      setMessages([]);
      setPage(1);
      setHasMore(false);
    });

    return () => {
      socket?.off("message:send");
      socket?.off("message:receive");
      socket?.off("message:sent");
      socket?.off("message:status");
      socket?.off("message:delete", removeByMessageId);
      socket?.off("message:deleted", removeByMessageId);
      socket?.off("message:hidden", removeByMessageId);
      socket?.off("chat:cleared");
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
        <div className="p-5 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-sm">
              {activeChat.user.username.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-semibold">{activeChat.user.username}</h3>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-gray-500 hover:text-gray-700 p-2 text-lg font-bold"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setShowSearch(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                  className="flex items-center block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  <Search className="w-4 h-4 mr-2" /> Search Messages
                </button>
                <button
                  onClick={handleClearChat}
                  className="flex items-center block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 text-sm"
                >
                  <Eraser className="w-4 h-4 mr-2" /> Clear Chat
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
        {hasMore && messages?.length > 0 && (
          <div className="text-center mb-4">
            <button onClick={loadMoreMessages} className="text-blue-500 hover:text-blue-700 text-sm underline">
              Load more messages
            </button>
          </div>
        )}
        {messages?.map((msg, index) => (
          <div
            key={(msg._id || msg.id || `${(msg.sender?.id || msg.sender)}-${msg.createdAt || msg.timestamp || index}`)}
            data-message-id={msg._id || msg.id}
            className={`mb-3 flex ${
              (msg.sender?.id || msg.sender) === user.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`group relative px-3 py-2
                ${(msg.sender?.id || msg.sender) === user.id
                  ? "bg-green-500 text-white rounded-2xl rounded-tr-sm"
                  : "bg-white border rounded-2xl rounded-tl-sm"
                }`}
              style={{ maxWidth: "75%", minWidth: "80px" }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>
                {(() => {
                  const decrypted = decryptMessage(msg.content || msg.message, encryptionKey);
                  return decrypted;
                })()}
              </div>
              <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
                <span>
                  {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {(msg.sender?.id || msg.sender) === user.id && !msg.isDeleted && (
                  <div className="ml-2">
                    {(!msg.status || msg.status === "sent") && <span className="text-white">✓</span>}
                    {msg.status === "delivered" && <span className="text-white">✓✓</span>}
                    {msg.status === "read" && <span className="text-blue-800">✓✓</span>}
                  </div>
                )}
              </div>
              {(msg.sender?.id || msg.sender) === user.id && (
                <button
                  type="button"
                  aria-label="Delete message"
                  title="Delete message"
                  className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-white transition shadow-sm"
                  onClick={() => { setDeleteTarget(msg); setShowDeleteModal(true); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 2h2v1h-2V5zm-2 4a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0V9zm6-1a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1z" />
                  </svg>
                </button>
              )}
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
        activeChat={activeChat}
      />

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">          
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} />          
          <div className="relative bg-white rounded-xl shadow-2xl w-[360px] p-5 animate-[fadeIn_.15s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Delete message?</h4>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                onClick={() => {                  
                  setMessages(prev => prev.filter(m => (m._id || m.id) !== (deleteTarget._id || deleteTarget.id)));
                  user.socket?.emit('message:delete', { messageId: deleteTarget._id || deleteTarget.id, forEveryone: false });
                  setShowDeleteModal(false); setDeleteTarget(null);
                }}
              >
                Delete for me
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {                                    
                  setMessages(prev => prev.filter(m => (m._id || m.id) !== (deleteTarget._id || deleteTarget.id)));
                  user.socket?.emit('message:delete', { messageId: deleteTarget._id || deleteTarget.id, forEveryone: true });
                  setShowDeleteModal(false); setDeleteTarget(null);
                }}
              >
                Delete for everyone
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PersonalChatWindow;