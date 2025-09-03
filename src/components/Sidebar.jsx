import { useState, useEffect } from "react";

function Sidebar({
  user,
  users,
  groups,
  activeChat,
  setActiveChat,
  onLogout,
  messageCounts,
}) {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  const createGroup = () => {
    if (groupName.trim() && user.socket) {
      const token = localStorage.getItem("token");
      user.socket.emit("createGroup", { groupName, token });
      setGroupName("");
      setShowCreateGroup(false);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{user?.username}</h2>

          <button
            onClick={() => {
              if (user.socket) {
                const token = localStorage.getItem("token");
                user.socket.emit("logout", { token });
                user.socket.disconnect();
              }
              localStorage.removeItem("token");
              localStorage.removeItem("username");
              localStorage.removeItem("userId");
              onLogout();
            }}
            className="text-red-500 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">All Users</h3>
          </div>

          {users.map((u) => (
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
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${
                      u.online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  ></div>
                  {u.username}
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
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              + Create
            </button>
          </div>

          {showCreateGroup && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={createGroup}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => setActiveChat({ type: "group", group: g })}
              className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                activeChat?.type === "group" && activeChat?.group?.id === g.id
                  ? "bg-blue-100"
                  : ""
              }`}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-xs">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-gray-500">
                    {g.members.length} members
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
