import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, registerAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '', password: '', orgName: '', name: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let result;
    if (isRegister) {
      result = await registerAdmin(formData.orgName, formData.name, formData.email, formData.password);
    } else {
      result = await login(formData.email, formData.password);
    }

    if (result.success) {
      if (isRegister) {
        setSuccessMsg(result.message);
        setPreviewUrl(result.previewUrl || '');
        setFormData({ email: '', password: '', orgName: '', name: ''});
        setIsRegister(false); // flip back to login view but show success
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">{isRegister ? 'Register Organization' : 'Login'}</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {successMsg && (
            <div className="bg-green-100 border border-green-200 p-4 rounded mb-4 flex flex-col gap-2">
                <p className="text-green-800 text-sm">{successMsg}</p>
                {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded font-semibold text-sm transition-colors shadow-sm">
                        ✉️ Open Mock Verification Email
                    </a>
                )}
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium">Organization Name</label>
                <input required type="text" name="orgName" value={formData.orgName} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium">Your Name (Admin)</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium">Email Address</label>
            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            {isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 underline">
            {isRegister ? 'Login' : 'Register Organization'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
