"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureFileVaultStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const s3n = require("aws-cdk-lib/aws-s3-notifications");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cognito_construct_1 = require("./cognito-construct");
const sns_construct_1 = require("./sns-construct");
const lambda = require("aws-cdk-lib/aws-lambda");
const lambda_python = require("@aws-cdk/aws-lambda-python-alpha");
const kms = require("aws-cdk-lib/aws-kms");
class SecureFileVaultStack extends cdk.Stack {
    constructor(scope, id, props) {
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
            throw new Error("Missing environment variable: DEFAULT_EMAIL. Please set it in your .env file or environment.");
        }
        if (!defaultPhoneNumber) {
            throw new Error("Missing environment variable: DEFAULT_PHONE_NUMBER. Please set it in your .env file or environment.");
        }
        // Create S3 bucket
        this.bucket = new s3.Bucket(this, "file-vault27", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
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
        const snsConstruct = new sns_construct_1.SnsConstruct(this, "SnsConstruct", {
            email: defaultEmail,
            phoneNumber: defaultPhoneNumber,
        });
        // Define the Lambda function that will be triggered by S3 events
        const s3UploadHandler = new lambda_python.PythonFunction(this, "S3UploadHandler", {
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
        });
        // Grant the Lambda function permission to publish to the SNS topic
        snsConstruct.topic.grantPublish(s3UploadHandler);
        // Grant the Lambda function permission to decrypt with the KMS key
        encryptionKey.grantDecrypt(s3UploadHandler);
        // Grant the Lambda function permission to read from the S3 bucket (optional, but good practice if it needs to)
        // this.bucket.grantRead(s3UploadHandler); // Uncomment if your lambda needs to read object content or metadata beyond the event
        // Trigger Lambda on object creation
        this.bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(s3UploadHandler));
        // Create Cognito resources
        this.cognitoConstruct = new cognito_construct_1.CognitoConstruct(this, "Cognito", {
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
exports.SecureFileVaultStack = SecureFileVaultStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJlLWZpbGUtdmF1bHQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZWN1cmUtZmlsZS12YXVsdC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMseUNBQXlDO0FBQ3pDLHdEQUF3RDtBQUN4RCw2Q0FBNEM7QUFDNUMsMkRBQXVEO0FBQ3ZELG1EQUErQztBQUMvQyxpREFBaUQ7QUFDakQsa0VBQWtFO0FBQ2xFLDJDQUEyQztBQUUzQyxNQUFhLG9CQUFxQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSWpELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0VBQWtFO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUQsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixXQUFXLEVBQUUscURBQXFEO1lBQ2xFLEtBQUssRUFBRSxrQ0FBa0M7U0FDMUMsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDO1FBQy9DLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQztRQUU1RCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FDYiw4RkFBOEYsQ0FDL0YsQ0FBQztRQUNKLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUNiLHFHQUFxRyxDQUN0RyxDQUFDO1FBQ0osQ0FBQztRQUVELG1CQUFtQjtRQUNuQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2hELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE1BQU07WUFDbkMsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRTt3QkFDZCxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUc7d0JBQ2xCLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJO3dCQUNuQixFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU07cUJBQ3RCO29CQUNELGNBQWMsRUFBRSxDQUFDLHVCQUF1QixDQUFDO29CQUN6QyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3RCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCw2REFBNkQ7UUFDN0QsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDMUQsS0FBSyxFQUFFLFlBQVk7WUFDbkIsV0FBVyxFQUFFLGtCQUFrQjtTQUNoQyxDQUFDLENBQUM7UUFFSCxpRUFBaUU7UUFDakUsTUFBTSxlQUFlLEdBQUcsSUFBSSxhQUFhLENBQUMsY0FBYyxDQUN0RCxJQUFJLEVBQ0osaUJBQWlCLEVBQ2pCO1lBQ0UsS0FBSyxFQUFFLFlBQVksRUFBRSxvREFBb0Q7WUFDekUsS0FBSyxFQUFFLFdBQVcsRUFBRSx1REFBdUQ7WUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9DQUFvQztZQUMvRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsdUNBQXVDO1lBQzNFLFdBQVcsRUFBRTtnQkFDWCxhQUFhLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxRQUFRO2dCQUMxQyxjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVO2dCQUN0QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDN0IsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsa0VBQWtFO2FBQ2pJO1lBQ0QsK0NBQStDO1lBQy9DLHFCQUFxQixFQUFFLGFBQWE7U0FDckMsQ0FDRixDQUFDO1FBRUYsbUVBQW1FO1FBQ25FLFlBQVksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRWpELG1FQUFtRTtRQUNuRSxhQUFhLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTVDLCtHQUErRztRQUMvRyxnSUFBZ0k7UUFFaEksb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQzlCLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUMzQixJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FDM0MsQ0FBQztRQUVGLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQzVELFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVM7U0FDakMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVTtZQUNoRCxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO1lBQzVELFdBQVcsRUFBRSx3Q0FBd0M7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxHQUFHO1lBQzdDLFdBQVcsRUFBRSxxQ0FBcUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVTtZQUM3QixXQUFXLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXBIRCxvREFvSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuaW1wb3J0ICogYXMgczNuIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczMtbm90aWZpY2F0aW9uc1wiO1xuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29nbml0b0NvbnN0cnVjdCB9IGZyb20gXCIuL2NvZ25pdG8tY29uc3RydWN0XCI7XG5pbXBvcnQgeyBTbnNDb25zdHJ1Y3QgfSBmcm9tIFwiLi9zbnMtY29uc3RydWN0XCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIGxhbWJkYV9weXRob24gZnJvbSBcIkBhd3MtY2RrL2F3cy1sYW1iZGEtcHl0aG9uLWFscGhhXCI7XG5pbXBvcnQgKiBhcyBrbXMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1rbXNcIjtcblxuZXhwb3J0IGNsYXNzIFNlY3VyZUZpbGVWYXVsdFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogczMuQnVja2V0O1xuICBwdWJsaWMgcmVhZG9ubHkgY29nbml0b0NvbnN0cnVjdDogQ29nbml0b0NvbnN0cnVjdDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgYSBLTVMga2V5IGZvciBlbmNyeXB0aW5nIHNlbnNpdGl2ZSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBjb25zdCBlbmNyeXB0aW9uS2V5ID0gbmV3IGttcy5LZXkodGhpcywgXCJFbnZpcm9ubWVudFZhcnNLZXlcIiwge1xuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJLTVMga2V5IGZvciBlbmNyeXB0aW5nIExhbWJkYSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcIixcbiAgICAgIGFsaWFzOiBcImFsaWFzL3NlY3VyZS1maWxlLXZhdWx0LWVudi12YXJzXCIsXG4gICAgfSk7XG5cbiAgICAvLyBSZXRyaWV2ZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIFNOU1xuICAgIGNvbnN0IGRlZmF1bHRFbWFpbCA9IHByb2Nlc3MuZW52LkRFRkFVTFRfRU1BSUw7XG4gICAgY29uc3QgZGVmYXVsdFBob25lTnVtYmVyID0gcHJvY2Vzcy5lbnYuREVGQVVMVF9QSE9ORV9OVU1CRVI7XG5cbiAgICBpZiAoIWRlZmF1bHRFbWFpbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIk1pc3NpbmcgZW52aXJvbm1lbnQgdmFyaWFibGU6IERFRkFVTFRfRU1BSUwuIFBsZWFzZSBzZXQgaXQgaW4geW91ciAuZW52IGZpbGUgb3IgZW52aXJvbm1lbnQuXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghZGVmYXVsdFBob25lTnVtYmVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiTWlzc2luZyBlbnZpcm9ubWVudCB2YXJpYWJsZTogREVGQVVMVF9QSE9ORV9OVU1CRVIuIFBsZWFzZSBzZXQgaXQgaW4geW91ciAuZW52IGZpbGUgb3IgZW52aXJvbm1lbnQuXCJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIFMzIGJ1Y2tldFxuICAgIHRoaXMuYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcImZpbGUtdmF1bHQyN1wiLCB7XG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkdFVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBVVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBPU1QsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5ERUxFVEUsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogW1wiaHR0cDovL2xvY2FsaG9zdDozMDAwXCJdLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBTTlMgVG9waWMgKG5lZWRlZCBmb3IgTGFtYmRhIGVudmlyb25tZW50IHZhcmlhYmxlcylcbiAgICBjb25zdCBzbnNDb25zdHJ1Y3QgPSBuZXcgU25zQ29uc3RydWN0KHRoaXMsIFwiU25zQ29uc3RydWN0XCIsIHtcbiAgICAgIGVtYWlsOiBkZWZhdWx0RW1haWwsXG4gICAgICBwaG9uZU51bWJlcjogZGVmYXVsdFBob25lTnVtYmVyLFxuICAgIH0pO1xuXG4gICAgLy8gRGVmaW5lIHRoZSBMYW1iZGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIHRyaWdnZXJlZCBieSBTMyBldmVudHNcbiAgICBjb25zdCBzM1VwbG9hZEhhbmRsZXIgPSBuZXcgbGFtYmRhX3B5dGhvbi5QeXRob25GdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIlMzVXBsb2FkSGFuZGxlclwiLFxuICAgICAge1xuICAgICAgICBlbnRyeTogXCJsYW1iZGFfc3JjXCIsIC8vIFBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIHlvdXIgTGFtYmRhIGNvZGVcbiAgICAgICAgaW5kZXg6IFwibGFtYmRhLnB5XCIsIC8vIFRoZSBmaWxlIG5hbWUgKHdpdGhvdXQgLnB5KSBvZiB5b3VyIGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgICAgaGFuZGxlcjogXCJsYW1iZGFfaGFuZGxlclwiLCAvLyBUaGUgbmFtZSBvZiB5b3VyIGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfOSwgLy8gQ2hvb3NlIGFuIGFwcHJvcHJpYXRlIFB5dGhvbiBydW50aW1lXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgU05TX1RPUElDX0FSTjogc25zQ29uc3RydWN0LnRvcGljLnRvcGljQXJuLFxuICAgICAgICAgIFMzX0JVQ0tFVF9OQU1FOiB0aGlzLmJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICAgIFMzX0JVQ0tFVF9SRUdJT046IHRoaXMucmVnaW9uLFxuICAgICAgICAgIENVU1RPTUVSX0VNQUlMX1NVQkpFQ1RfUFJFRklYOiBcIlMzIEZpbGUgVXBsb2FkIE5vdGlmaWNhdGlvblwiLCAvLyBPcHRpb25hbDogY3VzdG9taXplIG9yIHJlbW92ZSBpZiBkZWZhdWx0IGluIGxhbWJkYSBpcyBwcmVmZXJyZWRcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVXNlIEtNUyBrZXkgdG8gZW5jcnlwdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICAgICAgZW52aXJvbm1lbnRFbmNyeXB0aW9uOiBlbmNyeXB0aW9uS2V5LFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBHcmFudCB0aGUgTGFtYmRhIGZ1bmN0aW9uIHBlcm1pc3Npb24gdG8gcHVibGlzaCB0byB0aGUgU05TIHRvcGljXG4gICAgc25zQ29uc3RydWN0LnRvcGljLmdyYW50UHVibGlzaChzM1VwbG9hZEhhbmRsZXIpO1xuXG4gICAgLy8gR3JhbnQgdGhlIExhbWJkYSBmdW5jdGlvbiBwZXJtaXNzaW9uIHRvIGRlY3J5cHQgd2l0aCB0aGUgS01TIGtleVxuICAgIGVuY3J5cHRpb25LZXkuZ3JhbnREZWNyeXB0KHMzVXBsb2FkSGFuZGxlcik7XG5cbiAgICAvLyBHcmFudCB0aGUgTGFtYmRhIGZ1bmN0aW9uIHBlcm1pc3Npb24gdG8gcmVhZCBmcm9tIHRoZSBTMyBidWNrZXQgKG9wdGlvbmFsLCBidXQgZ29vZCBwcmFjdGljZSBpZiBpdCBuZWVkcyB0bylcbiAgICAvLyB0aGlzLmJ1Y2tldC5ncmFudFJlYWQoczNVcGxvYWRIYW5kbGVyKTsgLy8gVW5jb21tZW50IGlmIHlvdXIgbGFtYmRhIG5lZWRzIHRvIHJlYWQgb2JqZWN0IGNvbnRlbnQgb3IgbWV0YWRhdGEgYmV5b25kIHRoZSBldmVudFxuXG4gICAgLy8gVHJpZ2dlciBMYW1iZGEgb24gb2JqZWN0IGNyZWF0aW9uXG4gICAgdGhpcy5idWNrZXQuYWRkRXZlbnROb3RpZmljYXRpb24oXG4gICAgICBzMy5FdmVudFR5cGUuT0JKRUNUX0NSRUFURUQsXG4gICAgICBuZXcgczNuLkxhbWJkYURlc3RpbmF0aW9uKHMzVXBsb2FkSGFuZGxlcilcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gcmVzb3VyY2VzXG4gICAgdGhpcy5jb2duaXRvQ29uc3RydWN0ID0gbmV3IENvZ25pdG9Db25zdHJ1Y3QodGhpcywgXCJDb2duaXRvXCIsIHtcbiAgICAgIGJ1Y2tldEFybjogdGhpcy5idWNrZXQuYnVja2V0QXJuLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbElkXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNvZ25pdG9Db25zdHJ1Y3QudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBJRCBvZiB0aGUgQ29nbml0byBVc2VyIFBvb2xcIixcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xDbGllbnRJZFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jb2duaXRvQ29uc3RydWN0LnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogXCJUaGUgSUQgb2YgdGhlIENvZ25pdG8gVXNlciBQb29sIENsaWVudFwiLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJJZGVudGl0eVBvb2xJZFwiLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jb2duaXRvQ29uc3RydWN0LmlkZW50aXR5UG9vbC5yZWYsXG4gICAgICBkZXNjcmlwdGlvbjogXCJUaGUgSUQgb2YgdGhlIENvZ25pdG8gSWRlbnRpdHkgUG9vbFwiLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJCdWNrZXROYW1lXCIsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246IFwiVGhlIG5hbWUgb2YgdGhlIFMzIGJ1Y2tldFwiLFxuICAgIH0pO1xuICB9XG59XG4iXX0=