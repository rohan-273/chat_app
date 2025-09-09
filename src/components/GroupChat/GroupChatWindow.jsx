import { useState, useEffect } from "react";
import GroupInfoPopup from '../GroupInfoPopup';
import { decryptMessage } from '../../utils/encryption';
import { useChatWindow, useClickOutside, useMessageSearch } from '../../hooks/useChatWindow';
import SearchBar from '../../common/SearchBar';
import MessageInput from '../../common/MessageInput';

const LABELS = {
  TYPE_MESSAGE: "Type a message...",
  SEND: "Send",
};

function GroupChatWindow({ user, activeChat, users, setGroupMessageCounts }) {
  const [messages, setMessages] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
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
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = async () => {
    const results = await searchMessages(searchQuery);
    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  useEffect(() => {
    if (!activeChat?.group?.id || !user?.socket) {
      setMessages([]);
      return;
    }

    const fetchGroupMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/message/group/${activeChat.group.id}?page=1&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const messages = data.data || [];
        
        messages.forEach(msg => {
          if ((msg.sender?.id || msg.sender) !== user.id && msg.status !== 'read') {
            user.socket.emit('group:message:read', { messageId: msg._id });
          }
        });
        
        setMessages(messages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (error) {
        console.error('Failed to fetch group messages:', error);
        setMessages([]);
      }
    };
    fetchGroupMessages();

    const socket = user.socket;
  
    socket.on("group:sent", (msg) => {
      if (msg?.group === activeChat.group.id && (msg.sender?.id || msg.sender) === user.id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
  
    socket.on("group:receive", (msg) => {
      if (msg?.group === activeChat.group.id && (msg.sender?.id || msg.sender) !== user.id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        
        if (msg._id) {
          socket.emit('group:message:delivered', { messageId: msg._id });
          // Clear message count for this group
          if (setGroupMessageCounts) {
            setGroupMessageCounts(prev => ({ ...prev, [activeChat.group.id]: 0 }));
          }
        }
      }
    });
    socket.on("group:message:status", (data) => {
      setMessages((prev) => 
        prev.map(msg => 
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });

    socket.on("group:chat:clear", () => {
      setMessages([]);
      setPage(1);
      setHasMore(false);
    });
  
    return () => {
      socket?.off("group:sent");
      socket?.off("group:receive");
      socket?.off("group:message:status");
      socket?.off("group:chat:clear");
    };    
  }, [activeChat, user.id]);

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat || !user?.socket) return;

    try {
      user.socket.emit("group:send", {
        groupId: activeChat.group.id,
        content: messageInput,
        type: "text"
      });
      setMessageInput("");
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  const handleClearChat = () => {
    if (!activeChat?.group?.id || !user?.socket) return;
    user.socket.emit("group:chat:clear", { groupId: activeChat.group.id });
    setShowDropdown(false);
    setMessages([]);
    setPage(1);
    setHasMore(false);
  };

  return (
    <>
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{activeChat.group.name}</h3>
            <p className="text-sm text-gray-500">
              {activeChat.group.members
                .sort((a, b) => a.id === user.id ? -1 : b.id === user.id ? 1 : 0)
                .map(member => {
                  const name = member.username || member.email;
                  return member.id === user.id ? `${name} (You)` : name;
                }).join(', ')}
            </p>
          </div>
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
                    setShowGroupInfo(true);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Group Info
                </button>
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
                {activeChat.group.createdBy === user.id ? (
                  <button
                    onClick={() => {
                      if (user.socket) {
                        user.socket.emit('group:delete', { groupId: activeChat.group.id });
                      }
                      setShowDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                  >
                    Delete Group
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (user.socket) {
                        user.socket.emit('group:exit', {
                          groupId: activeChat.group.id
                        });
                      }
                      setShowDropdown(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                  >
                    Leave Group
                  </button>
                )}
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
              {(msg.sender?.id || msg.sender) !== user.id && (
                <div className="text-xs font-medium mb-1 opacity-70">
                  {(() => {
                    const senderId = msg.sender?.id || msg.sender;
                    const senderUser = users.find(u => u.id === senderId);
                    return senderUser?.username || senderUser?.email || 'Unknown User';
                  })()} 
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{decryptMessage(msg.content || msg.message)}</div>
              <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
                <span>{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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

      {showGroupInfo && (
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
                newMembers: selectedUsers,
                token
              });
            }
          }}
        />
      )}

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

export default GroupChatWindow;