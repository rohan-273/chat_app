import { useState, useEffect, useRef } from "react";
import GroupInfoPopup from '../GroupInfoPopup';
import { decryptMessage } from '../../utils/encryption';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';

const LABELS = {
  TYPE_MESSAGE: "Type a message...",
  SEND: "Send",
};

function GroupChatWindow({ user, activeChat, users, setGroupMessageCounts }) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setMessageInput("");
    setShowScrollDown(false);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setShowEmojiPicker(false);
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

  const searchMessages = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/message/search?query=${encodeURIComponent(searchQuery)}&type=group&groupId=${activeChat.group.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSearchResults(response.data.data || []);
      setCurrentSearchIndex(0);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const navigateToMessage = (messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.backgroundColor = 'rgb(219 234 254)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  const handleSearchNavigation = (direction) => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'up') {
      newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    } else {
      newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    }
    
    setCurrentSearchIndex(newIndex);
    navigateToMessage(searchResults[newIndex]._id);
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
  
    return () => {
      socket?.off("group:sent");
      socket?.off("group:receive");
      socket?.off("group:message:status");
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
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
              placeholder="Search messages..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={searchMessages}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Search
            </button>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSearchNavigation('up')}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  ↑
                </button>
                <span className="text-sm text-gray-600">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={() => handleSearchNavigation('down')}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  ↓
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setCurrentSearchIndex(-1);
              }}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
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
              className={`max-w-xs px-3 py-2 rounded-lg ${
                (msg.sender?.id || msg.sender) === user.id
                  ? "bg-green-500 text-white"
                  : "bg-white border"
              }`}
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
              <div>{decryptMessage(msg.content || msg.message)}</div>
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

      <div className="p-4 bg-white border-t relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder={LABELS.TYPE_MESSAGE}
              className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xl"
            >
              😊
            </button>
          </div>
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {LABELS.SEND}
          </button>
        </div>
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-16 right-4 z-50">
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                setMessageInput(prev => prev + emojiObject.emoji);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default GroupChatWindow;