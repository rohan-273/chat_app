import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';

const registerSchema = yup.object().shape({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

function Register({ onRegister, switchToLogin, error }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      await onRegister(data);
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-500 to-blue-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Create Account</h2>
        {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <input
              type="text"
              placeholder="First Name"
              {...register('firstName')}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.firstName ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'
              }`}
              disabled={isSubmitting}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Last Name"
              {...register('lastName')}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.lastName ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'
              }`}
              disabled={isSubmitting}
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
            )}
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Username"
              {...register('username')}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.username ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'
              }`}
              disabled={isSubmitting}
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              {...register('email')}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'
              }`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="mb-6">
            <input
              type="password"
              placeholder="Password"
              {...register('password')}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-500'
              }`}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-green-500 text-white p-3 rounded-lg transition duration-200 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-600'
            }`}
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-600">
          Already have an account?{' '}
          <button 
            onClick={switchToLogin} 
            className="text-blue-500 hover:underline"
            disabled={isSubmitting}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;