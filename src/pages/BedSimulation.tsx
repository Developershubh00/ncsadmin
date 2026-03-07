// pages/BedSimulation.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Bed,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  Settings,
  Monitor,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';
import * as callService from '../services/callService';

interface CallEvent {
  id: string;
  type: 'Normal' | 'Toilet' | 'Emergency' | 'Code Blue';
  timestamp: Date;
  duration: number;
  status: 'active' | 'acknowledged' | 'completed' | 'cancelled';
  responseTime?: number;
  apiCallId?: number; // Track backend call ID
}

interface BedStatus {
  bedNumber: string;
  ward: string;
  patientName: string;
  isOccupied: boolean;
  batteryLevel: number;
  signalStrength: number;
  isOnline: boolean;
  lastMaintenance: Date;
}

const BedSimulation: React.FC = () => {
  const [currentCall, setCurrentCall] = useState<CallEvent | null>(null);
  const [callHistory, setCallHistory] = useState<CallEvent[]>([]);
  const [callIdCounter, setCallIdCounter] = useState(1);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [bedStatus, setBedStatus] = useState<BedStatus>({
    bedNumber: 'A-1205',
    ward: '12th Floor A-Wing',
    patientName: 'John Smith',
    isOccupied: true,
    batteryLevel: 85,
    signalStrength: 4,
    isOnline: true,
    lastMaintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoModeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (autoModeTimerRef.current) clearTimeout(autoModeTimerRef.current);
    };
  }, []);

  // Auto mode simulation
  useEffect(() => {
    if (autoMode && !currentCall) {
      const randomDelay = Math.random() * 15000 + 5000; // 5-20 seconds
      autoModeTimerRef.current = setTimeout(() => {
        const callTypes: ('Normal' | 'Toilet' | 'Emergency')[] = ['Normal', 'Toilet', 'Emergency'];
        const randomType = callTypes[Math.floor(Math.random() * callTypes.length)];
        handleCallButtonPress(randomType);
      }, randomDelay);
    }

    return () => {
      if (autoModeTimerRef.current) clearTimeout(autoModeTimerRef.current);
    };
  }, [autoMode, currentCall]);

  // Update call duration
  useEffect(() => {
    if (currentCall && currentCall.status === 'active') {
      callTimerRef.current = setInterval(() => {
        setCurrentCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : null);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [currentCall?.status]);

  // Simulate system status changes
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setBedStatus(prev => ({
        ...prev,
        batteryLevel: Math.max(20, prev.batteryLevel - Math.random() * 2),
        signalStrength: Math.floor(Math.random() * 5) + 1,
        isOnline: Math.random() > 0.05 // 95% uptime
      }));
    }, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  const playCallSound = (type: string) => {
    if (!soundEnabled || !audioRef.current) return;

    // Create different tones for different call types
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'Normal':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case 'Toilet':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.setValueAtTime(600, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          osc2.start();
          osc2.stop(audioContext.currentTime + 0.3);
        }, 400);
        break;
      case 'Emergency':
        // Rapid beeping
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(1000, audioContext.currentTime);
            gain.gain.setValueAtTime(0.4, audioContext.currentTime);
            osc.start();
            osc.stop(audioContext.currentTime + 0.2);
          }, i * 300);
        }
        break;
      case 'Code Blue':
        // Continuous siren
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        for (let i = 0; i < 20; i++) {
          const time = audioContext.currentTime + i * 0.1;
          const freq = 800 + Math.sin(time * 4 * Math.PI) * 200;
          oscillator.frequency.setValueAtTime(freq, time);
        }
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 2);
        break;
    }
  };

  const handleCallButtonPress = async (type: 'Normal' | 'Toilet' | 'Emergency' | 'Code Blue') => {
    if (currentCall && currentCall.status === 'active') {
      alert('A call is already active. Please wait for it to be resolved.');
      return;
    }

    // Call real API to create a nurse call
    try {
      // Convert bed number to room_id (simple mapping for demo)
      const room_id = parseInt(bedStatus.bedNumber.split('-')[1]) || 101;
      const result = await callService.createCall({ room_id });
      
      const newCall: CallEvent = {
        id: result.id.toString(),
        type,
        timestamp: new Date(result.created_at),
        duration: 0,
        status: 'active',
        apiCallId: result.id
      };

      setCurrentCall(newCall);
      playCallSound(type);

      // Simulate automatic acknowledgment for Code Blue (immediate response)
      if (type === 'Code Blue') {
        setTimeout(() => {
          handleAcknowledge();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to create call:', err);
      alert('Failed to create call. Please ensure the API is accessible.');
    }
  };

  const handleAcknowledge = async () => {
    if (currentCall?.apiCallId) {
      try {
        await callService.acknowledgeCall(currentCall.apiCallId);
        const acknowledgedCall = {
          ...currentCall,
          status: 'acknowledged' as const,
          responseTime: currentCall.duration
        };
        setCurrentCall(acknowledgedCall);

        // Auto-complete after acknowledgment (simulate nurse arrival)
        setTimeout(() => {
          handleComplete();
        }, Math.random() * 10000 + 5000); // 5-15 seconds
      } catch (err) {
        console.error('Failed to acknowledge call:', err);
        // Continue locally as fallback
        const acknowledgedCall = {
          ...currentCall,
          status: 'acknowledged' as const,
          responseTime: currentCall.duration
        };
        setCurrentCall(acknowledgedCall);
      }
    }
  };

  const handleComplete = async () => {
    if (currentCall?.apiCallId) {
      try {
        await callService.attendCall(currentCall.apiCallId);
        const completedCall = {
          ...currentCall,
          status: 'completed' as const
        };

        setCallHistory(prev => [completedCall, ...prev.slice(0, 9)]); // Keep last 10 calls
        setCurrentCall(null);
      } catch (err) {
        console.error('Failed to attend call:', err);
        // Continue locally as fallback
        const completedCall = {
          ...currentCall,
          status: 'completed' as const
        };

        setCallHistory(prev => [completedCall, ...prev.slice(0, 9)]);
        setCurrentCall(null);
      }
    }
  };

  const handleCancel = () => {
    if (currentCall) {
      const cancelledCall = {
        ...currentCall,
        status: 'cancelled' as const
      };

      setCallHistory(prev => [cancelledCall, ...prev.slice(0, 9)]);
      setCurrentCall(null);
    }
  };

  const resetSimulation = () => {
    setCurrentCall(null);
    setCallHistory([]);
    setCallIdCounter(1);
    setAutoMode(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallTypeColor = (type: string) => {
    switch (type) {
      case 'Code Blue':
        return 'bg-red-600 text-white border-red-700';
      case 'Emergency':
        return 'bg-orange-500 text-white border-orange-600';
      case 'Toilet':
        return 'bg-blue-500 text-white border-blue-600';
      default:
        return 'bg-green-500 text-white border-green-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-red-600 bg-red-100';
      case 'acknowledged':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bed className="w-8 h-8 text-blue-600" />
              Bed Call Simulation
            </h1>
            <p className="text-gray-600 mt-2">
              Simulate nurse call system interactions from the patient's bedside
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${autoMode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
            >
              {autoMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              Auto Mode
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-2 hover:bg-red-200"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bed Panel Simulation */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Bed Status Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Bed {bedStatus.bedNumber}</h2>
                <p className="text-gray-600">{bedStatus.ward}</p>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <User className="w-4 h-4" />
                  {bedStatus.patientName}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {bedStatus.isOnline ? (
                    <Wifi className="w-5 h-5 text-green-500" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {bedStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">{Math.round(bedStatus.batteryLevel)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal className="w-5 h-5 text-green-500" />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(bar => (
                      <div
                        key={bar}
                        className={`w-1 h-3 rounded ${bar <= bedStatus.signalStrength ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Call Status */}
            {currentCall && (
              <div className={`mb-8 p-6 rounded-xl border-2 ${currentCall.status === 'active' ? 'bg-red-50 border-red-200 animate-pulse' :
                  currentCall.status === 'acknowledged' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                      Active Call: {currentCall.type}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Duration: {formatDuration(currentCall.duration)}
                    </p>
                    <p className={`text-sm px-3 py-1 rounded-full inline-block mt-2 ${getStatusColor(currentCall.status)}`}>
                      {currentCall.status.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {currentCall.status === 'active' && (
                      <>
                        <button
                          onClick={handleAcknowledge}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Acknowledge
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {currentCall.status === 'acknowledged' && (
                      <button
                        onClick={handleComplete}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Call Buttons */}
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => handleCallButtonPress('Normal')}
                disabled={currentCall?.status === 'active'}
                className={`p-8 rounded-xl border-4 transition-all ${getCallTypeColor('Normal')} ${currentCall?.status === 'active' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                  }`}
              >
                <Phone className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">NORMAL CALL</h3>
                <p className="text-sm opacity-90 mt-2">General assistance needed</p>
              </button>

              <button
                onClick={() => handleCallButtonPress('Toilet')}
                disabled={currentCall?.status === 'active'}
                className={`p-8 rounded-xl border-4 transition-all ${getCallTypeColor('Toilet')} ${currentCall?.status === 'active' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                  }`}
              >
                <Phone className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">TOILET CALL</h3>
                <p className="text-sm opacity-90 mt-2">Bathroom assistance</p>
              </button>

              <button
                onClick={() => handleCallButtonPress('Emergency')}
                disabled={currentCall?.status === 'active'}
                className={`p-8 rounded-xl border-4 transition-all ${getCallTypeColor('Emergency')} ${currentCall?.status === 'active' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                  }`}
              >
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">EMERGENCY</h3>
                <p className="text-sm opacity-90 mt-2">Urgent medical attention</p>
              </button>

              <button
                onClick={() => handleCallButtonPress('Code Blue')}
                disabled={currentCall?.status === 'active'}
                className={`p-8 rounded-xl border-4 transition-all ${getCallTypeColor('Code Blue')} ${currentCall?.status === 'active' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                  }`}
              >
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold">CODE BLUE</h3>
                <p className="text-sm opacity-90 mt-2">Cardiac/Respiratory arrest</p>
              </button>
            </div>
          </div>
        </div>

        {/* Monitoring Panel */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Connection</span>
                <span className={`px-2 py-1 rounded text-sm ${bedStatus.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                  {bedStatus.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Battery</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full ${bedStatus.batteryLevel > 50 ? 'bg-green-500' :
                          bedStatus.batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      style={{ width: `${bedStatus.batteryLevel}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{Math.round(bedStatus.batteryLevel)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Signal Strength</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(bar => (
                    <div
                      key={bar}
                      className={`w-2 h-4 rounded ${bar <= bedStatus.signalStrength ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Maintenance</span>
                <span className="text-sm text-gray-600">
                  {Math.floor((Date.now() - bedStatus.lastMaintenance.getTime()) / (1000 * 60 * 60 * 24))} days ago
                </span>
              </div>
            </div>
          </div>

          {/* Call History */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Calls
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {callHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent calls</p>
              ) : (
                callHistory.map((call) => (
                  <div key={call.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCallTypeColor(call.type)}`}>
                        {call.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Time: {call.timestamp.toLocaleTimeString()}</p>
                      <p>Duration: {formatDuration(call.duration)}</p>
                      {call.responseTime && (
                        <p>Response: {formatDuration(call.responseTime)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-3">How to Use</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Click any call button to simulate a patient request</li>
              <li>• Watch the real-time monitoring response</li>
              <li>• Use "Acknowledge" to simulate nurse response</li>
              <li>• Enable "Auto Mode" for continuous simulation</li>
              <li>• Toggle sound on/off for audio alerts</li>
              <li>• Monitor system status and call history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BedSimulation;