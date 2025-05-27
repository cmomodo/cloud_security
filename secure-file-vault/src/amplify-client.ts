// Example client-side integration with Amplify

import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';

// Function to configure Amplify with your backend
export function configureAmplify(config: {
  userPoolId: string;
  userPoolWebClientId: string;
  identityPoolId: string;
  region: string;
}) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolWebClientId,
        identityPoolId: config.identityPoolId,
        loginWith: {
          email: true,
        },
      },
    },
    // Add other configurations as needed
  });
}

// Helper functions for authentication
export async function login(username: string, password: string) {
  try {
    const signInOutput = await signIn({
      username,
      password,
    });
    return signInOutput;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut();
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function getCurrentSession() {
  try {
    const session = await fetchAuthSession();
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

export async function getCurrentCredentials() {
  try {
    const session = await fetchAuthSession();
    return session.credentials;
  } catch (error) {
    console.error('Error getting credentials:', error);
    return null;
  }
}

// Example function to get JWT token for accessing protected resources
export async function getIdToken(): Promise<string | null> {
  try {
    const tokenProvider = cognitoUserPoolsTokenProvider;
    const authTokens = await tokenProvider.getTokens(); // Changed from getIdToken()

    if (authTokens && authTokens.idToken) {
      return authTokens.idToken.toString(); // Access the idToken and convert to string
    }
    // It's possible there's no ID token (e.g., if not signed in or scope doesn't include openid)
    console.warn('ID token not found in the current authentication tokens.');
    return null;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
}