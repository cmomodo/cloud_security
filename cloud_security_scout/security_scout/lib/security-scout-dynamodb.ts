import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class SecurityScoutDynamoDBStack extends cdk.Stack {
  public readonly securityScoutTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table for security scout
    this.securityScoutTable = new dynamodb.Table(this, "SecurityScoutTable", {
      // Use a partition key for unique identification
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },

      // Optional: Add a sort key for more complex queries
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.NUMBER,
      },

      // Configure table name (optional, CDK will generate a name if not specified)
      tableName: "security-scout-table",

      // Configure billing mode
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Most cost-effective for variable workloads

      // Optional: Enable encryption at rest
      encryption: dynamodb.TableEncryption.AWS_MANAGED,

      // Optional: Configure removal policy (DESTROY for dev, RETAIN for prod)
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      // Optional: Configure time-to-live (TTL) for automatic record expiration
      timeToLiveAttribute: "expiresAt",
    });

    // Optional: Add Global Secondary Indexes (GSI) for flexible querying
    this.securityScoutTable.addGlobalSecondaryIndex({
      indexName: "TimestampIndex",
      partitionKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add a second GSI for potential security-related filtering
    this.securityScoutTable.addGlobalSecondaryIndex({
      indexName: "SecurityStatusIndex",
      partitionKey: {
        name: "securityStatus",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });
  }
}
/**
 * This implementation provides:
 * 1. A primary key with `id` and a sort key with `timestamp`
 * 2. Pay-per-request billing mode
 * 3. AWS-managed encryption
 * 4. Time-to-live attribute for automatic data expiration
 * 5. Two Global Secondary Indexes for flexible querying:
 *    - `TimestampIndex`: Allows querying by timestamp
 *    - `SecurityStatusIndex`: Allows filtering by security status
 * 6. Configured to be destroyed when the stack is deleted (suitable for development)
 *
 * The stack is designed to be flexible and scalable, with built-in security and cost-optimization features.
 */
