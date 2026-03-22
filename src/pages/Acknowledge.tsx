import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import * as callService from '../services/callService';
import { hydrateStore, processWSEvent } from '../services/nurseCallStore';
import { useNurseCallRealtime } from '../hooks/useNurseCallRealtime';
import type { CallRecord } from '../types/types';

// ─── Connection status badge ──────────────────────────────────────────────────

const ConnectionBadge: React.FC<{ status: ReturnType<typeof useNurseCallRealtime>['connectionStatus'] }> = ({ status }) => {
  const config = {
    connected:    { icon: Wifi,         bg: 'bg-green-100',  text: 'text-green-700',  label: 'Live' },
    connecting:   { icon: Wifi,         bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Connecting…' },
    reconnecting: { icon: AlertTriangle, bg: 'bg-orange-100', text: 'text-orange-700', label: 'Reconnecting…' },
    disconnected: { icon: WifiOff,      bg: 'bg-red-100',    text: 'text-red-700',    label: 'Disconnected' },
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const Acknowledge: React.FC = () => {
  // Real-time calls from the shared store (hydrated by the hook's initial fetch + WS events)
  const { calls, loading, error: realtimeError, connectionStatus, onEvent } = useNurseCallRealtime();

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [manualError, setManualError] = useState('');
  const [reconnectToast, setReconnectToast] = useState<string | null>(null);
  const reconnectToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [filterFloor, setFilterFloor] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [filterCallFrom, setFilterCallFrom] = useState<string>('');

  // Combined error to display
  const error = manualError || realtimeError;

  // ── Connection status toasts ────────────────────────────────────────────────
  const prevStatusRef = useRef(connectionStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = connectionStatus;

    if (prev === 'reconnecting' && connectionStatus === 'connected') {
      setReconnectToast('Real-time connection restored.');
      if (reconnectToastTimer.current) clearTimeout(reconnectToastTimer.current);
      reconnectToastTimer.current = setTimeout(() => setReconnectToast(null), 4000);
    } else if (connectionStatus === 'disconnected') {
      setReconnectToast('Real-time connection lost. Please refresh the page.');
    }
  }, [connectionStatus]);

  useEffect(() => {
    return () => { if (reconnectToastTimer.current) clearTimeout(reconnectToastTimer.current); };
  }, []);

  // ── Register onEvent listener for optional toast/sound hooks ───────────────
  useEffect(() => {
    const unsub = onEvent((event) => {
      if ('event' in event && event.event === 'call_unacknowledged') {
        // Optionally trigger an alert sound / toast here
        console.warn('[Acknowledge] call_unacknowledged alert for call_id', event.call_id);
      }
    });
    return unsub;
  }, [onEvent]);

  // ── Filter helpers ──────────────────────────────────────────────────────────

  const getUniqueCallFromValues = (callList: CallRecord[]): string[] => {
    const values = callList.map(c => c.call_from).filter((v): v is string => !!v);
    return [...new Set(values)].sort();
  };

  const getUniqueFloors = (callList: CallRecord[]): number[] => {
    const values = callList.map(c => c.floor_no).filter(v => v != null);
    return [...new Set(values)].sort((a, b) => a - b);
  };

  const getUniqueRooms = (callList: CallRecord[]): string[] => {
    const values = callList.map(c => c.room_no).filter((v): v is string => !!v);
    return [...new Set(values)].sort();
  };

  const getFilteredCalls = (): CallRecord[] => {
    return calls.filter(call => {
      if (filterFloor && call.floor_no !== parseInt(filterFloor)) return false;
      if (filterRoom && call.room_no !== filterRoom) return false;
      if (filterCallFrom && call.call_from !== filterCallFrom) return false;
      return true;
    });
  };

  // ── Manual refresh – re-hydrates the store from REST API ───────────────────
  const handleRefresh = async () => {
    try {
      setManualError('');
      const data = await callService.listCallEvents();
      hydrateStore(data);
      console.log('✅ Calls refreshed:', data.length, 'calls');
    } catch (err: unknown) {
      console.error('❌ Refresh error:', err instanceof Error ? err.message : err);
      setManualError('Unable to refresh calls. Please ensure the API is accessible.');
    }
  };

  // ── REST action handlers (unchanged) ───────────────────────────────────────

  const handleAcknowledge = async (callId: number, bedNo: string) => {
    setActionLoading(callId);
    setManualError('');
    try {
      console.log('🔄 Acknowledging call:', bedNo, '(id:', callId, ')');
      const result = await callService.acknowledgeCall(bedNo);
      console.log('✅ Call acknowledged successfully');
      // Optimistic update so the row reflects immediately
      processWSEvent({
        event: 'call_acknowledged',
        call_id: callId,
        room_no: bedNo,
        acknowledged_at: result.acknowledged_at ?? new Date().toISOString(),
      });
      // Then sync store from server
      const data = await callService.listCallEvents();
      hydrateStore(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Acknowledge failed. Please try again.';
      console.error('❌ Acknowledge failed:', err);
      setManualError(`Acknowledge failed: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAttend = async (callId: number, bedNo: string) => {
    setActionLoading(callId);
    setManualError('');
    try {
      console.log('🔄 Attending call:', bedNo, '(id:', callId, ')');
      const result = await callService.attendCall(bedNo);
      console.log('✅ Call attended successfully');
      // Optimistic update so the row reflects immediately
      processWSEvent({
        event: 'call_attended',
        call_id: callId,
        room_no: bedNo,
        attended_at: result.attended_at ?? new Date().toISOString(),
      });
      // Then sync store from server
      const data = await callService.listCallEvents();
      hydrateStore(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Attend failed. Please try again.';
      console.error('❌ Attend failed:', err);
      setManualError(`Attend failed: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Utilities ───────────────────────────────────────────────────────────────

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
    if (!acknowledgedAt || !createdAt) return '-';
    const diffSeconds = Math.floor((new Date(acknowledgedAt).getTime() - new Date(createdAt).getTime()) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Derive status from timestamps (backend may not always update the status field)
  const getCallStatus = (call: CallRecord): string => {
    if (call.attended_at) return 'attended';
    if (call.acknowledged_at) return 'acknowledged';
    return call.status || 'new';
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading calls…</span>
      </div>
    );
  }

  const filteredCalls = getFilteredCalls();

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Call Management</h1>
          <p className="text-gray-600">View, acknowledge, and attend nurse calls</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={connectionStatus} />
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Reconnect toast ── */}
      {reconnectToast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border flex items-center gap-2 ${
          connectionStatus === 'connected'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-orange-50 border-orange-200 text-orange-700'
        }`}>
          {connectionStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
          {reconnectToast}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Filters ── */}
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
                onClick={() => { setFilterFloor(''); setFilterRoom(''); setFilterCallFrom(''); }}
                className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
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
              {filteredCalls.map((call) => {
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
                        {(callStatus === 'new' || !call.acknowledged_at) && !call.attended_at && (
                          <button
                            onClick={() => handleAcknowledge(call.id, call.bed_no || call.room_no)}
                            disabled={actionLoading === call.id}
                            className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {actionLoading === call.id ? '…' : 'Ack'}
                          </button>
                        )}
                        {callStatus === 'acknowledged' && !call.attended_at && (
                          <button
                            onClick={() => handleAttend(call.id, call.bed_no || call.room_no)}
                            disabled={actionLoading === call.id}
                            className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            {actionLoading === call.id ? '…' : 'Attend'}
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
              {filteredCalls.length === 0 && (
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
