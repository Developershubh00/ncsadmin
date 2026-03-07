import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle, Heart, Stethoscope, Pin, ArrowLeft, RefreshCw } from 'lucide-react';
import * as callService from '../services/callService';
import type { CallRecord } from '../services/callService';

interface FloorPanelStatusProps {
  onFloorSelect?: (floorNumber: number) => void;
}

const FloorPanelStatus: React.FC<FloorPanelStatusProps> = ({ onFloorSelect }) => {
  const [pinnedCards, setPinnedCards] = useState<Set<string | number>>(new Set());
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [floorCalls, setFloorCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all calls to calculate statistics
  const [allCalls, setAllCalls] = useState<CallRecord[]>([]);

  // Fetch all calls on component mount
  useEffect(() => {
    fetchAllCalls();
  }, []);

  // Fetch all calls from API
  const fetchAllCalls = async () => {
    try {
      const data = await callService.listCallEvents({});
      setAllCalls(data);
      console.log('✅ All calls fetched:', data.length, 'calls');
    } catch (err) {
      console.error('❌ Error fetching calls:', err);
    }
  };

  // Fetch calls for a specific floor
  const fetchCallsForFloor = async (floorNumber: number) => {
    try {
      setLoading(true);
      setError('');
      const data = await callService.listCallEvents({ floor_no: floorNumber });
      setFloorCalls(data);
      setSelectedFloor(floorNumber);
      console.log('✅ Floor', floorNumber, 'calls fetched:', data.length, 'calls');
    } catch (err) {
      console.error('❌ Error fetching floor calls:', err);
      setError('Unable to load calls for this floor');
      setFloorCalls([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics for wings and special units
  const wings = Array.from({ length: 6 }, (_, i) => {
    const floorNumber = i + 1;
    const floorCalls = allCalls.filter(call => call.floor_no === floorNumber);
    
    const activeCalls = floorCalls.length;
    const emergencyCalls = floorCalls.filter(call => 
      call.status === 'new' // New/unacknowledged calls are considered emergencies
    ).length;

    return {
      id: floorNumber,
      name: `Floor ${floorNumber}`,
      activeCalls,
      emergencyCalls,
      icon: Building2,
    };
  });

  // Add ICU and NSCU with counts from API
  const specialUnits = [
    {
      id: 'ICU',
      name: 'ICU',
      activeCalls: allCalls.filter(c => c.floor_no === 7).length, // If ICU returns floor_no=7
      emergencyCalls: allCalls.filter(c => c.floor_no === 7 && c.status === 'new').length,
      icon: Heart,
    },
    {
      id: 'NSCU',
      name: 'NSCU',
      activeCalls: allCalls.filter(c => c.floor_no === 8).length, // If NSCU returns floor_no=8
      emergencyCalls: allCalls.filter(c => c.floor_no === 8 && c.status === 'new').length,
      icon: Stethoscope,
    },
  ];

  const allUnits = [...wings, ...specialUnits];

  // Sort units to show pinned cards first
  const sortedUnits = [...allUnits].sort((a, b) => {
    const aIsPinned = pinnedCards.has(a.id);
    const bIsPinned = pinnedCards.has(b.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return 0;
  });

  const handlePinClick = (e: React.MouseEvent, unitId: string | number) => {
    e.stopPropagation();
    setPinnedCards(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(unitId)) {
        newPinned.delete(unitId);
      } else {
        newPinned.add(unitId);
      }
      return newPinned;
    });
  };

  const handleFloorSelect = (floorNumber: number) => {
    if (typeof floorNumber === 'number' && floorNumber > 0) {
      fetchCallsForFloor(floorNumber);
      onFloorSelect?.(floorNumber);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hospital Floor Status</h1>
        <p className="text-gray-600">Monitor the status of all floors and active calls</p>
      </div>

      {/* Floor Cards View */}
      {selectedFloor === null ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {sortedUnits.map((unit) => {
              const Icon = unit.icon;
              const isPinned = pinnedCards.has(unit.id);
              return (
                <div 
                  key={unit.id} 
                  className={`bg-white rounded-lg shadow-sm p-5 border ${isPinned ? 'border-blue-300' : 'border-gray-100'} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => handleFloorSelect(typeof unit.id === 'number' ? unit.id : 0)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Icon size={24} className="text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-800">{unit.name}</h3>
                    </div>
                    <button
                      onClick={(e) => handlePinClick(e, unit.id)}
                      className={`p-2 rounded-full transition-colors ${
                        isPinned ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <Pin size={20} className={isPinned ? 'rotate-45' : ''} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Active Calls</p>
                      <p className="text-2xl font-semibold text-blue-700">{unit.activeCalls}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Unacknowledged</p>
                      <div className="flex items-center">
                        <p className="text-2xl font-semibold text-red-700">{unit.emergencyCalls}</p>
                        {unit.emergencyCalls > 0 && (
                          <AlertCircle size={20} className="text-red-600 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View Detailed Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Floor Detail View with Calls */
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedFloor(null)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back to Floors
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Floor {selectedFloor} - Active Calls</h2>
                <p className="text-gray-600">Real-time call data</p>
              </div>
            </div>
            <button
              onClick={() => fetchCallsForFloor(selectedFloor)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-100">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading calls...</span>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Floor
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hospital
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acknowledged At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attended At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {floorCalls.map((call) => (
                      <tr key={call.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{call.room_no}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Floor {call.floor_no}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{call.hospital_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            call.status === 'attended' ? 'bg-green-100 text-green-800' :
                            call.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(call.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {call.acknowledged_at ? new Date(call.acknowledged_at).toLocaleString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {call.attended_at ? new Date(call.attended_at).toLocaleString() : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {floorCalls.length === 0 && !loading && (
                  <div className="px-6 py-12 text-center text-gray-500">
                    No active calls on Floor {selectedFloor}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FloorPanelStatus;