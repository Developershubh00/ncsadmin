import React from 'react';
import { X } from 'lucide-react';
import GenderIcon from './GenderIcon';

interface WardTableViewProps {
  wardNumber: string;
  calls: Array<{
    wardNumber: string;
    bedNumber: number;
    patientName: string;
    gender: 'M' | 'F';
    callType: 'TOILET' | 'EMERGENCY' | 'CODE_BLUE';
    timeElapsed: string;
  }>;
  onClose: () => void;
}

const WardTableView: React.FC<WardTableViewProps> = ({ wardNumber, calls, onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Ward {wardNumber} Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close table view"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {calls.map((call, index) => (
                <tr key={index} className={call.callType === 'CODE_BLUE' ? 'animate-pulse bg-blue-50' : 
                  call.callType === 'EMERGENCY' ? 'bg-red-50' : 'bg-white'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {call.bedNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.patientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <GenderIcon 
                        gender={call.gender} 
                        className={`w-5 h-5 ${call.gender === 'F' ? 'text-pink-500' : 'text-blue-500'}`} 
                      />
                      <span className="ml-2">{call.gender === 'M' ? 'Male' : 'Female'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      call.callType === 'TOILET' ? 'bg-blue-100 text-blue-800' :
                      call.callType === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {call.callType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.timeElapsed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No active calls
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WardTableView;