"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoConstruct = void 0;
const cognito = require("aws-cdk-lib/aws-cognito");
const iam = require("aws-cdk-lib/aws-iam");
const constructs_1 = require("constructs");
class CognitoConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create Cognito User Pool
        this.userPool = new cognito.UserPool(this, "FileVaultUserPool", {
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: "Verify your email for Secure File Vault",
                emailBody: "Thanks for signing up! Your verification code is {####}",
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
        this.userPoolClient = this.userPool.addClient("file-vault-client", {
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID],
                callbackUrls: [
                    "http://localhost:3000/callback",
                    "http://localhost:8000/callback",
                ],
                logoutUrls: [
                    "http://localhost:3000/signout",
                    "http://localhost:8000/signout",
                ],
            },
            preventUserExistenceErrors: true,
        });
        // Create Identity Pool
        this.identityPool = new cognito.CfnIdentityPool(this, "FileVaultIdentityPool", {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });
        // Create IAM roles for each group
        this.adminRole = new iam.Role(this, "AdminRole", {
            assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated",
                },
            }, "sts:AssumeRoleWithWebIdentity"),
        });
        this.employeeRole = new iam.Role(this, "EmployeeRole", {
            assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated",
                },
            }, "sts:AssumeRoleWithWebIdentity"),
        });
        this.customerRole = new iam.Role(this, "CustomerRole", {
            assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
                StringEquals: {
                    "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
                },
                "ForAnyValue:StringLike": {
                    "cognito-identity.amazonaws.com:amr": "authenticated",
                },
            }, "sts:AssumeRoleWithWebIdentity"),
        });
        // Add S3 permissions to roles
        this.adminRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:*"],
            resources: [props.bucketArn, `${props.bucketArn}/*`],
        }));
        this.employeeRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:HeadBucket",
                "s3:HeadObject",
            ],
            resources: [props.bucketArn, `${props.bucketArn}/*`],
        }));
        this.customerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListObject*",
                "s3:GetObjectVersion",
                "s3:GetObjectAttributes",
                "s3:DeleteObjectVersion",
            ],
            resources: [
                `${props.bucketArn}/customers/\${cognito-identity.amazonaws.com:sub}/*`,
            ],
        }));
        this.customerRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:ListBucket"],
            resources: [props.bucketArn],
            conditions: {
                StringLike: {
                    "s3:prefix": [
                        "customers/${cognito-identity.amazonaws.com:sub}/*",
                        "customers/${cognito-identity.amazonaws.com:sub}",
                    ],
                },
            },
        }));
        // Create User Pool Groups
        new cognito.CfnUserPoolGroup(this, "AdminGroup", {
            userPoolId: this.userPool.userPoolId,
            groupName: "admins",
            description: "Administrators with full access to all buckets",
            roleArn: this.adminRole.roleArn,
        });
        new cognito.CfnUserPoolGroup(this, "EmployeeGroup", {
            userPoolId: this.userPool.userPoolId,
            groupName: "employees",
            description: "Employees with view and list access only",
            roleArn: this.employeeRole.roleArn,
        });
        new cognito.CfnUserPoolGroup(this, "CustomerGroup", {
            userPoolId: this.userPool.userPoolId,
            groupName: "customers",
            description: "Customers with full access to their own folders only",
            roleArn: this.customerRole.roleArn,
        });
        // Set up Identity Pool role mappings
        new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleAttachment", {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: this.customerRole.roleArn, // Default role if no group match
            },
            roleMappings: {
                mapping: {
                    type: "Rules",
                    ambiguousRoleResolution: "AuthenticatedRole",
                    identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`,
                    rulesConfiguration: {
                        rules: [
                            {
                                claim: "cognito:groups",
                                matchType: "Contains",
                                value: "admins",
                                roleArn: this.adminRole.roleArn,
                            },
                            {
                                claim: "cognito:groups",
                                matchType: "Contains",
                                value: "employees",
                                roleArn: this.employeeRole.roleArn,
                            },
                            {
                                claim: "cognito:groups",
                                matchType: "Contains",
                                value: "customers",
                                roleArn: this.customerRole.roleArn,
                            },
                        ],
                    },
                },
            },
        });
    }
}
exports.CognitoConstruct = CognitoConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2duaXRvLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtREFBbUQ7QUFDbkQsMkNBQTJDO0FBQzNDLDJDQUF1QztBQU12QyxNQUFhLGdCQUFpQixTQUFRLHNCQUFTO0lBUTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzlELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsZ0JBQWdCLEVBQUU7Z0JBQ2hCLFlBQVksRUFBRSx5Q0FBeUM7Z0JBQ3ZELFNBQVMsRUFBRSx5REFBeUQ7Z0JBQ3BFLFVBQVUsRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSTthQUNoRDtZQUNELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7YUFDRjtZQUNELGNBQWMsRUFBRTtnQkFDZCxTQUFTLEVBQUUsRUFBRTtnQkFDYixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsY0FBYyxFQUFFLElBQUk7YUFDckI7U0FDRixDQUFDLENBQUM7UUFFSCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRTtZQUNqRSxTQUFTLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGlCQUFpQixFQUFFLElBQUk7YUFDeEI7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsS0FBSyxFQUFFO29CQUNMLHNCQUFzQixFQUFFLElBQUk7aUJBQzdCO2dCQUNELE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO2dCQUNuQyxZQUFZLEVBQUU7b0JBQ1osZ0NBQWdDO29CQUNoQyxnQ0FBZ0M7aUJBQ2pDO2dCQUNELFVBQVUsRUFBRTtvQkFDViwrQkFBK0I7b0JBQy9CLCtCQUErQjtpQkFDaEM7YUFDRjtZQUNELDBCQUEwQixFQUFFLElBQUk7U0FDakMsQ0FBQyxDQUFDO1FBRUgsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUM3QyxJQUFJLEVBQ0osdUJBQXVCLEVBQ3ZCO1lBQ0UsOEJBQThCLEVBQUUsS0FBSztZQUNyQyx3QkFBd0IsRUFBRTtnQkFDeEI7b0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO29CQUM5QyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7aUJBQ2pEO2FBQ0Y7U0FDRixDQUNGLENBQUM7UUFFRixrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUMvQyxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsa0JBQWtCLENBQ25DLGdDQUFnQyxFQUNoQztnQkFDRSxZQUFZLEVBQUU7b0JBQ1osb0NBQW9DLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHO2lCQUM1RDtnQkFDRCx3QkFBd0IsRUFBRTtvQkFDeEIsb0NBQW9DLEVBQUUsZUFBZTtpQkFDdEQ7YUFDRixFQUNELCtCQUErQixDQUNoQztTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDckQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGtCQUFrQixDQUNuQyxnQ0FBZ0MsRUFDaEM7Z0JBQ0UsWUFBWSxFQUFFO29CQUNaLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRztpQkFDNUQ7Z0JBQ0Qsd0JBQXdCLEVBQUU7b0JBQ3hCLG9DQUFvQyxFQUFFLGVBQWU7aUJBQ3REO2FBQ0YsRUFDRCwrQkFBK0IsQ0FDaEM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3JELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsQ0FDbkMsZ0NBQWdDLEVBQ2hDO2dCQUNFLFlBQVksRUFBRTtvQkFDWixvQ0FBb0MsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUc7aUJBQzVEO2dCQUNELHdCQUF3QixFQUFFO29CQUN4QixvQ0FBb0MsRUFBRSxlQUFlO2lCQUN0RDthQUNGLEVBQ0QsK0JBQStCLENBQ2hDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUN4QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDakIsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQztTQUNyRCxDQUFDLENBQ0gsQ0FBQztRQUVGLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUMzQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsZUFBZTtnQkFDZixjQUFjO2dCQUNkLGVBQWU7Z0JBQ2YsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUM7U0FDckQsQ0FBQyxDQUNILENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FDM0IsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFO2dCQUNQLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxpQkFBaUI7Z0JBQ2pCLGdCQUFnQjtnQkFDaEIscUJBQXFCO2dCQUNyQix3QkFBd0I7Z0JBQ3hCLHdCQUF3QjthQUN6QjtZQUNELFNBQVMsRUFBRTtnQkFDVCxHQUFHLEtBQUssQ0FBQyxTQUFTLHFEQUFxRDthQUN4RTtTQUNGLENBQUMsQ0FDSCxDQUFDO1FBRUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQzNCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUMxQixTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1lBQzVCLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUU7b0JBQ1YsV0FBVyxFQUFFO3dCQUNYLG1EQUFtRDt3QkFDbkQsaURBQWlEO3FCQUNsRDtpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRiwwQkFBMEI7UUFDMUIsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUMvQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3BDLFNBQVMsRUFBRSxRQUFRO1lBQ25CLFdBQVcsRUFBRSxnREFBZ0Q7WUFDN0QsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTztTQUNoQyxDQUFDLENBQUM7UUFFSCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ2xELFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVU7WUFDcEMsU0FBUyxFQUFFLFdBQVc7WUFDdEIsV0FBVyxFQUFFLDBDQUEwQztZQUN2RCxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPO1NBQ25DLENBQUMsQ0FBQztRQUVILElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDbEQsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVTtZQUNwQyxTQUFTLEVBQUUsV0FBVztZQUN0QixXQUFXLEVBQUUsc0RBQXNEO1lBQ25FLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU87U0FDbkMsQ0FBQyxDQUFDO1FBRUgscUNBQXFDO1FBQ3JDLElBQUksT0FBTyxDQUFDLDZCQUE2QixDQUN2QyxJQUFJLEVBQ0osNEJBQTRCLEVBQzVCO1lBQ0UsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRztZQUNyQyxLQUFLLEVBQUU7Z0JBQ0wsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLGlDQUFpQzthQUM1RTtZQUNELFlBQVksRUFBRTtnQkFDWixPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE9BQU87b0JBQ2IsdUJBQXVCLEVBQUUsbUJBQW1CO29CQUM1QyxnQkFBZ0IsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRTtvQkFDakcsa0JBQWtCLEVBQUU7d0JBQ2xCLEtBQUssRUFBRTs0QkFDTDtnQ0FDRSxLQUFLLEVBQUUsZ0JBQWdCO2dDQUN2QixTQUFTLEVBQUUsVUFBVTtnQ0FDckIsS0FBSyxFQUFFLFFBQVE7Z0NBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTzs2QkFDaEM7NEJBQ0Q7Z0NBQ0UsS0FBSyxFQUFFLGdCQUFnQjtnQ0FDdkIsU0FBUyxFQUFFLFVBQVU7Z0NBQ3JCLEtBQUssRUFBRSxXQUFXO2dDQUNsQixPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPOzZCQUNuQzs0QkFDRDtnQ0FDRSxLQUFLLEVBQUUsZ0JBQWdCO2dDQUN2QixTQUFTLEVBQUUsVUFBVTtnQ0FDckIsS0FBSyxFQUFFLFdBQVc7Z0NBQ2xCLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU87NkJBQ25DO3lCQUNGO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUNGLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE5T0QsNENBOE9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuaW50ZXJmYWNlIENvZ25pdG9Db25zdHJ1Y3RQcm9wcyB7XG4gIGJ1Y2tldEFybjogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQ29nbml0b0NvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xuICBwdWJsaWMgcmVhZG9ubHkgaWRlbnRpdHlQb29sOiBjb2duaXRvLkNmbklkZW50aXR5UG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IGFkbWluUm9sZTogaWFtLlJvbGU7XG4gIHB1YmxpYyByZWFkb25seSBlbXBsb3llZVJvbGU6IGlhbS5Sb2xlO1xuICBwdWJsaWMgcmVhZG9ubHkgY3VzdG9tZXJSb2xlOiBpYW0uUm9sZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29nbml0b0NvbnN0cnVjdFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vIENyZWF0ZSBDb2duaXRvIFVzZXIgUG9vbFxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCBcIkZpbGVWYXVsdFVzZXJQb29sXCIsIHtcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgdXNlclZlcmlmaWNhdGlvbjoge1xuICAgICAgICBlbWFpbFN1YmplY3Q6IFwiVmVyaWZ5IHlvdXIgZW1haWwgZm9yIFNlY3VyZSBGaWxlIFZhdWx0XCIsXG4gICAgICAgIGVtYWlsQm9keTogXCJUaGFua3MgZm9yIHNpZ25pbmcgdXAhIFlvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaXMgeyMjIyN9XCIsXG4gICAgICAgIGVtYWlsU3R5bGU6IGNvZ25pdG8uVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5DT0RFLFxuICAgICAgfSxcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiAxMixcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIFVzZXIgUG9vbCBDbGllbnRcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gdGhpcy51c2VyUG9vbC5hZGRDbGllbnQoXCJmaWxlLXZhdWx0LWNsaWVudFwiLCB7XG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBvQXV0aDoge1xuICAgICAgICBmbG93czoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHNjb3BlczogW2NvZ25pdG8uT0F1dGhTY29wZS5PUEVOSURdLFxuICAgICAgICBjYWxsYmFja1VybHM6IFtcbiAgICAgICAgICBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9jYWxsYmFja1wiLFxuICAgICAgICAgIFwiaHR0cDovL2xvY2FsaG9zdDo4MDAwL2NhbGxiYWNrXCIsXG4gICAgICAgIF0sXG4gICAgICAgIGxvZ291dFVybHM6IFtcbiAgICAgICAgICBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9zaWdub3V0XCIsXG4gICAgICAgICAgXCJodHRwOi8vbG9jYWxob3N0OjgwMDAvc2lnbm91dFwiLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIElkZW50aXR5IFBvb2xcbiAgICB0aGlzLmlkZW50aXR5UG9vbCA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbChcbiAgICAgIHRoaXMsXG4gICAgICBcIkZpbGVWYXVsdElkZW50aXR5UG9vbFwiLFxuICAgICAge1xuICAgICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxuICAgICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjbGllbnRJZDogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgSUFNIHJvbGVzIGZvciBlYWNoIGdyb3VwXG4gICAgdGhpcy5hZG1pblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgXCJBZG1pblJvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkZlZGVyYXRlZFByaW5jaXBhbChcbiAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb21cIixcbiAgICAgICAge1xuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkXCI6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiRm9yQW55VmFsdWU6U3RyaW5nTGlrZVwiOiB7XG4gICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXJcIjogXCJhdXRoZW50aWNhdGVkXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHM6QXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eVwiLFxuICAgICAgKSxcbiAgICB9KTtcblxuICAgIHRoaXMuZW1wbG95ZWVSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIFwiRW1wbG95ZWVSb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXG4gICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tXCIsXG4gICAgICAgIHtcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZFwiOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIkZvckFueVZhbHVlOlN0cmluZ0xpa2VcIjoge1xuICAgICAgICAgICAgXCJjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YW1yXCI6IFwiYXV0aGVudGljYXRlZFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RzOkFzc3VtZVJvbGVXaXRoV2ViSWRlbnRpdHlcIixcbiAgICAgICksXG4gICAgfSk7XG5cbiAgICB0aGlzLmN1c3RvbWVyUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBcIkN1c3RvbWVyUm9sZVwiLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uRmVkZXJhdGVkUHJpbmNpcGFsKFxuICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbVwiLFxuICAgICAgICB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICBcImNvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWRcIjogdGhpcy5pZGVudGl0eVBvb2wucmVmLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlXCI6IHtcbiAgICAgICAgICAgIFwiY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtclwiOiBcImF1dGhlbnRpY2F0ZWRcIixcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBcInN0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5XCIsXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIFMzIHBlcm1pc3Npb25zIHRvIHJvbGVzXG4gICAgdGhpcy5hZG1pblJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wiczM6KlwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuYnVja2V0QXJuLCBgJHtwcm9wcy5idWNrZXRBcm59LypgXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICB0aGlzLmVtcGxveWVlUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgXCJzMzpMaXN0QnVja2V0XCIsXG4gICAgICAgICAgXCJzMzpHZXRPYmplY3RcIixcbiAgICAgICAgICBcInMzOkhlYWRCdWNrZXRcIixcbiAgICAgICAgICBcInMzOkhlYWRPYmplY3RcIixcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuYnVja2V0QXJuLCBgJHtwcm9wcy5idWNrZXRBcm59LypgXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICB0aGlzLmN1c3RvbWVyUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgXCJzMzpQdXRPYmplY3RcIixcbiAgICAgICAgICBcInMzOkdldE9iamVjdFwiLFxuICAgICAgICAgIFwiczM6RGVsZXRlT2JqZWN0XCIsXG4gICAgICAgICAgXCJzMzpMaXN0T2JqZWN0KlwiLFxuICAgICAgICAgIFwiczM6R2V0T2JqZWN0VmVyc2lvblwiLFxuICAgICAgICAgIFwiczM6R2V0T2JqZWN0QXR0cmlidXRlc1wiLFxuICAgICAgICAgIFwiczM6RGVsZXRlT2JqZWN0VmVyc2lvblwiLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgJHtwcm9wcy5idWNrZXRBcm59L2N1c3RvbWVycy9cXCR7Y29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOnN1Yn0vKmAsXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgdGhpcy5jdXN0b21lclJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wiczM6TGlzdEJ1Y2tldFwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuYnVja2V0QXJuXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIFN0cmluZ0xpa2U6IHtcbiAgICAgICAgICAgIFwiczM6cHJlZml4XCI6IFtcbiAgICAgICAgICAgICAgXCJjdXN0b21lcnMvJHtjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206c3VifS8qXCIsXG4gICAgICAgICAgICAgIFwiY3VzdG9tZXJzLyR7Y29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOnN1Yn1cIixcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgVXNlciBQb29sIEdyb3Vwc1xuICAgIG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgXCJBZG1pbkdyb3VwXCIsIHtcbiAgICAgIHVzZXJQb29sSWQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIGdyb3VwTmFtZTogXCJhZG1pbnNcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFkbWluaXN0cmF0b3JzIHdpdGggZnVsbCBhY2Nlc3MgdG8gYWxsIGJ1Y2tldHNcIixcbiAgICAgIHJvbGVBcm46IHRoaXMuYWRtaW5Sb2xlLnJvbGVBcm4sXG4gICAgfSk7XG5cbiAgICBuZXcgY29nbml0by5DZm5Vc2VyUG9vbEdyb3VwKHRoaXMsIFwiRW1wbG95ZWVHcm91cFwiLCB7XG4gICAgICB1c2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBncm91cE5hbWU6IFwiZW1wbG95ZWVzXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJFbXBsb3llZXMgd2l0aCB2aWV3IGFuZCBsaXN0IGFjY2VzcyBvbmx5XCIsXG4gICAgICByb2xlQXJuOiB0aGlzLmVtcGxveWVlUm9sZS5yb2xlQXJuLFxuICAgIH0pO1xuXG4gICAgbmV3IGNvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCBcIkN1c3RvbWVyR3JvdXBcIiwge1xuICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZ3JvdXBOYW1lOiBcImN1c3RvbWVyc1wiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ3VzdG9tZXJzIHdpdGggZnVsbCBhY2Nlc3MgdG8gdGhlaXIgb3duIGZvbGRlcnMgb25seVwiLFxuICAgICAgcm9sZUFybjogdGhpcy5jdXN0b21lclJvbGUucm9sZUFybixcbiAgICB9KTtcblxuICAgIC8vIFNldCB1cCBJZGVudGl0eSBQb29sIHJvbGUgbWFwcGluZ3NcbiAgICBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudChcbiAgICAgIHRoaXMsXG4gICAgICBcIklkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50XCIsXG4gICAgICB7XG4gICAgICAgIGlkZW50aXR5UG9vbElkOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYsXG4gICAgICAgIHJvbGVzOiB7XG4gICAgICAgICAgYXV0aGVudGljYXRlZDogdGhpcy5jdXN0b21lclJvbGUucm9sZUFybiwgLy8gRGVmYXVsdCByb2xlIGlmIG5vIGdyb3VwIG1hdGNoXG4gICAgICAgIH0sXG4gICAgICAgIHJvbGVNYXBwaW5nczoge1xuICAgICAgICAgIG1hcHBpbmc6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiUnVsZXNcIixcbiAgICAgICAgICAgIGFtYmlndW91c1JvbGVSZXNvbHV0aW9uOiBcIkF1dGhlbnRpY2F0ZWRSb2xlXCIsXG4gICAgICAgICAgICBpZGVudGl0eVByb3ZpZGVyOiBgJHt0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lfToke3RoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZH1gLFxuICAgICAgICAgICAgcnVsZXNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhaW06IFwiY29nbml0bzpncm91cHNcIixcbiAgICAgICAgICAgICAgICAgIG1hdGNoVHlwZTogXCJDb250YWluc1wiLFxuICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiYWRtaW5zXCIsXG4gICAgICAgICAgICAgICAgICByb2xlQXJuOiB0aGlzLmFkbWluUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhaW06IFwiY29nbml0bzpncm91cHNcIixcbiAgICAgICAgICAgICAgICAgIG1hdGNoVHlwZTogXCJDb250YWluc1wiLFxuICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiZW1wbG95ZWVzXCIsXG4gICAgICAgICAgICAgICAgICByb2xlQXJuOiB0aGlzLmVtcGxveWVlUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY2xhaW06IFwiY29nbml0bzpncm91cHNcIixcbiAgICAgICAgICAgICAgICAgIG1hdGNoVHlwZTogXCJDb250YWluc1wiLFxuICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiY3VzdG9tZXJzXCIsXG4gICAgICAgICAgICAgICAgICByb2xlQXJuOiB0aGlzLmN1c3RvbWVyUm9sZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICk7XG4gIH1cbn1cbiJdfQ==