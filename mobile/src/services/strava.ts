import { useState, useMemo } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import api from './api';
import type { StravaTokens, StravaActivity } from '@/types';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID =
  (Constants.expoConfig?.extra?.stravaClientId as string | undefined) ?? '216298';

// Strava requires unencoded commas between scopes (it rejects %2C). We
// assemble the URL by hand instead of using expo-auth-session's useAuthRequest
// because the latter URL-encodes query params and breaks Strava's parser.
const STRAVA_SCOPE_STRING = 'read,activity:read_all,profile:read_all';

type AuthResponse =
  | { type: 'success'; params: { code: string } }
  | { type: 'cancel' }
  | { type: 'error'; error: string }
  | null;

export function useStravaAuthRequest() {
  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: 'vincere',
        path: 'strava/callback',
      }),
    [],
  );

  const [response, setResponse] = useState<AuthResponse>(null);

  const promptAsync = async () => {
    const authUrl =
      `https://www.strava.com/oauth/mobile/authorize` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&approval_prompt=auto` +
      // Scope must be comma-separated and NOT URL-encoded — Strava rejects
      // %2C. Appending it raw preserves the commas in the final request.
      `&scope=${STRAVA_SCOPE_STRING}`;

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const code = parsed.searchParams.get('code');
        const err = parsed.searchParams.get('error');
        if (code) {
          setResponse({ type: 'success', params: { code } });
        } else {
          setResponse({ type: 'error', error: err ?? 'Código não recebido' });
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
    redirectUri,
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

export async function fetchActivityDetail(id: number): Promise<StravaActivity> {
  const { data } = await api.get<StravaActivity>(`/strava/activities/${id}`);
  return data;
}
