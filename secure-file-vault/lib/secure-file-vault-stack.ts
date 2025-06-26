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
  public readonly bucket: s3.Bucket;
  public readonly cognitoConstruct: CognitoConstruct;

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
    this.bucket = new s3.Bucket(this, "file-vault27", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,

      // Add lifecycle rules for cost optimization
      lifecycleRules: [
        {
          // Move current versions to IA after 6 months
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(180), // 6 months
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365), // 1 year
            },
          ],
          // Move noncurrent versions to IA after 30 days
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          // Delete noncurrent versions after 2 years
          noncurrentVersionExpiration: cdk.Duration.days(730),
          // Clean up incomplete multipart uploads after 7 days
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],

      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["http://localhost:3000"],
          allowedHeaders: ["*"],
        },
      ],
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
          S3_BUCKET_NAME: this.bucket.bucketName,
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
    // this.bucket.grantRead(s3UploadHandler); // Uncomment if your lambda needs to read object content or metadata beyond the event

    // Trigger Lambda on object creation
    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3UploadHandler),
    );

    // Create Cognito resources
    this.cognitoConstruct = new CognitoConstruct(this, "Cognito", {
      bucketArn: this.bucket.bucketArn,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.cognitoConstruct.userPool.userPoolId,
      description: "The ID of the Cognito User Pool",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.cognitoConstruct.userPoolClient.userPoolClientId,
      description: "The ID of the Cognito User Pool Client",
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.cognitoConstruct.identityPool.ref,
      description: "The ID of the Cognito Identity Pool",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "The name of the S3 bucket",
    });
  }
}
