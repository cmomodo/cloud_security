import boto3
import json
from botocore.exceptions import ClientError

# Initialize boto3 clients
iam = boto3.client('iam')
s3 = boto3.client('s3')
sts = boto3.client('sts')

# Define constants
BUCKET_NAME = 'securefilevaultstack-filevault275e1a6fc4-lwpik561taha'
ADMIN_USERS = ['admin1', 'admin2']
WORKER_USERS = ['worker1', 'worker2', 'worker3']
CUSTOMER_USERS = ['customer1', 'customer2', 'customer3', 'customer4', 'customer5']
ALL_USERS = ADMIN_USERS + WORKER_USERS + CUSTOMER_USERS

# Get account ID for building ARNs
account_id = sts.get_caller_identity()['Account']

# Define policies to be deleted
policies = [
    "S3AdminFullAccess",
    "S3WorkerReadDeleteAccess"
]
# Add customer policies
for i in range(1, len(CUSTOMER_USERS) + 1):
    policies.append(f"S3Customer{i}Access")

def delete_bucket(bucket_name):
    """Delete all objects in the bucket and then the bucket itself"""
    print(f"Deleting all objects in bucket {bucket_name}...")
    try:
        # List all objects including versions if bucket has versioning enabled
        paginator = s3.get_paginator('list_object_versions')
        for page in paginator.paginate(Bucket=bucket_name):
            # Delete versions
            if 'Versions' in page:
                for version in page['Versions']:
                    s3.delete_object(
                        Bucket=bucket_name,
                        Key=version['Key'],
                        VersionId=version['VersionId']
                    )
                    print(f"Deleted object {version['Key']} version {version['VersionId']}")

            # Delete delete markers
            if 'DeleteMarkers' in page:
                for marker in page['DeleteMarkers']:
                    s3.delete_object(
                        Bucket=bucket_name,
                        Key=marker['Key'],
                        VersionId=marker['VersionId']
                    )
                    print(f"Deleted delete marker {marker['Key']} version {marker['VersionId']}")

        # Delete objects without versions
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket_name):
            if 'Contents' in page:
                for obj in page['Contents']:
                    s3.delete_object(
                        Bucket=bucket_name,
                        Key=obj['Key']
                    )
                    print(f"Deleted object {obj['Key']}")

        # Delete the bucket
        s3.delete_bucket(Bucket=bucket_name)
        print(f"Deleted bucket {bucket_name}")
    except ClientError as e:
        print(f"Error working with bucket {bucket_name}: {e}")

def cleanup_user(username):
    """Delete access keys and detach policies for a user, then delete the user"""
    print(f"Cleaning up user {username}...")

    try:
        # List and delete access keys
        response = iam.list_access_keys(UserName=username)
        for key in response.get('AccessKeyMetadata', []):
            iam.delete_access_key(
                UserName=username,
                AccessKeyId=key['AccessKeyId']
            )
            print(f"Deleted access key {key['AccessKeyId']} for user {username}")

        # List and detach attached policies
        response = iam.list_attached_user_policies(UserName=username)
        for policy in response.get('AttachedPolicies', []):
            iam.detach_user_policy(
                UserName=username,
                PolicyArn=policy['PolicyArn']
            )
            print(f"Detached policy {policy['PolicyArn']} from user {username}")

        # Delete the user
        iam.delete_user(UserName=username)
        print(f"Deleted user {username}")
    except ClientError as e:
        print(f"Error cleaning up user {username}: {e}")

def delete_policy(policy_name):
    """Delete an IAM policy by name"""
    policy_arn = f"arn:aws:iam::{account_id}:policy/{policy_name}"
    try:
        iam.delete_policy(PolicyArn=policy_arn)
        print(f"Deleted policy {policy_name} ({policy_arn})")
    except ClientError as e:
        print(f"Error deleting policy {policy_name}: {e}")

# Main execution
if __name__ == "__main__":
    print("Starting cleanup of all resources...")

    # 1. Delete S3 bucket and its contents
    delete_bucket(BUCKET_NAME)

    # 2. Clean up all IAM users
    for user in ALL_USERS:
        cleanup_user(user)

    # 3. Delete IAM policies
    for policy in policies:
        delete_policy(policy)

    print("Cleanup completed!")
