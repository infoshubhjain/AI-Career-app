/**
 * API Client
 * 
 * Provides a configured fetch wrapper that automatically attaches
 * the JWT access token to requests for FastAPI authentication.
 */

import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Make an authenticated API request to the FastAPI backend.
 * 
 * The JWT is automatically retrieved from Supabase's session
 * and attached as an Authorization: Bearer header.
 * 
 * @example
 * // GET request
 * const { data, error } = await api.get<UserProfile>('/api/profile');
 * 
 * // POST request with body
 * const { data, error } = await api.post<CreateResponse>('/api/items', { name: 'Item' });
 */
async function request<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { requireAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Attach JWT token if authentication is required
  if (requireAuth) {
    const token = await getAccessToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      return {
        data: null,
        error: errorMessage,
        status: response.status,
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {
        data: null,
        error: null,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
      status: 0,
    };
  }
}

/**
 * API client with convenience methods for common HTTP verbs.
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Example usage with FastAPI:
 * 
 * ```typescript
 * // In a component or hook
 * import { api } from '@/app/lib/api';
 * 
 * async function fetchProtectedData() {
 *   const { data, error } = await api.get<MyDataType>('/api/protected-endpoint');
 *   
 *   if (error) {
 *     console.error('Failed to fetch:', error);
 *     return;
 *   }
 *   
 *   // Use data
 * }
 * ```
 * 
 * The JWT token flow:
 * 1. User signs in via Supabase Auth (frontend)
 * 2. Supabase stores session with access_token
 * 3. api.get/post/etc calls getAccessToken()
 * 4. Token is attached as Authorization: Bearer <token>
 * 5. FastAPI validates the JWT and extracts user info
 */

