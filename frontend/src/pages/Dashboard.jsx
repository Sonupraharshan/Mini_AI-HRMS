import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [selectedRosterId, setSelectedRosterId] = useState('');

  // Fetch rosters list if admin
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const fetchRosters = async () => {
        try {
          const res = await api.get('/rosters');
          setRosters(res.data);
          // Default to the admin's own roster if none selected
          if (!selectedRosterId && user.rosterId) {
            setSelectedRosterId(user.rosterId);
          } else if (!selectedRosterId && res.data.length > 0) {
             setSelectedRosterId(res.data[0].id);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchRosters();
    }
  }, [user]);

  // Fetch stats and employees for the requested scope
  useEffect(() => {
    // Wait until we have a selectedRosterId for admins
    if (user?.role === 'ADMIN' && !selectedRosterId) return;

    const queryParam = user?.role === 'ADMIN' && selectedRosterId ? `?rosterId=${selectedRosterId}` : '';

    const fetchDashboardData = async () => {
      try {
        const [statsRes, empRes] = await Promise.all([
          api.get(`/dashboard${queryParam}`),
          api.get(`/employees${queryParam}`)
        ]);
        setStats(statsRes.data);
        setEmployees(empRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    fetchDashboardData();
  }, [user, selectedRosterId]);

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
             Dashboard
             {user?.role === 'ADMIN' && (
                <select 
                  value={selectedRosterId} 
                  onChange={(e) => setSelectedRosterId(e.target.value)}
                  className="text-base border border-gray-300 rounded p-1 font-normal text-gray-600 bg-white"
                >
                  <option value="" disabled>Select Roster</option>
                  {rosters.map(r => (
                    <option key={r.id} value={r.id}>{r.name} {r.adminId === user.id ? '(My Roster)' : ''}</option>
                  ))}
                </select>
             )}
          </h1>
        </div>
        <div>
          <span className="text-gray-600">Welcome, {user?.name} ({user?.role})</span>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500 overflow-y-auto max-h-96">
            <h3 className="text-gray-500 text-sm">Total Roster Employees</h3>
            <p className="text-3xl font-bold border-b mb-2">{employees.length}</p>
          </div>
          <div className="bg-white p-6 rounded shadow border-t-4 border-green-500">
            <h3 className="text-gray-500 text-sm">Total Completed Tasks</h3>
            <p className="text-3xl font-bold">{stats.tasks.completed} <span className="text-gray-400 text-xl font-normal">/ {stats.tasks.total}</span></p>
          </div>
          <div className="bg-white p-6 rounded shadow border-t-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm">Total Tasks In Progress</h3>
            <p className="text-3xl font-bold">{stats.tasks.inProgress}</p>
          </div>
          <div className="bg-white p-6 rounded shadow border-t-4 border-purple-500">
            <h3 className="text-gray-500 text-sm">Completion Rate</h3>
            <p className="text-3xl font-bold">{stats.taskCompletionRate}%</p>
          </div>
        </div>
      ) : (
        <p>Loading stats...</p>
      )}
    </div>
  );
};

export default Dashboard;
