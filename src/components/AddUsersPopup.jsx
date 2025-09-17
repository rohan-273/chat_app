import { useState } from 'react';

function AddUsersPopup({ availableUsers, onClose, onAddUsers }) {
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAdd = () => {
    if (selectedUsers.length > 0) {
      onAddUsers(selectedUsers);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Add Members</h3>
        
        <div className="mb-4">
          {availableUsers.length > 0 ? availableUsers.map(user => (
            <label key={user.id} className="flex items-center mb-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {user.username || user.email}
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => handleUserToggle(user.id)}
                className="ml-2"
              />
            </label>
          )) : (
            <p className="text-gray-500">No member available to add</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add
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

export default AddUsersPopup;