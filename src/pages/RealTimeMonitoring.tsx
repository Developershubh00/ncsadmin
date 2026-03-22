import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Lock } from 'lucide-react';
import AdminAuth from '../components/AdminAuth';
import AdminDashboard from '../components/AdminDashboard';
import ConnectionStatusBadge from '../components/ConnectionStatusBadge';
import { listCallEvents } from '../services/callService';
import { useNurseCallRealtime } from '../hooks/useNurseCallRealtime';
import type { CallRecord, WSEvent } from '../types/types';

interface Call {
  id: string;
  ward: string;
  room: string;
  type: 'Normal' | 'Toilet' | 'Emergency' | 'Code Blue';
  date: string;
  callTime: string;
  cancelTime?: string;
  responseTime?: string;
  isActive: boolean;
  duration?: number;
  bedCode?: string;
  wardNo?: string;
  patientName?: string;
  callType?: 'normal' | 'emergency' | 'toilet' | 'code_blue';
  status?: 'unacknowledged' | 'acknowledged' | 'attended' | 'active';
  roomPosition?: { row: number; col: number };
  apiCallId?: number; // Track backend call ID
}

interface Ward {
  id: string;
  name: string;
  isDown: boolean;
  activeCall?: {
    room: string;
    duration: number;
    type: string;
  };
}

const RealTimeMonitoring: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calls, setCalls] = useState<Call[]>([]);
  const [callIdCounter, setCallIdCounter] = useState(1);
  const [showCodeBlueAlert, setShowCodeBlueAlert] = useState(false);
  const [currentCodeBlueBed, setCurrentCodeBlueBed] = useState('Bed A15 CC - 4th Floor');
  const [codeBlueCount, setCodeBlueCount] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading] = useState(true);

  // Admin dashboard states
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isReportsAuthenticated, setIsReportsAuthenticated] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ✅ REAL API INTEGRATION: Fetches calls from GET /api/calls/events/
  // Transforms flat call list into ward/floor grouping for display
  // Subscribes to WebSocket for real-time call updates
  
  const fetchCallsFromAPI = async () => {
    try {
      const apiCalls = await listCallEvents();
      
      // Transform API calls to display format
      const displayCalls: Call[] = apiCalls.map((call: CallRecord) => {
        // Map API status to UI status
        const uiStatus = call.status === 'new' ? 'unacknowledged' : 
                        call.status === 'acknowledged' ? 'acknowledged' : 
                        call.status === 'attended' ? 'attended' : 'unacknowledged';
        
        return {
          id: call.id.toString(),
          apiCallId: call.id,
          ward: call.hospital_name || 'Unknown',
          room: call.room_no?.toString() || 'Unknown',
          type: uiStatus === 'acknowledged' ? 'Emergency' : 'Normal' as 'Normal' | 'Emergency',
          date: new Date(call.created_at).toLocaleDateString('en-GB'),
          callTime: new Date(call.created_at).toLocaleTimeString('en-US', { hour12: false }),
          cancelTime: call.attended_at ? new Date(call.attended_at).toLocaleTimeString('en-US', { hour12: false }) : undefined,
          responseTime: call.acknowledged_at 
            ? `${Math.floor((new Date(call.acknowledged_at).getTime() - new Date(call.created_at).getTime()) / 60000).toString().padStart(2, '0')}:${Math.floor(((new Date(call.acknowledged_at).getTime() - new Date(call.created_at).getTime()) % 60000) / 1000).toString().padStart(2, '0')}`
            : undefined,
          isActive: uiStatus === 'unacknowledged' || uiStatus === 'acknowledged',
          duration: call.acknowledged_at 
            ? Math.floor((new Date(call.acknowledged_at).getTime() - new Date(call.created_at).getTime()) / 1000)
            : 0,
          status: uiStatus,
        };
      });
      
      setCalls(displayCalls);
      setApiConnected(true);
    } catch (error) {
      console.error('Failed to fetch calls from API:', error);
      setApiConnected(false);
    }
  };

  // Fetch corridors/floors from API
  const fetchFloorsFromAPI = async () => {
    try {
      const response = await fetch('https://ncs.dotdevz.com/api/corridors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch corridors: ${response.status}`);
      }
      
      const corridorData = await response.json();
      
      // Transform corridor data to Ward format
      const floorsFromAPI: Ward[] = (corridorData.results || corridorData).map((corridor: any) => ({
        id: corridor.id?.toString() || corridor.floor_no?.toString(),
        name: corridor.name || `Floor ${corridor.floor_no}`,
        isDown: false,
        activeCall: undefined,
      }));
      
      setWards(floorsFromAPI);
    } catch (error) {
      console.error('Failed to fetch corridors from API:', error);
      // Keep default wards if API fails
    }
  };

  const [wards, setWards] = useState<Ward[]>(() => {
    // Simplified ward structure - populated from API calls data
    return [
      { id: '1', name: 'Floor 1', isDown: false, activeCall: undefined },
      { id: '2', name: 'Floor 2', isDown: false, activeCall: undefined },
      { id: '3', name: 'Floor 3', isDown: false, activeCall: undefined },
      { id: '4', name: 'Floor 4', isDown: false, activeCall: undefined },
      { id: '5', name: 'Floor 5', isDown: false, activeCall: undefined },
    ];
  });

  const [codeBlueAlert, setCodeBlueAlert] = useState<{ room: string; ward: string } | null>(null);

  // ── Real-time hook ─────────────────────────────────────────────────────────
  const { connectionStatus, onEvent } = useNurseCallRealtime();

  // Fetch calls from API on mount and subscribe to real-time events
  useEffect(() => {
    // Fetch both floors and calls on mount
    fetchFloorsFromAPI();
    fetchCallsFromAPI();

    // Subscribe to real-time events via the hook
    const unsubscribe = onEvent((payload) => {
      const event = payload as WSEvent;
      if (event.event === 'call_created') {
        const newCall: Call = {
          id: (event as WSEvent & { call_id?: number }).call_id?.toString() || Math.random().toString(),
          apiCallId: (event as WSEvent & { call_id?: number }).call_id,
          ward: (event as WSEvent & { hospital_name?: string }).hospital_name || 'Unknown',
          room: (event as WSEvent & { room_no?: string }).room_no?.toString() || 'Unknown',
          type: 'Normal',
          date: new Date((event as WSEvent & { created_at?: string }).created_at || '').toLocaleDateString('en-GB'),
          callTime: new Date((event as WSEvent & { created_at?: string }).created_at || '').toLocaleTimeString('en-US', { hour12: false }),
          isActive: true,
          status: 'unacknowledged',
        };
        setCalls((prevCalls) => [newCall, ...prevCalls]);
      } else if (event.event === 'call_acknowledged') {
        setCalls((prevCalls) =>
          prevCalls.map((call) =>
            call.apiCallId === event.call_id
              ? {
                  ...call,
                  status: 'acknowledged' as const,
                  responseTime: `${Math.floor(((event as WSEvent & { response_time_seconds?: number }).response_time_seconds || 0) / 60).toString().padStart(2, '0')}:${(((event as WSEvent & { response_time_seconds?: number }).response_time_seconds || 0) % 60).toString().padStart(2, '0')}`,
                }
              : call
          )
        );
      } else if (event.event === 'call_attended') {
        setCalls((prevCalls) =>
          prevCalls.map((call) =>
            call.apiCallId === event.call_id
              ? {
                  ...call,
                  isActive: false,
                  status: 'attended' as const,
                  cancelTime: new Date(event.attended_at).toLocaleTimeString('en-US', { hour12: false }),
                }
              : call
          )
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onEvent]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for admin route
  useEffect(() => {
    const checkAdminRoute = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        setShowAdminAuth(true);
      }
    };
    
    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    
    return () => window.removeEventListener('hashchange', checkAdminRoute);
  }, []);

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContext) {
        const AudioContextConstructor = window.AudioContext || (window as Record<string, any>).webkitAudioContext;
        const ctx = new AudioContextConstructor();
        setAudioContext(ctx);
      }
    };
    
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioContext]);

  // API Status indicator
  useEffect(() => {
    // Just a display hook - API connectivity is handled in fetchCallsFromAPI
  }, [apiConnected]);

  const createSirenSound = () => {
    if (audioContext && !isPlaying) {
      setIsPlaying(true);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

      const modulationFreq = 2;
      const modulationDepth = 400;

      for (let i = 0; i < 50; i++) {
        const time = audioContext.currentTime + i * 0.1;
        const freq = 800 + Math.sin(time * modulationFreq * 2 * Math.PI) * modulationDepth;
        oscillator.frequency.setValueAtTime(freq, time);
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 5);
    }
  };

  const stopAlarmSound = () => {
    setIsPlaying(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getCallTypeColor = (type: string) => {
    switch (type) {
      case "Code Blue":
        return "bg-red-100 text-red-800";
      case "Emergency":
        return "bg-orange-100 text-orange-800";
      case "Toilet":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const handlePasswordSubmit = () => {
    if (password === "admin123") {
      setIsReportsAuthenticated(true);
      setPassword("");
    } else {
      alert("Incorrect password!");
      setPassword("");
    }
  };

  const handleAdminAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAdminAuth(false);
    setShowAdminDashboard(true);
  };

  const handleCloseAdmin = () => {
    setShowAdminAuth(false);
    setShowAdminDashboard(false);
    setIsAuthenticated(false);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleTriggerCodeBlueFromAdmin = (roomNumber: string) => {
    setCurrentCodeBlueBed(`Room ${roomNumber}`);
    setShowCodeBlueAlert(true);
    createSirenSound();
  };

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Nurse Call System Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>Nurse Call System Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  <th>WARD</th>
                  <th>ROOM</th>
                  <th>TYPE</th>
                  <th>DATE</th>
                  <th>CALL Time</th>
                  <th>CANCEL/ACK Time</th>
                  <th>RESP Time</th>
                </tr>
              </thead>
              <tbody>
                ${calls
                  .filter((call) => !call.isActive)
                  .map(
                    (call) => `
                  <tr>
                    <td>${call.ward}</td>
                    <td>${call.room}</td>
                    <td>${call.type}</td>
                    <td>${call.date}</td>
                    <td>${call.callTime}</td>
                    <td>${call.cancelTime || "-"}</td>
                    <td>${call.responseTime || "-"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Real-Time Monitoring </h1>
            </div>
            <div className="flex items-center gap-6">
              <ConnectionStatusBadge status={connectionStatus} />
              <div className="text-lg font-mono text-gray-700">{formatTime(currentTime)}</div>
              
            </div>
          </div>
        </div>

        {/* Code Blue Alert - Full Screen Overlay */}
        {(showCodeBlueAlert || codeBlueAlert) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900 animate-pulse">
            <div className="text-center text-white">
              <div className="text-8xl font-bold mb-8 animate-bounce">CODE BLUE</div>
              <div className="text-4xl font-semibold mb-4">
                ROOM: {codeBlueAlert?.room || currentCodeBlueBed.split(' - ')[0]}
              </div>
              <div className="text-3xl font-medium">
                {codeBlueAlert?.ward || currentCodeBlueBed.split(' - ')[1]}
              </div>
              <div className="mt-8 text-xl opacity-75">Emergency Response Required</div>
              <div className="mt-4 text-sm opacity-60">🚨 SIREN ALERT ACTIVE 🚨</div>
              <button
                onClick={() => {
                  setShowCodeBlueAlert(false);
                  setCodeBlueAlert(null);
                  stopAlarmSound();
                }}
                className="mt-8 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-xl font-semibold transition-colors"
              >
                ACKNOWLEDGE ALERT
              </button>
            </div>
          </div>
        )}

        {/* Ward Grid - Scrollable */}
        <div className="h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-20">
            {wards.map((ward) => (
              <div key={ward.id} className={`relative border rounded-lg ${ward.isDown ? "border-red-500 border-2" : "border-gray-200"}`}>
                <div className="pb-2">
                  <div
                    className={`text-sm font-medium text-center py-2 px-3 rounded-t-lg text-white ${
                      ward.isDown ? "bg-red-600" : "bg-teal-600"
                    }`}
                  >
                    {ward.name}
                  </div>
                </div>
                <div
                  className={`h-32 flex items-center justify-center rounded-b-lg ${
                    ward.isDown ? "bg-red-100" : "bg-gray-100"
                  }`}
                >
                  {ward.isDown ? (
                    <div className="text-center">
                      <div className="text-red-600 font-bold text-lg">PANEL DOWN</div>
                      <div className="text-red-500 text-sm">System Offline</div>
                    </div>
                  ) : ward.activeCall ? (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{ward.activeCall.room}</div>
                      <div className="text-lg text-gray-600">
                        {Math.floor(ward.activeCall.duration / 60)}:
                        {(ward.activeCall.duration % 60).toString().padStart(2, "0")}
                      </div>
                      <div className={`text-xs mt-1 px-2 py-1 rounded-full ${getCallTypeColor(ward.activeCall.type)}`}>
                        {ward.activeCall.type}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No Active Calls</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports Button - Fixed Position */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setShowReportsDialog(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            REPORTS
          </button>
        </div>

        {/* Reports Dialog */}
        {showReportsDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg p-6 ${isReportsAuthenticated ? "max-w-6xl max-h-[80vh] overflow-y-auto" : "max-w-md"} w-full mx-4`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {!isReportsAuthenticated ? (
                    <>
                      <Lock className="w-5 h-5" />
                      Enter Password
                    </>
                  ) : (
                    "Call Reports"
                  )}
                </h3>
                <button
                  onClick={() => {
                    setShowReportsDialog(false);
                    setIsReportsAuthenticated(false);
                    setPassword("");
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {!isReportsAuthenticated ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
                      placeholder="Enter password to access reports"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordSubmit}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                      Access Reports
                    </button>
                    <button
                      onClick={() => setShowReportsDialog(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">WARD</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">ROOM</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">TYPE</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">DATE</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">CALL Time</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">CANCEL/ACK Time</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">RESP Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calls
                          .filter((call) => !call.isActive)
                          .map((call) => (
                            <tr key={call.id}>
                              <td className="border border-gray-300 px-4 py-2">{call.ward}</td>
                              <td className="border border-gray-300 px-4 py-2">{call.room}</td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getCallTypeColor(call.type)}`}
                                >
                                  {call.type}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2">{call.date}</td>
                              <td className="border border-gray-300 px-4 py-2">{call.callTime}</td>
                              <td className="border border-gray-300 px-4 py-2">{call.cancelTime || "-"}</td>
                              <td className="border border-gray-300 px-4 py-2">{call.responseTime || "-"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-600">
                      Total No of Records: {calls.filter((call) => !call.isActive).length} | Median Response Time: 00:16
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Generate Report
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Mean / Median
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export to PDF
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Authentication Modal */}
      {showAdminAuth && (
        <AdminAuth
          onAuthenticated={handleAdminAuthenticated}
          onClose={handleCloseAdmin}
        />
      )}

      {/* Admin Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard
          onClose={handleCloseAdmin}
          onTriggerCodeBlue={handleTriggerCodeBlueFromAdmin}
          calls={calls}
          onUpdateCalls={setCalls}
        />
      )}
    </>
  );
};

export default RealTimeMonitoring;