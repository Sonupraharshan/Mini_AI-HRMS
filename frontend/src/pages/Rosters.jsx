import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const Rosters = () => {
  const { user } = useContext(AuthContext);
  const [rosters, setRosters] = useState([]);
  const [formData, setFormData] = useState({ name: '', adminName: '', adminEmail: '', adminPassword: '' });

  const fetchRosters = async () => {
    try {
      const res = await api.get('/rosters');
      setRosters(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRosters();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rosters', formData);
      setFormData({ name: '', adminName: '', adminEmail: '', adminPassword: '' });
      fetchRosters();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating roster');
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-red-500">Access Denied. Admins Only.</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Organization Rosters</h2>
      
      {!user.hasSmtpPassword && (
        <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded flex justify-between items-center">
          <p><strong>Warning:</strong> You must configure your Google App Password in Settings before you can invite new members to Rosters.</p>
          <Link to="/settings" className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm">Go to Settings</Link>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-8 bg-white p-6 rounded shadow max-w-2xl">
        <h3 className="text-xl mb-4 text-gray-700">Create New Roster & Admin</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Roster Name (e.g. Engineering)" className="p-2 border rounded col-span-2" />
          <input required type="text" name="adminName" value={formData.adminName} onChange={handleChange} placeholder="Admin Name" className="p-2 border rounded" />
          <input required type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} placeholder="Admin Email" className="p-2 border rounded" />
          <input required type="password" name="adminPassword" value={formData.adminPassword} onChange={handleChange} placeholder="Admin Password" className="p-2 border rounded" />
        </div>
        <button 
          type="submit" 
          disabled={!user.hasSmtpPassword}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Roster
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rosters.map(r => (
          <Link key={r.id} to={`/rosters/${r.id}`}>
            <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-bold mb-2">{r.name}</h3>
              <div className="flex justify-between text-sm text-gray-500 mt-4 border-t pt-2">
                <span>{r._count?.employees || 0} Employees</span>
                <span>{r._count?.tasks || 0} Tasks</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Rosters;
