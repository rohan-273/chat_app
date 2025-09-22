import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';

const loginSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

function Login({ onLogin, switchToRegister, error }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      await onLogin(data);
    } catch (error) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Login</h2>
        {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              {...register('email')}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
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
                errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
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
            className={`w-full bg-blue-500 text-white p-3 rounded-lg transition duration-200 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-600">
          Don't have an account?{' '}
          <button 
            onClick={switchToRegister} 
            className="text-green-500 hover:underline"
            disabled={isSubmitting}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;