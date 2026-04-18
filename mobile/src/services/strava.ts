import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import api from './api';
import type { StravaTokens, StravaActivity } from '@/types';

/** Minimal base64 decoder — avoids depending on base-64 npm package.
 *  Uses `atob` (global in React Native 0.71+) and decodeURIComponent to
 *  recover UTF-8 accented characters (names like "João") correctly. */
function base64UrlDecode(input: string): string {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = (globalThis as any).atob(b64) as string;
  // Reinterpret the latin-1 byte string as UTF-8
  return decodeURIComponent(
    binary
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
}

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID =
  (Constants.expoConfig?.extra?.stravaClientId as string | undefined) ?? '216298';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:8000';

// Strava requires unencoded commas between scopes (it rejects %2C). Build
// the URL by hand to keep the scope parameter literal.
const STRAVA_SCOPE_STRING = 'read,activity:read_all,profile:read_all';

// The HTTP callback on our own backend. Strava's "Authorization Callback
// Domain" must be set to the host of this URL (e.g. `localhost`). The
// backend's /auth/strava/callback endpoint exchanges the code for tokens and
// then redirects the browser to the `vincere://` deep link, closing the
// WebBrowser session.
const BACKEND_CALLBACK = `${API_URL}/auth/strava/callback`;

// The deep link the backend sends us back to after a successful exchange.
// `openAuthSessionAsync` watches for this URL to close the popup.
const APP_DEEP_LINK = 'vincere://strava/callback';

type AuthResponse =
  | { type: 'success'; tokens: StravaTokens }
  | { type: 'cancel' }
  | { type: 'error'; error: string }
  | null;

export function useStravaAuthRequest() {
  const [response, setResponse] = useState<AuthResponse>(null);

  const promptAsync = async () => {
    const authUrl =
      `https://www.strava.com/oauth/mobile/authorize` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(BACKEND_CALLBACK)}` +
      `&response_type=code` +
      `&approval_prompt=auto` +
      `&scope=${STRAVA_SCOPE_STRING}`;

    console.log('[strava] opening auth URL', authUrl);
    console.log('[strava] waiting for deep link', APP_DEEP_LINK);

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, APP_DEEP_LINK);
      console.log('[strava] auth session result', result);

      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const err = parsed.searchParams.get('error');
        const data = parsed.searchParams.get('data');
        if (err) {
          setResponse({ type: 'error', error: err });
          return;
        }
        if (!data) {
          setResponse({ type: 'error', error: 'Tokens ausentes no callback' });
          return;
        }
        try {
          const decoded = base64UrlDecode(data);
          const tokens = JSON.parse(decoded) as StravaTokens;
          setResponse({ type: 'success', tokens });
        } catch (parseErr: any) {
          setResponse({
            type: 'error',
            error: `Falha ao decodificar tokens: ${parseErr?.message ?? parseErr}`,
          });
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setResponse({ type: 'cancel' });
      }
    } catch (e: any) {
      setResponse({ type: 'error', error: e?.message ?? 'Erro desconhecido' });
    }
  };

  return {
    request: { ready: true },
    response,
    promptAsync,
    redirectUri: BACKEND_CALLBACK,
  };
}

/**
 * Exchanges the OAuth authorization code for access/refresh tokens.
 * This must go through our backend to keep the client_secret private.
 */
export async function exchangeStravaCode(
  code: string,
  redirectUri: string,
): Promise<StravaTokens> {
  const { data } = await api.post<StravaTokens>('/auth/strava/exchange', {
    code,
    redirect_uri: redirectUri,
  });
  return data;
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  const { data } = await api.post<StravaTokens>('/auth/strava/refresh', {
    refresh_token: refreshToken,
  });
  return data;
}

export async function fetchRecentActivities(after?: number): Promise<StravaActivity[]> {
  const { data } = await api.get<StravaActivity[]>('/strava/activities', {
    params: { after },
  });
  return data;
}

/** Fetches ~600 runs (last few months) — needed for accurate PR computation
 *  across distances like 21k / 42k that don't appear in the last 30 runs. */
export async function fetchFullHistory(): Promise<StravaActivity[]> {
  const { data } = await api.get<StravaActivity[]>('/strava/activities', {
    params: { full: true },
    timeout: 30000,
  });
  return data;
}

export async function fetchActivityDetail(id: number): Promise<StravaActivity> {
  const { data } = await api.get<StravaActivity>(`/strava/activities/${id}`);
  return data;
}
