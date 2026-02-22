import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  const links = [{ name: 'Dashboard', path: '/dashboard' }];
  if (user.role === 'ADMIN') {
    links.push({ name: 'Rosters', path: '/rosters' });
    links.push({ name: 'Settings', path: '/settings' });
  } else {
    links.push({ name: 'Employees', path: '/employees' });
  }
  links.push({ name: 'Tasks', path: '/tasks' });

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-lg">
      <h1 className="text-xl font-bold  bg-clip-text text-blue-400">Mini AI-HRMS</h1>
      <div className="flex gap-6">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`transition-colors ${location.pathname === link.path ? 'text-blue-400 border-b-2 border-blue-400' : 'hover:text-gray-300'}`}
          >
            {link.name}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{user.name} ({user.role})</span>
        <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
