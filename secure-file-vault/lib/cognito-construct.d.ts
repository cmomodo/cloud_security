import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
interface CognitoConstructProps {
  bucketArn: string;
}
export declare class CognitoConstruct extends Construct {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly identityPool: cognito.CfnIdentityPool;
  readonly adminRole: iam.Role;
  readonly employeeRole: iam.Role;
  readonly customerRole: iam.Role;
  constructor(scope: Construct, id: string, props: CognitoConstructProps);
}
export {};
