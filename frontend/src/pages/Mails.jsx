import React, { useState, useEffect, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const Mails = () => {
  const { user } = useContext(AuthContext);
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendForm, setSendForm] = useState({
    subject: '',
    body: '',
    targetType: 'ORGANIZATION', // 'ORGANIZATION', 'ROSTER', 'INDIVIDUALS'
    targetId: '',
    targetIds: []
  });
  const [rosters, setRosters] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchMails();
      fetchRosters();
      fetchEmployees();
    }
  }, [user]);

  const fetchMails = async () => {
    try {
      const res = await api.get('/mails/logs');
      setMails(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRosters = async () => {
    try {
      const res = await api.get('/rosters');
      setRosters(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/mails/send', sendForm);
      alert(res.data.message);
      setSendForm({ subject: '', body: '', targetType: 'ORGANIZATION', targetId: '', targetIds: [] });
      fetchMails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send mail');
    }
    setLoading(false);
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-red-500">Access Denied. Admins Only.</div>;
  }

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Send Mail Form */}
      <div className="bg-white p-6 rounded shadow border-t-4 border-blue-500 h-fit">
        <h2 className="text-2xl font-bold mb-6">Send Custom Mail</h2>
        <form onSubmit={handleSendMail} className="grid gap-4">
          <input 
            required 
            type="text" 
            placeholder="Subject" 
            value={sendForm.subject} 
            onChange={e => setSendForm({...sendForm, subject: e.target.value})} 
            className="p-2 border rounded" 
          />
          <textarea 
            required 
            placeholder="Mail Body..." 
            rows="5"
            value={sendForm.body} 
            onChange={e => setSendForm({...sendForm, body: e.target.value})} 
            className="p-2 border rounded" 
          />
          
          <div className="flex gap-4">
            <select 
              value={sendForm.targetType} 
              onChange={e => setSendForm({...sendForm, targetType: e.target.value, targetId: '', targetIds: []})} 
              className="p-2 border rounded flex-1"
            >
              <option value="ORGANIZATION">Entire Organization</option>
              <option value="ROSTER">Specific Roster</option>
              <option value="INDIVIDUALS">Specific Individuals</option>
            </select>
            
            {sendForm.targetType === 'ROSTER' && (
              <select 
                required 
                value={sendForm.targetId} 
                onChange={e => setSendForm({...sendForm, targetId: e.target.value})} 
                className="p-2 border rounded flex-1"
              >
                <option value="" disabled>Select Target Roster</option>
                {rosters.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}

            {sendForm.targetType === 'INDIVIDUALS' && (
              <select 
                required 
                multiple
                value={sendForm.targetIds || []} 
                onChange={e => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setSendForm({...sendForm, targetIds: selected});
                }} 
                className="p-2 border rounded flex-1 h-32"
              >
                <option value="" disabled>Select (Hold Ctrl)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full disabled:opacity-50"
          >
            {loading ? 'Dispatching Mails...' : 'Send Mail'}
          </button>
        </form>
      </div>

      {/* Mail Logs */}
      <div className="bg-white p-6 rounded shadow border-t-4 border-purple-500">
        <h2 className="text-2xl font-bold mb-6">Mail Logs</h2>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {mails.length === 0 ? <p className="text-gray-400 italic">No emails logged yet.</p> : mails.map(m => (
            <div key={m.id} className="p-4 border rounded shadow-sm bg-gray-50 flex flex-col gap-2 relative">
               <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded bg-gray-200">
                 {m.type}
               </div>
               {m.senderId === user.id ? (
                   <div className="text-sm text-gray-500">To: <span className="font-semibold">{m.recipientEmail}</span></div>
               ) : (
                   <div className="text-sm text-gray-500 text-blue-600">From: <span className="font-semibold">{m.sender?.name || m.sender?.email || 'System'}</span></div>
               )}
               <div className="font-bold text-gray-800">{m.subject}</div>
               <div className="text-sm text-gray-700 whitespace-pre-line mt-2">{m.body}</div>
               <div className="text-xs text-gray-400 mt-2">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Mails;
