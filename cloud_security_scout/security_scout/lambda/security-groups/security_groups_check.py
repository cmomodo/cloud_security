import boto3
import logging
import json

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Checks all security groups in the AWS account and region for open security groups.
    Sends alerts via SNS for any security groups that have open access (0.0.0.0/0).
    This function is designed to be triggered by EventBridge daily at 2 AM.
    """
    try:
        ec2_client = boto3.client('ec2')
        sns_client = boto3.client('sns')
        logger.info("Successfully created boto3 clients for EC2 and SNS.")
    except Exception as e:
        logger.error(f"Failed to create boto3 clients: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error: Could not create AWS clients.'})
        }

    # Get SNS topic ARN from environment variable
    import os
    sns_topic_arn = os.environ.get('SNS_TOPIC_ARN')
    if not sns_topic_arn:
        logger.error("SNS_TOPIC_ARN environment variable not set")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error: SNS topic ARN not configured.'})
        }

    open_security_groups = []

    try:
        # Get all security groups
        paginator = ec2_client.get_paginator('describe_security_groups')
        for page in paginator.paginate():
            for sg in page.get('SecurityGroups', []):
                sg_id = sg.get('GroupId')
                sg_name = sg.get('GroupName')
                vpc_id = sg.get('VpcId', 'Classic')

                # Check inbound rules for open access
                for rule in sg.get('IpPermissions', []):
                    for ip_range in rule.get('IpRanges', []):
                        if ip_range.get('CidrIp') == '0.0.0.0/0':
                            from_port = rule.get('FromPort', 'All')
                            to_port = rule.get('ToPort', 'All')
                            protocol = rule.get('IpProtocol', 'All')

                            open_sg = {
                                'GroupId': sg_id,
                                'GroupName': sg_name,
                                'VpcId': vpc_id,
                                'Protocol': protocol,
                                'FromPort': from_port,
                                'ToPort': to_port,
                                'Description': rule.get('UserIdGroupPairs', [{}])[0].get('Description', 'No description') if rule.get('UserIdGroupPairs') else ip_range.get('Description', 'No description')
                            }
                            open_security_groups.append(open_sg)
                            logger.warning(f"❌ Open security group found: {sg_id} ({sg_name}) - {protocol}:{from_port}-{to_port}")

        logger.info(f"Security group scan complete. Found {len(open_security_groups)} open security groups.")

    except Exception as e:
        logger.error(f"Failed to scan security groups: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error: Could not scan security groups.'})
        }

    # Send SNS notification if open security groups found
    if open_security_groups:
        try:
            # Create detailed message
            message_lines = [
                "🚨 SECURITY ALERT: Open Security Groups Detected",
                f"Found {len(open_security_groups)} security groups with open access (0.0.0.0/0):",
                ""
            ]

            for sg in open_security_groups:
                message_lines.append(f"• {sg['GroupId']} ({sg['GroupName']})")
                message_lines.append(f"  VPC: {sg['VpcId']}")
                message_lines.append(f"  Rule: {sg['Protocol']}:{sg['FromPort']}-{sg['ToPort']}")
                message_lines.append(f"  Description: {sg['Description']}")
                message_lines.append("")

            message_lines.append("Please review these security groups and restrict access as needed.")
            message_lines.append(f"Scan completed at: {context.aws_request_id}")

            message = "\n".join(message_lines)

            # Send SNS notification
            sns_response = sns_client.publish(
                TopicArn=sns_topic_arn,
                Subject="Security Alert: Open Security Groups Detected",
                Message=message
            )

            logger.info(f"SNS notification sent successfully. MessageId: {sns_response['MessageId']}")

        except Exception as e:
            logger.error(f"Failed to send SNS notification: {e}")
            return {
                'statusCode': 500,
                'body': json.dumps({'message': 'Security groups scanned but failed to send notification.'})
            }
    else:
        logger.info("✅ No open security groups found. No notification sent.")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': f'Security group scan completed. Found {len(open_security_groups)} open security groups.',
            'open_security_groups': open_security_groups,
            'notification_sent': len(open_security_groups) > 0
        })
    }
