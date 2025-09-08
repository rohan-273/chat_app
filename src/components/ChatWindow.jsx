import PersonalChatWindow from './PersonalChat/PersonalChatWindow';
import GroupChatWindow from './GroupChat/GroupChatWindow';

function ChatWindow({ user, activeChat, users, allMessages }) {
  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h3 className="text-xl mb-2">Welcome to Chat App</h3>
          <p>Select a chat or group to start messaging</p>
        </div>
      </div>
    );
  }

  if (activeChat.type === "personal") {
    return <PersonalChatWindow user={user} activeChat={activeChat} />;
  }

  if (activeChat.type === "group") {
    return <GroupChatWindow user={user} activeChat={activeChat} users={users} />;
  }

  return null;
}

export default ChatWindow;