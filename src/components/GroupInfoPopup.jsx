import { useState } from 'react';

function GroupInfoPopup({ group, user, users, onClose, onAddUsers }) {
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const isOwner = group.createdBy === user.id;
  const availableUsers = users.filter(u => !group.members.some(m => m.id === u.id));

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddUsers = () => {
    if (selectedUsers.length > 0) {
      onAddUsers(group.id, selectedUsers);
      setShowAddUsers(false);
      setSelectedUsers([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{group.name}</h3>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Members ({group.members.length}):</h4>
          {group.members.map(member => {
            const displayName = member.username || member.email || 'Unknown User';
            return (
              <div key={member.id} className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span>{displayName}</span>
                {member.id === group.createdBy && <span className="ml-2 text-xs text-blue-500">(Owner)</span>}
              </div>
            );
          })}
        </div>

        {isOwner && !showAddUsers && availableUsers.length > 0 && (
          <button
            onClick={() => setShowAddUsers(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
          >
            Add Users
          </button>
        )}

        {showAddUsers && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Add Users:</h4>
            {availableUsers.length > 0 ? availableUsers.map(user => (
              <label key={user.id} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="mr-2"
                />
                {user.username || user.email}
              </label>
            )) : (
              <p className="text-gray-500">No users available to add</p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddUsers}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddUsers(false)}
                className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default GroupInfoPopup;