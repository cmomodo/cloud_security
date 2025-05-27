// Direct Cognito client to replace Amplify Auth

import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  GlobalSignOutCommand,
  GetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { 
  CognitoIdentityClient, 
  GetIdCommand, 
  GetCredentialsForIdentityCommand 
} from "@aws-sdk/client-cognito-identity";

// Configuration interface
export interface CognitoConfig {
  userPoolId: string;
  userPoolWebClientId: string;
  identityPoolId: string;
  region: string;
}

// Auth result interface
export interface AuthResult {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Session interface
export interface Session {
  idToken: string;
  accessToken: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration: Date;
  };
}

// Singleton class to manage Cognito authentication
export class CognitoAuth {
  private static instance: CognitoAuth;
  private config: CognitoConfig | null = null;
  private currentSession: Session | null = null;
  
  private cognitoClient: CognitoIdentityProviderClient | null = null;
  private identityClient: CognitoIdentityClient | null = null;

  private constructor() {}

  public static getInstance(): CognitoAuth {
    if (!CognitoAuth.instance) {
      CognitoAuth.instance = new CognitoAuth();
    }
    return CognitoAuth.instance;
  }

  public configure(config: CognitoConfig): void {
    this.config = config;
    this.cognitoClient = new CognitoIdentityProviderClient({ region: config.region });
    this.identityClient = new CognitoIdentityClient({ region: config.region });
  }

  public async signIn(username: string, password: string): Promise<AuthResult> {
    if (!this.config || !this.cognitoClient) {
      throw new Error('Cognito is not configured');
    }

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.config.userPoolWebClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const response = await this.cognitoClient.send(command);
      
      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      const session: Session = {
        idToken: response.AuthenticationResult.IdToken || '',
        accessToken: response.AuthenticationResult.AccessToken || '',
      };

      this.currentSession = session;

      return {
        idToken: response.AuthenticationResult.IdToken || '',
        accessToken: response.AuthenticationResult.AccessToken || '',
        refreshToken: response.AuthenticationResult.RefreshToken || '',
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  public async signOut(): Promise<void> {
    if (!this.config || !this.cognitoClient || !this.currentSession) {
      return;
    }

    try {
      const command = new GlobalSignOutCommand({
        AccessToken: this.currentSession.accessToken,
      });

      await this.cognitoClient.send(command);
      this.currentSession = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  public async getCurrentSession(): Promise<Session | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      // Validate the access token is still valid
      const command = new GetUserCommand({
        AccessToken: this.currentSession.accessToken,
      });

      await this.cognitoClient?.send(command);
      return this.currentSession;
    } catch (error) {
      console.error('Session expired or invalid');
      this.currentSession = null;
      return null;
    }
  }

  public async getCredentials(): Promise<Session | null> {
    if (!this.config || !this.identityClient || !this.currentSession) {
      return null;
    }

    try {
      // Get identity ID
      const getIdCommand = new GetIdCommand({
        IdentityPoolId: this.config.identityPoolId,
        Logins: {
          [`cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`]: this.currentSession.idToken,
        },
      });
      
      const { IdentityId } = await this.identityClient.send(getIdCommand);
      
      if (!IdentityId) {
        throw new Error('Failed to get identity ID');
      }

      // Get AWS credentials
      const getCredentialsCommand = new GetCredentialsForIdentityCommand({
        IdentityId,
        Logins: {
          [`cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`]: this.currentSession.idToken,
        },
      });
      
      const credentialsResponse = await this.identityClient.send(getCredentialsCommand);
      
      if (!credentialsResponse.Credentials) {
        throw new Error('Failed to get credentials');
      }

      // Update session with credentials
      this.currentSession = {
        ...this.currentSession,
        credentials: {
          accessKeyId: credentialsResponse.Credentials.AccessKeyId || '',
          secretAccessKey: credentialsResponse.Credentials.SecretKey || '',
          sessionToken: credentialsResponse.Credentials.SessionToken || '',
          expiration: credentialsResponse.Credentials.Expiration || new Date(),
        },
      };

      return this.currentSession;
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  }

  public async getIdToken(): Promise<string | null> {
    const session = await this.getCurrentSession();
    return session ? session.idToken : null;
  }
}

// Helper functions for simpler API
export function configureCognito(config: CognitoConfig): void {
  CognitoAuth.getInstance().configure(config);
}

export async function login(username: string, password: string): Promise<AuthResult> {
  return CognitoAuth.getInstance().signIn(username, password);
}

export async function logout(): Promise<void> {
  return CognitoAuth.getInstance().signOut();
}

export async function getCurrentSession(): Promise<Session | null> {
  return CognitoAuth.getInstance().getCurrentSession();
}

export async function getCurrentCredentials(): Promise<Session | null> {
  return CognitoAuth.getInstance().getCredentials();
}

export async function getIdToken(): Promise<string | null> {
  return CognitoAuth.getInstance().getIdToken();
}