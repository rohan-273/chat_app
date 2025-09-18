import { Edit2 } from "lucide-react";

function ProfileView({ user }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center items-center bg-white py-10 border-b border-gray-300">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <button className="absolute bottom-2 right-2 bg-blue-500 text-white p-2 rounded-full shadow hover:bg-blue-600">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 bg-gray-100">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={user?.username || ""}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileView;
