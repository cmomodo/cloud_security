import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";

export class SecurityScoutStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the existing SNS topic from SecurityScoutSnsStack
    const snsTopicArn = cdk.Fn.importValue("SecurityScoutTopicArn");

    // Lambda Function that checks for DynamoDB encryption
    const dynamoDBEncryptionChecker = new lambda.Function(
      this,
      "DynamoDBEncryptionChecker",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "dynamodb_encryption_check.lambda_handler",
        code: lambda.Code.fromAsset("lambda/dynamodb-encryption"),
        timeout: cdk.Duration.seconds(60),
      }
    );

    // Add necessary IAM permissions to the Lambda function
    dynamoDBEncryptionChecker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:ListTables", "dynamodb:DescribeTable"],
        resources: ["*"],
      })
    );

    // Lambda Function that checks for open security groups
    const securityGroupsChecker = new lambda.Function(
      this,
      "SecurityGroupsChecker",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "security_groups_check.lambda_handler",
        code: lambda.Code.fromAsset("lambda/security-groups"),
        timeout: cdk.Duration.seconds(300),
        environment: {
          SNS_TOPIC_ARN: snsTopicArn,
        },
      }
    );

    // Add necessary IAM permissions for security groups scanning
    securityGroupsChecker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ec2:DescribeSecurityGroups", "ec2:DescribeVpcs"],
        resources: ["*"],
      })
    );

    // Add SNS publish permissions
    securityGroupsChecker.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sns:Publish"],
        resources: [snsTopicArn],
      })
    );

    // EventBridge rule to trigger the DynamoDB Lambda function daily at 1 AM
    const dynamoDBRule = new events.Rule(
      this,
      "DynamoDBEncryptionDailyTrigger",
      {
        schedule: events.Schedule.cron({ minute: "0", hour: "1" }),
        description: "Triggers DynamoDB encryption check daily at 1 AM UTC",
      }
    );

    // EventBridge rule to trigger the Security Groups Lambda function every 6 hours
    const securityGroupsRule = new events.Rule(
      this,
      "SecurityGroupsPeriodicTrigger",
      {
        schedule: events.Schedule.cron({ minute: "0", hour: "*/6" }),
        description: "Triggers security groups check every 6 hours",
      }
    );

    // Set the Lambda functions as targets for the EventBridge rules
    dynamoDBRule.addTarget(
      new targets.LambdaFunction(dynamoDBEncryptionChecker)
    );
    securityGroupsRule.addTarget(
      new targets.LambdaFunction(securityGroupsChecker)
    );
  }
}
