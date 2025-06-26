# Secure File Vault Frontend

This is a simple frontend for testing the Secure File Vault application with your existing Cognito admin user.

## Setup Instructions

1. Deploy your CDK stack if you haven't already:

   ```
   npm run cdk deploy
   ```

2. Note the outputs from the CDK deployment:

   - UserPoolId
   - UserPoolClientId
   - IdentityPoolId
   - BucketName

3. Update the configuration in `main.js`:

   - Open `main.js` and locate the `config` object at the top
   - Replace the placeholder values with your actual values from the CDK outputs

4. Start a simple HTTP server to test:

   ```
   python -m http.server 8080
   ```

5. Access the frontend at http://localhost:8080

## Login with Admin User

1. Use your existing admin user credentials to log in:

   - Username: [your admin username]
   - Password: [your admin password]

2. After logging in, you should be able to:
   - Upload files
   - View all files in the bucket (as admin)
   - Download files
   - Delete files

## Troubleshooting

If you encounter CORS errors:

1. Check that your S3 bucket has appropriate CORS configuration
2. Make sure your Cognito Identity Pool is properly configured with trust relationships
3. Verify the admin user is in the "admins" group in Cognito
