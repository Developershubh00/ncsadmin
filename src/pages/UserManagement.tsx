import React from 'react';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const users = [
    { 
      id: 1, 
      name: 'Dr. Rajiv Sharma', 
      email: 'rajiv.sharma@hospital.org', 
      role: 'Admin', 
      department: 'Cardiology',
      lastActive: '10 minutes ago' 
    },
    { 
      id: 2, 
      name: 'Nurse Priya Patel', 
      email: 'priya.patel@hospital.org', 
      role: 'Nurse Manager', 
      department: 'Emergency',
      lastActive: '2 hours ago' 
    },
    { 
      id: 3, 
      name: 'Dr. Anand Verma', 
      email: 'anand.verma@hospital.org', 
      role: 'Doctor', 
      department: 'Neurology',
      lastActive: '1 day ago' 
    },
    { 
      id: 4, 
      name: 'Nurse Meera Singh', 
      email: 'meera.singh@hospital.org', 
      role: 'Nurse', 
      department: 'Pediatrics',
      lastActive: '3 hours ago' 
    },
    { 
      id: 5, 
      name: 'Admin Vikram Mehta', 
      email: 'vikram.mehta@hospital.org', 
      role: 'System Admin', 
      department: 'IT',
      lastActive: '30 minutes ago' 
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600">Manage admin users and permissions</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <UserPlus size={18} className="mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.lastActive}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit size={18} />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
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

export default UserManagement;