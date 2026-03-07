import { apiRequest, storeTokens, clearTokens } from './api';
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ProfileUpdateRequest,
    UserProfile,
} from '../types/types';

/**
 * Login with username and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
    const data = await apiRequest<LoginResponse>('/api/users/login/', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });

    // Store tokens and user profile
    storeTokens(data.tokens.access, data.tokens.refresh);
    localStorage.setItem('user_profile', JSON.stringify(data.user));

    return data;
}

/**
 * Register a new user
 */
export async function register(userData: RegisterRequest): Promise<RegisterResponse> {
    const data = await apiRequest<RegisterResponse>('/api/users/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
    });

    storeTokens(data.tokens.access, data.tokens.refresh);
    localStorage.setItem('user_profile', JSON.stringify(data.user));

    return data;
}

/**
 * Update user profile
 */
export async function updateProfile(profileData: ProfileUpdateRequest): Promise<UserProfile> {
    const data = await apiRequest<UserProfile>('/api/users/profile/update/', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    });

    localStorage.setItem('user_profile', JSON.stringify(data));
    return data;
}

/**
 * Logout — clear all stored auth data
 */
export function logout(): void {
    clearTokens();
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
}

/**
 * Get stored user profile
 */
export function getStoredProfile(): UserProfile | null {
    const profile = localStorage.getItem('user_profile');
    return profile ? JSON.parse(profile) : null;
}
