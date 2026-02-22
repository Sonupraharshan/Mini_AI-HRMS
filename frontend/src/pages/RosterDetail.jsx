import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const RosterDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [roster, setRoster] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigneeId: '', complexityScore: 1 });

  const fetchRoster = async () => {
    try {
      const res = await api.get(`/rosters/${id}`);
      setRoster(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [id]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', { ...empForm, rosterId: id });
      setEmpForm({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '' });
      fetchRoster();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating employee');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', { ...taskForm, complexityScore: parseInt(taskForm.complexityScore), rosterId: id });
      setTaskForm({ title: '', description: '', assigneeId: '', complexityScore: 1 });
      fetchRoster();
    } catch (err) {
      alert('Error creating task');
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-red-500">Access Denied.</div>;
  }

  if (!roster) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <Link to="/rosters" className="text-blue-500 hover:underline mb-2 inline-block">&larr; Back to Rosters</Link>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            📋 Roster: <span className="text-gray-600">{roster.name}</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ADD EMPLOYEE SECTION */}
        <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500">
          {roster.adminId === user.id && (
            <>
              <h3 className="text-xl mb-4 font-bold text-gray-700">Add Employee to Roster</h3>
              
              {!user.hasSmtpPassword && (
                <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 text-sm rounded">
                  <strong>Warning:</strong> Please <Link to="/settings" className="underline font-bold">configure your App Password</Link> to send email invitations.
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="grid gap-3 mb-8">
                <input required type="text" placeholder="Name" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} className="p-2 border rounded" />
                <input required type="email" placeholder="Email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} className="p-2 border rounded" />
                <input required type="password" placeholder="Password" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} className="p-2 border rounded" />
                <div className="flex gap-2">
                  <select required value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} className="p-2 border rounded flex-1">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <select required value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} className="p-2 border rounded flex-1">
                    <option value="" disabled>Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <button 
                   type="submit" 
                   disabled={!user.hasSmtpPassword}
                   className="bg-blue-600 text-white p-2 rounded w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   Hire Employee
                </button>
              </form>
            </>
          )}

          <h4 className="font-bold border-b pb-2 mb-4">Current Members</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {roster.employees.length === 0 ? <p className="text-gray-400 italic">No employees yet</p> : roster.employees.map(emp => (
              <div key={emp.id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <span className="font-semibold">{emp.name}</span>
                  {emp.status === 'PENDING' && <span className="ml-2 px-2 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded-full font-bold">PENDING</span>}
                </div>
                <span className="text-sm text-gray-500">{emp.email}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ADD TASK SECTION */}
        <div className="bg-white p-6 rounded shadow border-t-4 border-green-500">
          {roster.adminId === user.id && (
            <>
              <h3 className="text-xl mb-4 font-bold text-gray-700">Assign New Task</h3>
              <form onSubmit={handleCreateTask} className="grid gap-3 mb-8">
                <input required type="text" placeholder="Task Title" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="p-2 border rounded" />
                <textarea required placeholder="Task Description" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="p-2 border rounded" />
                
                <div className="flex gap-2">
                  <select required value={taskForm.assigneeId} onChange={e => setTaskForm({...taskForm, assigneeId: e.target.value})} className="p-2 border rounded flex-1">
                    <option value="" disabled>Select Roster Member</option>
                    {roster.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <input type="number" min="1" max="10" placeholder="Score 1-10" value={taskForm.complexityScore} onChange={e => setTaskForm({...taskForm, complexityScore: e.target.value})} className="w-24 p-2 border rounded" />
                </div>
                
                <button type="submit" className="bg-green-600 text-white p-2 rounded w-full">Assign Task</button>
              </form>
            </>
          )}

          <h4 className="font-bold border-b pb-2 mb-4">Roster Tasks</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {roster.tasks.length === 0 ? <p className="text-gray-400 italic">No tasks yet</p> : roster.tasks.map(task => (
              <div key={task.id} className="p-2 border rounded text-sm">
                <div className="font-semibold text-gray-700">{task.title}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">Owner: {task.assignee?.name || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RosterDetail;
