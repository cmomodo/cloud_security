import boto3
import json
from botocore.exceptions import ClientError

# Initialize boto3 clients
iam = boto3.client('iam')
s3 = boto3.client('s3')

# Define bucket name
BUCKET_NAME = 'securefilevaultstack-filevault275e1a6fc4-lwpik561taha'

# Create bucket if it doesn't exist
try:
    s3.create_bucket(
        Bucket=BUCKET_NAME,
        CreateBucketConfiguration={'LocationConstraint': 'us-east-2'}  # Change to your preferred region
    )
    print(f"Created bucket {BUCKET_NAME}")
except ClientError as e:
    error_code = e.response['Error']['Code']
    if error_code in ['BucketAlreadyExists', 'BucketAlreadyOwnedByYou']:
        print(f"Bucket {BUCKET_NAME} already exists or is already owned by you")
    else:
        print(f"Error creating bucket: {e}")
        raise

# Create customer folders
customers = ['customer1', 'customer2', 'customer3', 'customer4', 'customer5']
for customer in customers:
    s3.put_object(Bucket=BUCKET_NAME, Key=f"{customer}/")
    print(f"Created folder for {customer}")

# Define IAM policies

# Admin policy - full access
admin_policy_document = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:*",
            "Resource": [
                f"arn:aws:s3:::{BUCKET_NAME}",
                f"arn:aws:s3:::{BUCKET_NAME}/*"
            ]
        }
    ]
}

# Worker policy - read and delete only
worker_policy_document = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket",

            ],
            "Resource": [
                f"arn:aws:s3:::{BUCKET_NAME}",
                f"arn:aws:s3:::{BUCKET_NAME}/*"
            ]
        }
    ]
}

# Function to create customer policy with access only to their folder
def create_customer_policy_document(customer_name):
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    f"arn:aws:s3:::{BUCKET_NAME}/{customer_name}/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": "s3:ListBucket",
                "Resource": f"arn:aws:s3:::{BUCKET_NAME}",
                "Condition": {
                    "StringLike": {
                        "s3:prefix": f"{customer_name}/*"
                    }
                }
            }
        ]
    }

# Create IAM policies
def create_policy(policy_name, policy_document):
    try:
        response = iam.create_policy(
            PolicyName=policy_name,
            PolicyDocument=json.dumps(policy_document)
        )
        policy_arn = response['Policy']['Arn']
        print(f"Created policy {policy_name} with ARN: {policy_arn}")
        return policy_arn
    except ClientError as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            print(f"Policy {policy_name} already exists")
            # Get the policy ARN if it already exists
            account_id = boto3.client('sts').get_caller_identity().get('Account')
            return f"arn:aws:iam::{account_id}:policy/{policy_name}"
        else:
            print(f"Error creating policy: {e}")
            raise

# Create users and assign policies
def create_user_with_policy(username, policy_arn):
    try:
        iam.create_user(UserName=username)
        print(f"Created user {username}")

        # Create access key for the user
        response = iam.create_access_key(UserName=username)
        access_key = response['AccessKey']['AccessKeyId']
        secret_key = response['AccessKey']['SecretAccessKey']
        print(f"Created access key for {username}: {access_key}")

        # Attach policy to user
        iam.attach_user_policy(
            UserName=username,
            PolicyArn=policy_arn
        )
        print(f"Attached policy {policy_arn} to user {username}")

        return {
            'username': username,
            'access_key': access_key,
            'secret_key': secret_key
        }
    except ClientError as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            print(f"User {username} already exists")
            return {'username': username, 'error': 'User already exists'}
        else:
            print(f"Error creating user: {e}")
            raise

# Create admin policy
admin_policy_arn = create_policy("S3AdminFullAccess", admin_policy_document)

# Create worker policy
worker_policy_arn = create_policy("S3WorkerReadDeleteAccess", worker_policy_document)

# Create users
admin_users = []
for i in range(1, 3):
    admin_user = create_user_with_policy(f"admin{i}", admin_policy_arn)
    admin_users.append(admin_user)

worker_users = []
for i in range(1, 4):
    worker_user = create_user_with_policy(f"worker{i}", worker_policy_arn)
    worker_users.append(worker_user)

customer_users = []
for i, customer_name in enumerate(customers, 1):
    customer_policy_doc = create_customer_policy_document(customer_name)
    customer_policy_arn = create_policy(f"S3Customer{i}Access", customer_policy_doc)
    customer_user = create_user_with_policy(customer_name, customer_policy_arn)
    customer_users.append(customer_user)

# Print all users and their credentials
print("\nAdmin Users:")
for user in admin_users:
    print(f"Username: {user.get('username')}, Access Key: {user.get('access_key')}")

print("\nWorker Users:")
for user in worker_users:
    print(f"Username: {user.get('username')}, Access Key: {user.get('access_key')}")

print("\nCustomer Users:")
for user in customer_users:
    print(f"Username: {user.get('username')}, Access Key: {user.get('access_key')}")

print("\nNOTE: Make sure to save the secret keys securely. They won't be accessible again.")

# Function to test the permissions using temporary credentials
def test_user_permissions(username, access_key, secret_key):
    session = boto3.Session(
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key
    )

    test_s3 = session.client('s3')

    print(f"\nTesting permissions for {username}:")

    # Test listing buckets
    try:
        response = test_s3.list_buckets()
        print(f"List buckets: Success - {len(response['Buckets'])} buckets found")
    except ClientError as e:
        print(f"List buckets: Failed - {e}")

    # Test listing objects in bucket
    try:
        response = test_s3.list_objects_v2(Bucket=BUCKET_NAME)
        print(f"List objects: Success - {response.get('KeyCount', 0)} objects found")
    except ClientError as e:
        print(f"List objects: Failed - {e}")

    # More tests can be added here based on the expected permissions

# Uncomment to test permissions (requires valid credentials)
# For testing, pick one user from each category
# test_user_permissions(admin_users[0]['username'], admin_users[0]['access_key'], admin_users[0]['secret_key'])
# test_user_permissions(worker_users[0]['username'], worker_users[0]['access_key'], worker_users[0]['secret_key'])
# test_user_permissions(customer_users[0]['username'], customer_users[0]['access_key'], customer_users[0]['secret_key'])
