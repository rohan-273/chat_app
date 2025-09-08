import EmojiPicker from 'emoji-picker-react';

function MessageInput({ 
  messageInput, 
  setMessageInput, 
  onSendMessage, 
  showEmojiPicker, 
  setShowEmojiPicker, 
  emojiPickerRef 
}) {
  return (
    <div className="p-4 bg-white border-t relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && onSendMessage()}
            placeholder="Type a message..."
            className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto leading-relaxed"
            rows={1}
            style={{ 
              minHeight: '48px', 
              maxHeight: '150px',
              lineHeight: '1.5',
              fontSize: '14px',
              scrollbarWidth: 'thin',
              WebkitScrollbar: {
                width: '2px'
              },
              WebkitScrollbarTrack: {
                background: '#f1f1f1'
              },
              WebkitScrollbarThumb: {
                background: '#c1c1c1',
                borderRadius: '2px'
              }
            }}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-4 bottom-3 text-gray-500 hover:text-gray-700 text-xl"
          >
            😊
          </button>
        </div>
        <button
          onClick={onSendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 self-end"
          style={{ minHeight: '48px' }}
        >
          Send
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
  );
}

export default MessageInput;