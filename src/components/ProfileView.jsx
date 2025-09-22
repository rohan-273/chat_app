import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-hot-toast";
import { Edit2 } from "lucide-react";
import axios from "axios";

const profileSchema = yup.object().shape({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  username: yup
    .string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must not exceed 20 characters"),
  email: yup.string().email("Invalid email").required("Email is required"),
});

function ProfileView({ user, socket }) {
  const {
    register,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
    watch,
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
    },
  });

  const currentUsername = watch("username");

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || ''
      });
    }
  }, [user, reset]);

  useEffect(() => {
    if (!socket) return;
  
    const handleProfileUpdated = (updatedUser) => {
      reset({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
        email: updatedUser.email,
      }, { keepDirty: false });
  
      toast.success("Profile updated successfully");
    };
  
    socket.on('user:profileUpdated', handleProfileUpdated);
  
    return () => {
      socket.off('user:profileUpdated', handleProfileUpdated);
    };
  }, [socket, reset]);
  

  const onSubmit = async (data) => {
    try {
      if (!socket) {
        throw new Error("Socket connection not available");
      }      
      
      const updatedUser = {
        ...data,
        id: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email
      };
      
      socket.emit('user:updateProfile', updatedUser, (response) => {
        if (!response?.success) {
          reset({
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email
          });
          toast.error(response?.message);
        }
      });      
    } catch (err) {
      toast.error(err.response?.data?.message);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.data?.success) {
          const profileData = res.data.data;
          reset({
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            username: profileData.username,
            email: profileData.email,
          });
        }
      } catch (err) {
        toast.error(err.response?.data?.message);
      }
    };

    fetchProfile();
  }, [reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      <div className="flex justify-center items-center bg-white py-10 border-b border-gray-300">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600">
            {currentUsername?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <button className="absolute bottom-2 right-2 bg-blue-500 text-white p-2 rounded-full shadow hover:bg-blue-600 transition">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 bg-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              {...register("firstName")}
              className={`w-full border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 bg-gray-100 text-gray-700`}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              {...register("lastName")}
              className={`w-full border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 bg-gray-100 text-gray-700`}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              {...register("username")}
              className={`w-full border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 bg-gray-100 text-gray-700`}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className={`w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 bg-gray-100 text-gray-700`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={`bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition ${
              !isDirty || isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Updating..." : "Update Profile"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default ProfileView;