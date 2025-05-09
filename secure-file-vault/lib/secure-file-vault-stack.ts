import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import { CognitoConstruct } from "./cognito-construct";
import { SnsConstruct } from "./sns-construct";

export class SecureFileVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket
    const bucket = new s3.Bucket(this, "file-vault27", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Create Cognito resources
    const cognitoConstruct = new CognitoConstruct(this, "Cognito", {
      bucketArn: bucket.bucketArn,
    });

    // Create SNS Topic and add email subscription
    const snsConstruct = new SnsConstruct(this, "SnsConstruct", {
      email: "ceesay.ml@outlook.com",
      phoneNumber: "+447413922324",
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
