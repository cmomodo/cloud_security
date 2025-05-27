# Testing with Existing Admin User

Follow these steps to test the Secure File Vault application with your existing admin user:

## Step 1: Deploy the CDK Stack

First, deploy your CDK stack if you haven't already:

```bash
npm run cdk deploy

```

Take note of the outputs from this deployment, as you'll need them in the next step.

## Step 2: Update Configuration

1. Open `update-config.js` and update the configuration object with the values from your CDK deployment:

   - UserPoolId
   - UserPoolClientId
   - IdentityPoolId
   - Region
   - BucketName

2. Open `update-config.js` in your browser's developer console and run the script to get the formatted configuration.

3. Copy the generated configuration and replace the config object in `main.js`.

## Step 3: Start the Frontend

Start a simple HTTP server in the frontend directory:

```bash
cd frontend
python -m http.server 8080
```

Then open your browser to http://localhost:8080

## Step 4: Log in with Admin User

Use your existing admin user credentials:

Username: admin1@example.com (or your existing admin username)
Password: [your admin password]

## Step 5: Test Admin Features

Once logged in, you should be able to:

1. See that you're logged in as an admin (check the console for user group information)
2. Upload files to the admin directory
3. View all files in the bucket (as admin)
4. Download files
5. Delete files

## Troubleshooting

If you have trouble logging in:

1. Verify that your admin user exists in the Cognito User Pool
2. Make sure the admin user is in the "admins" group
3. Check that the user has a verified email
4. Ensure you're using the correct password

If you encounter CORS errors when accessing S3:

1. You may need to add CORS configuration to your S3 bucket
2. Add the following CORS configuration to your bucket via AWS Console or CLI:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:8080"],
    "ExposeHeaders": ["ETag"]
  }
]
```
