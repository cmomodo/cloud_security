"use strict";
// Example client-side integration with Amplify
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureAmplify = configureAmplify;
exports.login = login;
exports.logout = logout;
exports.getCurrentSession = getCurrentSession;
exports.getCurrentCredentials = getCurrentCredentials;
exports.getIdToken = getIdToken;
const aws_amplify_1 = require("aws-amplify");
const cognito_1 = require("@aws-amplify/auth/cognito");
const auth_1 = require("aws-amplify/auth");
// Function to configure Amplify with your backend
function configureAmplify(config) {
    aws_amplify_1.Amplify.configure({
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
async function login(username, password) {
    try {
        const signInOutput = await (0, auth_1.signIn)({
            username,
            password,
        });
        return signInOutput;
    }
    catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
}
async function logout() {
    try {
        await (0, auth_1.signOut)();
        return { success: true };
    }
    catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}
async function getCurrentSession() {
    try {
        const session = await (0, auth_1.fetchAuthSession)();
        return session;
    }
    catch (error) {
        console.error('Error getting current session:', error);
        return null;
    }
}
async function getCurrentCredentials() {
    try {
        const session = await (0, auth_1.fetchAuthSession)();
        return session.credentials;
    }
    catch (error) {
        console.error('Error getting credentials:', error);
        return null;
    }
}
// Example function to get JWT token for accessing protected resources
async function getIdToken() {
    try {
        const tokenProvider = cognito_1.cognitoUserPoolsTokenProvider;
        const authTokens = await tokenProvider.getTokens(); // Changed from getIdToken()
        if (authTokens && authTokens.idToken) {
            return authTokens.idToken.toString(); // Access the idToken and convert to string
        }
        // It's possible there's no ID token (e.g., if not signed in or scope doesn't include openid)
        console.warn('ID token not found in the current authentication tokens.');
        return null;
    }
    catch (error) {
        console.error('Error getting ID token:', error);
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1jbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbXBsaWZ5LWNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsK0NBQStDOztBQU8vQyw0Q0FtQkM7QUFHRCxzQkFXQztBQUVELHdCQVFDO0FBRUQsOENBUUM7QUFFRCxzREFRQztBQUdELGdDQWVDO0FBdEZELDZDQUFzQztBQUN0Qyx1REFBMEU7QUFDMUUsMkNBQXFFO0FBRXJFLGtEQUFrRDtBQUNsRCxTQUFnQixnQkFBZ0IsQ0FBQyxNQUtoQztJQUNDLHFCQUFPLENBQUMsU0FBUyxDQUFDO1FBQ2hCLElBQUksRUFBRTtZQUNKLE9BQU8sRUFBRTtnQkFDUCxVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7Z0JBQzdCLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7Z0JBQzVDLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDckMsU0FBUyxFQUFFO29CQUNULEtBQUssRUFBRSxJQUFJO2lCQUNaO2FBQ0Y7U0FDRjtRQUNELHFDQUFxQztLQUN0QyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsc0NBQXNDO0FBQy9CLEtBQUssVUFBVSxLQUFLLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjtJQUM1RCxJQUFJLENBQUM7UUFDSCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUEsYUFBTSxFQUFDO1lBQ2hDLFFBQVE7WUFDUixRQUFRO1NBQ1QsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFDLE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFTSxLQUFLLFVBQVUsTUFBTTtJQUMxQixJQUFJLENBQUM7UUFDSCxNQUFNLElBQUEsY0FBTyxHQUFFLENBQUM7UUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0MsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQztBQUVNLEtBQUssVUFBVSxpQkFBaUI7SUFDckMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFBLHVCQUFnQixHQUFFLENBQUM7UUFDekMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFTSxLQUFLLFVBQVUscUJBQXFCO0lBQ3pDLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBQSx1QkFBZ0IsR0FBRSxDQUFDO1FBQ3pDLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUM3QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQztBQUVELHNFQUFzRTtBQUMvRCxLQUFLLFVBQVUsVUFBVTtJQUM5QixJQUFJLENBQUM7UUFDSCxNQUFNLGFBQWEsR0FBRyx1Q0FBNkIsQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QjtRQUVoRixJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckMsT0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsMkNBQTJDO1FBQ25GLENBQUM7UUFDRCw2RkFBNkY7UUFDN0YsT0FBTyxDQUFDLElBQUksQ0FBQywwREFBMEQsQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBFeGFtcGxlIGNsaWVudC1zaWRlIGludGVncmF0aW9uIHdpdGggQW1wbGlmeVxuXG5pbXBvcnQgeyBBbXBsaWZ5IH0gZnJvbSAnYXdzLWFtcGxpZnknO1xuaW1wb3J0IHsgY29nbml0b1VzZXJQb29sc1Rva2VuUHJvdmlkZXIgfSBmcm9tICdAYXdzLWFtcGxpZnkvYXV0aC9jb2duaXRvJztcbmltcG9ydCB7IGZldGNoQXV0aFNlc3Npb24sIHNpZ25Jbiwgc2lnbk91dCB9IGZyb20gJ2F3cy1hbXBsaWZ5L2F1dGgnO1xuXG4vLyBGdW5jdGlvbiB0byBjb25maWd1cmUgQW1wbGlmeSB3aXRoIHlvdXIgYmFja2VuZFxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ3VyZUFtcGxpZnkoY29uZmlnOiB7XG4gIHVzZXJQb29sSWQ6IHN0cmluZztcbiAgdXNlclBvb2xXZWJDbGllbnRJZDogc3RyaW5nO1xuICBpZGVudGl0eVBvb2xJZDogc3RyaW5nO1xuICByZWdpb246IHN0cmluZztcbn0pIHtcbiAgQW1wbGlmeS5jb25maWd1cmUoe1xuICAgIEF1dGg6IHtcbiAgICAgIENvZ25pdG86IHtcbiAgICAgICAgdXNlclBvb2xJZDogY29uZmlnLnVzZXJQb29sSWQsXG4gICAgICAgIHVzZXJQb29sQ2xpZW50SWQ6IGNvbmZpZy51c2VyUG9vbFdlYkNsaWVudElkLFxuICAgICAgICBpZGVudGl0eVBvb2xJZDogY29uZmlnLmlkZW50aXR5UG9vbElkLFxuICAgICAgICBsb2dpbldpdGg6IHtcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICAvLyBBZGQgb3RoZXIgY29uZmlndXJhdGlvbnMgYXMgbmVlZGVkXG4gIH0pO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb25zIGZvciBhdXRoZW50aWNhdGlvblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luKHVzZXJuYW1lOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzaWduSW5PdXRwdXQgPSBhd2FpdCBzaWduSW4oe1xuICAgICAgdXNlcm5hbWUsXG4gICAgICBwYXNzd29yZCxcbiAgICB9KTtcbiAgICByZXR1cm4gc2lnbkluT3V0cHV0O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNpZ25pbmcgaW46JywgZXJyb3IpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXQoKSB7XG4gIHRyeSB7XG4gICAgYXdhaXQgc2lnbk91dCgpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzaWduaW5nIG91dDonLCBlcnJvcik7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRTZXNzaW9uKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBmZXRjaEF1dGhTZXNzaW9uKCk7XG4gICAgcmV0dXJuIHNlc3Npb247XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBjdXJyZW50IHNlc3Npb246JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50Q3JlZGVudGlhbHMoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IGZldGNoQXV0aFNlc3Npb24oKTtcbiAgICByZXR1cm4gc2Vzc2lvbi5jcmVkZW50aWFscztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGNyZWRlbnRpYWxzOicsIGVycm9yKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyBFeGFtcGxlIGZ1bmN0aW9uIHRvIGdldCBKV1QgdG9rZW4gZm9yIGFjY2Vzc2luZyBwcm90ZWN0ZWQgcmVzb3VyY2VzXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0SWRUb2tlbigpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0b2tlblByb3ZpZGVyID0gY29nbml0b1VzZXJQb29sc1Rva2VuUHJvdmlkZXI7XG4gICAgY29uc3QgYXV0aFRva2VucyA9IGF3YWl0IHRva2VuUHJvdmlkZXIuZ2V0VG9rZW5zKCk7IC8vIENoYW5nZWQgZnJvbSBnZXRJZFRva2VuKClcblxuICAgIGlmIChhdXRoVG9rZW5zICYmIGF1dGhUb2tlbnMuaWRUb2tlbikge1xuICAgICAgcmV0dXJuIGF1dGhUb2tlbnMuaWRUb2tlbi50b1N0cmluZygpOyAvLyBBY2Nlc3MgdGhlIGlkVG9rZW4gYW5kIGNvbnZlcnQgdG8gc3RyaW5nXG4gICAgfVxuICAgIC8vIEl0J3MgcG9zc2libGUgdGhlcmUncyBubyBJRCB0b2tlbiAoZS5nLiwgaWYgbm90IHNpZ25lZCBpbiBvciBzY29wZSBkb2Vzbid0IGluY2x1ZGUgb3BlbmlkKVxuICAgIGNvbnNvbGUud2FybignSUQgdG9rZW4gbm90IGZvdW5kIGluIHRoZSBjdXJyZW50IGF1dGhlbnRpY2F0aW9uIHRva2Vucy4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIElEIHRva2VuOicsIGVycm9yKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufSJdfQ==