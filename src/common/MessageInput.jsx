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
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
            placeholder="Type a message..."
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
          onClick={onSendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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