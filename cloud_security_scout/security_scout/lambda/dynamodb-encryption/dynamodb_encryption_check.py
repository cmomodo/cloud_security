import boto3
import logging
import json

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Checks all DynamoDB tables in the AWS account and region for server-side encryption (SSE) status.
    This function is designed to be triggered by AWS Lambda.
    """
    try:
        dynamodb_client = boto3.client('dynamodb')
        logger.info("Successfully created a boto3 client for DynamoDB.")
    except Exception as e:
        logger.error(f"Failed to create boto3 client for DynamoDB: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error: Could not create DynamoDB client.'})
        }

    unencrypted_tables = []
    table_names = []
    try:
        paginator = dynamodb_client.get_paginator('list_tables')
        for page in paginator.paginate():
            table_names.extend(page.get('TableNames', []))
        logger.info(f"Found {len(table_names)} DynamoDB tables in the region.")
    except Exception as e:
        logger.error(f"Failed to list DynamoDB tables: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error: Could not list DynamoDB tables.'})
        }

    if not table_names:
        logger.info("No DynamoDB tables found in this region.")
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'No DynamoDB tables found.', 'unencrypted_tables': []})
        }

    logger.info("--- Starting DynamoDB Encryption Check ---")
    for table_name in table_names:
        try:
            response = dynamodb_client.describe_table(TableName=table_name)
            table_description = response.get('Table', {})
            sse_description = table_description.get('SSEDescription')

            if not (sse_description and sse_description.get('Status') == 'ENABLED'):
                unencrypted_tables.append(table_name)
                logger.warning(f"❌ Table '{table_name}': Encryption is DISABLED.")
            else:
                logger.info(f"✅ Table '{table_name}': Encryption is ENABLED.")

        except Exception as e:
            logger.error(f"Could not describe table '{table_name}': {e}")
            # Optionally, add to a list of tables that failed inspection
            pass

    logger.info("--- DynamoDB Encryption Check Complete ---")

    if not unencrypted_tables:
        summary_message = "All checked tables are encrypted at rest."
        logger.info(summary_message)
    else:
        summary_message = f"Found {len(unencrypted_tables)} unencrypted table(s)."
        logger.warning(summary_message)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': summary_message,
            'unencrypted_tables': unencrypted_tables,
            'total_tables_checked': len(table_names),
            'encrypted_tables_count': len(table_names) - len(unencrypted_tables),
            'scan_timestamp': context.aws_request_id
        })
    }
