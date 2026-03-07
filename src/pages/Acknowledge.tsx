import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import * as callService from '../services/callService';
import websocketService from '../services/websocketService';
import type { CallRecord } from '../types/types';

const Acknowledge: React.FC = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Filter state
  const [filterFloor, setFilterFloor] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [filterCallFrom, setFilterCallFrom] = useState<string>('');

  // Get unique values from calls for filter dropdowns
  const getUniqueCallFromValues = (callList: CallRecord[]): string[] => {
    const values = callList
      .map(c => c.call_from)
      .filter((v): v is string => v !== null && v !== undefined && v !== '');
    return [...new Set(values)].sort();
  };

  const getUniqueFloors = (callList: CallRecord[]): number[] => {
    const values = callList.map(c => c.floor_no).filter(v => v !== null && v !== undefined);
    return [...new Set(values)].sort((a, b) => a - b);
  };

  const getUniqueRooms = (callList: CallRecord[]): string[] => {
    const values = callList
      .map(c => c.room_no)
      .filter((v): v is string => v !== null && v !== undefined);
    return [...new Set(values)].sort();
  };

  // Apply filters to calls
  const getFilteredCalls = (): CallRecord[] => {
    return calls.filter(call => {
      if (filterFloor && call.floor_no !== parseInt(filterFloor)) return false;
      if (filterRoom && call.room_no !== filterRoom) return false;
      if (filterCallFrom && call.call_from !== filterCallFrom) return false;
      return true;
    });
  };

  // Fetch calls from API
  const fetchCalls = async () => {
    try {
      const data = await callService.listCallEvents();
      setCalls(data);
      setError('');
      console.log('✅ Calls fetched:', data.length, 'calls');
    } catch (err: any) {
      console.error('❌ API error:', err.message);
      setError('Unable to load calls. Please ensure the API is accessible.');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    
    // Subscribe to WebSocket for real-time updates
    websocketService.connect();
    const unsubscribe = websocketService.subscribe((event) => {
      console.log('📡 WebSocket event:', event.event);
      
      if (event.event === 'call_created') {
        console.log('📱 New call created');
        fetchCalls();
      } else if (event.event === 'call_acknowledged') {
        console.log('👍 Call acknowledged:', (event as any).call_id);
        // Update locally first for instant UI update
        setCalls(prev => prev.map(c => 
          c.id === (event as any).call_id 
            ? { ...c, status: 'acknowledged', acknowledged_at: (event as any).acknowledged_at || new Date().toISOString() }
            : c
        ));
        // Then fetch fresh data from API
        setTimeout(() => fetchCalls(), 500);
      } else if (event.event === 'call_attended') {
        console.log('✅ Call attended:', (event as any).call_id);
        // Update locally first
        setCalls(prev => prev.map(c => 
          c.id === (event as any).call_id 
            ? { ...c, status: 'attended', attended_at: (event as any).attended_at || new Date().toISOString() }
            : c
        ));
        // Then fetch fresh data
        setTimeout(() => fetchCalls(), 500);
      }
    });
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCalls, 30000);
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleAcknowledge = async (callId: number) => {
    setActionLoading(callId);
    try {
      console.log('🔄 Acknowledging call:', callId);
      await callService.acknowledgeCall(callId);
      console.log('✅ Call acknowledged successfully');
      // Fetch fresh data immediately
      await fetchCalls();
    } catch (err) {
      console.error('❌ Acknowledge failed:', err);
      // Update locally as fallback
      setCalls(prev => prev.map(c =>
        c.id === callId ? { ...c, status: 'acknowledged' as const, acknowledged_at: new Date().toISOString() } : c
      ));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAttend = async (callId: number) => {
    setActionLoading(callId);
    try {
      console.log('🔄 Attending call:', callId);
      await callService.attendCall(callId);
      console.log('✅ Call attended successfully');
      // Fetch fresh data immediately
      await fetchCalls();
    } catch (err) {
      console.error('❌ Attend failed:', err);
      // Update locally as fallback  
      setCalls(prev => prev.map(c =>
        c.id === callId ? { ...c, status: 'attended' as const, attended_at: new Date().toISOString() } : c
      ));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchCalls();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Unacknowledged</span>;
      case 'acknowledged':
        return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Acknowledged</span>;
      case 'attended':
        return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Attended</span>;
      default:
        return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calculateResponseTime = (createdAt: string, acknowledgedAt: string | null) => {
    if (!acknowledgedAt) return '-';
    const created = new Date(createdAt).getTime();
    const acknowledged = new Date(acknowledgedAt).getTime();
    const diffSeconds = Math.floor((acknowledged - created) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Calculate status from timestamps (since backend may not update status field)
  const getCallStatus = (call: CallRecord): string => {
    if (call.attended_at) return 'attended';
    if (call.acknowledged_at) return 'acknowledged';
    return call.status || 'new';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading calls...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Call Management</h1>
          <p className="text-gray-600">View, acknowledge, and attend nurse calls</p>
        </div>
        <button
          onClick={handleRefresh}
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

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label htmlFor="filter-call-from" className="block text-sm font-medium text-gray-700 mb-1">
              Call Type
            </label>
            <select
              id="filter-call-from"
              value={filterCallFrom}
              onChange={(e) => setFilterCallFrom(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Types</option>
              {getUniqueCallFromValues(calls).map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
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
              className="block w-full px-3 py-2 rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Floors</option>
              {getUniqueFloors(calls).map((floor) => (
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
            <select
              id="filter-room"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Rooms</option>
              {getUniqueRooms(calls).map((room) => (
                <option key={room} value={room}>
                  Room {room}
                </option>
              ))}
            </select>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call From</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ack Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attend Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredCalls().map((call) => {
                const callStatus = getCallStatus(call);
                return (
                <tr key={`call-${call.id}`} className={callStatus === 'new' ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{call.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">Room {call.room_no}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Floor {call.floor_no}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">{call.call_from || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatTime(call.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatTime(call.acknowledged_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatTime(call.attended_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {calculateResponseTime(call.created_at, call.acknowledged_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(callStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      {(callStatus === 'new' || !call.acknowledged_at) && (
                        <button
                          onClick={() => handleAcknowledge(call.id)}
                          disabled={actionLoading === call.id}
                          className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {actionLoading === call.id ? '...' : 'Ack'}
                        </button>
                      )}
                      {callStatus === 'acknowledged' && !call.attended_at && (
                        <button
                          onClick={() => handleAttend(call.id)}
                          disabled={actionLoading === call.id}
                          className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          {actionLoading === call.id ? '...' : 'Attend'}
                        </button>
                      )}
                      {callStatus === 'attended' && (
                        <span className="text-green-600 text-xs flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> Completed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })}
              {getFilteredCalls().length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    {calls.length === 0 ? 'No calls found' : 'No calls match the selected filters'}
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

export default Acknowledge;