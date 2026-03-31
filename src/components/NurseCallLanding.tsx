import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, X } from 'lucide-react';
import * as authService from '../services/authService';
import * as callService from '../services/callService';
import websocketService from '../services/websocketService';
import type { CallRecord, WSEvent } from '../types/types';

type EventType = 'nurse_call' | 'toilet_emergency' | 'staff_assist' | 'code_blue';

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
    if (s.includes('toilet') || s.includes('toilet')  || s.includes('washroom'))    return 'toilet_emergency';
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

/** toilet Emergency — urgent double-tone flash (High) */
function startToiletBeep(): () => void {
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
    case 'toilet_emergency': return startToiletBeep();
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

    /* ── Toilet Emergency: alternates between two reds — text always white ── */
    @keyframes toiletFlash {
      0%,49%  { background-color: #dc2626; }
      50%,100%{ background-color: #991b1b; }
    }
    .call-box-toilet_emergency { animation: toiletFlash 1s steps(1) infinite; }

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
    .dot-toilet_emergency{ background-color:#ef4444; animation:dotBlink 0.8s steps(1) infinite; }
    .dot-staff_assist      { background-color:#fbbf24; animation:dotBlink 0.8s steps(1) infinite; }
    .dot-code_blue         { background-color:#2563eb; animation:dotBlink 0.3s steps(1) infinite; }
    .dot-ack               { background-color:#eab308; box-shadow:0 0 8px 3px #eab30888; }
    .dot-siren             { background-color:#ef4444; animation:dotBlink 0.25s steps(1) infinite; }
  `;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────
type CallBoxState = 'idle' | 'nurse_call' | 'toilet_emergency' | 'staff_assist' | 'code_blue' | 'ack' | 'siren';

/** Sort queue so unacknowledged code_blue calls always float to the top */
function sortWithCodeBluePriority(calls: Call[]): Call[] {
  return [...calls].sort((a, b) => {
    const aPri = a.eventType === 'code_blue' && !a.acknowledged ? 1 : 0;
    const bPri = b.eventType === 'code_blue' && !b.acknowledged ? 1 : 0;
    if (aPri !== bPri) return bPri - aPri;
    return 0;
  });
}

/** Derive box state for a single call (used by small grid boxes) */
function boxStateForCall(call: Call, now: Date): CallBoxState {
  const diffMin = (now.getTime() - call.timestamp.getTime()) / 60000;
  if (diffMin >= 3) return 'siren';           // siren until attended, even after ack
  if (call.acknowledged) return 'ack';
  return call.eventType;
}

/** Human-readable label for an event type */
const eventTypeLabel: Record<EventType, string> = {
  nurse_call:        '🔴 NURSE CALL',
  toilet_emergency:  '🔴 TOILET EMERGENCY',
  staff_assist:      '🟡 STAFF ASSIST',
  code_blue:         '🔵 CODE BLUE',
};

/** Build display label that keeps event type visible in ack/siren states */
function buildDisplayLabel(state: CallBoxState, eventType: EventType): string {
  if (state === 'ack')   return `✅ ACK · ${eventTypeLabel[eventType]}`;
  if (state === 'siren') return `🚨 UNATTENDED · ${eventTypeLabel[eventType]}`;
  if (state === 'idle')  return 'STANDBY';
  return eventTypeLabel[eventType];
}

/** Text color for a given box state */
function textColorForState(state: CallBoxState): string {
  const dark = state === 'nurse_call' || state === 'toilet_emergency' || state === 'code_blue' || state === 'siren';
  if (dark) return 'text-white';
  if (state === 'ack') return 'text-yellow-900';
  if (state === 'staff_assist') return 'text-white';
  return 'text-gray-800';
}

const NurseCallLanding: React.FC<NurseCallLandingProps> = ({
  onLoginSuccess,
  logoUrl = '/logo.png',
}) => {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ── Single queue: callQueue[0] is the "current" big box, [1..10] fill the 10 small boxes ──
  const [callQueue, setCallQueue] = useState<Call[]>([]);

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

  // Ref for stale-closure-free access inside WS callbacks
  const callQueueRef = useRef<Call[]>([]);
  useEffect(() => { callQueueRef.current = callQueue; }, [callQueue]);

  const stopAllSounds = useCallback(() => {
    stopBeepRef.current?.();
    stopBeepRef.current = null;
    stopSirenRef.current?.();
    stopSirenRef.current = null;
  }, []);

  // Derived helpers
  const currentCall = callQueue[0] ?? null;
  const previousCalls = callQueue.slice(1, 11);

  // ── Clock ──
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Box-state machine: driven by currentCall ID + acknowledged flag ──
  useEffect(() => {
    if (!currentCall) {
      stopAllSounds();
      setCallBoxState('idle');
      return;
    }
    const diffMin = (Date.now() - currentCall.timestamp.getTime()) / 60000;
    if (diffMin >= 3) {
      // Already past 3 min — go straight to siren (even if ack'd)
      if (callBoxState !== 'siren') {
        stopAllSounds();
        setCallBoxState('siren');
        setAlertCall(currentCall);
        setShowAlert(true);
        stopSirenRef.current = startSiren();
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCall?.id, currentCall?.acknowledged]);

  // ── 3-minute siren escalation (fires even if acknowledged) ──
  useEffect(() => {
    if (!currentCall || !currentCall.timestamp) return;
    const diffMs = currentTime.getTime() - currentCall.timestamp.getTime();
    const diffMin = diffMs / 60000;

    if (diffMin >= 3 && callBoxState !== 'siren') {
      stopAllSounds();
      setCallBoxState('siren');
      setAlertCall(currentCall);
      setShowAlert(true);
      stopSirenRef.current = startSiren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (mapped.length > 0) {
          setCallQueue(sortWithCodeBluePriority(mapped).slice(0, 11));
        }
      })
      .catch(() => {
        setApiConnected(false);
      });

    // ── WebSocket ──
    websocketService.connect();
    const unsub = websocketService.subscribe((event: WSEvent) => {

      // ── CALL CREATED / CODE BLUE ──
      if (event.event === 'call_created' || event.event === 'code_blue') {
        const callIdStr = String(event.call_id);
        const resolvedType = event.event === 'code_blue'
          ? 'code_blue' as EventType
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
        setCallQueue(prev =>
          prev.some(c => String(c.apiCallId) === callIdStr)
            ? prev
            : sortWithCodeBluePriority([nc, ...prev]).slice(0, 11)
        );

      // ── CALL ACKNOWLEDGED ──
      } else if (event.event === 'call_acknowledged') {
        const callIdStr = String(event.call_id);
        setCallQueue(prev => sortWithCodeBluePriority(prev.map(c =>
          String(c.apiCallId) === callIdStr ? { ...c, acknowledged: true } : c
        )));

      // ── CALL ATTENDED / RESOLVED / CLOSED ──
      } else if (
        event.event === 'call_attended'  ||
        event.event === 'call_resolved'  ||
        event.event === 'call_closed'    ||
        event.event === 'call_completed'
      ) {
        const callIdStr = String(event.call_id);
        setCallQueue(prev => prev.filter(c => String(c.apiCallId) !== callIdStr));
      }
    });

    return () => {
      unsub();
      stopAllSounds();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Duration ──
  const getCallDuration = (timestamp: Date): string => {
    try {
      if (!timestamp || isNaN(timestamp.getTime())) return '00:00';
      const diff = Math.max(0, Math.floor((currentTime.getTime() - timestamp.getTime()) / 1000));
      return `${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`;
    } catch { return '00:00'; }
  };

  const getCurrentCallDuration = () => currentCall ? getCallDuration(currentCall.timestamp) : '00:00';

  // ── Acknowledge ──
  const handleAcknowledge = async () => {
    if (!currentCall) return;
    const diffMin = (currentTime.getTime() - currentCall.timestamp.getTime()) / 60000;

    // Optimistic UI — mark acknowledged
    setCallQueue(prev => prev.map((c, i) =>
      i === 0 ? { ...c, acknowledged: true } : c
    ));

    if (diffMin >= 3) {
      // Past 3 min — keep siren running until attended, just play ack beep
      playAckSound();
    } else {
      // Normal ack: stop sounds, show ack state
      stopAllSounds();
      setCallBoxState('ack');
      setShowAlert(false);
      setAlertCall(null);
      playAckSound();
    }

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

  const getCurrentDate = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const totalCalls = callQueue.length;

  // ── Box class helpers for the MAIN (big) box ──
  const isRedEvent   = callBoxState === 'nurse_call' || callBoxState === 'toilet_emergency';
  const isYellowEvent = callBoxState === 'staff_assist';
  const isBlueEvent  = callBoxState === 'code_blue';
  const isDarkBg     = isRedEvent || isBlueEvent || callBoxState === 'siren';

  const mainBoxClass = `border-4 border-black h-40 flex items-center justify-center shadow-lg call-box-${callBoxState}`;

  const textColorClass =
    isDarkBg           ? 'text-white'      :
    callBoxState === 'ack' ? 'text-yellow-900' :
    isYellowEvent      ? 'text-white'      :
    'text-gray-800';

  const timerBadgeClass =
    isDarkBg           ? 'text-red-900 bg-white'         :
    callBoxState === 'ack' ? 'text-yellow-900 bg-yellow-200' :
    isYellowEvent      ? 'text-yellow-900 bg-yellow-100' :
    'text-gray-700 bg-gray-100';

  const eventLabel: Record<CallBoxState, string> = {
    idle:             'STANDBY',
    nurse_call:       '🔴 NURSE CALL',
    toilet_emergency: '🔴 TOILET EMERGENCY',
    staff_assist:     '🟡 STAFF ASSIST',
    code_blue:        '🔵 CODE BLUE',
    ack:              'ACKNOWLEDGED',
    siren:            '🚨 ALERT — UNATTENDED',
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
        <div className="flex justify-between items-center px-6 py-2">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 flex items-center justify-center">
              {!logoError ? (
                <img src={logoUrl} alt="Hospital Logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)} />
              ) : (
                <img src="/ncs.png" alt="Hospital Logo"
                  className="w-full h-full object-contain" />
              )}
            </div>
            <h1 className="text-2xl font-bold">NURSE CALL SYSTEM</h1>
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

        {/* ── Current Call Box (big) ── */}
        <div className="mb-6">
          <div className={mainBoxClass}>
            {currentCall ? (
              <div className="text-center">
                <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${textColorClass} opacity-70`}>
                  {buildDisplayLabel(callBoxState, currentCall.eventType)}
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

        {/* ── Previous Calls (2 rows × 5 boxes, each colored by event type) ── */}
        <div className="mb-6">
          <div className="grid grid-cols-5 gap-4 mb-4">
            {Array.from({ length: 5 }, (_, i) => {
              const call = previousCalls[i];
              const state = call ? boxStateForCall(call, currentTime) : 'idle';
              const txtClr = call ? textColorForState(state) : '';
              return (
                <div key={`r1-${i}`}
                  className={`border-2 border-black h-24 flex items-center justify-center shadow-md call-box-${state}`}>
                  {call ? (
                    <div className="text-center px-2">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${txtClr} opacity-70`}>
                        {buildDisplayLabel(state, call.eventType)}
                      </div>
                      <div className={`text-sm font-bold ${txtClr} mb-1`}>
                        {call.floor}{call.wing ? `, ${call.wing}` : ''}
                      </div>
                      <div className={`text-xs ${txtClr} opacity-80 mb-1`}>
                        ROOM {call.roomNo} · BED {call.bedNumber}
                      </div>
                      <div className={`text-xs font-mono ${state === 'ack' ? 'text-yellow-800 bg-yellow-200' : state === 'siren' ? 'text-red-900 bg-white' : 'text-blue-600 bg-blue-50'} px-2 py-0.5 rounded`}>
                        ⏱ {getCallDuration(call.timestamp)}
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
              const state = call ? boxStateForCall(call, currentTime) : 'idle';
              const txtClr = call ? textColorForState(state) : '';
              return (
                <div key={`r2-${i}`}
                  className={`border-2 border-black h-24 flex items-center justify-center shadow-md call-box-${state}`}>
                  {call ? (
                    <div className="text-center px-2">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${txtClr} opacity-70`}>
                        {buildDisplayLabel(state, call.eventType)}
                      </div>
                      <div className={`text-sm font-bold ${txtClr} mb-1`}>
                        {call.floor}{call.wing ? `, ${call.wing}` : ''}
                      </div>
                      <div className={`text-xs ${txtClr} opacity-80 mb-1`}>
                        ROOM {call.roomNo} · BED {call.bedNumber}
                      </div>
                      <div className={`text-xs font-mono ${state === 'ack' ? 'text-yellow-800 bg-yellow-200' : state === 'siren' ? 'text-red-900 bg-white' : 'text-blue-600 bg-blue-50'} px-2 py-0.5 rounded`}>
                        ⏱ {getCallDuration(call.timestamp)}
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
              disabled={callQueue.length === 0}
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