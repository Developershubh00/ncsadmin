import React from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';

const SystemLogs: React.FC = () => {
  const logs = [
    { 
      id: 1, 
      action: 'User Login', 
      user: 'Dr. Rajiv Sharma', 
      timestamp: '2025-04-15 10:15:23', 
      details: 'Successful login from 192.168.1.105' 
    },
    { 
      id: 2, 
      action: 'Call Acknowledged', 
      user: 'Nurse Priya Patel', 
      timestamp: '2025-04-15 10:20:45', 
      details: 'Call from Room 202B acknowledged' 
    },
    { 
      id: 3, 
      action: 'System Configuration', 
      user: 'Admin Vikram Mehta', 
      timestamp: '2025-04-15 10:30:12', 
      details: 'Alert threshold updated from 5 min to 3 min' 
    },
    { 
      id: 4, 
      action: 'Emergency Alert', 
      user: 'System', 
      timestamp: '2025-04-15 10:45:33', 
      details: 'Emergency alert triggered for Room 101A' 
    },
    { 
      id: 5, 
      action: 'User Added', 
      user: 'Admin Vikram Mehta', 
      timestamp: '2025-04-15 11:05:18', 
      details: 'New user "Nurse Meera Singh" added to the system' 
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Logs</h1>
        <p className="text-gray-600">View audit logs and system activity</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search logs..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Actions</option>
              <option value="login">User Login</option>
              <option value="call">Call Actions</option>
              <option value="config">System Configuration</option>
              <option value="emergency">Emergency Alerts</option>
            </select>
          </div>
          <div>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div>
            <button
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter size={18} className="mr-2" />
              Advanced Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.action}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{log.timestamp}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 flex items-center justify-between">
                      {log.details}
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;