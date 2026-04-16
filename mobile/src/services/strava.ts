import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import api from './api';
import type { StravaTokens, StravaActivity } from '@/types';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID =
  (Constants.expoConfig?.extra?.stravaClientId as string | undefined) ?? '216298';

const discovery = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
};

export const STRAVA_SCOPES = [
  'read',
  'activity:read_all',
  'profile:read_all',
];

export function useStravaAuthRequest() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'vincere',
    path: 'strava/callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: STRAVA_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { approval_prompt: 'auto' },
    },
    discovery,
  );

  return { request, response, promptAsync, redirectUri };
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
