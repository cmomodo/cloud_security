export interface CognitoConfig {
  userPoolId: string;
  userPoolWebClientId: string;
  identityPoolId: string;
  region: string;
}
export interface AuthResult {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
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
export declare class CognitoAuth {
  private static instance;
  private config;
  private currentSession;
  private cognitoClient;
  private identityClient;
  private constructor();
  static getInstance(): CognitoAuth;
  configure(config: CognitoConfig): void;
  signIn(username: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<Session | null>;
  getCredentials(): Promise<Session | null>;
  getIdToken(): Promise<string | null>;
}
export declare function configureCognito(config: CognitoConfig): void;
export declare function login(
  username: string,
  password: string,
): Promise<AuthResult>;
export declare function logout(): Promise<void>;
export declare function getCurrentSession(): Promise<Session | null>;
export declare function getCurrentCredentials(): Promise<Session | null>;
export declare function getIdToken(): Promise<string | null>;
