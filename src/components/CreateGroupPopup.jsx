import { useState } from 'react';

function CreateGroupPopup({ users, onClose, onCreateGroup }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      onCreateGroup(groupName, selectedUsers);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Create Group</h3>

        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />

        <div className="mb-4">
          <h4 className="font-medium mb-2">Select Members:</h4>
          <div className="max-h-48 overflow-y-auto pr-2">
            {users?.map(user => (
              <label key={user.id} className="flex items-center mb-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {user.username}
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="ml-2"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupPopup;
