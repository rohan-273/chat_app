import { useState, useEffect } from "react";
import GroupInfoPopup from '../GroupInfoPopup';
import { encryptMessage, decryptMessage } from '../../utils/encryption';
import { useChatWindow, useClickOutside, useMessageSearch } from '../../hooks/useChatWindow';
import SearchBar from '../../common/SearchBar';
import MessageInput from '../../common/MessageInput';

const TEST_KEY = 'test-key-1234567890abcdef12345678';

function GroupChatWindow({ user, activeChat, users, setGroupMessageCounts }) {
  const [messages, setMessages] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [key, setKey] = useState(TEST_KEY);

  const {
    messageInput, setMessageInput, showDropdown, setShowDropdown,
    showSearch, setShowSearch, searchQuery, setSearchQuery,
    searchResults, setSearchResults, currentSearchIndex, setCurrentSearchIndex,
    showEmojiPicker, setShowEmojiPicker, messagesEndRef, dropdownRef,
    messagesContainerRef, searchInputRef, emojiPickerRef
  } = useChatWindow(activeChat);

  const { searchMessages, handleSearchNavigation } = useMessageSearch(activeChat);

  useClickOutside([dropdownRef, emojiPickerRef], [() => setShowDropdown(false), () => setShowEmojiPicker(false)]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setShowScrollDown(false);
    setKey(TEST_KEY);
  }, [activeChat]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const handleScroll = () => {
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        setShowScrollDown(scrollHeight - scrollTop - clientHeight >= 10 && messages.length > 0);
      }
    };
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [messages]);

  const processMessages = (msgs, senderId, userId) => {
    return msgs.map(msg => {
      if (!msg.messageStatus || !Array.isArray(msg.messageStatus)) return msg;
      const statusData = {};
      const sender = msg.sender?.id || msg.sender;

      msg.messageStatus.forEach(ms => {
        statusData[ms.user] = { status: ms.status, readAt: ms.readAt, deliveredAt: ms.deliveredAt };
      });

      if (!statusData[sender]) {
        statusData[sender] = { status: 'read', readAt: msg.readAt || new Date().toISOString() };
      } else if (statusData[sender]?.status !== 'read') {
        statusData[sender] = { ...statusData[sender], status: 'read', readAt: statusData[sender]?.readAt || msg.readAt || new Date().toISOString() };
      }

      const recipients = Object.keys(statusData).filter(id => id !== sender);
      const allRead = recipients.length > 0 && recipients.every(id => statusData[id]?.status === 'read');
      const allDelivered = recipients.length > 0 && recipients.every(id => ['read', 'delivered'].includes(statusData[id]?.status));

      return { ...msg, statusData, status: allRead ? 'read' : allDelivered ? 'delivered' : 'sent' };
    });
  };

  const fetchMessages = async (pageNum = 1, isLoadMore = false) => {
    if (!activeChat?.group?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/message/group/${activeChat.group.id}?page=${pageNum}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { data, pagination } = await response.json();
      const newMessages = processMessages(data || [], user.id, user.id);

      const container = messagesContainerRef.current;
      const scrollHeightBefore = container?.scrollHeight || 0;

      setMessages(prev => isLoadMore ? [...newMessages, ...prev] : newMessages);
      setHasMore(pagination?.hasNext || false);
      if (!isLoadMore) setPage(1);

      if (isLoadMore) {
        setTimeout(() => container && (container.scrollTop = container.scrollHeight - scrollHeightBefore), 0);
      } else {
        newMessages.forEach(msg => {
          if ((msg.sender?.id || msg.sender) !== user.id && !msg.readBy?.includes(user.id)) {
            user.socket.emit('group:read', { messageIds: [msg._id], groupId: activeChat.group.id });
          }
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  useEffect(() => {
    if (!activeChat?.group?.id || !user?.socket) {
      setMessages([]);
      return;
    }

    fetchMessages();

    const socket = user.socket;
    socket.on('group:sent', msg => {
      if (msg?.group === activeChat.group.id && (msg.sender?.id || msg.sender) === user.id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    socket.on('group:receive', msg => {
      if (msg?.group === activeChat.group.id && (msg.sender?.id || msg.sender) !== user.id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        if (msg._id) {
          socket.emit('group:delivered', { messageId: msg._id, groupId: activeChat.group.id });
          socket.emit('group:read', { messageIds: [msg._id], groupId: activeChat.group.id });
          setGroupMessageCounts?.(prev => ({ ...prev, [activeChat.group.id]: 0 }));
        }
      }
    });

    socket.on('group:status', data => {
      setMessages(prev => prev.map(msg => {
        if (msg._id !== data.messageId) return msg;
        const statusData = { ...msg.statusData, ...data.status, [msg.sender?.id || msg.sender]: { status: 'read', readAt: new Date().toISOString() } };
        const recipients = Object.keys(statusData).filter(id => id !== (msg.sender?.id || msg.sender));
        const allRead = recipients.length > 0 && recipients.every(id => statusData[id]?.status === 'read');
        const allDelivered = recipients.length > 0 && recipients.every(id => ['read', 'delivered'].includes(statusData[id]?.status));
        return {
          ...msg,
          statusData,
          status: allRead ? 'read' : allDelivered ? 'delivered' : 'sent',
          updatedAt: data.updatedAt || msg.updatedAt
        };
      }));
    });

    socket.on('group:chat:clear', () => {
      setMessages([]);
      setPage(1);
      setHasMore(false);
    });

    return () => {
      socket.off('group:sent');
      socket.off('group:receive');
      socket.off('group:status');
      socket.off('group:chat:clear');
    };
  }, [activeChat, user.id]);

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat?.group?.id || !user?.socket || !key) return;
    try {
      user.socket.emit('group:send', {
        groupId: activeChat.group.id,
        content: encryptMessage(messageInput, key),
        type: 'text'
      });
      setMessageInput('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleClearChat = () => {
    if (!activeChat?.group?.id || !user?.socket) return;
    user.socket.emit('group:chat:clear', { groupId: activeChat.group.id });
    setShowDropdown(false);
    setMessages([]);
    setPage(1);
    setHasMore(false);
    setShowScrollDown(false);
  };

  const handleSearch = async () => {
    const results = await searchMessages(searchQuery);
    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  return (
    <>
      <div className="border-b border-gray-200 bg-white p-4 flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{activeChat.group.name}</h3>
          <p className="text-sm text-gray-500">
            {activeChat.group.members
              .sort((a, b) => a.id === user.id ? -1 : b.id === user.id ? 1 : 0)
              .map(m => `${m.username || m.email}${m.id === user.id ? ' (You)' : ''}`)
              .join(', ')}
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
              <button onClick={() => { setShowDropdown(false); setShowGroupInfo(true); }} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                Group Info
              </button>
              <button onClick={() => { setShowDropdown(false); setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                Search Messages
              </button>
              <button onClick={handleClearChat} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
                Clear Chat
              </button>
              <button
                onClick={() => {
                  user.socket.emit(activeChat.group.createdBy === user.id ? 'group:delete' : 'group:exit', { groupId: activeChat.group.id });
                  setShowDropdown(false);
                }}
                className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
              >
                {activeChat.group.createdBy === user.id ? 'Delete Group' : 'Leave Group'}
              </button>
            </div>
          )}
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
          onClose={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); setCurrentSearchIndex(-1); }}
        />
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {hasMore && messages.length > 0 && (
          <div className="text-center mb-4">
            <button onClick={() => fetchMessages(page + 1, true)} className="text-blue-500 hover:text-blue-700 text-sm underline">
              Load more messages
            </button>
          </div>
        )}
        {messages.map((msg, i) => {
          const senderId = msg.sender?.id || msg.sender;
          const isUser = senderId === user.id;
          return (
            <div key={msg.id || i} data-message-id={msg._id || msg.id} className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-2 rounded-lg ${isUser ? 'bg-green-500 text-white' : 'bg-white border'}`} style={{ maxWidth: '75%', minWidth: '80px' }}>
                {!isUser && (
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {users.find(u => u.id === senderId)?.username || users.find(u => u.id === senderId)?.email || 'Unknown User'}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{decryptMessage(msg.content || msg.message, key)}</div>
                <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
                  <span>{new Date(msg.updatedAt || msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isUser && (
                    <div className="ml-2">
                      {(() => {
                        const statusData = msg.statusData || {};
                        const recipients = Object.keys(statusData).filter(id => id !== senderId);
                        const display = recipients.length > 0 && recipients.every(id => statusData[id]?.status === 'read') ? 'read'
                          : recipients.length > 0 && recipients.every(id => ['read', 'delivered'].includes(statusData[id]?.status)) ? 'delivered'
                          : msg.status || 'sent';
                        return <span className={display === 'read' ? 'text-blue-600' : 'text-white'} title={display === 'read' ? 'Read by all' : display === 'delivered' ? 'Delivered to all' : 'Sent'}>✓✓</span>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 transition-opacity duration-200 z-10 ${showScrollDown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })} className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-blue-600">
          ↓
        </button>
      </div>

      {showGroupInfo && (
        <GroupInfoPopup
          group={activeChat.group}
          user={user}
          users={users}
          onClose={() => setShowGroupInfo(false)}
          onAddUsers={(groupId, selectedUsers) => user.socket?.emit('group:addMembers', { groupId, newMembers: selectedUsers, token: localStorage.getItem('token') })}
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