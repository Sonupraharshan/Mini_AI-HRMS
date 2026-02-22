import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Verify = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        await api.get(`/auth/verify/${token}`);
        setStatus('success');
        setTimeout(() => {
           navigate('/login');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.error || 'Verification failed. The link might be invalid or expired.');
      }
    };
    verifyToken();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        {status === 'verifying' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Verifying Invitation...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Verified!</h2>
            <p className="text-gray-600 mb-4">Your account is now active. Redirecting to login...</p>
            <Link to="/login" className="text-blue-600 hover:underline">Click here if not redirected</Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4">{errorMsg}</p>
            <Link to="/login" className="text-blue-600 hover:underline">Return to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;
