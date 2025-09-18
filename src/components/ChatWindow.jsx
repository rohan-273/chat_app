import PersonalChatWindow from './PersonalChat/PersonalChatWindow';
import GroupChatWindow from './GroupChat/GroupChatWindow';
import ProfileView from './ProfileView';

const LABELS = {
  WELCOME_TITLE: "Welcome to Chat App",
  WELCOME_MESSAGE: "Select a chat or group to start messaging",
  ADD_USER: "Add User",
  TYPE_MESSAGE: "Type a message...",
  SEND: "Send",
};

function ChatWindow({ user, activeChat, users, setMessageCounts, setGroupMessageCounts }) {

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

  return (
    <div className="flex-1 flex flex-col relative">
      {activeChat?.type === "profile" && (
        <ProfileView user={activeChat.user} />
      )}
      {activeChat.type === "personal" && (
        <PersonalChatWindow 
          user={user} 
          activeChat={activeChat} 
          users={users}
          setMessageCounts={setMessageCounts}
        />
      )}
      {activeChat.type === "group" && (
        <GroupChatWindow 
          user={user} 
          activeChat={activeChat} 
          users={users}
          setGroupMessageCounts={setGroupMessageCounts}
        />
      )}
    </div>
  );
}

export default ChatWindow;