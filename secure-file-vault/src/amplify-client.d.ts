export declare function configureAmplify(config: {
    userPoolId: string;
    userPoolWebClientId: string;
    identityPoolId: string;
    region: string;
}): void;
export declare function login(username: string, password: string): Promise<import("aws-amplify/auth").SignInOutput>;
export declare function logout(): Promise<{
    success: boolean;
}>;
export declare function getCurrentSession(): Promise<import("aws-amplify/auth").AuthSession | null>;
export declare function getCurrentCredentials(): Promise<import("@aws-amplify/core/internals/utils").AWSCredentials | null | undefined>;
export declare function getIdToken(): Promise<string | null>;
