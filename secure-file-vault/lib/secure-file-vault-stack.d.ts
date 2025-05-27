import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { CognitoConstruct } from "./cognito-construct";
export declare class SecureFileVaultStack extends cdk.Stack {
    readonly bucket: s3.Bucket;
    readonly cognitoConstruct: CognitoConstruct;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
