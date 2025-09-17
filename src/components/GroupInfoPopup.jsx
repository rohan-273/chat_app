import { useState, useEffect, useRef } from "react";
import AddUsersPopup from "./AddUsersPopup";
import { Pencil, UserPlus } from "lucide-react";

function GroupInfoPopup({ group, user, users, onClose, onAddUsers }) {
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(group.name);
  
  const popupRef = useRef(null);
  const inputRef = useRef(null);

  const isOwner = group.createdBy === user.id;
  const availableUsers = users.filter(
    (u) => !group.members.some((m) => m.id === u.id)
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingName]);

  const handleSaveGroupName = () => {
    if (newGroupName.trim() && newGroupName !== group.name) {
      user.socket.emit("group:rename", {
        groupId: group.id,
        name: newGroupName.trim(),
      });
      setNewGroupName(newGroupName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setNewGroupName(group.name);
    setIsEditingName(false);
  };

  const handleAddUsers = (selectedUsers) => {
    onAddUsers(group.id, selectedUsers);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={popupRef}
        className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{group.name}</h3>

          {!isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-blue-400 transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
        </div>

        {isEditingName && (
          <div className="flex items-center gap-2 mb-4">
            <input
              ref={inputRef}
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveGroupName}
              className="text-green-500 hover:text-green-700"
            >
              ✓
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-sm text-gray-600 mb-2">
            Group : {group.members.length} Members
          </h4>
          {isOwner && !showAddUsers && availableUsers?.length > 0 && (
            <button
              onClick={() => setShowAddUsers(true)}
              className="flex items-center text-blue-500 hover:text-blue-700 mb-3"
            >
              <div className="w-8 h-8 bg-green-500 rounded-full mr-2 flex items-center justify-center text-xs">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              Add Members
            </button>
          )}
          {group.members
            .sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0))
            .map((member) => {
              const displayName = member.username || member.email;
              const nameWithYou =
                member.id === user.id ? `${displayName} (You)` : displayName;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between mb-2"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span>{nameWithYou}</span>
                    {member.id === group.createdBy && (
                      <span className="ml-2 text-xs text-blue-500">
                        (Owner)
                      </span>
                    )}
                  </div>
                  {isOwner && member.id !== group.createdBy && (
                    <button
                      onClick={() => {
                        if (user.socket) {
                          user.socket.emit("group:removeMember", {
                            groupId: group.id,
                            userId: member.id,
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
        </div>
        {showAddUsers && (
          <AddUsersPopup
            availableUsers={availableUsers}
            onClose={() => setShowAddUsers(false)}
            onAddUsers={handleAddUsers}
          />
        )}
      </div>
    </div>
  );
}

export default GroupInfoPopup;
