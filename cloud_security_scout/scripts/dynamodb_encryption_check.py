import boto3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def check_dynamodb_encryption():
    """
    Checks all DynamoDB tables in the AWS account and region configured for the
    boto3 session and reports their server-side encryption (SSE) status.
    """
    try:
        dynamodb_client = boto3.client('dynamodb')
        logging.info("Successfully created a boto3 client for DynamoDB.")
    except Exception as e:
        logging.error(f"Failed to create boto3 client for DynamoDB: {e}")
        return

    table_names = []
    try:
        paginator = dynamodb_client.get_paginator('list_tables')
        for page in paginator.paginate():
            table_names.extend(page.get('TableNames', []))
        logging.info(f"Found {len(table_names)} DynamoDB tables in the region.")
    except Exception as e:
        logging.error(f"Failed to list DynamoDB tables: {e}")
        return

    if not table_names:
        logging.warning("No DynamoDB tables found in this region.")
        return

    logging.info("--- Starting DynamoDB Encryption Check ---")
    all_encrypted = True
    for table_name in table_names:
        try:
            response = dynamodb_client.describe_table(TableName=table_name)
            table_description = response.get('Table', {})

            sse_description = table_description.get('SSEDescription')

            if sse_description and sse_description.get('Status') == 'ENABLED':
                sse_type = sse_description.get('SSEType')
                kms_key_arn = sse_description.get('KMSMasterKeyArn')

                logging.info(f"✅ Table '{table_name}': Encryption is ENABLED.")
                logging.info(f"   - SSE Type: {sse_type}")
                if kms_key_arn:
                    logging.info(f"   - KMS Key ARN: {kms_key_arn}")
            else:
                all_encrypted = False
                logging.warning(f"❌ Table '{table_name}': Encryption is DISABLED.")

        except Exception as e:
            all_encrypted = False
            logging.error(f"Could not describe table '{table_name}': {e}")

    logging.info("--- DynamoDB Encryption Check Complete ---")
    if all_encrypted:
        logging.info("Summary: All checked tables are encrypted at rest.")
    else:
        logging.warning("Summary: One or more tables are not encrypted at rest.")


if __name__ == "__main__":
    check_dynamodb_encryption()
