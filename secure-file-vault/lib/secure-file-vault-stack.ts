import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { RemovalPolicy } from "aws-cdk-lib";
import { CognitoConstruct } from "./cognito-construct";
import { SnsConstruct } from "./sns-construct";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambda_python from "@aws-cdk/aws-lambda-python-alpha";
import * as kms from "aws-cdk-lib/aws-kms";

export class SecureFileVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a KMS key for encrypting sensitive environment variables
    const encryptionKey = new kms.Key(this, "EnvironmentVarsKey", {
      enableKeyRotation: true,
      description: "KMS key for encrypting Lambda environment variables",
      alias: "alias/secure-file-vault-env-vars",
    });

    // Retrieve environment variables for SNS
    const defaultEmail = process.env.DEFAULT_EMAIL;
    const defaultPhoneNumber = process.env.DEFAULT_PHONE_NUMBER;

    if (!defaultEmail) {
      throw new Error(
        "Missing environment variable: DEFAULT_EMAIL. Please set it in your .env file or environment.",
      );
    }
    if (!defaultPhoneNumber) {
      throw new Error(
        "Missing environment variable: DEFAULT_PHONE_NUMBER. Please set it in your .env file or environment.",
      );
    }

    // Create S3 bucket
    const bucket = new s3.Bucket(this, "file-vault27", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Create SNS Topic (needed for Lambda environment variables)
    const snsConstruct = new SnsConstruct(this, "SnsConstruct", {
      email: defaultEmail,
      phoneNumber: defaultPhoneNumber,
    });

    // Define the Lambda function that will be triggered by S3 events
    const s3UploadHandler = new lambda_python.PythonFunction(
      this,
      "S3UploadHandler",
      {
        entry: "lambda_src", // Path to the directory containing your Lambda code
        index: "lambda.py", // The file name (without .py) of your handler function
        handler: "lambda_handler", // The name of your handler function
        runtime: lambda.Runtime.PYTHON_3_9, // Choose an appropriate Python runtime
        environment: {
          SNS_TOPIC_ARN: snsConstruct.topic.topicArn,
          S3_BUCKET_NAME: bucket.bucketName,
          S3_BUCKET_REGION: this.region,
          CUSTOMER_EMAIL_SUBJECT_PREFIX: "S3 File Upload Notification", // Optional: customize or remove if default in lambda is preferred
        },
        // Use KMS key to encrypt environment variables
        environmentEncryption: encryptionKey,
      },
    );

    // Grant the Lambda function permission to publish to the SNS topic
    snsConstruct.topic.grantPublish(s3UploadHandler);

    // Grant the Lambda function permission to decrypt with the KMS key
    encryptionKey.grantDecrypt(s3UploadHandler);

    // Grant the Lambda function permission to read from the S3 bucket (optional, but good practice if it needs to)
    // bucket.grantRead(s3UploadHandler); // Uncomment if your lambda needs to read object content or metadata beyond the event

    // Trigger Lambda on object creation
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3UploadHandler),
    );

    // Create Cognito resources
    const cognitoConstruct = new CognitoConstruct(this, "Cognito", {
      bucketArn: bucket.bucketArn,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: cognitoConstruct.userPool.userPoolId,
      description: "The ID of the Cognito User Pool",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: cognitoConstruct.userPoolClient.userPoolClientId,
      description: "The ID of the Cognito User Pool Client",
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: cognitoConstruct.identityPool.ref,
      description: "The ID of the Cognito Identity Pool",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
      description: "The name of the S3 bucket",
    });
  }
}
