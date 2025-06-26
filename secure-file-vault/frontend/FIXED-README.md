# Secure File Vault - Frontend Guide

This frontend application connects to AWS services using Cognito for authentication and S3 for file storage.

## Setup Instructions

1. Make sure you have the latest configuration values from your AWS deployment:

   - User Pool ID
   - User Pool Web Client ID
   - Identity Pool ID
   - S3 Bucket Name
   - Region

2. Update the configuration in one of these ways:

   **Option 1**: Edit `main.js` directly and update the `config` object.

   **Option 2**: Use the utility script:

   ```bash
   node update-config.js userPoolId=your-pool-id userPoolWebClientId=your-client-id bucketName=your-bucket-name
   ```

3. Configure local test users (for development only):
   - Edit `users.json` to include any test users you want to use for development
   - The default file includes an admin and a customer user

## Using Local Users for Testing

For easier testing, this frontend includes a mechanism to use local user credentials. This is useful when:

1. You need to test specific user roles (admin, customer)
2. You want to ensure the correct S3 paths are being used
3. You want to debug S3 access issues without having to understand the Cognito token payload

### How it works:

1. Enter username/password that match an entry in `users.json`
2. The code augments your Cognito session with this local user data
3. This ensures the S3 access paths match exactly what the IAM policy expects

## Common Issues and Fixes

### S3 Bucket Access Issues

If you're having trouble accessing the S3 bucket even after login:

1. Check IAM policy for the customer role in `cognito-construct.ts`:

   - The policy restricts access to: `customers/${cognito-identity.amazonaws.com:sub}/*`
   - The path prefix must match exactly, including the correct user ID

2. Check the browser console for errors and pay attention to:

   - The exact S3 path being used in requests
   - The error messages from AWS
   - The user ID and role information

3. Verify your local user configuration:
   - Make sure the `sub` value in your `users.json` matches what's expected
   - Ensure the role is correctly set to either "admin" or "customer"

## Testing Workflow

1. Open the application in a browser
2. Sign in using credentials from `users.json`
3. Upload a file and check if it appears in the list
4. Try downloading and deleting files
5. Check the browser console for detailed logs and any errors

## File Structure

- `index.html` - Main HTML interface
- `main.js` - Main application logic
- `cognito-client.js` - AWS Cognito authentication
- `debug.js` - Debugging tools
- `users.json` - Local user definitions for testing
- `update-config.js` - Utility to update configuration

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Verify your configuration values
3. Ensure your Cognito user belongs to the correct group
4. Verify the S3 paths match the IAM policy expectations
5. Look for any CORS issues in browser network tab
