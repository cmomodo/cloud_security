import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# ─── CONFIG ─────────────────────────────────────────────────────────────────────
USER_POOL_ID = os.getenv('USER_POOL_ID')
CLIENT_ID = os.getenv('CLIENT_ID')
IDENTITY_POOL_ID = os.getenv('IDENTITY_POOL_ID')
REGION = os.getenv('REGION')
ACCOUNT_ID = os.getenv('ACCOUNT_ID')
BUCKET_NAME = os.getenv('BUCKET_NAME')
USERNAME = os.getenv('USERNAME')
PASSWORD = os.getenv('PASSWORD')

# Validate that all required environment variables are set
required_vars = ['USER_POOL_ID', 'CLIENT_ID', 'IDENTITY_POOL_ID', 'REGION', 'ACCOUNT_ID', 'BUCKET_NAME', 'USERNAME', 'PASSWORD']
missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

# ─── STEP 1: Get an IdToken via ADMIN_NO_SRP_AUTH ────────────────────────────────
cognito_idp = boto3.client("cognito-idp", region_name=REGION)
resp = cognito_idp.admin_initiate_auth(
    UserPoolId=USER_POOL_ID,
    ClientId=CLIENT_ID,
    AuthFlow="ADMIN_NO_SRP_AUTH",
    AuthParameters={
        "USERNAME": USERNAME,
        "PASSWORD": PASSWORD
    }
)

# Handle NEW_PASSWORD_REQUIRED challenge if present
if 'ChallengeName' in resp and resp['ChallengeName'] == 'NEW_PASSWORD_REQUIRED':
    print(f"User {USERNAME} requires password change. Responding to challenge...")
    
    new_password = "NewPassword123!@#"  # Create a new permanent password
    
    # Respond to the new password challenge
    resp = cognito_idp.admin_respond_to_auth_challenge(
        UserPoolId=USER_POOL_ID,
        ClientId=CLIENT_ID,
        ChallengeName='NEW_PASSWORD_REQUIRED',
        Session=resp['Session'],
        ChallengeResponses={
            'USERNAME': USERNAME,
            'NEW_PASSWORD': new_password
        }
    )
    print(f"Password changed successfully for {USERNAME}")

print("Authentication successful!")
id_token = resp["AuthenticationResult"]["IdToken"]

# ─── STEP 2: Exchange IdToken for AWS creds ────────────────────────────────────
cognito_identity = boto3.client("cognito-identity", region_name=REGION)
login_key = f"cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"

# get IdentityId
identity = cognito_identity.get_id(
    AccountId      = ACCOUNT_ID,
    IdentityPoolId= IDENTITY_POOL_ID,
    Logins        = {login_key: id_token}
)

# get temporary AWS creds
creds = cognito_identity.get_credentials_for_identity(
    IdentityId    = identity["IdentityId"],
    Logins        = {login_key: id_token}
)["Credentials"]

# ─── STEP 3: Call S3 with those creds ─────────────────────────────────────────
session = boto3.Session(
    aws_access_key_id     = creds["AccessKeyId"],
    aws_secret_access_key = creds["SecretKey"],
    aws_session_token     = creds["SessionToken"],
    region_name           = REGION
)
s3 = session.client("s3")

print(f"\nTesting as {USERNAME} in group…")
# e.g. list bucket root
try:
    resp = s3.list_objects_v2(Bucket=BUCKET_NAME)
    print("✔ list_objects_v2 succeeded:", [o["Key"] for o in resp.get("Contents",[])])
except ClientError as e:
    print("✖ list_objects_v2 failed:", e)

# e.g. put an object in another user’s folder (should fail for customers/workers)
try:
    s3.put_object(Bucket=BUCKET_NAME, Key="admin1/test.txt", Body=b"hello")
    print("✖ put_object to admin1 folder succeeded (unexpected)")
except ClientError as e:
    print("✔ put_object denied as expected:", e.response["Error"]["Code"])