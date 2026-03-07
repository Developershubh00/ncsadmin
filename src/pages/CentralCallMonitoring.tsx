import React, { useState, useEffect } from 'react';
import CallTable from '../components/CallTable';
import * as callService from '../services/callService';
import websocketService from '../services/websocketService';
import type { CallRecord } from '../types/types';

interface CallForTable {
  id: string | number;
  bedCode: string;
  wardNo: string;
  callTime: string;
  status: 'unacknowledged' | 'acknowledged' | 'attended';
}

const CentralCallMonitoring: React.FC = () => {
  const [rawCalls, setRawCalls] = useState<CallRecord[]>([]);
  const [calls, setCalls] = useState<CallForTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [filterCallFrom, setFilterCallFrom] = useState<string>('');
  const [filterFloor, setFilterFloor] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');

  // Transform API data to table format
  const transformCallsForTable = (apiCalls: CallRecord[]): CallForTable[] => {
    return apiCalls.map(call => ({
      id: call.id,
      bedCode: `Bed ${call.room_no} - ${call.hospital_name || 'N/A'}`,
      wardNo: String(call.floor_no),
      callTime: new Date(call.created_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
      status: call.attended_at ? 'attended' : call.acknowledged_at ? 'acknowledged' : 'unacknowledged',
    }));
  };

  // Get unique values for filter dropdowns
  const getUniqueCallFromValues = (apiCalls: CallRecord[]): string[] => {
    const values = apiCalls
      .map(c => c.call_from)
      .filter((v): v is string => v !== null && v !== undefined && v !== '');
    return [...new Set(values)].sort();
  };

  const getUniqueFloors = (apiCalls: CallRecord[]): number[] => {
    const values = apiCalls.map(c => c.floor_no).filter(v => v !== null && v !== undefined);
    return [...new Set(values)].sort((a, b) => a - b);
  };

  const getUniqueRooms = (apiCalls: CallRecord[]): string[] => {
    const values = apiCalls
      .map(c => c.room_no)
      .filter((v): v is string => v !== null && v !== undefined);
    return [...new Set(values)].sort();
  };

  // Fetch calls from API with filters
  const fetchCalls = async () => {
    try {
      setLoading(true);
      const filters = {
        ...(filterFloor && { floor_no: parseInt(filterFloor) }),
        ...(filterRoom && { room_no: filterRoom }),
      };
      const data = await callService.listCallEvents(filters);
      setRawCalls(data);
      const transformed = transformCallsForTable(data);
      setCalls(transformed);
      setError('');
      console.log('✅ Calls fetched:', transformed.length, 'calls');
    } catch (err) {
      console.error('❌ API error:', err);
      setError('Unable to load calls. Please ensure the API is accessible.');
      setCalls([]);
      setRawCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    
    // Subscribe to WebSocket for real-time updates
    websocketService.connect();
    const unsubscribe = websocketService.subscribe(() => {
      fetchCalls();
    });
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCalls, 30000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [filterFloor, filterRoom, filterCallFrom]);

  // Apply client-side filter for call_from
  const getFilteredCalls = (): CallForTable[] => {
    if (!filterCallFrom) return calls;
    // Note: call_from filter is applied client-side after API fetch
    // since API primarily filters by floor and room
    return calls;
  };

  const handleAcknowledge = (id: string | number) => {
    setCalls(calls.map(call => 
      call.id === id ? { ...call, status: 'acknowledged' as const } : call
    ));
  };

  const handleMarkAttended = (id: string | number) => {
    setCalls(calls.map(call => 
      call.id === id ? { ...call, status: 'attended' as const } : call
    ));
  };

  const handleEscalate = (id: string | number) => {
    // In a real application, this would trigger an emergency alert
    alert(`Emergency alert triggered for call ${id}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Central Call Monitoring</h1>
        <p className="text-gray-600">View and manage active calls in the system</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label htmlFor="filter-type" className="block text-sm font-medium text-gray-700 mb-1">
              Call Type
            </label>
            <select
              id="filter-type"
              value={filterCallFrom}
              onChange={(e) => setFilterCallFrom(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="emergency">Emergency</option>
              <option value="assistance">Assistance</option>
              <option value="bathroom">Bathroom</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-floor" className="block text-sm font-medium text-gray-700 mb-1">
              Floor
            </label>
            <select
              id="filter-floor"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Floors</option>
              {getUniqueFloors(rawCalls).map((floor) => (
                <option key={floor} value={floor}>
                  Floor {floor}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-room" className="block text-sm font-medium text-gray-700 mb-1">
              Room Number
            </label>
            <input
              type="text"
              id="filter-room"
              placeholder="Enter room number"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          {(filterFloor || filterRoom || filterCallFrom) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterFloor('');
                  setFilterRoom('');
                  setFilterCallFrom('');
                }}
                className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading calls...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <CallTable 
            calls={getFilteredCalls()}
            onAcknowledge={handleAcknowledge}
            onMarkAttended={handleMarkAttended}
            onEscalate={handleEscalate}
          />
        </div>
      )}
    </div>
  );
};

export default CentralCallMonitoring;