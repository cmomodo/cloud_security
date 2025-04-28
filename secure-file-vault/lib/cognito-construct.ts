import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface CognitoConstructProps {
  bucketArn: string;
}

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly adminRole: iam.Role;
  public readonly employeeRole: iam.Role;
  public readonly customerRole: iam.Role;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'FileVaultUserPool', {
      selfSignUpEnabled: false,
      userVerification: {
        emailSubject: 'Verify your email for Secure File Vault',
        emailBody: 'Thanks for signing up! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    // Create User Pool Client
    this.userPoolClient = this.userPool.addClient('file-vault-client', {
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: ['http://localhost:3000/callback'],
        logoutUrls: ['http://localhost:3000/signout'],
      },
      preventUserExistenceErrors: true,
    });

    // Create Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'FileVaultIdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // Create IAM roles for each group
    this.adminRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    this.employeeRole = new iam.Role(this, 'EmployeeRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    this.customerRole = new iam.Role(this, 'CustomerRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Add S3 permissions to roles
    this.adminRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*'],
      resources: [props.bucketArn, `${props.bucketArn}/*`],
    }));

    this.employeeRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:ListBucket',
        's3:GetObject',
        's3:HeadBucket',
        's3:HeadObject'
      ],
      resources: [props.bucketArn, `${props.bucketArn}/*`],
    }));

    this.customerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:ListObject*',
        's3:GetObjectVersion',
        's3:GetObjectAttributes',
        's3:DeleteObjectVersion'
      ],
      resources: [
        `${props.bucketArn}/customers/\${cognito-identity.amazonaws.com:sub}/*`
      ],
    }));

    this.customerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:ListBucket'],
      resources: [props.bucketArn],
      conditions: {
        'StringLike': {
          's3:prefix': [
            'customers/${cognito-identity.amazonaws.com:sub}/*',
            'customers/${cognito-identity.amazonaws.com:sub}'
          ]
        }
      }
    }));

    // Create User Pool Groups
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admins',
      description: 'Administrators with full access to all buckets',
      roleArn: this.adminRole.roleArn,
    });

    new cognito.CfnUserPoolGroup(this, 'EmployeeGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'employees',
      description: 'Employees with view and list access only',
      roleArn: this.employeeRole.roleArn,
    });

    new cognito.CfnUserPoolGroup(this, 'CustomerGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'customers',
      description: 'Customers with full access to their own folders only',
      roleArn: this.customerRole.roleArn,
    });

    // Set up Identity Pool role mappings
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.customerRole.roleArn,  // Default role if no group match
      },
      roleMappings: {
        mapping: {
          type: 'Rules',
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`,
          rulesConfiguration: {
            rules: [
              {
                claim: 'cognito:groups',
                matchType: 'Contains',
                value: 'admins',
                roleArn: this.adminRole.roleArn,
              },
              {
                claim: 'cognito:groups',
                matchType: 'Contains',
                value: 'employees',
                roleArn: this.employeeRole.roleArn,
              },
              {
                claim: 'cognito:groups',
                matchType: 'Contains',
                value: 'customers',
                roleArn: this.customerRole.roleArn,
              },
            ],
          },
        },
      },
    });
  }
}