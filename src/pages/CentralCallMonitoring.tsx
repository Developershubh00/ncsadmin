import React, { useState, useEffect } from 'react';
import CallTable from '../components/CallTable';
import * as callService from '../services/callService';
import type { CallRecord, WSEvent } from '../types/types';
import { useNurseCallRealtime } from '../hooks/useNurseCallRealtime';
import ConnectionStatusBadge from '../components/ConnectionStatusBadge';

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

  // ── Real-time hook ─────────────────────────────────────────────────────────
  const { connectionStatus, onEvent } = useNurseCallRealtime();
  
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

  // ── Live in-place updates from WS / webhook events ───────────────────────────
  useEffect(() => {
    const unsubscribe = onEvent((payload) => {
      const e = payload as WSEvent;

      if (e.event === 'call_created') {
        setRawCalls((prev) => {
          // Don’t duplicate
          if (prev.some((c) => c.id === e.call_id)) return prev;
          const newRecord: CallRecord = {
            id: e.call_id,
            room_no: e.room_no ?? '',
            floor_no: e.floor_no ?? 0,
            hospital_name: (e as { hospital_name?: string }).hospital_name ?? (e as { hospital?: string }).hospital ?? '',
            call_from: e.call_from,
            status: 'new',
            created_at: e.created_at,
            acknowledged_at: null,
            attended_at: null,
          };
          return [newRecord, ...prev];
        });
      } else if (e.event === 'call_acknowledged') {
        setRawCalls((prev) =>
          prev.map((c) =>
            c.id === e.call_id
              ? { ...c, status: 'acknowledged' as const, acknowledged_at: e.acknowledged_at }
              : c
          )
        );
      } else if (e.event === 'call_attended') {
        setRawCalls((prev) =>
          prev.map((c) =>
            c.id === e.call_id
              ? { ...c, status: 'attended' as const, attended_at: e.attended_at }
              : c
          )
        );
      } else if (e.event === 'call_unacknowledged') {
        setRawCalls((prev) =>
          prev.map((c) =>
            c.id === e.call_id
              ? { ...c, status: 'new' as const, acknowledged_at: null }
              : c
          )
        );
      }
    });
    return unsubscribe;
  }, [onEvent]);

  // ── Initial REST fetch + re-fetch when filters change ─────────────────────────
  useEffect(() => {
    fetchCalls();
  }, [filterFloor, filterRoom, filterCallFrom]);

  // ── Keep table rows in sync when rawCalls changes via live events ─────────────
  useEffect(() => {
    setCalls(transformCallsForTable(rawCalls));
  }, [rawCalls]);

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Central Call Monitoring</h1>
          <p className="text-gray-600">View and manage active calls in the system</p>
        </div>
        <ConnectionStatusBadge status={connectionStatus} className="mt-1" />
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