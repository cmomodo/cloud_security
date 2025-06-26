import boto3
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito_client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    """
    Post-confirmation trigger to automatically assign users to the customers group
    """
    try:
        user_pool_id = event['userPoolId']
        username = event['userName']

        # Add user to customers group by default
        response = cognito_client.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName='customers'
        )

        logger.info(f"Successfully added user {username} to customers group")

    except Exception as e:
        logger.error(f"Error adding user {username} to group: {str(e)}")
        # Don't raise the exception to avoid blocking user confirmation

    return event
