import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Phone, 
  Users, 
  Activity, 
  Settings,
  Plus,
  Trash2,
  Edit,
  Power,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Call {
  id: string;
  bedCode?: string;
  wardNo?: string;
  patientName?: string;
  callTime: string;
  status?: 'unacknowledged' | 'acknowledged' | 'attended' | 'active';
  callType?: 'normal' | 'emergency' | 'toilet' | 'code_blue';
  // API fields
  ward: string;
  room?: string;
  type?: string;
  isActive?: boolean;
  apiCallId?: number;
  date?: string;
  cancelTime?: string;
  responseTime?: string;
  duration?: number;
}

interface AdminDashboardProps {
  onClose: () => void;
  onTriggerCodeBlue: (roomNumber: string) => void;
  calls: Call[];
  onUpdateCalls: (calls: Call[]) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, 
  onTriggerCodeBlue, 
  calls, 
  onUpdateCalls 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [codeBlueRoom, setCodeBlueRoom] = useState('');
  const [systemStatus, setSystemStatus] = useState({
    totalPanels: 24,
    onlinePanels: 22,
    offlinePanels: 2,
    soundEnabled: true,
    autoResponse: true
  });


  const handleDeleteCall = (id: string) => {
    onUpdateCalls(calls.filter(call => call.id !== id));
  };

  const handleUpdateCallStatus = (id: string, status: Call['status']) => {
    onUpdateCalls(calls.map(call => 
      call.id === id ? { ...call, status } : call
    ));
  };

  const handleTriggerCodeBlue = () => {
    if (codeBlueRoom) {
      onTriggerCodeBlue(codeBlueRoom);
      setCodeBlueRoom('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unacknowledged': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'attended': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCallTypeColor = (callType: string) => {
    switch (callType) {
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      case 'CODE_BLUE': return 'bg-blue-900 text-white';
      case 'TOILET': return 'bg-red-100 text-red-800 animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCallTypeLabel = (callType: string) => {
    switch (callType) {
      case 'CODE_BLUE': return 'CODE BLUE';
      case 'EMERGENCY': return 'EMERGENCY';
      case 'TOILET': return 'TOILET';
      default: return callType;
    }
  };

  const calculateDuration = (callTime: string) => {
    const now = new Date();
    const callDate = new Date();
    const [time, period] = callTime.split(' ');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    let adjustedHours = hours;
    if (period === 'PM' && hours !== 12) adjustedHours += 12;
    if (period === 'AM' && hours === 12) adjustedHours = 0;
    
    callDate.setHours(adjustedHours, minutes, seconds || 0, 0);
    
    const diffMs = now.getTime() - callDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${diffHours}h ${mins}m`;
  };
  const stats = {
    totalCalls: calls.length,
    activeCalls: calls.filter(c => c.status !== 'attended').length,
    emergencyCalls: calls.filter(c => c.callType === 'EMERGENCY' || c.callType === 'CODE_BLUE').length,
    responseTime: '3.2 min'
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-300">Nurse Call System Management</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-100 border-b">
        <div className="flex space-x-1 p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'calls', label: 'Call Management', icon: Phone },
            { id: 'emergency', label: 'Emergency Controls', icon: AlertTriangle },
            { id: 'system', label: 'System Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
                  </div>
                  <Phone className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeCalls}</p>
                  </div>
                  <Activity className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Emergency Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.emergencyCalls}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.responseTime}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{systemStatus.onlinePanels}</p>
                  <p className="text-sm text-gray-600">Online Panels</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{systemStatus.offlinePanels}</p>
                  <p className="text-sm text-gray-600">Offline Panels</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{systemStatus.totalPanels}</p>
                  <p className="text-sm text-gray-600">Total Panels</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call Management Tab */}
        {activeTab === 'calls' && (
          <div className="space-y-6">

            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Active Calls</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bed Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      {calls.some(call => call.status === 'acknowledged') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calls.map(call => (
                      <tr key={call.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{call.bedCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{call.wardNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{call.patientName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getCallTypeColor(call.callType)}`}>
                            {getCallTypeLabel(call.callType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{call.callTime}</td>
                        {calls.some(c => c.status === 'acknowledged') && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {call.status === 'acknowledged' ? calculateDuration(call.callTime) : '-'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(call.status)}`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <select
                              value={call.status}
                              onChange={(e) => handleUpdateCallStatus(call.id, e.target.value as Call['status'])}
                              className="text-xs px-2 py-1 border rounded"
                            >
                              <option value="unacknowledged">Unacknowledged</option>
                              <option value="acknowledged">Acknowledged</option>
                              <option value="active">Active</option>
                              <option value="attended">Attended</option>
                            </select>
                            <button
                              onClick={() => handleDeleteCall(call.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Controls Tab */}
        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                <AlertTriangle className="mr-2" />
                Code Blue Alert System
              </h3>
              <p className="text-red-700 mb-4">
                Trigger a Code Blue emergency alert for testing or actual emergencies.
              </p>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Room Number (e.g., 1554)"
                  value={codeBlueRoom}
                  onChange={(e) => setCodeBlueRoom(e.target.value)}
                  className="px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 flex-1"
                />
                <button
                  onClick={handleTriggerCodeBlue}
                  disabled={!codeBlueRoom}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <AlertTriangle size={18} className="mr-2" />
                  Trigger Code Blue
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h4 className="font-semibold mb-4">Quick Actions</h4>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                    Test All Alarms
                  </button>
                  <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                    Emergency Broadcast
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    System Lockdown
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h4 className="font-semibold mb-4">Emergency Contacts</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Security:</span>
                    <span className="font-mono">ext. 911</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medical Emergency:</span>
                    <span className="font-mono">ext. 999</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IT Support:</span>
                    <span className="font-mono">ext. 123</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maintenance:</span>
                    <span className="font-mono">ext. 456</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Audio Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sound Alerts</p>
                    <p className="text-sm text-gray-600">Enable/disable audio notifications</p>
                  </div>
                  <button
                    onClick={() => setSystemStatus({...systemStatus, soundEnabled: !systemStatus.soundEnabled})}
                    className={`p-2 rounded-lg ${systemStatus.soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {systemStatus.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Response</p>
                    <p className="text-sm text-gray-600">Automatically acknowledge calls after timeout</p>
                  </div>
                  <button
                    onClick={() => setSystemStatus({...systemStatus, autoResponse: !systemStatus.autoResponse})}
                    className={`px-4 py-2 rounded-lg ${systemStatus.autoResponse ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {systemStatus.autoResponse ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">System Version:</p>
                  <p className="font-mono">v2.1.4</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Update:</p>
                  <p className="font-mono">2024-01-15</p>
                </div>
                <div>
                  <p className="text-gray-600">Uptime:</p>
                  <p className="font-mono">15 days, 4 hours</p>
                </div>
                <div>
                  <p className="text-gray-600">Database Status:</p>
                  <p className="text-green-600 font-semibold">Connected</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;