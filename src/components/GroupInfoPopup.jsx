import { useState } from 'react';
import AddUsersPopup from './AddUsersPopup';

function GroupInfoPopup({ group, user, users, onClose, onAddUsers }) {
  const [showAddUsers, setShowAddUsers] = useState(false);

  const isOwner = group.createdBy === user.id;
  const availableUsers = users.filter(u => !group.members.some(m => m.id === u.id));

  const handleAddUsers = (selectedUsers) => {
    onAddUsers(group.id, selectedUsers);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{group.name}</h3>
          {isOwner && !showAddUsers && availableUsers.length > 0 && (
            <button
              onClick={() => setShowAddUsers(true)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Add Users
            </button>
          )}
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Members ({group.members.length}):</h4>
          {group.members.map(member => {
            const displayName = member.username || member.email || 'Unknown User';
            return (
              <div key={member.id} className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span>{displayName}</span>
                  {member.id === group.createdBy && <span className="ml-2 text-xs text-blue-500">(Owner)</span>}
                </div>
                {isOwner && member.id !== group.createdBy && (
                  <button
                    onClick={() => {
                      if (user.socket) {
                        user.socket.emit('group:removeMember', {
                          groupId: group.id,
                          userId: member.id
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
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Close
          </button>
          {isOwner && (
            <button
              onClick={() => {
                if (user.socket) {
                  user.socket.emit('group:delete', { groupId: group.id });
                }
                onClose();
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupInfoPopup;