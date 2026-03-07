import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import * as callService from '../services/callService';
import type { CallRecord } from '../services/callService';

interface WardViewProps {
  floorNumber: number;
  onClose: () => void;
}

const WardView: React.FC<WardViewProps> = ({ floorNumber, onClose }) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch calls for the floor on component mount
  useEffect(() => {
    fetchFloorCalls();
  }, [floorNumber]);

  // Fetch calls from API for the given floor
  const fetchFloorCalls = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await callService.listCallEvents({ floor_no: floorNumber });
      setCalls(data);
      console.log('✅ Floor', floorNumber, 'ward view - fetched:', data.length, 'calls');
    } catch (err) {
      console.error('❌ Error fetching floor calls:', err);
      setError('Unable to load calls for this floor');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate elapsed time from created_at
  const getTimeElapsed = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return `${Math.floor(diffSecs / 3600)}h ago`;
  };

  // Group calls by room number
  const roomsMap = new Map<string, CallRecord[]>();
  calls.forEach(call => {
    const room = call.room_no;
    if (!roomsMap.has(room)) {
      roomsMap.set(room, []);
    }
    roomsMap.get(room)!.push(call);
  });

  // Convert to sorted array
  const rooms = Array.from(roomsMap.entries())
    .sort(([a], [b]) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return aNum - bNum;
    });

  // Determine status color
  const getStatusColor = (status: CallRecord['status']) => {
    switch (status) {
      case 'attended':
        return 'bg-green-100 text-green-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'new':
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  // Determine room card color based on status
  const getRoomCardColor = (roomCalls: CallRecord[]) => {
    const hasNew = roomCalls.some(c => c.status === 'new');
    const hasAcknowledged = roomCalls.some(c => c.status === 'acknowledged');
    
    if (hasNew) return 'border-red-200 bg-red-50';
    if (hasAcknowledged) return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Floor {floorNumber} - Ward View</h1>
            <p className="text-gray-600">Real-time active calls by room</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchFloorCalls}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close ward view"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading ward data...</span>
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(([roomNumber, roomCalls]) => (
              <div 
                key={roomNumber} 
                className={`bg-white rounded-xl shadow-sm border ${getRoomCardColor(roomCalls)} overflow-hidden transition-all duration-200 hover:shadow-md`}
              >
                <div className={`px-4 py-3 border-b flex justify-between items-center ${getRoomCardColor(roomCalls).split(' ')[1]}`}>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Room {roomNumber}</h3>
                    <p className="text-sm text-gray-600">
                      {roomCalls.length} {roomCalls.length === 1 ? 'Call' : 'Calls'}
                    </p>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    {roomCalls.map((call) => (
                      <div 
                        key={call.id}
                        className="p-4 rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">Call ID: {call.id}</p>
                            <p className="text-xs text-gray-500">{call.hospital_name || 'Hospital'}</p>
                          </div>
                          <span className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${getStatusColor(call.status)}`}>
                            {call.status}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium text-gray-900">{new Date(call.created_at).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Elapsed:</span>
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                              <Clock size={14} />
                              {getTimeElapsed(call.created_at)}
                            </span>
                          </div>
                          {call.acknowledged_at && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Acknowledged:</span>
                              <span className="font-medium text-gray-900">{new Date(call.acknowledged_at).toLocaleTimeString()}</span>
                            </div>
                          )}
                          {call.attended_at && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Attended:</span>
                              <span className="font-medium text-gray-900">{new Date(call.attended_at).toLocaleTimeString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">No active calls on Floor {floorNumber}</p>
            <p className="text-sm text-gray-500 mt-2">Calls will appear here as they are registered</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WardView;