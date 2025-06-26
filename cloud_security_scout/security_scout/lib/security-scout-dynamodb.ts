import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { securityScoutTableSchema } from "./security-scout-dynamodb-schema";

export class SecurityScoutDynamoDBStack extends cdk.Stack {
  public readonly securityScoutTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table using schema configuration
    this.securityScoutTable = new dynamodb.Table(this, "SecurityScoutTable", {
      // Use partition key from schema
      partitionKey: {
        name: securityScoutTableSchema.partitionKey.name,
        type: dynamodb.AttributeType[
          securityScoutTableSchema.partitionKey
            .type as keyof typeof dynamodb.AttributeType
        ],
      },

      // Add sort key from schema
      sortKey: {
        name: securityScoutTableSchema.sortKey.name,
        type: dynamodb.AttributeType[
          securityScoutTableSchema.sortKey
            .type as keyof typeof dynamodb.AttributeType
        ],
      },

      // Configure table name from schema
      tableName: securityScoutTableSchema.tableName,

      // Configure billing mode
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Most cost-effective for variable workloads

      // Optional: Enable encryption at rest
      encryption: dynamodb.TableEncryption.AWS_MANAGED,

      // Optional: Configure removal policy (DESTROY for dev, RETAIN for prod)
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      // Configure time-to-live (TTL) from schema
      timeToLiveAttribute: securityScoutTableSchema.timeToLiveAttribute,
    });

    // Add Global Secondary Indexes from schema
    securityScoutTableSchema.globalSecondaryIndexes.forEach((gsi) => {
      this.securityScoutTable.addGlobalSecondaryIndex({
        indexName: gsi.indexName,
        partitionKey: {
          name: gsi.partitionKey.name,
          type: dynamodb.AttributeType[
            gsi.partitionKey.type as keyof typeof dynamodb.AttributeType
          ],
        },
        projectionType: dynamodb.ProjectionType.ALL,
      });
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
