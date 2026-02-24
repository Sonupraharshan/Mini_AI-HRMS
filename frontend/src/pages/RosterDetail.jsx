import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const RosterDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [roster, setRoster] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', department: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigneeId: '', complexityScore: 1 });
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

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
      const res = await api.post('/employees', { ...empForm, rosterId: id });
      setEmpForm({ name: '', email: '', password: '', department: '' });
      fetchRoster();
      
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating employee');
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    if (!window.confirm("Are you sure you want to remove this employee from the roster? This cannot be undone.")) return;
    try {
      await api.delete(`/employees/${employeeId}`);
      fetchRoster();
    } catch (err) {
      alert(err.response?.data?.error || 'Error removing employee');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', { ...taskForm, complexityScore: parseInt(taskForm.complexityScore), rosterId: id });
      setTaskForm({ title: '', description: '', assigneeId: '', complexityScore: 1 });
      setAiRecommendation(null);
      fetchRoster();
    } catch (err) {
      alert('Error creating task');
    }
  };

  const handleSmartAssign = async () => {
    if (!taskForm.title || !taskForm.description) {
      alert("Please provide a title and description first for the AI to analyze.");
      return;
    }
    setLoadingAI(true);
    setAiRecommendation(null);
    try {
      const res = await api.post('/ai/smart-assign-draft', { title: taskForm.title, description: taskForm.description, complexityScore: taskForm.complexityScore, rosterId: id });
      setAiRecommendation(res.data.recommendation);
      if (res.data.recommendation?.recommendedEmployeeId) {
        setTaskForm(prev => ({ ...prev, assigneeId: res.data.recommendation.recommendedEmployeeId }));
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "AI assignment failed.");
    }
    setLoadingAI(false);
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

              <form onSubmit={handleCreateEmployee} className="grid gap-3 mb-8">
                <input required type="text" placeholder="Name" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} className="p-2 border rounded" />
                <input required type="email" placeholder="Email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} className="p-2 border rounded" />
                <input required type="password" placeholder="Password" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} className="p-2 border rounded" />
                <div className="flex gap-2">

                  <select required value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} className="p-2 border rounded flex-1">
                    <option value="" disabled>Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">Hire Employee</button>
              </form>
            </>
          )}

          <h4 className="font-bold border-b pb-2 mb-4">Current Members</h4>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {/* Display Admin First */}
            <EmployeeListItem 
              key={roster.adminId} 
              emp={{
                id: roster.adminId,
                name: roster.admin.name,
                email: roster.admin.email,
                status: roster.admin.status,
                role: 'ADMIN',
                department: 'Management'
              }} 
            />
            {roster.employees.map(emp => (
              <EmployeeListItem key={emp.id} emp={emp} onRemove={handleRemoveEmployee} canRemove={user?.id === roster.adminId} />
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
                
                <div className="flex gap-2">
                  <button type="button" onClick={handleSmartAssign} disabled={loadingAI} className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded flex-1 flex justify-center items-center gap-2 disabled:opacity-50">
                    {loadingAI ? 'Analyzing...' : '✨ AI Smart Assign'}
                  </button>
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white p-2 rounded flex-1">Create Task</button>
                </div>

                {aiRecommendation && (
                  <div className="mt-2 text-sm bg-purple-50 text-purple-800 p-3 rounded border border-purple-200">
                    <strong>AI Recommendation:</strong> {aiRecommendation.reason}
                  </div>
                )}
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

const EmployeeListItem = ({ emp, onRemove, canRemove }) => {
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/ai/productivity/${emp.id}`);
      setScoreData(res.data.productivity);
    } catch (err) {
      alert(err.response?.data?.error || "Error generating productivity score.");
    }
    setLoading(false);
  };

  return (
    <div className="p-3 border rounded shadow-sm bg-gray-50 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div>
          <span className="font-bold text-gray-800">{emp.name}</span>
          {emp.status === 'PENDING' && <span className="ml-2 px-2 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded-full font-bold">PENDING</span>}
          <div className="text-xs text-gray-500">
             {emp.role === 'ADMIN' && <span className="font-bold text-blue-600 mr-1">Admin •</span>}
             {emp.department}
          </div>
          <div className="text-xs text-blue-600">{emp.email}</div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          {emp.role !== 'ADMIN' && canRemove && (
             <button onClick={() => onRemove(emp.id)} className="text-[10px] bg-red-100 text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-200 transition-colors">
               Remove
             </button>
          )}
          {emp.role !== 'ADMIN' && !scoreData && (
             <button onClick={handleEvaluate} disabled={loading} className="text-[11px] bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors">
              {loading ? 'Evaluating...' : '✨ Get Productivity'}
            </button>
          )}
          {scoreData && (
            <div className="text-right">
              <div className="font-bold text-purple-800 text-xl">{scoreData.score}/100</div>
            </div>
          )}
        </div>
      </div>
      {scoreData && (
        <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded italic">
          "{scoreData.reason}"
        </div>
      )}
    </div>
  );
};

export default RosterDetail;
