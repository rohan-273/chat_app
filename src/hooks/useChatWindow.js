import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const useChatWindow = (activeChat) => {
  const [messageInput, setMessageInput] = useState("");
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
    setMessageInput("");
    setShowScrollDown(false);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setShowEmojiPicker(false);
  }, [activeChat]);

  return {
    messageInput,
    setMessageInput,
    showDropdown,
    setShowDropdown,
    showScrollDown,
    setShowScrollDown,
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
  };
};

export const useClickOutside = (refs, callbacks) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      refs.forEach((ref, index) => {
        if (ref.current && !ref.current.contains(event.target)) {
          callbacks[index]();
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [refs, callbacks]);
};

export const useMessageSearch = (activeChat) => {
  const searchMessages = async (searchQuery) => {
    if (!searchQuery.trim()) return [];
    
    try {
      const token = localStorage.getItem('token');
      let url;
      
      if (activeChat.type === 'group' && activeChat.group?.id) {
        url = `${import.meta.env.VITE_API_URL}/message/search?query=${encodeURIComponent(searchQuery)}&type=group&groupId=${activeChat.group.id}`;
      } else if (activeChat.type === 'personal' && activeChat.user?.id) {
        url = `${import.meta.env.VITE_API_URL}/message/search?query=${encodeURIComponent(searchQuery)}&type=direct&userId=${activeChat.user.id}`;
      } else {
        return [];
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Search failed:', error);
      return [];
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

  const handleSearchNavigation = (direction, searchResults, currentSearchIndex, setCurrentSearchIndex) => {
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

  return { searchMessages, navigateToMessage, handleSearchNavigation };
};