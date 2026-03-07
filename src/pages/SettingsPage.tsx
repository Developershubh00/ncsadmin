import React from 'react';
import { Bell, Clock, Shield, Database, Save } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Configure system settings and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <Bell size={20} className="text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Notifications & Alerts</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Enable sound alerts for new calls</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Enable desktop notifications</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Escalation Threshold
              </label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="3">3 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <Clock size={20} className="text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Response Time Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard Response Time Goal
              </label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="2">2 minutes</option>
                <option value="3">3 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Response Time Goal
              </label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="1">1 minute</option>
                <option value="2">2 minutes</option>
                <option value="3">3 minutes</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <Shield size={20} className="text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Security Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout
              </label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Require two-factor authentication for admin users</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Log all user actions</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="p-5">
          <div className="flex items-center mb-4">
            <Database size={20} className="text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-800">Data Management</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Retention Period
              </label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">6 months</option>
                <option value="365">1 year</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Enable automatic data backup</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Frequency
              </label>
              <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3">
          Cancel
        </button>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <Save size={18} className="mr-2" />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;