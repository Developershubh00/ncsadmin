// import React, { useState, useEffect, useRef } from 'react';
// import { User, X } from 'lucide-react';
// import * as authService from '../services/authService';
// import * as callService from '../services/callService';
// import websocketService from '../services/websocketService';
// import type { CallRecord, WSEvent } from '../types/types';

// interface Call {
//   id: string;
//   floor: string;
//   wing: string;
//   bedNumber: string;
//   timestamp: Date;
//   acknowledged: boolean;
//   apiCallId?: number; // Track the backend call ID
// }

// interface NurseCallLandingProps {
//   onLoginSuccess: () => void;
//   logoUrl?: string;
// }

// const NurseCallLanding: React.FC<NurseCallLandingProps> = ({
//   onLoginSuccess,
//   logoUrl = "/logo.png"
// }) => {
//   const [showLogin, setShowLogin] = useState(false);
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [isLoggingIn, setIsLoggingIn] = useState(false);
//   const [currentCall, setCurrentCall] = useState<Call | null>(null);
//   const [previousCalls, setPreviousCalls] = useState<Call[]>([]);
//   const [faultCount, setFaultCount] = useState(0);
//   const [showAlert, setShowAlert] = useState(false);
//   const [alertCall, setAlertCall] = useState<Call | null>(null);
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [logoError, setLogoError] = useState(false);
//   const [apiConnected, setApiConnected] = useState(false);
//   const alertAudioRef = useRef<HTMLAudioElement>(null);

//   // Update current time every second
//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//     }, 1000);
//     return () => clearInterval(timer);
//   }, []);

//   // Connect to WebSocket and load initial data
//   useEffect(() => {
//     // Load existing calls from API
//     callService.listCallEvents()
//       .then((calls: CallRecord[]) => {
//         setApiConnected(true);
//         const mappedCalls: Call[] = calls
//           .filter(c => c.status === 'new' || c.status === 'acknowledged')
//           .map(c => ({
//             id: String(c.id),
//             floor: `FLOOR ${c.floor_no || '1'}`,
//             wing: c.hospital_name || 'A-WING',
//             bedNumber: c.room_no,
//             timestamp: new Date(c.created_at),
//             acknowledged: !!c.acknowledged_at,
//             apiCallId: c.id,
//           }));

//         if (mappedCalls.length > 0) {
//           setCurrentCall(mappedCalls[0]);
//           console.log('[NurseCallLanding] Loaded current call from API:', mappedCalls);
//           setPreviousCalls(mappedCalls.slice(1, 11));
//         }
//       })
//       .catch(() => {
//         console.log('[NurseCallLanding] API not available, running in demo mode');
//         setApiConnected(false);
//       });

//     // Subscribe to WebSocket events
//     websocketService.connect();
//     const unsubscribe = websocketService.subscribe((event: WSEvent) => {
//       if (event.event === 'call_created') {
//         const newCall: Call = {
//           id: String(event.call_id),
//           floor: `FLOOR ${event.floor_no}`,
//           wing: event.hospital_name || 'A-WING',
//           bedNumber: event.room_no,
//           timestamp: new Date(event.created_at),
//           acknowledged: false,
//           apiCallId: event.call_id,
//         };

//         setCurrentCall(prev => {
//           if (prev) {
//             setPreviousCalls(prevCalls => {
//               const updated = [prev, ...prevCalls];
//               return updated.slice(0, 10);
//             });
//           }
//           return newCall;
//         });
//       } else if (event.event === 'call_acknowledged') {
//         // Remove acknowledged call from display
//         setCurrentCall(prev => {
//           if (prev && String(prev.apiCallId) === String(event.call_id)) {
//             return null;
//           }
//           return prev;
//         });
//         setPreviousCalls(prev => prev.filter(c => String(c.apiCallId) !== String(event.call_id)));
//       }
//     });

//     return () => {
//       unsubscribe();
//     };
//   }, []);

//   // Demo mode: simulate calls if API is not connected
//   useEffect(() => {
//     if (apiConnected) return; // Don't simulate if API is working

//     const simulateCall = () => {
//       const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;
//       if (totalCalls >= 11) return;

//       const floors = ['1ST FLOOR', '2ND FLOOR', '3RD FLOOR', '4TH FLOOR', '5TH FLOOR'];
//       const wings = ['A-WING', 'B-WING', 'C-WING'];
//       const bedNumbers = ['101', '102', '103', '201', '202', '301', '302'];

//       const newCall: Call = {
//         id: Date.now().toString(),
//         floor: floors[Math.floor(Math.random() * floors.length)],
//         wing: wings[Math.floor(Math.random() * wings.length)],
//         bedNumber: bedNumbers[Math.floor(Math.random() * bedNumbers.length)],
//         timestamp: new Date(),
//         acknowledged: false,
//       };

//       if (currentCall) {
//         setPreviousCalls(prev => {
//           const updated = [currentCall, ...prev];
//           return updated.slice(0, 10);
//         });
//       }
//       setCurrentCall(newCall);
//     };

//     const firstCallTimer = setTimeout(simulateCall, 2000);
//     const callInterval = setInterval(() => {
//       if (Math.random() > 0.3) simulateCall();
//     }, Math.random() * 30000 + 30000);

//     return () => {
//       clearTimeout(firstCallTimer);
//       clearInterval(callInterval);
//     };
//   }, [currentCall, previousCalls, apiConnected]);

//   // Calculate call duration
//   const getCallDuration = (timestamp: Date): string => {
//     try {
//       if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
//         return '00:00';
//       }
//       const now = new Date();
//       const diffInSeconds = Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 1000));
//       const minutes = Math.floor(diffInSeconds / 60);
//       const seconds = diffInSeconds % 60;
//       return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
//     } catch {
//       return '00:00';
//     }
//   };

//   const getCurrentCallDuration = (): string => {
//     if (!currentCall || !currentCall.timestamp) return '00:00';
//     return getCallDuration(currentCall.timestamp);
//   };

//   // Check for 3-minute alerts
//   useEffect(() => {
//     const checkAlerts = () => {
//       if (currentCall && currentCall.timestamp) {
//         const diffInMinutes = (new Date().getTime() - currentCall.timestamp.getTime()) / (1000 * 60);
//         if (diffInMinutes >= 3 && (!alertCall || alertCall.id !== currentCall.id)) {
//           setAlertCall(currentCall);
//           setShowAlert(true);
//           if (alertAudioRef.current) {
//             alertAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
//           }
//         }
//       }
//     };
//     checkAlerts();
//   }, [currentTime, currentCall, alertCall]);

//   // Login handler — uses real API
//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoggingIn(true);
//     setError('');

//     try {
//       await authService.login({ username, password });
//       setShowLogin(false);
//       setError('');
//       onLoginSuccess();
//     } catch (err: any) {
//       setError(err.message || 'Invalid username or password. Please check your credentials.');
//     } finally {
//       setIsLoggingIn(false);
//     }
//   };

//   // Acknowledge handler — uses real API
//   const handleAcknowledge = async () => {
//     if (currentCall?.apiCallId) {
//       try {
//         await callService.acknowledgeCall(currentCall.apiCallId);
//       } catch (err) {
//         console.log('API acknowledge failed, clearing locally:', err);
//       }
//     }
//     setCurrentCall(null);
//     setPreviousCalls([]);
//     setShowAlert(false);
//     setAlertCall(null);
//   };

//   const getCurrentDate = () => {
//     return new Date().toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   };

//   const handleLogoError = () => { setLogoError(true); };

//   const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;

//   return (
//     <div className="min-h-screen bg-white">
//       {/* Hidden audio element for alert sound */}
//       <audio ref={alertAudioRef} preload="auto" loop>
//         <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L1tm8gBjqV2vDBeB8ELILNkc5qJQfLntp6qV8RC0SQkY2aw8Xzq3gpBSkBLEHM8tm4pwsYZLfm5LqfOwgpge7yjr1nHQQpgczz25g8CRZkuOvnuZY5CSiC7vOKvWgbBSyByvLZuKQGFWG16Oaygj8IJIDt8oyXRwQpBSt+zPPasjkJGGO25umYQw0pfM/y2/aqCAoYY7Xo6qiUCxSfz/PSgiIFLH3L9t2HPgUrgsr025+CEBVhu+XpuYtJECl+yPDgSgcjdcnz25BSEy1+yfLaJgI" type="audio/wav" />
//       </audio>

//       {/* API Connection Status */}
//       <div className={`text-center text-xs py-1 ${apiConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
//         {apiConnected ? '🟢 Connected to backend' : '🟡 Demo mode — backend not connected'}
//       </div>

//       {/* Alert Banner */}
//       {showAlert && alertCall && (
//         <div className="bg-red-600 text-white p-4 text-center font-bold animate-pulse border-b-4 border-red-800">
//           <div className="text-lg">
//             ⚠️ ALERT: The call from {alertCall.floor}, {alertCall.wing} - BED {alertCall.bedNumber} has not been cancelled for 3 minutes.
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <div className="bg-white border-4 border-black">
//         <div className="flex justify-between items-center px-6 py-4">
//           <div className="flex items-center space-x-4">
//             <div className="w-12 h-12 flex items-center justify-center">
//               {!logoError ? (
//                 <img
//                   src={logoUrl}
//                   alt="Hospital Logo"
//                   className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1"
//                   onError={handleLogoError}
//                 />
//               ) : (
//                 <div className="w-12 h-12 flex items-center justify-center">
//   <img
//     src="/logo system tek.png"
//     alt="Hospital Logo"
//     className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1"
//   />
// </div>
//               )}
//             </div>
//             <h1 className="text-2xl font-bold">NURSE CALL MONITORING</h1>
//           </div>
//           <div className="text-xl font-semibold">{getCurrentDate()}</div>
//           <button
//             onClick={() => setShowLogin(true)}
//             className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors shadow-lg"
//             title="Admin Login"
//           >
//             <User size={24} />
//           </button>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="p-6 bg-white">
//         {/* Current Call - Large Grid */}
//         <div className="mb-6">
//           <div className="border-4 border-black bg-white h-40 flex items-center justify-center shadow-lg">
//             {currentCall ? (
//               <div className="text-center">
//                 <div className="text-4xl font-bold text-black mb-2">
//                   {currentCall.floor}, {currentCall.wing}
//                 </div>
//                 <div className="text-xl font-semibold text-gray-700 mb-2">
//                   BED {currentCall.bedNumber}
//                 </div>
//                 <div className="text-lg font-mono text-red-600 bg-red-50 px-4 py-1 rounded-full inline-block">
//                   {getCurrentCallDuration()}
//                 </div>
//               </div>
//             ) : (
//               <div className="text-3xl font-bold text-gray-400">NO ACTIVE CALLS</div>
//             )}
//           </div>
//         </div>

//         {/* Previous Calls - Small Grids (2 rows x 5 columns) */}
//         <div className="mb-6">
//           <div className="grid grid-cols-5 gap-4 mb-4">
//             {Array.from({ length: 5 }, (_, index) => {
//               const call = previousCalls[index];
//               return (
//                 <div key={`row1-${index}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
//                   {call ? (
//                     <div className="text-center px-2">
//                       <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
//                       <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
//                       <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
//                         {getCallDuration(call.timestamp)}
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="text-xs text-gray-200"></div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           <div className="grid grid-cols-5 gap-4">
//             {Array.from({ length: 5 }, (_, index) => {
//               const call = previousCalls[index + 5];
//               return (
//                 <div key={`row2-${index}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
//                   {call ? (
//                     <div className="text-center px-2">
//                       <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
//                       <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
//                       <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
//                         {getCallDuration(call.timestamp)}
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="text-xs text-gray-200"></div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Status Bar */}
//         <div className="border-4 border-black bg-white p-6 shadow-lg">
//           <div className="flex justify-between items-center">
//             <div className="flex space-x-16">
//               <div className="text-center">
//                 <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
//                   {faultCount.toString().padStart(2, '0')}
//                 </div>
//                 <div className="text-sm font-semibold mt-2">NO. OF FAULTS</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
//                   {totalCalls.toString().padStart(2, '0')}
//                 </div>
//                 <div className="text-sm font-semibold mt-2">NO. OF CALLS</div>
//               </div>
//             </div>
//             <button
//               onClick={handleAcknowledge}
//               className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-full font-bold text-xl transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
//               disabled={!currentCall && previousCalls.length === 0}
//             >
//               <div className="w-4 h-4 bg-white rounded-full"></div>
//               <span>ACKNOWLEDGE</span>
//             </button>
//           </div>
//         </div>

//         {/* Grid Full Warning */}
//         {totalCalls >= 11 && (
//           <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-4">
//             <div className="text-yellow-800 font-semibold">
//               ⚠️ All call grids are full. New calls cannot be displayed until acknowledged.
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Login Modal */}
//       {showLogin && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-8 w-96 shadow-2xl border-4 border-gray-300">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
//               <button
//                 onClick={() => {
//                   setShowLogin(false);
//                   setError('');
//                   setUsername('');
//                   setPassword('');
//                 }}
//                 className="text-gray-500 hover:text-gray-700 p-1"
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <form onSubmit={handleLogin}>
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
//                 <input
//                   type="text"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   placeholder="Enter username"
//                   required
//                 />
//               </div>

//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
//                 <input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   placeholder="Enter password"
//                   required
//                 />
//               </div>

//               {error && (
//                 <div className="mb-4 text-red-600 text-sm text-center bg-red-50 p-2 rounded">
//                   {error}
//                 </div>
//               )}

//               <button
//                 type="submit"
//                 disabled={isLoggingIn}
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors shadow-lg disabled:opacity-50"
//               >
//                 {isLoggingIn ? 'Logging in...' : 'Login'}
//               </button>
//             </form>

//             <div className="mt-4 text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
//               {apiConnected ? 'Use your registered credentials' : 'Demo: admin / admin'}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NurseCallLanding;

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { User, X } from 'lucide-react';
// import * as authService from '../services/authService';
// import * as callService from '../services/callService';
// import websocketService from '../services/websocketService';
// import type { CallRecord, WSEvent } from '../types/types';

// interface Call {
//   id: string;
//   floor: string;
//   wing: string;
//   bedNumber: string;
//   timestamp: Date;
//   acknowledged: boolean;
//   apiCallId?: number;
// }

// interface NurseCallLandingProps {
//   onLoginSuccess: () => void;
//   logoUrl?: string;
// }

// // ─── Web Audio helpers ────────────────────────────────────────────────────────
// let audioCtx: AudioContext | null = null;

// function getAudioContext(): AudioContext {
//   if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
//   return audioCtx;
// }

// function playTone(
//   frequency: number,
//   duration: number,
//   type: OscillatorType = 'sine',
//   gainVal = 0.3,
//   startDelay = 0
// ): void {
//   try {
//     const ctx = getAudioContext();
//     const osc = ctx.createOscillator();
//     const gain = ctx.createGain();
//     osc.connect(gain);
//     gain.connect(ctx.destination);
//     osc.type = type;
//     osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
//     gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
//     gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.01);
//     gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);
//     osc.start(ctx.currentTime + startDelay);
//     osc.stop(ctx.currentTime + startDelay + duration + 0.01);
//   } catch (_) { /* ignore */ }
// }

// /** Soft quiet beep-beep — returns a stop function */
// function startHospitalBeep(): () => void {
//   let stopped = false;
//   let timeout: ReturnType<typeof setTimeout>;

//   const beep = () => {
//     if (stopped) return;
//     // two soft short beeps, low volume
//     playTone(660, 0.08, 'sine', 0.06, 0);
//     playTone(660, 0.08, 'sine', 0.06, 0.18);
//     timeout = setTimeout(beep, 1800);
//   };
//   beep();
//   return () => { stopped = true; clearTimeout(timeout); };
// }

// /** Double beep on acknowledge */
// function playAckSound(): void {
//   playTone(523, 0.15, 'sine', 0.25, 0);      // C5
//   playTone(659, 0.15, 'sine', 0.25, 0.2);    // E5
//   playTone(784, 0.2, 'sine', 0.25, 0.4);     // G5
// }

// /** Rising siren for 3-min alert */
// function startSiren(): () => void {
//   let stopped = false;
//   let timeout: ReturnType<typeof setTimeout>;

//   const cycle = () => {
//     if (stopped) return;
//     try {
//       const ctx = getAudioContext();
//       const osc = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.type = 'sawtooth';
//       osc.frequency.setValueAtTime(600, ctx.currentTime);
//       osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.6);
//       osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.2);
//       gain.gain.setValueAtTime(0.22, ctx.currentTime);
//       gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
//       osc.start(ctx.currentTime);
//       osc.stop(ctx.currentTime + 1.3);
//     } catch (_) { /* ignore */ }
//     timeout = setTimeout(cycle, 1400);
//   };
//   cycle();
//   return () => { stopped = true; clearTimeout(timeout); };
// }

// // ─── CSS injected once ────────────────────────────────────────────────────────
// const STYLE_ID = 'nurse-call-animations';
// if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
//   const style = document.createElement('style');
//   style.id = STYLE_ID;
//   style.textContent = `
//     @keyframes redFlicker {
//       0%,100% { background-color: #fff; box-shadow: none; }
//       25%      { background-color: #fff1f1; box-shadow: inset 0 0 0 3px #fca5a5; }
//       50%      { background-color: #ffe4e4; box-shadow: inset 0 0 0 3px #f87171; }
//       75%      { background-color: #fff1f1; box-shadow: inset 0 0 0 3px #fca5a5; }
//     }
//     @keyframes yellowPulse {
//       0%,100% { background-color: #fefce8; box-shadow: inset 0 0 0 4px #eab308, 0 0 16px 4px #eab30855; }
//       50%      { background-color: #fef08a; box-shadow: inset 0 0 0 4px #ca8a04, 0 0 28px 8px #ca8a0466; }
//     }
//     @keyframes dotFlicker {
//       0%,49%  { opacity: 1; background-color: #ef4444; box-shadow: 0 0 8px 3px #ef444499; }
//       50%,100% { opacity: 0.15; background-color: #ef4444; }
//     }
//     @keyframes sirenFlash {
//       0%,100% { background-color: #7f1d1d; }
//       50%      { background-color: #ef4444; }
//     }
//     .call-box-idle     { background-color: #fff; transition: background-color 0.4s; }
//     .call-box-active   { animation: redFlicker 1.6s ease-in-out infinite; }
//     .call-box-ack      { animation: yellowPulse 1.2s ease-in-out infinite; }
//     .call-box-siren    { animation: redFlicker 0.35s ease-in-out infinite, sirenFlash 0.5s infinite; }
//     .dot-idle          { width: 12px; height: 12px; border-radius: 3px; background-color: #22c55e; box-shadow: 0 0 6px 2px #22c55e88; }
//     .dot-active        { width: 12px; height: 12px; border-radius: 3px; animation: dotFlicker 0.6s steps(1) infinite; }
//     .dot-siren         { width: 12px; height: 12px; border-radius: 3px; animation: dotFlicker 0.25s steps(1) infinite; }
//   `;
//   document.head.appendChild(style);
// }

// // ─── Component ────────────────────────────────────────────────────────────────
// type CallBoxState = 'idle' | 'active' | 'ack' | 'siren';

// const NurseCallLanding: React.FC<NurseCallLandingProps> = ({
//   onLoginSuccess,
//   logoUrl = '/logo.png',
// }) => {
//   const [showLogin, setShowLogin] = useState(false);
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [isLoggingIn, setIsLoggingIn] = useState(false);
//   const [currentCall, setCurrentCall] = useState<Call | null>(null);
//   const [previousCalls, setPreviousCalls] = useState<Call[]>([]);
//   const [faultCount, setFaultCount] = useState(0);
//   const [showAlert, setShowAlert] = useState(false);
//   const [alertCall, setAlertCall] = useState<Call | null>(null);
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [logoError, setLogoError] = useState(false);
//   const [apiConnected, setApiConnected] = useState(false);
//   const [callBoxState, setCallBoxState] = useState<CallBoxState>('idle');

//   // Sound stop-functions stored in refs so they survive re-renders
//   const stopBeepRef = useRef<(() => void) | null>(null);
//   const stopSirenRef = useRef<(() => void) | null>(null);

//   const stopAllSounds = useCallback(() => {
//     stopBeepRef.current?.();
//     stopBeepRef.current = null;
//     stopSirenRef.current?.();
//     stopSirenRef.current = null;
//   }, []);

//   // ── Clock ──
//   useEffect(() => {
//     const t = setInterval(() => setCurrentTime(new Date()), 1000);
//     return () => clearInterval(t);
//   }, []);

//   // ── Box-state machine driven by currentCall ──
//   useEffect(() => {
//     if (!currentCall) {
//       stopAllSounds();
//       setCallBoxState('idle');
//       return;
//     }
//     // New call arriving — start red flicker + hospital beep
//     setCallBoxState('active');
//     stopAllSounds();
//     stopBeepRef.current = startHospitalBeep();
//   }, [currentCall?.id]); // only re-run when the call *identity* changes

//   // ── 3-minute siren escalation ──
//   useEffect(() => {
//     if (!currentCall || !currentCall.timestamp) return;
//     const diffMs = currentTime.getTime() - currentCall.timestamp.getTime();
//     const diffMin = diffMs / 60000;

//     if (diffMin >= 3) {
//       if (callBoxState !== 'siren' && callBoxState !== 'ack') {
//         stopBeepRef.current?.();
//         stopBeepRef.current = null;
//         setCallBoxState('siren');
//         setAlertCall(currentCall);
//         setShowAlert(true);
//         stopSirenRef.current = startSiren();
//       }
//     }
//   }, [currentTime]);

//   // ── Load initial data + WebSocket ──
//   useEffect(() => {
//     callService.listCallEvents()
//       .then((calls: CallRecord[]) => {
//         setApiConnected(true);
//         const mapped: Call[] = calls
//           .filter(c => c.status === 'new' || c.status === 'acknowledged')
//           .map(c => ({
//             id: String(c.id),
//             floor: `FLOOR ${c.floor_no || '1'}`,
//             wing: c.hospital_name || 'A-WING',
//             bedNumber: c.room_no,
//             timestamp: new Date(c.created_at),
//             acknowledged: !!c.acknowledged_at,
//             apiCallId: c.id,
//           }));
//         if (mapped.length > 0) {
//           setCurrentCall(mapped[0]);
//           setPreviousCalls(mapped.slice(1, 11));
//         }
//       })
//       .catch(() => {
//         setApiConnected(false);
//       });

//     websocketService.connect();
//     const unsub = websocketService.subscribe((event: WSEvent) => {
//       if (event.event === 'call_created') {
//         const nc: Call = {
//           id: String(event.call_id),
//           floor: `FLOOR ${event.floor_no}`,
//           wing: event.hospital_name || 'A-WING',
//           bedNumber: event.room_no,
//           timestamp: new Date(event.created_at),
//           acknowledged: false,
//           apiCallId: event.call_id,
//         };
//         setCurrentCall(prev => {
//           if (prev) setPreviousCalls(p => [prev, ...p].slice(0, 10));
//           return nc;
//         });
//       } else if (event.event === 'call_acknowledged') {
//         setCurrentCall(prev => {
//           if (prev && String(prev.apiCallId) === String(event.call_id)) return null;
//           return prev;
//         });
//         setPreviousCalls(prev => prev.filter(c => String(c.apiCallId) !== String(event.call_id)));
//       }
//     });
//     return () => { unsub(); stopAllSounds(); };
//   }, []);

//   // ── Demo mode ──
//   useEffect(() => {
//     if (apiConnected) return;
//     const simulate = () => {
//       const total = (currentCall ? 1 : 0) + previousCalls.length;
//       if (total >= 11) return;
//       const nc: Call = {
//         id: Date.now().toString(),
//         floor: ['1ST FLOOR','2ND FLOOR','3RD FLOOR'][Math.floor(Math.random()*3)],
//         wing: ['A-WING','B-WING','C-WING'][Math.floor(Math.random()*3)],
//         bedNumber: ['101','102','201','202','301'][Math.floor(Math.random()*5)],
//         timestamp: new Date(),
//         acknowledged: false,
//       };
//       setCurrentCall(prev => {
//         if (prev) setPreviousCalls(p => [prev, ...p].slice(0, 10));
//         return nc;
//       });
//     };
//     const t1 = setTimeout(simulate, 2000);
//     const t2 = setInterval(() => { if (Math.random() > 0.3) simulate(); }, 35000);
//     return () => { clearTimeout(t1); clearInterval(t2); };
//   }, [currentCall, previousCalls, apiConnected]);

//   // ── Duration ──
//   const getCallDuration = (timestamp: Date): string => {
//     try {
//       if (!timestamp || isNaN(timestamp.getTime())) return '00:00';
//       const diff = Math.max(0, Math.floor((new Date().getTime() - timestamp.getTime()) / 1000));
//       return `${String(Math.floor(diff/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`;
//     } catch { return '00:00'; }
//   };

//   const getCurrentCallDuration = () => currentCall ? getCallDuration(currentCall.timestamp) : '00:00';

//   // ── Acknowledge ──
//   const handleAcknowledge = async () => {
//     stopAllSounds();
//     setCallBoxState('ack');
//     setShowAlert(false);
//     setAlertCall(null);
//     playAckSound();

//     if (currentCall?.apiCallId) {
//       try { await callService.acknowledgeCall(currentCall.apiCallId); } catch (_) {}
//     }

//     // Hold yellow for 1.2 s then clear
//     setTimeout(() => {
//       setCurrentCall(null);
//       setPreviousCalls([]);
//       setCallBoxState('idle');
//     }, 1200);
//   };

//   // ── Login ──
//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoggingIn(true);
//     setError('');
//     try {
//       await authService.login({ username, password });
//       setShowLogin(false);
//       onLoginSuccess();
//     } catch (err: any) {
//       setError(err.message || 'Invalid credentials.');
//     } finally {
//       setIsLoggingIn(false);
//     }
//   };

//   const getCurrentDate = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });

//   const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;

//   // ── Box class helpers ──
//   const mainBoxClass = `border-4 border-black h-40 flex items-center justify-center shadow-lg ${
//     callBoxState === 'idle'   ? 'call-box-idle bg-white' :
//     callBoxState === 'active' ? 'call-box-active' :
//     callBoxState === 'ack'    ? 'call-box-ack' :
//     'call-box-siren'
//   }`;

//   const dotClass =
//     callBoxState === 'idle'   ? 'dot-idle' :
//     callBoxState === 'siren'  ? 'dot-siren' :
//     'dot-active';

//   // ── Render ──
//   return (
//     <div className="min-h-screen bg-white">

//       {/* Connection status bar */}
//       <div className={`text-center text-xs py-1 ${apiConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
//         {apiConnected ? '🟢 Connected to backend' : '🟡 Demo mode — backend not connected'}
//       </div>

//       {/* Siren Alert Banner */}
//       {showAlert && alertCall && (
//         <div className="bg-red-700 text-white p-4 text-center font-bold border-b-4 border-red-900" style={{ animation: 'sirenFlash 0.5s steps(1) infinite' }}>
//           <div className="text-lg">
//             🚨 ALERT: Call from {alertCall.floor}, {alertCall.wing} – BED {alertCall.bedNumber} unattended for 3+ minutes!
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <div className="bg-white border-4 border-black">
//         <div className="flex justify-between items-center px-6 py-4">
//           <div className="flex items-center space-x-4">
//             <div className="w-12 h-12 flex items-center justify-center">
//               {!logoError ? (
//                 <img src={logoUrl} alt="Hospital Logo"
//                   className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1"
//                   onError={() => setLogoError(true)} />
//               ) : (
//                 <img src="/logo system tek.png" alt="Hospital Logo"
//                   className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1" />
//               )}
//             </div>
//             <h1 className="text-2xl font-bold">NURSE CALL MONITORING</h1>
//           </div>
//           <div className="text-xl font-semibold">{getCurrentDate()}</div>
//           <button onClick={() => setShowLogin(true)}
//             className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors shadow-lg"
//             title="Admin Login">
//             <User size={24} />
//           </button>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="p-6 bg-white">

//         {/* ── Current Call Box ── */}
//         <div className="mb-6">
//           <div className={mainBoxClass}>
//             {currentCall ? (
//               <div className="text-center">
//                 <div className={`text-4xl font-bold mb-2 ${callBoxState === 'siren' ? 'text-white' : callBoxState === 'ack' ? 'text-yellow-800' : 'text-red-400'}`}>
//                   {currentCall.floor}, {currentCall.wing}
//                 </div>
//                 <div className={`text-xl font-semibold mb-2 ${callBoxState === 'siren' ? 'text-red-100' : callBoxState === 'ack' ? 'text-yellow-700' : 'text-gray-700'}`}>
//                   BED {currentCall.bedNumber}
//                 </div>
//                 <div className={`text-lg font-mono px-4 py-1 rounded-full inline-block font-bold ${
//                   callBoxState === 'siren' ? 'text-white bg-red-800' :
//                   callBoxState === 'ack'   ? 'text-yellow-900 bg-yellow-200' :
//                   'text-red-400 bg-red-50'
//                 }`}>
//                   ⏱ {getCurrentCallDuration()}
//                 </div>
//               </div>
//             ) : (
//               <div className="text-3xl font-bold text-gray-400">NO ACTIVE CALLS</div>
//             )}
//           </div>
//         </div>

//         {/* ── Previous Calls ── */}
//         <div className="mb-6">
//           <div className="grid grid-cols-5 gap-4 mb-4">
//             {Array.from({ length: 5 }, (_, i) => {
//               const call = previousCalls[i];
//               return (
//                 <div key={`r1-${i}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
//                   {call ? (
//                     <div className="text-center px-2">
//                       <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
//                       <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
//                       <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
//                         {getCallDuration(call.timestamp)}
//                       </div>
//                     </div>
//                   ) : <div className="text-xs text-gray-200" />}
//                 </div>
//               );
//             })}
//           </div>
//           <div className="grid grid-cols-5 gap-4">
//             {Array.from({ length: 5 }, (_, i) => {
//               const call = previousCalls[i + 5];
//               return (
//                 <div key={`r2-${i}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
//                   {call ? (
//                     <div className="text-center px-2">
//                       <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
//                       <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
//                       <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
//                         {getCallDuration(call.timestamp)}
//                       </div>
//                     </div>
//                   ) : <div className="text-xs text-gray-200" />}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* ── Status Bar ── */}
//         <div className="border-4 border-black bg-white p-6 shadow-lg">
//           <div className="flex justify-between items-center">
//             <div className="flex space-x-16">
//               <div className="text-center">
//                 <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
//                   {faultCount.toString().padStart(2, '0')}
//                 </div>
//                 <div className="text-sm font-semibold mt-2">NO. OF FAULTS</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
//                   {totalCalls.toString().padStart(2, '0')}
//                 </div>
//                 <div className="text-sm font-semibold mt-2">NO. OF CALLS</div>
//               </div>
//             </div>

//             <button onClick={handleAcknowledge}
//               disabled={!currentCall && previousCalls.length === 0}
//               className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-full font-bold text-xl transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2">
//               <div className="w-4 h-4 bg-white rounded-full" />
//               <span>ACKNOWLEDGE</span>
//             </button>
//           </div>

//           {/* ── Connectivity Indicator ── */}
//           <div className="flex justify-center mt-5">
//             <div className="flex flex-col items-center space-y-1">
//               <div className={dotClass} />
//               <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
//                 {callBoxState === 'idle'   ? 'STANDBY' :
//                  callBoxState === 'active' ? 'CALL ACTIVE' :
//                  callBoxState === 'ack'    ? 'ACK' :
//                  'ALERT'}
//               </span>
//             </div>
//           </div>
//         </div>

//         {totalCalls >= 11 && (
//           <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-4">
//             <div className="text-yellow-800 font-semibold">
//               ⚠️ All call grids are full. New calls cannot be displayed until acknowledged.
//             </div>
//           </div>
//         )}
//       </div>

//       {/* ── Login Modal ── */}
//       {showLogin && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-8 w-96 shadow-2xl border-4 border-gray-300">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
//               <button onClick={() => { setShowLogin(false); setError(''); setUsername(''); setPassword(''); }}
//                 className="text-gray-500 hover:text-gray-700 p-1">
//                 <X size={24} />
//               </button>
//             </div>
//             <form onSubmit={handleLogin}>
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
//                 <input type="text" value={username} onChange={e => setUsername(e.target.value)}
//                   className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter username" required />
//               </div>
//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
//                 <input type="password" value={password} onChange={e => setPassword(e.target.value)}
//                   className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter password" required />
//               </div>
//               {error && (
//                 <div className="mb-4 text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>
//               )}
//               <button type="submit" disabled={isLoggingIn}
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors shadow-lg disabled:opacity-50">
//                 {isLoggingIn ? 'Logging in...' : 'Login'}
//               </button>
//             </form>
//             <div className="mt-4 text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
//               {apiConnected ? 'Use your registered credentials' : 'Demo: admin / admin'}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NurseCallLanding;

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { User, X } from 'lucide-react';
// import * as authService from '../services/authService';
// import * as callService from '../services/callService';
// import websocketService from '../services/websocketService';
// import type { CallRecord, WSEvent } from '../types/types';

// interface Call {
//   id: string;
//   floor: string;
//   wing: string;
//   bedNumber: string;
//   timestamp: Date;
//   acknowledged: boolean;
//   apiCallId?: number;
// }

// interface NurseCallLandingProps {
//   onLoginSuccess: () => void;
//   logoUrl?: string;
// }

// // ─── Web Audio helpers ────────────────────────────────────────────────────────
// let audioCtx: AudioContext | null = null;

// function getAudioContext(): AudioContext {
//   if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
//   return audioCtx;
// }

// function playTone(
//   frequency: number,
//   duration: number,
//   type: OscillatorType = 'sine',
//   gainVal = 0.3,
//   startDelay = 0
// ): void {
//   try {
//     const ctx = getAudioContext();
//     const osc = ctx.createOscillator();
//     const gain = ctx.createGain();
//     osc.connect(gain);
//     gain.connect(ctx.destination);
//     osc.type = type;
//     osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
//     gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
//     gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.01);
//     gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);
//     osc.start(ctx.currentTime + startDelay);
//     osc.stop(ctx.currentTime + startDelay + duration + 0.01);
//   } catch (_) { /* ignore */ }
// }

// /** Soft quiet beep-beep — returns a stop function */
// function startHospitalBeep(): () => void {
//   let stopped = false;
//   let timeout: ReturnType<typeof setTimeout>;

//   const beep = () => {
//     if (stopped) return;
//     // two soft short beeps, low volume
//     playTone(660, 0.08, 'sine', 0.06, 0);
//     playTone(660, 0.08, 'sine', 0.06, 0.18);
//     timeout = setTimeout(beep, 1800);
//   };
//   beep();
//   return () => { stopped = true; clearTimeout(timeout); };
// }

// /** Double beep on acknowledge */
// function playAckSound(): void {
//   playTone(523, 0.15, 'sine', 0.25, 0);      // C5
//   playTone(659, 0.15, 'sine', 0.25, 0.2);    // E5
//   playTone(784, 0.2, 'sine', 0.25, 0.4);     // G5
// }

// /** Rising siren for 3-min alert */
// function startSiren(): () => void {
//   let stopped = false;
//   let timeout: ReturnType<typeof setTimeout>;

//   const cycle = () => {
//     if (stopped) return;
//     try {
//       const ctx = getAudioContext();
//       const osc = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.type = 'sawtooth';
//       osc.frequency.setValueAtTime(600, ctx.currentTime);
//       osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.6);
//       osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.2);
//       gain.gain.setValueAtTime(0.22, ctx.currentTime);
//       gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
//       osc.start(ctx.currentTime);
//       osc.stop(ctx.currentTime + 1.3);
//     } catch (_) { /* ignore */ }
//     timeout = setTimeout(cycle, 1400);
//   };
//   cycle();
//   return () => { stopped = true; clearTimeout(timeout); };
// }

// // ─── CSS injected once ────────────────────────────────────────────────────────
// const STYLE_ID = 'nurse-call-animations';
// if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
//   const style = document.createElement('style');
//   style.id = STYLE_ID;
//   style.textContent = `
//     @keyframes redFlicker {
//       0%,100% { background-color: #fff; box-shadow: none; }
//       25%      { background-color: #fff1f1; box-shadow: inset 0 0 0 3px #fca5a5; }
//       50%      { background-color: #ffe4e4; box-shadow: inset 0 0 0 3px #f87171; }
//       75%      { background-color: #fff1f1; box-shadow: inset 0 0 0 3px #fca5a5; }
//     }
//     @keyframes yellowPulse {
//       0%,100% { background-color: #fefce8; box-shadow: inset 0 0 0 4px #eab308, 0 0 16px 4px #eab30855; }
//       50%      { background-color: #fef08a; box-shadow: inset 0 0 0 4px #ca8a04, 0 0 28px 8px #ca8a0466; }
//     }
//     @keyframes dotFlicker {
//       0%,49%  { opacity: 1; background-color: #ef4444; box-shadow: 0 0 8px 3px #ef444499; }
//       50%,100% { opacity: 0.15; background-color: #ef4444; }
//     }
//     @keyframes sirenFlash {
//       0%,100% { background-color: #7f1d1d; }
//       50%      { background-color: #ef4444; }
//     }
//     .call-box-idle     { background-color: #fff; transition: background-color 0.4s; }
//     .call-box-active   { animation: redFlicker 1.6s ease-in-out infinite; }
//     .call-box-ack      { background-color: #fef08a; box-shadow: inset 0 0 0 4px #eab308; }
//     .call-box-siren    { animation: redFlicker 0.35s ease-in-out infinite, sirenFlash 0.5s infinite; }
//     .dot-idle          { width: 12px; height: 12px; border-radius: 3px; background-color: #22c55e; box-shadow: 0 0 6px 2px #22c55e88; }
//     .dot-active        { width: 12px; height: 12px; border-radius: 3px; animation: dotFlicker 0.6s steps(1) infinite; }
//     .dot-ack           { width: 12px; height: 12px; border-radius: 3px; background-color: #eab308; box-shadow: 0 0 8px 3px #eab30888; animation: yellowDotPulse 1.2s ease-in-out infinite; }
//     .dot-siren         { width: 12px; height: 12px; border-radius: 3px; animation: dotFlicker 0.25s steps(1) infinite; }
//     @keyframes yellowDotPulse {
//       0%,100% { box-shadow: 0 0 4px 2px #eab30866; }
//       50%      { box-shadow: 0 0 10px 4px #eab308cc; }
//     }
//   `;
//   document.head.appendChild(style);
// }

// // ─── Component ────────────────────────────────────────────────────────────────
// type CallBoxState = 'idle' | 'active' | 'ack' | 'siren';

// const NurseCallLanding: React.FC<NurseCallLandingProps> = ({
//   onLoginSuccess,
//   logoUrl = '/logo.png',
// }) => {
//   const [showLogin, setShowLogin] = useState(false);
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [isLoggingIn, setIsLoggingIn] = useState(false);
//   const [currentCall, setCurrentCall] = useState<Call | null>(null);
//   const [previousCalls, setPreviousCalls] = useState<Call[]>([]);
//   const [faultCount, setFaultCount] = useState(0);
//   const [showAlert, setShowAlert] = useState(false);
//   const [alertCall, setAlertCall] = useState<Call | null>(null);
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [logoError, setLogoError] = useState(false);
//   const [apiConnected, setApiConnected] = useState(false);
//   const [callBoxState, setCallBoxState] = useState<CallBoxState>('idle');

//   // Sound stop-functions stored in refs so they survive re-renders
//   const stopBeepRef = useRef<(() => void) | null>(null);
//   const stopSirenRef = useRef<(() => void) | null>(null);
//   // Track which call is in yellow (awaiting server confirmation)
//   const ackedCallIdRef = useRef<number | null>(null);
//   // Webhook polling interval while waiting for server attended event
//   const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   /** Clear yellow state once server confirms the call is fully attended */
//   const clearAckedCall = useCallback(() => {
//     ackedCallIdRef.current = null;
//     if (pollIntervalRef.current) {
//       clearInterval(pollIntervalRef.current);
//       pollIntervalRef.current = null;
//     }
//     setCurrentCall(null);
//     setPreviousCalls([]);
//     setCallBoxState('idle');
//   }, []);

//   /** Start polling the REST endpoint every 3 s as a webhook fallback */
//   const startAttendedPoll = useCallback((callId: number) => {
//     if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
//     pollIntervalRef.current = setInterval(async () => {
//       try {
//         const record: CallRecord = await callService.getCallEvent(callId);
//         // Consider call fully attended when status is 'resolved', 'attended', or 'closed'
//         const doneStatuses = ['resolved', 'attended', 'closed', 'completed'];
//         if (doneStatuses.includes(record.status)) {
//           clearAckedCall();
//         }
//       } catch (_) {
//         // ignore transient errors — keep polling
//       }
//     }, 3000);
//   }, [clearAckedCall]);

//   const stopAllSounds = useCallback(() => {
//     stopBeepRef.current?.();
//     stopBeepRef.current = null;
//     stopSirenRef.current?.();
//     stopSirenRef.current = null;
//   }, []);

//   // ── Clock ──
//   useEffect(() => {
//     const t = setInterval(() => setCurrentTime(new Date()), 1000);
//     return () => clearInterval(t);
//   }, []);

//   // ── Box-state machine driven by currentCall ──
//   useEffect(() => {
//     if (!currentCall) {
//       stopAllSounds();
//       setCallBoxState('idle');
//       return;
//     }
//     // New call arriving — start red flicker + hospital beep
//     setCallBoxState('active');
//     stopAllSounds();
//     stopBeepRef.current = startHospitalBeep();
//   }, [currentCall?.id]); // only re-run when the call *identity* changes

//   // ── 3-minute siren escalation ──
//   useEffect(() => {
//     if (!currentCall || !currentCall.timestamp) return;
//     const diffMs = currentTime.getTime() - currentCall.timestamp.getTime();
//     const diffMin = diffMs / 60000;

//     if (diffMin >= 3) {
//       if (callBoxState !== 'siren' && callBoxState !== 'ack') {
//         stopBeepRef.current?.();
//         stopBeepRef.current = null;
//         setCallBoxState('siren');
//         setAlertCall(currentCall);
//         setShowAlert(true);
//         stopSirenRef.current = startSiren();
//       }
//     }
//   }, [currentTime]);

//   // ── Load initial data + WebSocket ──
//   useEffect(() => {
//     callService.listCallEvents()
//       .then((calls: CallRecord[]) => {
//         setApiConnected(true);
//         const mapped: Call[] = calls
//           .filter(c => c.status === 'new' || c.status === 'acknowledged')
//           .map(c => ({
//             id: String(c.id),
//             floor: `FLOOR ${c.floor_no || '1'}`,
//             wing: c.hospital_name || 'A-WING',
//             bedNumber: c.room_no,
//             timestamp: new Date(c.created_at),
//             acknowledged: !!c.acknowledged_at,
//             apiCallId: c.id,
//           }));
//         if (mapped.length > 0) {
//           setCurrentCall(mapped[0]);
//           setPreviousCalls(mapped.slice(1, 11));
//         }
//       })
//       .catch(() => {
//         setApiConnected(false);
//       });

//     websocketService.connect();
//     const unsub = websocketService.subscribe((event: WSEvent) => {
//       if (event.event === 'call_created') {
//         const nc: Call = {
//           id: String(event.call_id),
//           floor: `FLOOR ${event.floor_no}`,
//           wing: event.hospital_name || 'A-WING',
//           bedNumber: event.room_no,
//           timestamp: new Date(event.created_at),
//           acknowledged: false,
//           apiCallId: event.call_id,
//         };
//         setCurrentCall(prev => {
//           if (prev) setPreviousCalls(p => [prev, ...p].slice(0, 10));
//           return nc;
//         });
//       } else if (event.event === 'call_acknowledged') {
//         // Server echoes our own ACK — keep yellow, wait for attended/resolved
//         setCurrentCall(prev => {
//           if (prev && String(prev.apiCallId) === String(event.call_id)) {
//             return { ...prev, acknowledged: true };
//           }
//           return prev;
//         });
//       } else if (
//         event.event === 'call_attended' ||
//         event.event === 'call_resolved'  ||
//         event.event === 'call_closed'    ||
//         event.event === 'call_completed'
//       ) {
//         // ✅ Server confirms physically attended — clear yellow box
//         if (
//           ackedCallIdRef.current !== null &&
//           String(ackedCallIdRef.current) === String(event.call_id)
//         ) {
//           clearAckedCall();
//         }
//         setPreviousCalls(prev =>
//           prev.filter(c => String(c.apiCallId) !== String(event.call_id))
//         );
//       }
//     });
//     return () => {
//       unsub();
//       stopAllSounds();
//       if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
//     };
//   }, []);

//   // ── Demo mode ──
//   useEffect(() => {
//     if (apiConnected) return;
//     const simulate = () => {
//       const total = (currentCall ? 1 : 0) + previousCalls.length;
//       if (total >= 11) return;
//       const nc: Call = {
//         id: Date.now().toString(),
//         floor: ['1ST FLOOR','2ND FLOOR','3RD FLOOR'][Math.floor(Math.random()*3)],
//         wing: ['A-WING','B-WING','C-WING'][Math.floor(Math.random()*3)],
//         bedNumber: ['101','102','201','202','301'][Math.floor(Math.random()*5)],
//         timestamp: new Date(),
//         acknowledged: false,
//       };
//       setCurrentCall(prev => {
//         if (prev) setPreviousCalls(p => [prev, ...p].slice(0, 10));
//         return nc;
//       });
//     };
//     const t1 = setTimeout(simulate, 2000);
//     const t2 = setInterval(() => { if (Math.random() > 0.3) simulate(); }, 35000);
//     return () => { clearTimeout(t1); clearInterval(t2); };
//   }, [currentCall, previousCalls, apiConnected]);

//   // ── Duration ──
//   const getCallDuration = (timestamp: Date): string => {
//     try {
//       if (!timestamp || isNaN(timestamp.getTime())) return '00:00';
//       const diff = Math.max(0, Math.floor((new Date().getTime() - timestamp.getTime()) / 1000));
//       return `${String(Math.floor(diff/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`;
//     } catch { return '00:00'; }
//   };

//   const getCurrentCallDuration = () => currentCall ? getCallDuration(currentCall.timestamp) : '00:00';

//   // ── Acknowledge ──
//   const handleAcknowledge = async () => {
//     if (!currentCall) return;

//     stopAllSounds();
//     setCallBoxState('ack');
//     setShowAlert(false);
//     setAlertCall(null);
//     playAckSound();

//     // Remember which call we're waiting on
//     const callId = currentCall.apiCallId ?? null;
//     ackedCallIdRef.current = callId;

//     if (callId) {
//       try {
//         await callService.acknowledgeCall(callId);
//       } catch (_) {
//         console.log('[ACK] API call failed — still holding yellow, polling will retry');
//       }
//       // ── Start webhook polling as fallback ──
//       // Yellow stays until WS fires call_attended/resolved OR poll detects it
//       startAttendedPoll(callId);
//     } else {
//       // Demo mode — no real API, simulate server response after 4 s
//       setTimeout(() => clearAckedCall(), 4000);
//     }
//   };

//   // ── Login ──
//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoggingIn(true);
//     setError('');
//     try {
//       await authService.login({ username, password });
//       setShowLogin(false);
//       onLoginSuccess();
//     } catch (err: any) {
//       setError(err.message || 'Invalid credentials.');
//     } finally {
//       setIsLoggingIn(false);
//     }
//   };

//   const getCurrentDate = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });

//   const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;

//   // ── Box class helpers ──
//   const mainBoxClass = `border-4 border-black h-40 flex items-center justify-center shadow-lg ${
//     callBoxState === 'idle'   ? 'call-box-idle bg-white' :
//     callBoxState === 'active' ? 'call-box-active' :
//     callBoxState === 'ack'    ? 'call-box-ack' :
//     'call-box-siren'
//   }`;

//   const dotClass =
//     callBoxState === 'idle'   ? 'dot-idle'   :
//     callBoxState === 'ack'    ? 'dot-ack'    :
//     callBoxState === 'siren'  ? 'dot-siren'  :
//     'dot-active';

//   // ── Render ──
//   return (
//     <div className="min-h-screen bg-white">

//       {/* Connection status bar */}
//       <div className={`text-center text-xs py-1 ${apiConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
//         {apiConnected ? '🟢 Connected to backend' : '🟡 Demo mode — backend not connected'}
//       </div>

//       {/* Siren Alert Banner */}
//       {showAlert && alertCall && (
//         <div className="bg-red-700 text-white p-4 text-center font-bold border-b-4 border-red-900" style={{ animation: 'sirenFlash 0.5s steps(1) infinite' }}>
//           <div className="text-lg">
//             🚨 ALERT: Call from {alertCall.floor}, {alertCall.wing} – BED {alertCall.bedNumber} unattended for 3+ minutes!
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <div className="bg-white border-4 border-black">
//         <div className="flex justify-between items-center px-6 py-4">
//           <div className="flex items-center space-x-4">
//             <div className="w-12 h-12 flex items-center justify-center">
//               {!logoError ? (
//                 <img src={logoUrl} alt="Hospital Logo"
//                   className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1"
//                   onError={() => setLogoError(true)} />
//               ) : (
//                 <img src="/logo system tek.png" alt="Hospital Logo"
//                   className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1" />
//               )}
//             </div>
//             <h1 className="text-2xl font-bold">NURSE CALL MONITORING</h1>
//           </div>
//           <div className="text-xl font-semibold">{getCurrentDate()}</div>
//           <button onClick={() => setShowLogin(true)}
//             className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors shadow-lg"
//             title="Admin Login">
//             <User size={24} />
//           </button>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="p-6 bg-white">

//         {/* ── Current Call Box ── */}
//         <div className="mb-6">
//           <div className={mainBoxClass}>
//             {currentCall ? (
//               <div className="text-center">
//                 <div className={`text-4xl font-bold mb-2 ${callBoxState === 'siren' ? 'text-white' : callBoxState === 'ack' ? 'text-yellow-800' : 'text-red-400'}`}>
//                   {currentCall.floor}, {currentCall.wing}
//                 </div>
//                 <div className={`text-xl font-semibold mb-2 ${callBoxState === 'siren' ? 'text-red-100' : callBoxState === 'ack' ? 'text-yellow-700' : 'text-gray-700'}`}>
//                   BED {currentCall.bedNumber}
//                 </div>
//                 <div className={`text-lg font-mono px-4 py-1 rounded-full inline-block font-bold ${
//                   callBoxState === 'siren' ? 'text-white bg-red-800' :
//                   callBoxState === 'ack'   ? 'text-yellow-900 bg-yellow-200' :
//                   'text-red-400 bg-red-50'
//                 }`}>
//                   ⏱ {getCurrentCallDuration()}
//                 </div>
//               </div>
//             ) : (
//               <div className="text-3xl font-bold text-gray-400">NO ACTIVE CALLS</div>
//             )}
//           </div>
//         </div>

//         {/* ── Previous Calls ── */}
//         <div className="mb-6">
//           <div className="grid grid-cols-5 gap-4 mb-4">
//             {Array.from({ length: 5 }, (_, i) => {
//               const call = previousCalls[i];
//               return (
//                 <div key={`r1-${i}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
//                   {call ? (
//                     <div className="text-center px-2">
//                       <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
//                       <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
//                       <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
//                         {getCallDuration(call.timestamp)}
//                       </div>
//                     </div>
//                   ) : <div className="text-xs text-gray-200" />}
//                 </div>
//               );
//             })}
//           </div>
//           <div className="grid grid-cols-5 gap-4">
//             {Array.from({ length: 5 }, (_, i) => {
//               const call = previousCalls[i + 5];
//               return (
//                 <div key={`r2-${i}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
//                   {call ? (
//                     <div className="text-center px-2">
//                       <div className="text-sm font-bold text-black mb-1">{call.floor}, {call.wing}</div>
//                       <div className="text-xs text-gray-600 mb-1">BED {call.bedNumber}</div>
//                       <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
//                         {getCallDuration(call.timestamp)}
//                       </div>
//                     </div>
//                   ) : <div className="text-xs text-gray-200" />}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* ── Status Bar ── */}
//         <div className="border-4 border-black bg-white p-6 shadow-lg">
//           <div className="flex justify-between items-center">
//             <div className="flex space-x-16">
//               <div className="text-center">
//                 <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
//                   {faultCount.toString().padStart(2, '0')}
//                 </div>
//                 <div className="text-sm font-semibold mt-2">NO. OF FAULTS</div>
//               </div>
//               <div className="text-center">
//                 <div className="text-3xl font-bold border-2 border-black px-4 py-2 bg-gray-50">
//                   {totalCalls.toString().padStart(2, '0')}
//                 </div>
//                 <div className="text-sm font-semibold mt-2">NO. OF CALLS</div>
//               </div>
//             </div>

//             <button onClick={handleAcknowledge}
//               disabled={!currentCall && previousCalls.length === 0}
//               className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-full font-bold text-xl transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2">
//               <div className="w-4 h-4 bg-white rounded-full" />
//               <span>ACKNOWLEDGE</span>
//             </button>
//           </div>

//           {/* ── Connectivity Indicator ── */}
//           <div className="flex justify-center mt-5">
//             <div className="flex flex-col items-center space-y-1">
//               <div className={dotClass} />
//               <span className="text-[10px] font-semibold tracking-widest uppercase"
//                 style={{ color: callBoxState === 'ack' ? '#92400e' : '#6b7280' }}>
//                 {callBoxState === 'idle'   ? 'STANDBY' :
//                  callBoxState === 'active' ? 'CALL ACTIVE' :
//                  callBoxState === 'ack'    ? 'WAITING — SERVER CONFIRM' :
//                  'ALERT'}
//               </span>
//               {callBoxState === 'ack' && (
//                 <span className="text-[9px] text-yellow-700 animate-pulse tracking-wide">
//                   ● polling for attended status…
//                 </span>
//               )}
//             </div>
//           </div>
//         </div>

//         {totalCalls >= 11 && (
//           <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-4">
//             <div className="text-yellow-800 font-semibold">
//               ⚠️ All call grids are full. New calls cannot be displayed until acknowledged.
//             </div>
//           </div>
//         )}
//       </div>

//       {/* ── Login Modal ── */}
//       {showLogin && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-8 w-96 shadow-2xl border-4 border-gray-300">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
//               <button onClick={() => { setShowLogin(false); setError(''); setUsername(''); setPassword(''); }}
//                 className="text-gray-500 hover:text-gray-700 p-1">
//                 <X size={24} />
//               </button>
//             </div>
//             <form onSubmit={handleLogin}>
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
//                 <input type="text" value={username} onChange={e => setUsername(e.target.value)}
//                   className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter username" required />
//               </div>
//               <div className="mb-6">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
//                 <input type="password" value={password} onChange={e => setPassword(e.target.value)}
//                   className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter password" required />
//               </div>
//               {error && (
//                 <div className="mb-4 text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>
//               )}
//               <button type="submit" disabled={isLoggingIn}
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors shadow-lg disabled:opacity-50">
//                 {isLoggingIn ? 'Logging in...' : 'Login'}
//               </button>
//             </form>
//             <div className="mt-4 text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
//               {apiConnected ? 'Use your registered credentials' : 'Demo: admin / admin'}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NurseCallLanding;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, X } from 'lucide-react';
import * as authService from '../services/authService';
import * as callService from '../services/callService';
import websocketService from '../services/websocketService';
import type { CallRecord, WSEvent } from '../types/types';

type EventType = 'nurse_call' | 'bathroom_emergency' | 'staff_assist' | 'code_blue';

interface Call {
  id: string;
  floor: string;
  wing: string;       // corridor label e.g. "CORRIDOR 1"
  bedNumber: string;  // bed_no from backend
  roomNo: string;     // room_no from backend
  callFrom: string;   // call_from from backend
  timestamp: Date;
  acknowledged: boolean;
  apiCallId?: number;
  apiBedNo?: string;  // bed_no used for acknowledge/attend API calls
  eventType: EventType;
}

// Map API call_from / event_type strings → our EventType
function resolveEventType(...raws: (string | undefined)[]): EventType {
  for (const raw of raws) {
    if (!raw) continue;
    const s = raw.toLowerCase();
    if (s.includes('code')     || s.includes('blue')    || s.includes('cardiac'))     return 'code_blue';
    if (s.includes('bathroom') || s.includes('toilet')  || s.includes('washroom'))    return 'bathroom_emergency';
    if (s.includes('staff')    || s.includes('assist')  || s.includes('emergency'))   return 'staff_assist';
  }
  return 'nurse_call';
}

interface NurseCallLandingProps {
  onLoginSuccess: () => void;
  logoUrl?: string;
}

// ─── Web Audio helpers ────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.3,
  startDelay = 0
): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration + 0.01);
  } catch (_) { /* ignore */ }
}

/** Nurse Call — soft quiet beep-beep (Normal) */
function startNurseCallBeep(): () => void {
  let stopped = false;
  let t: ReturnType<typeof setTimeout>;
  const beep = () => {
    if (stopped) return;
    playTone(660, 0.08, 'sine', 0.06, 0);
    playTone(660, 0.08, 'sine', 0.06, 0.18);
    t = setTimeout(beep, 1800);
  };
  beep();
  return () => { stopped = true; clearTimeout(t); };
}

/** Bathroom Emergency — urgent double-tone flash (High) */
function startBathroomBeep(): () => void {
  let stopped = false;
  let t: ReturnType<typeof setTimeout>;
  const beep = () => {
    if (stopped) return;
    playTone(880, 0.1, 'square', 0.18, 0);
    playTone(660, 0.1, 'square', 0.18, 0.15);
    t = setTimeout(beep, 700);
  };
  beep();
  return () => { stopped = true; clearTimeout(t); };
}

/** Staff Assist — amber two-tone chime (High) */
function startStaffAssistBeep(): () => void {
  let stopped = false;
  let t: ReturnType<typeof setTimeout>;
  const beep = () => {
    if (stopped) return;
    playTone(784, 0.12, 'triangle', 0.2, 0);
    playTone(523, 0.12, 'triangle', 0.2, 0.18);
    t = setTimeout(beep, 900);
  };
  beep();
  return () => { stopped = true; clearTimeout(t); };
}

/** Code Blue — rapid high-pitched alarm (Critical) */
function startCodeBlueBeep(): () => void {
  let stopped = false;
  let t: ReturnType<typeof setTimeout>;
  const beep = () => {
    if (stopped) return;
    playTone(1200, 0.08, 'square', 0.28, 0);
    playTone(1200, 0.08, 'square', 0.28, 0.12);
    playTone(1200, 0.08, 'square', 0.28, 0.24);
    t = setTimeout(beep, 500);
  };
  beep();
  return () => { stopped = true; clearTimeout(t); };
}

function startSoundForEventType(et: EventType): () => void {
  switch (et) {
    case 'bathroom_emergency': return startBathroomBeep();
    case 'staff_assist':       return startStaffAssistBeep();
    case 'code_blue':          return startCodeBlueBeep();
    default:                   return startNurseCallBeep();
  }
}

/** Double beep on acknowledge */
function playAckSound(): void {
  playTone(523, 0.15, 'sine', 0.25, 0);      // C5
  playTone(659, 0.15, 'sine', 0.25, 0.2);    // E5
  playTone(784, 0.2, 'sine', 0.25, 0.4);     // G5
}

/** Rising siren for 3-min alert */
function startSiren(): () => void {
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout>;

  const cycle = () => {
    if (stopped) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.3);
    } catch (_) { /* ignore */ }
    timeout = setTimeout(cycle, 1400);
  };
  cycle();
  return () => { stopped = true; clearTimeout(timeout); };
}

// ─── CSS injected once ────────────────────────────────────────────────────────
const STYLE_ID = 'nurse-call-animations';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ── Nurse Call: solid dark red — text always white ── */
    .call-box-nurse_call { background-color: #dc2626; }

    /* ── Bathroom Emergency: alternates between two reds — text always white ── */
    @keyframes bathroomFlash {
      0%,49%  { background-color: #dc2626; }
      50%,100%{ background-color: #991b1b; }
    }
    .call-box-bathroom_emergency { animation: bathroomFlash 1s steps(1) infinite; }

    /* ── Staff Assist: amber flashing — text dark on light, light on dark ── */
    @keyframes staffFlash {
      0%,49%  { background-color: #d97706; }
      50%,100%{ background-color: #fef3c7; }
    }
    .call-box-staff_assist { animation: staffFlash 1s steps(1) infinite; }

    /* ── Code Blue: alternates between two blues — text always white ── */
    @keyframes codeBlueFlash {
      0%,49%  { background-color: #1d4ed8; }
      50%,100%{ background-color: #1e3a8a; }
    }
    .call-box-code_blue { animation: codeBlueFlash 0.5s steps(1) infinite; }

    /* ── Ack: solid amber — no animation ── */
    .call-box-ack { background-color: #fef08a !important; animation: none !important; }

    /* ── Siren: alternates between two dark reds — text always white ── */
    @keyframes sirenFlash {
      0%,100% { background-color: #7f1d1d; }
      50%      { background-color: #dc2626; }
    }
    .call-box-siren { animation: sirenFlash 0.4s steps(1) infinite; }

    /* ── Idle ── */
    .call-box-idle { background-color: #fff; transition: background-color 0.4s; }

    /* ── Dot indicators ── */
    .dot-base { width: 12px; height: 12px; border-radius: 3px; }
    @keyframes dotBlink { 0%,49%{ opacity:1; } 50%,100%{ opacity:0.15; } }
    .dot-idle              { background-color:#22c55e; box-shadow:0 0 6px 2px #22c55e88; }
    .dot-nurse_call        { background-color:#ef4444; box-shadow:0 0 6px 2px #ef444488; }
    .dot-bathroom_emergency{ background-color:#ef4444; animation:dotBlink 0.8s steps(1) infinite; }
    .dot-staff_assist      { background-color:#fbbf24; animation:dotBlink 0.8s steps(1) infinite; }
    .dot-code_blue         { background-color:#2563eb; animation:dotBlink 0.3s steps(1) infinite; }
    .dot-ack               { background-color:#eab308; box-shadow:0 0 8px 3px #eab30888; }
    .dot-siren             { background-color:#ef4444; animation:dotBlink 0.25s steps(1) infinite; }
  `;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────
type CallBoxState = 'idle' | 'nurse_call' | 'bathroom_emergency' | 'staff_assist' | 'code_blue' | 'ack' | 'siren';

const NurseCallLanding: React.FC<NurseCallLandingProps> = ({
  onLoginSuccess,
  logoUrl = '/logo.png',
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
  const [callBoxState, setCallBoxState] = useState<CallBoxState>('idle');

  // Sound stop-functions stored in refs so they survive re-renders
  const stopBeepRef = useRef<(() => void) | null>(null);
  const stopSirenRef = useRef<(() => void) | null>(null);
  // Synchronous set of call IDs already shown — used for dedup between REST load and WS events
  const loadedCallIdsRef = useRef<Set<string>>(new Set());
  // Refs for stale-closure-free access inside WS callbacks
  const currentCallRef = useRef<Call | null>(null);

  /**
   * Use a ref-backed function so the WS useEffect can depend on [] and
   * never re-subscribe unexpectedly (avoids StrictMode double-fire issues).
   */
  const clearCallByIdRef = useRef((callIdStr: string) => {
    loadedCallIdsRef.current.delete(callIdStr);
    setCurrentCall(prev =>
      prev && String(prev.apiCallId) === callIdStr ? null : prev
    );
    setPreviousCalls(prev => prev.filter(c => String(c.apiCallId) !== callIdStr));
  });

  const stopAllSounds = useCallback(() => {
    stopBeepRef.current?.();
    stopBeepRef.current = null;
    stopSirenRef.current?.();
    stopSirenRef.current = null;
  }, []);

  // ── Keep refs in sync so WS callbacks always see latest state ──
  useEffect(() => { currentCallRef.current = currentCall; }, [currentCall]);

  // ── Promote first previous call when currentCall becomes null ──
  useEffect(() => {
    if (!currentCall && previousCalls.length > 0) {
      setCurrentCall(previousCalls[0]);
      setPreviousCalls(p => p.slice(1));
    }
  }, [currentCall, previousCalls]);

  // ── Clock ──
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Box-state machine: driven by currentCall ID *and* acknowledged flag ──
  useEffect(() => {
    if (!currentCall) {
      stopAllSounds();
      setCallBoxState('idle');
      return;
    }
    if (currentCall.acknowledged) {
      stopAllSounds();
      setCallBoxState('ack');
      return;
    }
    stopAllSounds();
    setCallBoxState(currentCall.eventType);
    stopBeepRef.current = startSoundForEventType(currentCall.eventType);
  }, [currentCall?.id, currentCall?.acknowledged]);

  // ── 3-minute siren escalation ──
  useEffect(() => {
    if (!currentCall || !currentCall.timestamp) return;
    const diffMs = currentTime.getTime() - currentCall.timestamp.getTime();
    const diffMin = diffMs / 60000;

    if (diffMin >= 3) {
      if (callBoxState !== 'siren' && callBoxState !== 'ack') {
        stopBeepRef.current?.();
        stopBeepRef.current = null;
        setCallBoxState('siren');
        setAlertCall(currentCall);
        setShowAlert(true);
        stopSirenRef.current = startSiren();
      }
    }
  }, [currentTime]);

  // ── Load initial data + WebSocket ──
  useEffect(() => {
    // ── REST: load active calls once on mount ──
    callService.listCallEvents()
      .then((calls: CallRecord[]) => {
        setApiConnected(true);
        const mapped: Call[] = calls
          .filter(c => c.status === 'new' || c.status === 'acknowledged')
          .map(c => ({
            id: String(c.id),
            floor: `FLOOR ${c.floor_no ?? '1'}`,
            wing: c.corridoor_no != null ? `CORRIDOR ${c.corridoor_no}` : (c.hospital_name || ''),
            bedNumber: c.bed_no || c.room_no,
            roomNo: c.room_no,
            callFrom: c.call_from || '',
            timestamp: new Date(c.created_at),
            acknowledged: !!c.acknowledged_at,
            apiCallId: c.id,
            apiBedNo: c.bed_no || c.room_no,
            eventType: resolveEventType(c.call_from),
          }));
        // Synchronously register all REST-loaded IDs so WS dedup fires correctly
        loadedCallIdsRef.current = new Set(mapped.map(c => c.id));
        if (mapped.length > 0) {
          setCurrentCall(mapped[0]);
          setPreviousCalls(mapped.slice(1, 11));
        }
      })
      .catch(() => {
        setApiConnected(false);
      });

    // ── WebSocket ──
    websocketService.connect();
    const unsub = websocketService.subscribe((event: WSEvent) => {

      // ─────────────────────────────────────────────────────────────
      // CALL CREATED — add to queue, deduplicate
      // Also handles a dedicated 'code_blue' event some backends fire
      // ─────────────────────────────────────────────────────────────
      if (event.event === 'call_created' || event.event === 'code_blue') {
        const callIdStr = String(event.call_id);

        // Skip if already loaded via REST or a previous WS fire
        if (loadedCallIdsRef.current.has(callIdStr)) return;
        loadedCallIdsRef.current.add(callIdStr);

        const resolvedType = event.event === 'code_blue'
          ? 'code_blue'
          : resolveEventType(event.call_from);

        const nc: Call = {
          id: callIdStr,
          floor: `FLOOR ${event.floor_no}`,
          wing: event.corridoor_no != null
            ? `CORRIDOR ${event.corridoor_no}`
            : (event.hospital_name || (event as any).hospital || ''),
          bedNumber: event.bed_no || event.room_no,
          roomNo: event.room_no,
          callFrom: event.call_from || (event.event === 'code_blue' ? 'CODE BLUE' : ''),
          timestamp: new Date(event.created_at),
          acknowledged: false,
          apiCallId: event.call_id,
          apiBedNo: event.bed_no || event.room_no,
          eventType: resolvedType,
        };
        setCurrentCall(prev => {
          if (prev) setPreviousCalls(p => [prev, ...p].slice(0, 10));
          return nc;
        });

      // ─────────────────────────────────────────────────────────────
      // CALL ACKNOWLEDGED — keep the call but turn it YELLOW
      // (regardless of whether it came from the nurse panel or the bed)
      // ─────────────────────────────────────────────────────────────
      } else if (event.event === 'call_acknowledged') {
        const callIdStr = String(event.call_id);
        const isCurrent = currentCallRef.current != null &&
          String(currentCallRef.current.apiCallId) === callIdStr;
        // Mark acknowledged on the call object (triggers box-state effect → 'ack')
        setCurrentCall(prev =>
          prev && String(prev.apiCallId) === callIdStr ? { ...prev, acknowledged: true } : prev
        );
        setPreviousCalls(prev =>
          prev.map(c =>
            String(c.apiCallId) === callIdStr ? { ...c, acknowledged: true } : c
          )
        );
        if (isCurrent) {
          stopAllSounds();
          setCallBoxState('ack');
        }

      // ─────────────────────────────────────────────────────────────
      // CALL ATTENDED / RESOLVED / CLOSED — remove the call entirely
      // ─────────────────────────────────────────────────────────────
      } else if (
        event.event === 'call_attended'  ||
        event.event === 'call_resolved'  ||
        event.event === 'call_closed'    ||
        event.event === 'call_completed'
      ) {
        const callIdStr = String(event.call_id);
        const isCurrent = currentCallRef.current != null &&
          String(currentCallRef.current.apiCallId) === callIdStr;
        clearCallByIdRef.current(callIdStr);
        if (isCurrent) {
          stopAllSounds();
          setCallBoxState('idle');
        }
      }
    });

    return () => {
      unsub();
      stopAllSounds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] — intentional: WS subscription must never re-run and double-subscribe

  // ── Duration ──
  const getCallDuration = (timestamp: Date): string => {
    try {
      if (!timestamp || isNaN(timestamp.getTime())) return '00:00';
      const diff = Math.max(0, Math.floor((new Date().getTime() - timestamp.getTime()) / 1000));
      return `${String(Math.floor(diff/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`;
    } catch { return '00:00'; }
  };

  const getCurrentCallDuration = () => currentCall ? getCallDuration(currentCall.timestamp) : '00:00';

  // ── Acknowledge ──
  // Optimistically turn the box yellow, then call the API.
  // The WS event `call_acknowledged` will keep it yellow;
  // `call_attended` (or resolved/closed) will clear it.
  const handleAcknowledge = async () => {
    if (!currentCall) return;

    // Optimistic UI — go yellow immediately
    stopAllSounds();
    setCallBoxState('ack');
    setShowAlert(false);
    setAlertCall(null);
    playAckSound();

    if (currentCall.apiCallId) {
      const bedNoForApi = currentCall.apiBedNo || String(currentCall.apiCallId);
      try {
        await callService.acknowledgeCall(bedNoForApi);
      } catch (err) {
        console.warn('[ACK] API call failed:', err);
      }
    }
  };

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    try {
      await authService.login({ username, password });
      setShowLogin(false);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getCurrentDate = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });

  const totalCalls = (currentCall ? 1 : 0) + previousCalls.length;

  // ── Box class helpers ──
  const isRedEvent   = callBoxState === 'nurse_call' || callBoxState === 'bathroom_emergency';
  const isYellowEvent = callBoxState === 'staff_assist';
  const isBlueEvent  = callBoxState === 'code_blue';
  const isDarkBg     = isRedEvent || isBlueEvent || callBoxState === 'siren';

  const mainBoxClass = `border-4 border-black h-40 flex items-center justify-center shadow-lg call-box-${callBoxState}`;

  // White text on all dark/colored backgrounds so text is always readable
  const textColorClass =
    isDarkBg                              ? 'text-white'      :
    callBoxState === 'ack'                ? 'text-yellow-900' :
    isYellowEvent                         ? 'text-white'      :
    'text-gray-800';

  // Timer badge: high-contrast pill on top of the box background
  const timerBadgeClass =
    isDarkBg                              ? 'text-red-900 bg-white'         :
    callBoxState === 'ack'                ? 'text-yellow-900 bg-yellow-200' :
    isYellowEvent                         ? 'text-yellow-900 bg-yellow-100' :
    'text-gray-700 bg-gray-100';

  const eventLabel: Record<CallBoxState, string> = {
    idle:                 'STANDBY',
    nurse_call:           '🔴 NURSE CALL',
    bathroom_emergency:   '🔴 BATHROOM EMERGENCY',
    staff_assist:         '🟡 STAFF ASSIST',
    code_blue:            '🔵 CODE BLUE',
    ack:                  'ACKNOWLEDGED',
    siren:                '🚨 ALERT — UNATTENDED',
  };

  const dotClass = `dot-base dot-${callBoxState}`;

  // ── Render ──
  return (
    <div className="min-h-screen bg-white">

      {/* Connection status bar */}
      <div className={`text-center text-xs py-1 ${apiConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {apiConnected ? '🟢 Connected to backend' : '🟡 Demo mode — backend not connected'}
      </div>

      {/* Siren Alert Banner */}
      {showAlert && alertCall && (
        <div className="bg-red-700 text-white p-4 text-center font-bold border-b-4 border-red-900" style={{ animation: 'sirenFlash 0.5s steps(1) infinite' }}>
          <div className="text-lg">
            🚨 ALERT: Call from {alertCall.floor}{alertCall.wing ? `, ${alertCall.wing}` : ''} – ROOM {alertCall.roomNo} · BED {alertCall.bedNumber} unattended for 3+ minutes!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-4 border-black">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center">
              {!logoError ? (
                <img src={logoUrl} alt="Hospital Logo"
                  className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1"
                  onError={() => setLogoError(true)} />
              ) : (
                <img src="/logo system tek.png" alt="Hospital Logo"
                  className="w-full h-full object-contain rounded-full border-2 border-gray-300 bg-white p-1" />
              )}
            </div>
            <h1 className="text-2xl font-bold">NURSE CALL MONITORING</h1>
          </div>
          <div className="text-xl font-semibold">{getCurrentDate()}</div>
          <button onClick={() => setShowLogin(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors shadow-lg"
            title="Admin Login">
            <User size={24} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 bg-white">

        {/* ── Current Call Box ── */}
        <div className="mb-6">
          <div className={mainBoxClass}>
            {currentCall ? (
              <div className="text-center">
                <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${textColorClass} opacity-70`}>
                  {eventLabel[callBoxState]}
                  {currentCall.callFrom ? ` · ${currentCall.callFrom.toUpperCase()}` : ''}
                </div>
                <div className={`text-4xl font-bold mb-2 ${textColorClass}`}>
                  {currentCall.floor}{currentCall.wing ? `, ${currentCall.wing}` : ''}
                </div>
                <div className={`text-xl font-semibold mb-2 ${textColorClass} opacity-80`}>
                  ROOM {currentCall.roomNo} · BED {currentCall.bedNumber}
                </div>
                <div className={`text-lg font-mono px-4 py-1 rounded-full inline-block font-bold ${timerBadgeClass}`}>
                  ⏱ {getCurrentCallDuration()}
                </div>
              </div>
            ) : (
              <div className="text-3xl font-bold text-gray-400">NO ACTIVE CALLS</div>
            )}
          </div>
        </div>

        {/* ── Previous Calls ── */}
        <div className="mb-6">
          <div className="grid grid-cols-5 gap-4 mb-4">
            {Array.from({ length: 5 }, (_, i) => {
              const call = previousCalls[i];
              return (
                <div key={`r1-${i}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
                  {call ? (
                    <div className="text-center px-2">
                      <div className="text-sm font-bold text-black mb-1">{call.floor}{call.wing ? `, ${call.wing}` : ''}</div>
                      <div className="text-xs text-gray-600 mb-1">ROOM {call.roomNo} · BED {call.bedNumber}</div>
                      <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {getCallDuration(call.timestamp)}
                      </div>
                    </div>
                  ) : <div className="text-xs text-gray-200" />}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }, (_, i) => {
              const call = previousCalls[i + 5];
              return (
                <div key={`r2-${i}`} className="border-2 border-black bg-white h-24 flex items-center justify-center shadow-md">
                  {call ? (
                    <div className="text-center px-2">
                      <div className="text-sm font-bold text-black mb-1">{call.floor}{call.wing ? `, ${call.wing}` : ''}</div>
                      <div className="text-xs text-gray-600 mb-1">ROOM {call.roomNo} · BED {call.bedNumber}</div>
                      <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {getCallDuration(call.timestamp)}
                      </div>
                    </div>
                  ) : <div className="text-xs text-gray-200" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Status Bar ── */}
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

            <button onClick={handleAcknowledge}
              disabled={!currentCall && previousCalls.length === 0}
              className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-full font-bold text-xl transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2">
              <div className="w-4 h-4 bg-white rounded-full" />
              <span>ACKNOWLEDGE</span>
            </button>
          </div>

          {/* ── Connectivity Indicator ── */}
          <div className="flex justify-center mt-5">
            <div className="flex flex-col items-center space-y-1">
              <div className={dotClass} />
              <span className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: callBoxState === 'ack' ? '#92400e' : callBoxState === 'code_blue' ? '#1d4ed8' : '#6b7280' }}>
                {eventLabel[callBoxState]}
              </span>
              {callBoxState === 'ack' && (
                <span className="text-[9px] text-yellow-700 animate-pulse tracking-wide">
                  ● polling for attended status…
                </span>
              )}
            </div>
          </div>
        </div>

        {totalCalls >= 11 && (
          <div className="mt-4 bg-yellow-100 border-l-4 border-yellow-500 p-4">
            <div className="text-yellow-800 font-semibold">
              ⚠️ All call grids are full. New calls cannot be displayed until acknowledged.
            </div>
          </div>
        )}
      </div>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-96 shadow-2xl border-4 border-gray-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
              <button onClick={() => { setShowLogin(false); setError(''); setUsername(''); setPassword(''); }}
                className="text-gray-500 hover:text-gray-700 p-1">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username" required />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password" required />
              </div>
              {error && (
                <div className="mb-4 text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>
              )}
              <button type="submit" disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors shadow-lg disabled:opacity-50">
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