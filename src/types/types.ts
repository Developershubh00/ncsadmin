// ===== Auth Types =====
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  user_type: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: UserProfile;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  user_type: string;
}

export interface RegisterResponse {
  message: string;
  user: UserProfile;
  tokens: AuthTokens;
}

export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

// ===== Call Types =====
export interface CallCreateRequest {
  room_id: number;
}

/**
 * CallRecord represents a nurse call record from the API
 * 
 * API Endpoint: GET /api/calls/events/
 * Response fields:
 * - id: Call ID
 * - room_no: Room/bed number
 * - floor_no: Floor number
 * - hospital_name: Hospital name
 * - status: Call status (new | acknowledged | attended)
 * - created_at: Call creation timestamp
 * - acknowledged_at: Acknowledgment timestamp (null if not acknowledged)
 * - attended_at: Attendance timestamp (null if not attended)
 * 
 * Optional fields (may be present in other endpoints):
 * - call_from: Source of call (bed, toilet, etc.)
 * - response_time_seconds: Time to acknowledge
 * - attend_delay_seconds: Time from acknowledge to attend
 */
export interface CallRecord {
  id: number;
  bed_no?: string;
  room_no: string;
  floor_no: number;
  corridoor_no?: string | number;
  hospital_name: string;
  status: 'new' | 'acknowledged' | 'attended';
  created_at: string;
  acknowledged_at: string | null;
  attended_at: string | null;
  // Optional fields from other endpoints
  call_from?: string;
  response_time_seconds?: number | null;
  attend_delay_seconds?: number | null;
}

export interface CallAckResponse {
  message: string;
  acknowledged_at: string;
}

export interface CallAttendResponse {
  message: string;
  attended_at: string;
  response_time_seconds: number;
  attend_delay_seconds: number;
}

// ===== WebSocket Event Types =====
export interface WSCallCreatedEvent {
  event: 'call_created';
  call_id: number;
  bed_no?: string;
  room_no: string;
  floor_no: number;
  corridoor_no?: string | number;
  hospital?: string | null;
  hospital_name?: string;
  call_from: string;
  created_at: string;
  message?: string;
}

export interface WSCallAcknowledgedEvent {
  event: 'call_acknowledged';
  call_id: number;
  room_no?: string;
  bed_no?: string;
  acknowledged_at: string;
  response_time_seconds?: number;
  message?: string;
}

export interface WSCallAttendedEvent {
  event: 'call_attended';
  call_id: number;
  room_no?: string;
  bed_no?: string;
  attended_at: string;
  attend_delay_seconds?: number;
  message?: string;
}

export interface WSCallUnacknowledgedEvent {
  event: 'call_unacknowledged';
  call_id: number;
  room_no?: string;
  call_from?: string;
  created_at?: string;
  message?: string;
}

/** Fired by some backends as a standalone code-blue push */
export interface WSCodeBlueEvent {
  event: 'code_blue';
  call_id: number;
  room_no: string;
  bed_no?: string;
  floor_no: number;
  corridoor_no?: string | number;
  hospital?: string | null;
  hospital_name?: string;
  call_from?: string;
  created_at: string;
  message?: string;
  auto_attended_calls?: unknown[];
}

export type WSEvent =
  | WSCallCreatedEvent
  | WSCallAcknowledgedEvent
  | WSCallAttendedEvent
  | WSCallUnacknowledgedEvent
  | WSCodeBlueEvent;

// ===== Webhook Payload Types =====
/** POST fired when a bed/staff/code-blue call is created */
export interface WebhookCallCreatedPayload {
  call_id: number;
  bed_no?: string;
  room_no: string;
  floor_no: number;
  corridoor_no?: string | number;
  hospital_name?: string;
  call_from: string;
  created_at: string;
  status: 'new';
  /** Only present for code-blue calls */
  auto_attended_calls?: unknown[];
}

/** POST fired when a call is acknowledged */
export interface WebhookCallAcknowledgedPayload {
  event: 'call_acknowledged';
  call_id: number;
  bed_no?: string;
  room_no: string;
  acknowledged_at: string;
}

/** POST fired when a call is attended */
export interface WebhookCallAttendedPayload {
  event: 'call_attended';
  call_id: number;
  bed_no?: string;
  room_no: string;
  attended_at: string;
}

export type AnyWebhookPayload =
  | WebhookCallCreatedPayload
  | WebhookCallAcknowledgedPayload
  | WebhookCallAttendedPayload;

// ===== Real-time connection status =====
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

// ===== Hospital Types =====
export interface HospitalValidity {
  status: 'valid' | 'expired' | 'inactive';
  message: string;
  hospital: {
    id: number;
    name: string;
    end_date: string;
    is_active: boolean;
    how_many_beds_allowed: number;
  };
}


