import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Call {
  id: string;
  bedCode: string;
  wardNo: string;
  callTime: string;
  status: 'unacknowledged' | 'acknowledged' | 'attended';
}

interface CallTableProps {
  calls: Call[];
  onAcknowledge: (id: string) => void;
  onMarkAttended: (id: string) => void;
  onEscalate: (id: string) => void;
}

const CallTable: React.FC<CallTableProps> = ({ 
  calls, 
  onAcknowledge, 
  onMarkAttended, 
  onEscalate 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unacknowledged':
        return 'bg-red-100 text-red-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'attended':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unacknowledged':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'acknowledged':
        return <Clock size={16} className="text-yellow-600" />;
      case 'attended':
        return <CheckCircle size={16} className="text-green-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'unacknowledged':
        return 'Unacknowledged';
      case 'acknowledged':
        return 'Acknowledged';
      case 'attended':
        return 'Attended';
      default:
        return status;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bed Code
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ward No.
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Call Time
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {calls.map((call) => (
            <tr key={call.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{call.bedCode}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{call.wardNo}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{call.callTime}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(call.status)}`}>
                  <span className="flex items-center">
                    {getStatusIcon(call.status)}
                    <span className="ml-1">{getStatusText(call.status)}</span>
                  </span>
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {call.status === 'unacknowledged' && (
                  <button
                    onClick={() => onAcknowledge(call.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Acknowledge
                  </button>
                )}
                {call.status !== 'attended' && (
                  <button
                    onClick={() => onMarkAttended(call.id)}
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    Mark as Attended
                  </button>
                )}
                <button
                  onClick={() => onEscalate(call.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Escalate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CallTable;