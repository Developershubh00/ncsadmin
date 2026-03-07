import { apiRequest } from './api';
import type {
    CallCreateRequest,
    CallRecord,
    CallAckResponse,
    CallAttendResponse,
} from '../types/types';

/**
 * Create a new nurse call
 * POST /api/call/
 */
export async function createCall(data: CallCreateRequest): Promise<CallRecord> {
    return apiRequest<CallRecord>('/api/call/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Acknowledge a call
 * POST /api/call/<id>/ack/
 */
export async function acknowledgeCall(callId: number): Promise<CallAckResponse> {
    return apiRequest<CallAckResponse>(`/api/call/${callId}/ack/`, {
        method: 'POST',
    });
}

/**
 * Attend a call (nurse arrived)
 * POST /api/call/<id>/attend/
 */
export async function attendCall(callId: number): Promise<CallAttendResponse> {
    return apiRequest<CallAttendResponse>(`/api/call/${callId}/attend/`, {
        method: 'POST',
    });
}

/**
 * List all calls
 * GET /api/calls/
 */
export async function listCalls(): Promise<CallRecord[]> {
    return apiRequest<CallRecord[]>('/api/call/');
}

/**
 * List call events with optional filters (for dashboard/real-time)
 * GET /api/calls/events/?hospital=X&floor_no=Y&room_no=Z
 */
export async function listCallEvents(filters?: {
    hospital?: string;
    floor_no?: number;
    room_no?: string;
}): Promise<CallRecord[]> {
    const params = new URLSearchParams();
    if (filters?.hospital) params.append('hospital', filters.hospital);
    if (filters?.floor_no) params.append('floor_no', String(filters.floor_no));
    if (filters?.room_no) params.append('room_no', filters.room_no);

    const query = params.toString();
    // FIXED: Changed from /api/call/events/ to /api/calls/events/ (plural)
    const endpoint = `/api/calls/events/${query ? `?${query}` : ''}`;

    return apiRequest<CallRecord[]>(endpoint);
}
/**
 * Get call report with filtering
 * GET /api/calls/report/?hospital_id=X&floor_no=Y&room_no=Z&status=W&start_date=A&end_date=B...
 */
export interface CallReportRecord extends CallRecord {
    response_time_seconds?: number;
    attend_delay_seconds?: number;
}

export async function getCallReport(filters?: {
    hospital_id?: number;
    hospital_name?: string;
    floor_no?: number;
    room_no?: string;
    bed_no?: string;
    status?: 'new' | 'acknowledged' | 'attended';
    start_date?: string;
    end_date?: string;
    min_response_time?: number;
    max_response_time?: number;
    min_attend_delay?: number;
    max_attend_delay?: number;
}): Promise<CallReportRecord[]> {
    const params = new URLSearchParams();
    if (filters?.hospital_id) params.append('hospital_id', String(filters.hospital_id));
    if (filters?.hospital_name) params.append('hospital_name', filters.hospital_name);
    if (filters?.floor_no) params.append('floor_no', String(filters.floor_no));
    if (filters?.room_no) params.append('room_no', filters.room_no);
    if (filters?.bed_no) params.append('bed_no', filters.bed_no);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.min_response_time) params.append('min_response_time', String(filters.min_response_time));
    if (filters?.max_response_time) params.append('max_response_time', String(filters.max_response_time));
    if (filters?.min_attend_delay) params.append('min_attend_delay', String(filters.min_attend_delay));
    if (filters?.max_attend_delay) params.append('max_attend_delay', String(filters.max_attend_delay));

    const query = params.toString();
    const endpoint = `/api/calls/report/${query ? `?${query}` : ''}`;

    return apiRequest<CallReportRecord[]>(endpoint);
}

/**
 * Get call analytics with aggregated metrics
 * GET /api/calls/analytics/?hospital_id=X&floor_no=Y&start_date=A&end_date=B
 */
export interface CallAnalytics {
    total_calls: number;
    new_calls: number;
    acknowledged_calls: number;
    attended_calls: number;
    avg_response_time_seconds: number;
    avg_attend_delay_seconds: number;
}

export async function getCallAnalytics(filters?: {
    hospital_id?: number;
    floor_no?: number;
    start_date?: string;
    end_date?: string;
}): Promise<CallAnalytics> {
    const params = new URLSearchParams();
    if (filters?.hospital_id) params.append('hospital_id', String(filters.hospital_id));
    if (filters?.floor_no) params.append('floor_no', String(filters.floor_no));
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const query = params.toString();
    const endpoint = `/api/calls/analytics/${query ? `?${query}` : ''}`;

    return apiRequest<CallAnalytics>(endpoint);
}