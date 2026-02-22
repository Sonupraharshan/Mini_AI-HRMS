import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { WorkforceLoggerABI } from '../abis';
import { ethers } from 'ethers';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', assigneeId: '', complexityScore: 1 });
  const [wallet, setWallet] = useState(user?.walletAddress || null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (user?.walletAddress && !wallet) {
      setWallet(user.walletAddress);
    }
  }, [user]);

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

  const connectWallet = async () => {
    if (wallet) {
      const change = window.confirm(`A wallet is already connected: ${wallet}\n\nDo you want to change it and connect a new one?`);
      if (!change) return;
      
      if (window.ethereum) {
        try {
          // Force MetaMask to ask for explicit account selection again
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (err) {
          console.error("User cancelled permission request", err);
          return; // Stop if they hit cancel
        }
      }
    }

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const selectedWallet = accounts[0];
        setWallet(selectedWallet);
        
        // Persist to database so admins can see it on the dashboard
        await api.put('/employees/wallet', { walletAddress: selectedWallet });
        
        // Update local context so it feels snappy
        if (user) {
          user.walletAddress = selectedWallet;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (err) { console.error(err); alert("Failed to connect wallet or save to database"); }
    } else {
      alert("Please install MetaMask!");
    }
  };

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
      if (status === 'COMPLETED' && wallet) {
        if (!window.ethereum) {
          alert("MetaMask is required to log completions on-chain.");
          return;
        }
        console.log("Submitting transaction to local Hardhat node...");
        
        // Ethers v6 usage
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const contract = new ethers.Contract(contractAddress, WorkforceLoggerABI, signer);
        
        // Use a generated dummy hash for the task completion proof
        const taskHashProof = "0x" + Math.random().toString(16).slice(2) + "deadbeef";
        
        const tx = await contract.logTaskCompletion(task.id, taskHashProof);
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        
        txHash = receipt.hash;
        console.log("Transaction confirmed:", receipt.hash);
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
            <button onClick={connectWallet} className={`px-4 py-2 rounded font-bold ${wallet ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} text-white`}>
              {wallet ? `Connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Connect MetaMask'}
            </button>
            {wallet && (
              <button onClick={connectWallet} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded font-semibold border">
                Change
              </button>
            )}
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
