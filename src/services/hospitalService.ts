import { apiRequest } from './api';
import type { HospitalValidity } from '../types/types';

/**
 * Check hospital subscription validity
 * GET /api/check-validity/<hospital_id>/
 */
export async function checkValidity(hospitalId: number): Promise<HospitalValidity> {
    return apiRequest<HospitalValidity>(`/api/check-validity/${hospitalId}/`);
}
