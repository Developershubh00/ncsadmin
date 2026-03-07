import React, { useState, useEffect, useRef } from 'react';
import { User, X } from 'lucide-react';
import * as authService from '../services/authService';
import * as callService from '../services/callService';
import websocketService from '../services/websocketService';
import type { CallRecord, WSEvent } from '../types/types';

interface Call {
  id: string;
  floor: string;
  wing: string;
  bedNumber: string;
  timestamp: Date;
  acknowledged: boolean;
  apiCallId?: number; // Track the backend call ID
}

interface NurseCallLandingProps {
  onLoginSuccess: () => void;
  logoUrl?: string;
}

const NurseCallLanding: React.FC<NurseCallLandingProps> = ({
  onLoginSuccess,
  logoUrl = "/logo.png"
}) => {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [previousCalls, setPreviousCalls] = useState<Call[]>([]);
  const [faultCount, setFaultCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertCall, setAlertCall] = useState<Call | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [logoError, setLogoError] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const alertAudioRef = useRef<HTMLAudioElement>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Connect to WebSocket and load initial data
  useEffect(() => {
    // Load existing calls from API
    callService.listCallEvents()
      .then((calls: CallRecord[]) => {
        setApiConnected(true);
        const mappedCalls: Call[] = calls
          .filter(c => c.status === 'new' || !c.acknowledged_at)
          .map(c => ({
            id: String(c.id),
            floor: `FLOOR ${c.floor_no || '1'}`,
            wing: c.hospital_name || 'A-WING',
            bedNumber: c.room_no,
            timestamp: new Date(c.created_at),
            acknowledged: !!c.acknowledged_at,
            apiCallId: c.id,
          }));

        if (mappedCalls.length > 0) {
          setCurrentCall(mappedCalls[0]);
          setPreviousCalls(mappedCalls.slice(1, 11));
        }
      })
      .catch(() => {
        console.log('[NurseCallLanding] API not available, running in demo mode');
        setApiConnected(false);
      });

    // Subscribe to WebSocket events
    websocketService.connect();
    const unsubscribe = websocketService.subscribe((event: WSEvent) => {
      if (event.event === 'call_created') {
        const newCall: Call = {
          id: String(event.call_id),
          floor: `FLOOR ${event.floor_no}`,
          wing: event.hospital_name || 'A-WING',
          bedNumber: event.room_no,
          timestamp: new Date(event.created_at),
          acknowledged: false,
          apiCallId: event.call_id,
        };

        setCurrentCall(prev => {
          if (prev) {
            setPreviousCalls(prevCalls => {
              const updated = [prev, ...prevCalls];
              return updated.slice(0, 10);
            });
          }
          return newCall;
        });
      } else if (event.event === 'call_acknowledged') {
        // Remove acknowledged call from display
        setCurrentCall(prev => {
          if (prev && String(prev.apiCallId) === String(event.call_id)) {
            return null;
          }
          return prev;
        });
        setPreviousCalls(prev => prev.filter(c => String(c.apiCallId) !== String(event.call_id)));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Demo mode: simulate calls if API is not connected
  useEffect(() => {
    if (apiConnected) return; // Don't simulate if API is working

    const simulateCall = () => {
      const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;
      if (totalCalls >= 11) return;

      const floors = ['1ST FLOOR', '2ND FLOOR', '3RD FLOOR', '4TH FLOOR', '5TH FLOOR'];
      const wings = ['A-WING', 'B-WING', 'C-WING'];
      const bedNumbers = ['101', '102', '103', '201', '202', '301', '302'];

      const newCall: Call = {
        id: Date.now().toString(),
        floor: floors[Math.floor(Math.random() * floors.length)],
        wing: wings[Math.floor(Math.random() * wings.length)],
        bedNumber: bedNumbers[Math.floor(Math.random() * bedNumbers.length)],
        timestamp: new Date(),
        acknowledged: false,
      };

      if (currentCall) {
        setPreviousCalls(prev => {
          const updated = [currentCall, ...prev];
          return updated.slice(0, 10);
        });
      }
      setCurrentCall(newCall);
    };

    const firstCallTimer = setTimeout(simulateCall, 2000);
    const callInterval = setInterval(() => {
      if (Math.random() > 0.3) simulateCall();
    }, Math.random() * 30000 + 30000);

    return () => {
      clearTimeout(firstCallTimer);
      clearInterval(callInterval);
    };
  }, [currentCall, previousCalls, apiConnected]);

  // Calculate call duration
  const getCallDuration = (timestamp: Date): string => {
    try {
      if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
        return '00:00';
      }
      const now = new Date();
      const diffInSeconds = Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 1000));
      const minutes = Math.floor(diffInSeconds / 60);
      const seconds = diffInSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return '00:00';
    }
  };

  const getCurrentCallDuration = (): string => {
    if (!currentCall || !currentCall.timestamp) return '00:00';
    return getCallDuration(currentCall.timestamp);
  };

  // Check for 3-minute alerts
  useEffect(() => {
    const checkAlerts = () => {
      if (currentCall && currentCall.timestamp) {
        const diffInMinutes = (new Date().getTime() - currentCall.timestamp.getTime()) / (1000 * 60);
        if (diffInMinutes >= 3 && (!alertCall || alertCall.id !== currentCall.id)) {
          setAlertCall(currentCall);
          setShowAlert(true);
          if (alertAudioRef.current) {
            alertAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
          }
        }
      }
    };
    checkAlerts();
  }, [currentTime, currentCall, alertCall]);

  // Login handler — uses real API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    try {
      await authService.login({ username, password });
      setShowLogin(false);
      setError('');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Acknowledge handler — uses real API
  const handleAcknowledge = async () => {
    if (currentCall?.apiCallId) {
      try {
        await callService.acknowledgeCall(currentCall.apiCallId);
      } catch (err) {
        console.log('API acknowledge failed, clearing locally:', err);
      }
    }
    setCurrentCall(null);
    setPreviousCalls([]);
    setShowAlert(false);
    setAlertCall(null);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleLogoError = () => { setLogoError(true); };

  const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden audio element for alert sound */}
      <audio ref={alertAudioRef} preload="auto" loop>
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L1tm8gBjqV2vDBeB8ELILNkc5qJQfLntp6qV8RC0SQkY2aw8Xzq3gpBSkBLEHM8tm4pwsYZLfm5LqfOwgpge7yjr1nHQQpgczz25g8CRZkuOvnuZY5CSiC7vOKvWgbBSyByvLZuKQGFWG16Oaygj8IJIDt8oyXRwQpBSt+zPPasjkJGGO25umYQw0pfM/y2/aqCAoYY7Xo6qiUCxSfz/PSgiIFLH3L9t2HPgUrgsr025+CEBVhu+XpuYtJECl+yPDgSgcjdcnz25BSEy1+yfLaJgI" type="audio/wav" />
      </audio>

      {/* API Connection Status */}
      <div className={`text-center text-xs py-1 ${apiConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {apiConnected ? '🟢 Connected to backend' : '🟡 Demo mode — backend not connected'}
      </div>

      {/* Alert Banner */}
      {showAlert && alertCall && (
        <div className="bg-red-600 text-white p-4 text-center font-bold animate-pulse border-b-4 border-red-800">
          <div className="text-lg">
            ⚠️ ALERT: The call from {alertCall.floor}, {alertCall.wing} - BED {alertCall.bedNumber} has not been cancelled for 3 minutes.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-4 border-black">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center">
              {!logoError ? (
                <img
                  src={logoUrl}
                  alt="Hospital Logo"
                  className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1"
                  onError={handleLogoError}
                />
              ) : (
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">🏥</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold">NURSE CALL MONITORING</h1>
          </div>
          <div className="text-xl font-semibold">{getCurrentDate()}</div>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors shadow-lg"
            title="Admin Login"
          >
            <User size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 bg-white">
        {/* Current Call - Large Grid */}
        <div className="mb-6">
          <div className="border-4 border-black bg-white h-40 flex items-center justify-center shadow-lg">
            {currentCall ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-black mb-2">
                  {currentCall.floor}, {currentCall.wing}
                </div>
                <div className="text-xl font-semibold text-gray-700 mb-2">
                  BED {currentCall.bedNumber}
                </div>
                <div className="text-lg font-mono text-red-600 bg-red-50 px-4 py-1 rounded-full inline-block">
                  {getCurrentCallDuration()}
                </div>
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-400">NO ACTIVE CALLS</div>
            )}
          </div>
        </div>

        {/* Previous Calls - Small Grids (2 rows x 5 columns) */}
        <div className="mb-6">
          <div className="grid grid-cols-5 gap-4 mb-4">
            {Array.from({ length: 5 }, (_, index) => {
              const call = previousCalls[index];
              return (
                <div key={`row1-${index}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
                  {call ? (
                    <div className="text-center px-2">
                      <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
                      <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
                      <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {getCallDuration(call.timestamp)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-200"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }, (_, index) => {
              const call = previousCalls[index + 5];
              return (
                <div key={`row2-${index}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
                  {call ? (
                    <div className="text-center px-2">
                      <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
                      <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
                      <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {getCallDuration(call.timestamp)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-200"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Bar */}
        <div className="border-4 border-black bg-white p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex space-x-16">
              <div className="text-center">
                <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
                  {faultCount.toString().padStart(2, '0')}
                </div>
                <div className="text-sm font-semibold mt-2">NO. OF FAULTS</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
                  {totalCalls.toString().padStart(2, '0')}
                </div>
                <div className="text-sm font-semibold mt-2">NO. OF CALLS</div>
              </div>
            </div>
            <button
              onClick={handleAcknowledge}
              className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-full font-bold text-xl transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              disabled={!currentCall && previousCalls.length === 0}
            >
              <div className="w-4 h-4 bg-white rounded-full"></div>
              <span>ACKNOWLEDGE</span>
            </button>
          </div>
        </div>

        {/* Grid Full Warning */}
        {totalCalls >= 11 && (
          <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-4">
            <div className="text-yellow-800 font-semibold">
              ⚠️ All call grids are full. New calls cannot be displayed until acknowledged.
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-2xl border-4 border-gray-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setError('');
                  setUsername('');
                  setPassword('');
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && (
                <div className="mb-4 text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors shadow-lg disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="mt-4 text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
              {apiConnected ? 'Use your registered credentials' : 'Demo: admin / admin'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseCallLanding;