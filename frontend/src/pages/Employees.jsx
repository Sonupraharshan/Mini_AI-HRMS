import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const Employees = () => {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '', skills: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...formData, skills: formData.skills.split(',').map(s => s.trim()) };
      await api.post('/employees', data);
      setFormData({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '', skills: '' });
      fetchEmployees();
    } catch (err) {
      alert('Error creating employee');
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Employee Management</h2>
      


      <div className="bg-white rounded shadow p-6">
        <h3 className="text-xl mb-4 text-gray-700">Employee Roster</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Role</th>
              <th className="p-2">Department</th>
              <th className="p-2">Skills</th>
              <th className="p-2 text-right">AI Evaluation</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <EmployeeRow key={emp.id} emp={emp} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmployeeRow = ({ emp }) => {
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
    <tr className="border-b">
      <td className="p-2 align-top">
        {emp.name}
        {emp.status === 'PENDING' && <span className="ml-2 px-2 py-0.5 text-[10px] bg-yellow-100 text-yellow-800 rounded-full font-bold">PENDING</span>}
        <br/><span className="text-xs text-gray-500">{emp.email}</span>
      </td>
      <td className="p-2 align-top">{emp.role}</td>
      <td className="p-2 align-top">{emp.department}</td>
      <td className="p-2 align-top">{emp.skills?.join(', ')}</td>
      <td className="p-2 text-right align-top">
        {!scoreData && (
           <button onClick={handleEvaluate} disabled={loading} className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 transition-colors">
            {loading ? 'Evaluating...' : '✨ Get Productivity'}
          </button>
        )}
        {scoreData && (
          <div className="text-left bg-purple-50 p-2 rounded border border-purple-100 text-sm max-w-xs ml-auto">
            <div className="font-bold text-purple-800 text-lg mb-1">{scoreData.score}/100</div>
            <div className="text-gray-700 text-xs leading-tight">{scoreData.reason}</div>
          </div>
        )}
      </td>
    </tr>
  );
};

export default Employees;
