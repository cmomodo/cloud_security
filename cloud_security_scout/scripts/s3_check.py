import boto3
import json
from botocore.exceptions import ClientError
from tabulate import tabulate

def get_s3_bucket_info():
    # Initialize S3 client
    s3_client = boto3.client('s3')

    # List to store bucket information
    bucket_info = []

    try:
        # List all buckets
        response = s3_client.list_buckets()
        buckets = response.get('Buckets', [])

        if not buckets:
            print("No buckets found in the account.")
            return

        for bucket in buckets:
            bucket_name = bucket['Name']
            policy_status = "No Policy"
            acl_status = "Private"
            public_access_block = "Enabled"

            try:
                # Get bucket policy
                try:
                    policy_response = s3_client.get_bucket_policy(Bucket=bucket_name)
                    policy = json.loads(policy_response['Policy'])
                    policy_status = "Policy Exists"
                except ClientError as e:
                    if e.response['Error']['Code'] == 'NoSuchBucketPolicy':
                        policy_status = "No Policy"
                    else:
                        policy_status = f"Error: {e.response['Error']['Message']}"

                # Get bucket ACL
                acl_response = s3_client.get_bucket_acl(Bucket=bucket_name)
                for grant in acl_response['Grants']:
                    grantee = grant.get('Grantee', {})
                    if grantee.get('Type') == 'Group' and 'AllUsers' in grantee.get('URI', ''):
                        acl_status = "Public (AllUsers)"
                        break
                    elif grantee.get('Type') == 'Group' and 'AuthenticatedUsers' in grantee.get('URI', ''):
                        acl_status = "Authenticated Users"
                        break

                # Check public access block settings
                try:
                    pab_response = s3_client.get_public_access_block(Bucket=bucket_name)
                    config = pab_response['PublicAccessBlockConfiguration']
                    public_access_block = (
                        "Enabled" if (
                            config['BlockPublicAcls'] and
                            config['IgnorePublicAcls'] and
                            config['BlockPublicPolicy'] and
                            config['RestrictPublicBuckets']
                        ) else "Partially Disabled" if (
                            not all([
                                config['BlockPublicAcls'],
                                config['IgnorePublicAcls'],
                                config['BlockPublicPolicy'],
                                config['RestrictPublicBuckets']
                            ])
                        ) else "Disabled"
                    )
                except ClientError as e:
                    if e.response['Error']['Code'] == 'NoSuchPublicAccessBlockConfiguration':
                        public_access_block = "Not Configured"
                    else:
                        public_access_block = f"Error: {e.response['Error']['Message']}"

                # Append bucket info to list
                bucket_info.append([
                    bucket_name,
                    policy_status,
                    acl_status,
                    public_access_block
                ])

            except ClientError as e:
                # Handle bucket-level errors (e.g., access denied)
                bucket_info.append([
                    bucket_name,
                    f"Error: {e.response['Error']['Message']}",
                    f"Error: {e.response['Error']['Message']}",
                    f"Error: {e.response['Error']['Message']}"
                ])

        # Print table
        headers = ["Bucket Name", "Bucket Policy", "ACL Status", "Public Access Block"]
        print(tabulate(bucket_info, headers=headers, tablefmt="grid"))

    except ClientError as e:
        print(f"Error listing buckets: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")

if __name__ == "__main__":
    get_s3_bucket_info()
