const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

/**
 * Get stored auth tokens from localStorage
 */
function getAccessToken(): string | null {
    return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
}

/**
 * Store auth tokens in localStorage
 */
export function storeTokens(access: string, refresh: string): void {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
}

/**
 * Clear auth tokens from localStorage
 */
export function clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_profile');
}

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            clearTokens();
            return null;
        }

        const data = await response.json();
        if (data.access) {
            localStorage.setItem('access_token', data.access);
            return data.access;
        }
        return null;
    } catch {
        clearTokens();
        return null;
    }
}

/**
 * Main API request function with JWT auth and auto-refresh
 */
export async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = 'GET', body } = options;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Attach JWT token if available
    const token = getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body,
    });

    // If 401 Unauthorized, try refreshing the token
    if (response.status === 401 && token) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers,
                body,
            });
        } else {
            clearTokens();
            throw new Error('Session expired. Please log in again.');
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.message || errorData.detail || `API Error: ${response.status}`
        );
    }

    return response.json();
}

export { API_BASE_URL };
