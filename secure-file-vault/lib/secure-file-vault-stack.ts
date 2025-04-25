import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";

export class SecureFileVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    //super construct first
    super(scope, id, props);

    //s3 bucket
    new s3.Bucket(this, "file-vault27", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: false,
      versioned: false,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
