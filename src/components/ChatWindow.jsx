import { useState, useEffect } from "react";

const LABELS = {
  WELCOME_TITLE: "Welcome to Chat App",
  WELCOME_MESSAGE: "Select a chat or group to start messaging",
  ADD_USER: "Add User",
  TYPE_MESSAGE: "Type a message...",
  SEND: "Send",
};

function ChatWindow({ user, activeChat, users, allMessages }) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    if (activeChat.type === "personal" && activeChat.user?.id) {
      const filteredMessages = allMessages.filter(msg => 
        (msg.sender === activeChat.user.id && msg.recipient === user.id) ||
        (msg.sender === user.id && msg.recipient === activeChat.user.id)
      );
      setMessages(filteredMessages);
    } else {
      setMessages([]);
    }
  }, [activeChat, allMessages, user.id]);

  const sendMessage = () => {
    if (!messageInput.trim() || !activeChat || !user?.socket) return;

    const token = localStorage.getItem("token");

    try {
      if (activeChat.type === "personal" && activeChat.user?.id) {
        user.socket.emit("message:send", {
          to: activeChat.user.id,
          content: messageInput,
          type: "text",
        });

        user.socket.emit("message:sent", {
          to: activeChat.user.id,
          content: messageInput,
          type: "text",
        });
      } else if (activeChat.type === "group" && activeChat.group?.id) {
        user.socket.emit("groupMessage", {
          groupId: activeChat.group.id,
          message: messageInput,
          token,
        });
      }
      setMessageInput("");
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h3 className="text-xl mb-2">{LABELS.WELCOME_TITLE}</h3>
          <p>{LABELS.WELCOME_MESSAGE}</p>
        </div>
      </div>
    );
  }

  const isGroupCreator =
    activeChat.type === "group" && activeChat.group.creator === user.id;

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-gray-200 bg-white">
        {activeChat.type === "personal" ? (
          <div className="p-4">
            <h3 className="font-semibold">{activeChat.user.username}</h3>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="font-semibold">{activeChat.group.name}</h3>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className={`mb-3 flex ${
              msg.sender === user.id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg ${
                msg.sender === user.id
                  ? "bg-blue-500 text-white"
                  : "bg-white border"
              }`}
            >
              {activeChat.type === "group" && msg.sender !== user.id && (
                <div className="text-xs font-medium mb-1 opacity-70">User</div>
              )}
              <div>{msg.content || msg.message}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder={LABELS.TYPE_MESSAGE}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {LABELS.SEND}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
