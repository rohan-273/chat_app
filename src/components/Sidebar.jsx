import { useEffect, useRef, useState } from "react";
import { MoreVertical, LogOut, User, UsersRound } from "lucide-react";
import CreateGroupPopup from "./CreateGroupPopup";

function Sidebar({
  user,
  users,
  groups,
  activeChat,
  setActiveChat,
  onLogout,
  messageCounts,
  groupMessageCounts,
}) {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleCreateGroup = (groupName, selectedUsers) => {
    if (user.socket) {
      const token = localStorage.getItem("token");
      user.socket.emit("group:create", {
        name: groupName,
        members: selectedUsers,
        token,
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center justify-between relative">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-semibold">{user?.username}</h2>
          </div>
     
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 bg-white shadow-md rounded-md w-40 border border-gray-200 z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm"
                >
                  <User className="w-4 h-4 mr-2" />
                  View Profile
                </button>
                <button
                  onClick={() => {
                    if (user.socket) user.socket.disconnect();
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                    localStorage.removeItem("userId");
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-gray-100 text-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="font-semibold mb-2">All Users</h3>
          {users?.map((u) => (
            <div
              key={u.id}
              onClick={() => setActiveChat({ type: "personal", user: u })}
              className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                activeChat?.type === "personal" && activeChat?.user?.id === u.id
                  ? "bg-blue-100"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-sm">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">{u.username}</span>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        u.online ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></div>
                  </div>
                </div>
                {messageCounts[u.id] > 0 && (
                  <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {messageCounts[u.id]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Groups</h3>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Create
            </button>
          </div>

          {showCreateGroup && (
            <CreateGroupPopup
              users={users}
              onClose={() => setShowCreateGroup(false)}
              onCreateGroup={handleCreateGroup}
            />
          )}

          {groups?.map((g) => (
            <div
              key={g.id}
              onClick={() => setActiveChat({ type: "group", group: g })}
              className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                activeChat?.type === "group" && activeChat?.group?.id === g.id
                  ? "bg-blue-100"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
                    <UsersRound className="w-4 h-4 text-gray-700" />
                  </div>
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-gray-500">
                      {g.members.length} members
                    </div>
                  </div>
                </div>
                {groupMessageCounts[g.id] > 0 && (
                  <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {groupMessageCounts[g.id]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
