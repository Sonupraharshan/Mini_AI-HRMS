import React, { useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [status, setStatus] = useState('');

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-red-500">Access Denied. Only Admins have settings.</div>;
  }

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setStatus('saving');
    try {
      await api.put('/auth/smtp', { smtpPassword });
      setUser(prev => ({ ...prev, hasSmtpPassword: true }));
      setStatus('success');
      setSmtpPassword('');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Admin Settings</h2>

      <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500">
        <h3 className="text-xl mb-4 font-bold text-gray-700">Email Delivery Configuration</h3>
        <p className="text-sm text-gray-600 mb-6 border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded">
          <strong>Important:</strong> To send actual invitation emails to your team members, you must configure a Gmail App Password. Without this, invitations cannot be sent.
        </p>

        <form onSubmit={handleSaveSmtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google App Password
            </label>
            <input 
              type="password" 
              required
              placeholder="16-character app password (e.g. abcd efgh ijkl mnop)" 
              value={smtpPassword}
              onChange={e => setSmtpPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
            />
            {user.hasSmtpPassword && (
               <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                 <span>✓</span> A password is currently configured and active for <strong>{user.email}</strong>
               </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
               Go to your Google Account Settings &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords. Generate a new password and paste it here without spaces.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={status === 'saving'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving...' : user.hasSmtpPassword ? 'Update App Password' : 'Save App Password'}
          </button>

          {status === 'success' && <p className="text-sm text-green-600">Configuration saved successfully!</p>}
          {status === 'error' && <p className="text-sm text-red-600">Failed to save configuration. Please try again.</p>}
        </form>
      </div>
    </div>
  );
};

export default Settings;
