import json
import boto3
import os
import urllib.parse
import logging
import base64

# Configure basic logging
# Logs will go to Amazon CloudWatch Logs
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients outside the handler for better performance
# as they can be reused across invocations.
try:
    s3_client = boto3.client('s3')
    sns_client = boto3.client('sns')
    kms_client = boto3.client('kms')
except Exception as e:
    logger.error(f"Error initializing AWS clients: {e}")
    # If clients fail to initialize, the function might not work correctly.
    # Depending on the severity, you might want to raise the exception.
    s3_client = None
    sns_client = None
    kms_client = None

# Function to decrypt KMS encrypted values
def decrypt_env_var(encrypted_value):
    if not encrypted_value:
        return None

    try:
        # AWS Lambda automatically decrypts environment variables encrypted with KMS
        # This is provided as a backup in case manual decryption is needed
        # For values manually encrypted outside of the Lambda deployment
        if encrypted_value.startswith('kms:'):
            # Remove the 'kms:' prefix and base64 decode
            binary_data = base64.b64decode(encrypted_value[4:])
            # Decrypt using KMS
            response = kms_client.decrypt(CiphertextBlob=binary_data)
            # Return the decrypted value as a string
            return response['Plaintext'].decode('utf-8')
        else:
            # Value is not KMS encrypted or was already decrypted by AWS Lambda
            return encrypted_value
    except Exception as e:
        logger.error(f"Error decrypting environment variable: {e}")
        return None

# Retrieve environment variables
# Environment variables are automatically decrypted by AWS Lambda when using KMS encryption
# but we provide a manual decryption function if needed for values encrypted outside of Lambda
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
CUSTOMER_EMAIL_SUBJECT_PREFIX = os.environ.get('CUSTOMER_EMAIL_SUBJECT_PREFIX', "S3 File Upload Notification")
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
S3_BUCKET_REGION = os.environ.get('S3_BUCKET_REGION')



def lambda_handler(event, context):
    """
    This function is triggered by an S3 'ObjectCreated' event.
    It logs information about the uploaded file to CloudWatch Logs
    and sends a notification email via an SNS topic.

    CloudTrail will automatically log the S3 PutObject API call and the
    Lambda Invoke API call if configured correctly. This function's logs
    (using print or logger) go to CloudWatch Logs.
    """
    logger.info(f"Received event: {json.dumps(event)}")

    if not sns_client or not s3_client:
        logger.error("AWS clients not initialized. Exiting.")
        return {'statusCode': 500, 'body': json.dumps({'error': 'AWS clients not initialized'})}

    if not SNS_TOPIC_ARN:
        logger.error("SNS_TOPIC_ARN environment variable is not set.")
        # This is a critical configuration error.
        return {'statusCode': 500, 'body': json.dumps({'error': 'SNS_TOPIC_ARN not configured'})}

    processed_records = 0
    errors = []

    # An S3 event can contain multiple records
    for record in event.get('Records', []):
        try:
            # Extract S3 event details
            s3_event = record.get('s3', {})
            if not s3_event:
                logger.warning(f"Skipping record due to missing 's3' key: {json.dumps(record)}")
                errors.append(f"Missing 's3' key in record: {record.get('eventID', 'Unknown')}")
                continue

            bucket_name = s3_event.get('bucket', {}).get('name')
            # Object key might be URL-encoded (e.g., spaces as '%20' or '+')
            object_key_encoded = s3_event.get('object', {}).get('key')

            if not bucket_name or not object_key_encoded:
                logger.warning(f"Skipping record due to missing bucket name or object key: {json.dumps(record)}")
                errors.append(f"Missing bucket/key in record: {record.get('eventID', 'Unknown')}")
                continue

            # Decode the object key
            object_key = urllib.parse.unquote_plus(object_key_encoded)

            # --- Log to CloudWatch Logs ---
            # This is the "log message" part that the Lambda function controls.
            # CloudTrail will automatically log the S3 PutObject and Lambda Invoke API calls.
            log_message = (
                f"File uploaded to S3. Bucket: {bucket_name}, Key: {object_key}. "
                f"Event Time: {record.get('eventTime', 'N/A')}, "
                f"Event Source: {record.get('eventSource', 'N/A')}, "
                f"AWS Region: {record.get('awsRegion', 'N/A')}"
            )
            logger.info(log_message) # This goes to CloudWatch Logs

            # --- Prepare and Send SNS Notification ---
            # You can customize the message format for the customer.
            # Extracting the filename from the object key
            filename = object_key.split('/')[-1]

            subject = f"{CUSTOMER_EMAIL_SUBJECT_PREFIX}: {filename} uploaded"
            message_body = (
                f"Hello Customer,\n\n"
                f"A new file has been successfully uploaded to your folder.\n\n"
                f"File Name: {filename}\n"
                f"Full S3 Path: s3://{bucket_name}/{object_key}\n"
                f"Upload Timestamp (UTC): {record.get('eventTime', 'N/A')}\n\n"
                f"If you have any questions, please contact support.\n\n"
                f"Thank you."
            )

            # Publish the message to the SNS topic
            sns_response = sns_client.publish(
                TopicArn=SNS_TOPIC_ARN,
                Message=message_body,
                Subject=subject
                # You can add MessageAttributes here if needed for filtering or other purposes
            )
            logger.info(f"SNS notification successfully sent for s3://{bucket_name}/{object_key}. Message ID: {sns_response.get('MessageId')}")
            processed_records += 1

        except Exception as e:
            # Log the error and continue processing other records if any
            object_key_for_error = object_key if 'object_key' in locals() else "Unknown"
            bucket_name_for_error = bucket_name if 'bucket_name' in locals() else "Unknown"
            logger.error(f"Error processing S3 record for s3://{bucket_name_for_error}/{object_key_for_error}: {str(e)}", exc_info=True)
            errors.append(f"Error for s3://{bucket_name_for_error}/{object_key_for_error}: {str(e)}")

    if errors:
        logger.error(f"Completed processing with {len(errors)} errors: {'; '.join(errors)}")
        # Depending on requirements, you might want to return a 500 if any record failed.
        # For now, we return 200 if at least one record was attempted, to avoid S3 retrying indefinitely for partial failures.
        return {
            'statusCode': 207, # Multi-Status, indicating partial success
            'body': json.dumps({
                'message': f"Processed {processed_records} records successfully. Encountered {len(errors)} errors.",
                'errors': errors
            })
        }

    if processed_records == 0 and not event.get('Records'):
        logger.info("No records found in the event.")
        return {'statusCode': 200, 'body': json.dumps({'message': 'No records to process.'})}


    logger.info(f"Successfully processed {processed_records} S3 event record(s).")
    return {'statusCode': 200, 'body': json.dumps({'message': f'Successfully processed {processed_records} record(s).'})}
