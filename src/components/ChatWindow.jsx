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

export default function ChatWindow({ 
  user, 
  activeChat, 
  users, 
  setMessageCounts, 
  setGroupMessageCounts, 
  socket,
  onUserUpdate,
  onUsersUpdate
}) {

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
        <ProfileView 
          user={user} 
          socket={socket}
          onProfileUpdated={(updatedUser) => {
            if (onUserUpdate) {
              onUserUpdate(updatedUser);
            }
            
            if (onUsersUpdate) {
              onUsersUpdate(prevUsers => 
                prevUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u)
              );
            }
            
            try {
              localStorage.setItem('userData', JSON.stringify(updatedUser));
              if (updatedUser.username) {
                localStorage.setItem('username', updatedUser.username);
              }
            } catch (e) {
              console.error('Error updating local storage:', e);
            }
          }} 
        />
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