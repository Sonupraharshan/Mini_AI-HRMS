import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { WorkforceLoggerABI } from '../abis';
import { useAccount, useWriteContract } from 'wagmi';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', assigneeId: '', complexityScore: 1 });
  const [wallet, setWallet] = useState(user?.walletAddress || null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const { address: wagmiAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    // Sync the wallet address from Wagmi to our state and database
    if (isConnected && wagmiAddress && wagmiAddress !== wallet) {
      setWallet(wagmiAddress);
      
      // Update database and local storage in background
      api.put('/employees/wallet', { walletAddress: wagmiAddress }).catch(console.error);
      if (user) {
        user.walletAddress = wagmiAddress;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } else if (!isConnected && wallet) {
      // Handle disconnect
      setWallet(null);
    }
  }, [isConnected, wagmiAddress, wallet, user]);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchTasks();
    if (user?.role === 'ADMIN') fetchEmployees();
  }, [user]);

  // connectWallet function is no longer needed, AppKit handles it natively!

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', { ...formData, complexityScore: parseInt(formData.complexityScore) });
      setFormData({ title: '', description: '', assigneeId: '', complexityScore: 1 });
      setAiRecommendation(null);
      fetchTasks();
    } catch (err) { alert('Error creating task'); }
  };

  const handleSmartAssign = async () => {
    if (!formData.title || !formData.description) {
      alert("Please provide a title and description first for the AI to analyze.");
      return;
    }
    setLoadingAI(true);
    setAiRecommendation(null);
    try {
      const res = await api.post('/ai/smart-assign-draft', { title: formData.title, description: formData.description, complexityScore: formData.complexityScore });
      setAiRecommendation(res.data.recommendation);
      if (res.data.recommendation?.recommendedEmployeeId) {
        setFormData(prev => ({ ...prev, assigneeId: res.data.recommendation.recommendedEmployeeId }));
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "AI assignment failed.");
    }
    setLoadingAI(false);
  };

  const updateStatus = async (task, status) => {
    try {
      let txHash = null;
      if (status === 'COMPLETED') {
        if (!isConnected) {
          alert("Please connect your wallet using the button first.");
          return;
        }
        console.log("Submitting transaction securely via Wagmi...");
        
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const taskHashProof = "0x" + Math.random().toString(16).slice(2) + "deadbeef";
        
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: WorkforceLoggerABI,
          functionName: 'logTaskCompletion',
          args: [task.id, taskHashProof]
        });
        
        txHash = hash;
        console.log("Transaction successfully submitted:", hash);
      }
      
      await api.put(`/tasks/${task.id}/status`, { status, txHash });
      fetchTasks();
    } catch (err) { console.error(err); alert('Error updating status: ' + err.message); }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Task Board</h2>
        {user?.role === 'EMPLOYEE' && (
          <div className="flex items-center gap-2">
            <appkit-button />
          </div>
        )}
      </div>



      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kanban Columns */}
        {['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map(status => (
          <div key={status} className="bg-gray-100 p-4 rounded h-[600px] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-600 border-b pb-2">{status.replace('_', ' ')}</h3>
            {tasks.filter(t => t.status === status).map(task => (
              <div key={task.id} className="bg-white p-4 mb-4 rounded shadow border-l-4 border-blue-500">
                <h4 className="font-bold">{task.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                {task.txHash && <p className="text-xs text-green-600 mt-2 break-all">Tx: {task.txHash}</p>}
                <div className="mt-4 flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-xs text-gray-500">{task.assignee?.name || 'Unassigned'}</span>
                  {user?.role === 'EMPLOYEE' && status !== 'COMPLETED' && (
                    <button 
                      onClick={() => updateStatus(task, status === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED')}
                      className="text-white text-xs px-3 py-1.5 rounded font-semibold bg-green-500 hover:bg-green-600 transition-colors"
                    >
                      {status === 'ASSIGNED' ? 'START' : 'COMPLETE'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
