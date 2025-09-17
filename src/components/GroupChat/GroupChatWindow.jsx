import { useState, useEffect } from "react";
import GroupInfoPopup from '../GroupInfoPopup';
import { encryptMessage, decryptMessage } from '../../utils/encryption';
import { useChatWindow, useClickOutside, useMessageSearch } from '../../hooks/useChatWindow';
import SearchBar from '../../common/SearchBar';
import MessageInput from '../../common/MessageInput';
import { DoorOpen, Eraser, Info, MoreVertical, Search, Trash, UsersRound } from "lucide-react";

const TEST_KEY = 'test-key-1234567890abcdef12345678';

function GroupChatWindow({ user, activeChat, users, setGroupMessageCounts }) {
  const [messages, setMessages] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [key, setKey] = useState(TEST_KEY);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

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

  const processMessages = (msgs) => {
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

      try {
        const unreadIds = (isLoadMore ? [...newMessages] : newMessages)
          .filter(m => {
            const senderId = m.sender?.id || m.sender;
            if (senderId === user.id) return false;
            const statusForUser = m.statusData?.[user.id];
            return !statusForUser || statusForUser.status !== 'read';
          })
          .map(m => m._id)
          .filter(Boolean);

        if (unreadIds.length > 0 && user?.socket) {
          user.socket.emit('group:read', { messageIds: unreadIds, groupId: activeChat.group.id });
          setGroupMessageCounts?.(prev => ({ ...prev, [activeChat.group.id]: 0 }));
        }
      } catch (e) {
        console.warn('Failed to compute/emit group:read on fetch:', e);
      }

      if (isLoadMore) {
        setTimeout(() => container && (container.scrollTop = container.scrollHeight - scrollHeightBefore), 0);
      } else {
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

    const removeGroupMessageById = (data) => {
      const targetId = (data?.messageId ?? data?._id ?? data?.id ?? data?.message?._id ?? data?.message?.id);
      if (!targetId) return;
      setMessages(prev => prev.filter(m => String(m._id || m.id) !== String(targetId)));
    };

    socket.on('group:message:delete', removeGroupMessageById);
    socket.on('group:messageDeleted', removeGroupMessageById);
    socket.on('group:messageHidden', removeGroupMessageById);

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
      socket.off('group:message:delete', removeGroupMessageById);
      socket.off('group:messageDeleted', removeGroupMessageById);
      socket.off('group:messageHidden', removeGroupMessageById);
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
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
            <UsersRound className="w-4 h-4 text-gray-700" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-semibold">{activeChat.group.name}</h3>
            <p className="text-sm text-gray-500">
              {(() => {
                const onlineCount = activeChat?.group?.members?.filter(m => m.online)?.length || 0;
                return `(${onlineCount} online)`;
              })()}
            </p>
          </div>
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
              <button onClick={() => { setShowDropdown(false); setShowGroupInfo(true); }} className="flex items-center block w-full text-left px-4 py-2 hover:bg-gray-100">
                <Info className="w-4 h-4 mr-2" /> Group Info
              </button>
              <button onClick={() => { setShowDropdown(false); setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} className="flex items-center block w-full text-left px-4 py-2 hover:bg-gray-100">
                <Search className="w-4 h-4 mr-2" /> Search Messages
              </button>
              <button onClick={handleClearChat} className="flex items-center block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
                <Eraser className="w-4 h-4 mr-2" /> Clear Chat
              </button>
              <button
                onClick={() => {
                  setConfirmAction(() => () => {
                    user.socket.emit(
                      activeChat.group.createdBy === user.id ? 'group:delete' : 'group:exit',
                      { groupId: activeChat.group.id }
                    );
                  });
                  setShowDropdown(false);
                  setShowConfirmModal(true);
                }}
                className="flex items-center block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
              >
                {activeChat.group.createdBy === user.id ? (
                  <>
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Group
                  </>
                ) : (
                  <>
                    <DoorOpen className="w-4 h-4 mr-2" />
                    Exit Group
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-[360px] p-5 animate-[fadeIn_.15s_ease-out]">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Trash className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {activeChat.group.createdBy === user.id ? "Delete Group?" : "Exit Group?"}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {activeChat.group.createdBy === user.id
                    ? "This will permanently delete the group and all messages for all members."
                    : "You will leave the group and won’t receive further messages."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  confirmAction?.();
                  setShowConfirmModal(false);
                }}
              >
                {activeChat.group.createdBy === user.id ? "Delete" : "Exit"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className={`group relative px-3 py-2 rounded-lg ${isUser ? 'bg-green-500 text-white' : 'bg-white border'}`} style={{ maxWidth: '75%', minWidth: '80px' }}>
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
                {(isUser || (activeChat.group.createdBy === user.id && !isUser)) && (
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
            {!(activeChat.group.createdBy === user.id && (deleteTarget.sender?.id || deleteTarget.sender) !== user.id) && (
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                onClick={() => {
                  user.socket?.emit('group:message:delete', {
                    groupId: activeChat.group.id,
                    messageId: deleteTarget._id || deleteTarget.id,
                    forEveryone: false
                  });
                  setShowDeleteModal(false); setDeleteTarget(null);
                }}
              >
                Delete for me
              </button>
            )}
              <button
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  user.socket?.emit('group:message:delete', { groupId: activeChat.group.id, messageId: deleteTarget._id || deleteTarget.id, forEveryone: true });
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

export default GroupChatWindow;