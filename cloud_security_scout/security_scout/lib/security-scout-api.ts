import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";

export interface SecurityScoutApiProps extends cdk.StackProps {
  /** Existing DynamoDB table for the API backend */
  table: dynamodb.Table;
}

export class SecurityScoutApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SecurityScoutApiProps) {
    super(scope, id, props);

    const table = props.table;

    // IAM role for API Gateway to call DynamoDB
    const apiDynamoRole = new iam.Role(this, "ApiGatewayDynamoRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });
    table.grantReadWriteData(apiDynamoRole);

    // Define REST API
    const api = new apigateway.RestApi(this, "SecurityScoutApi", {
      restApiName: "Security Scout Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: "prod",
      },
    });

    // /items resource
    const items = api.root.addResource("items");

    // GET /items -> Scan all items
    items.addMethod(
      "GET",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "Scan",
        options: {
          credentialsRole: apiDynamoRole,
          requestTemplates: {
            "application/json": JSON.stringify({
              TableName: "security-scout-table",
            }),
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": `
#set($items = $input.path('$.Items'))
[
#foreach($item in $items)
  {
    "id": "$item.id.S",
    "timestamp": $item.timestamp.N,
    "imdb_id": "$item.imdb_id.S",
    "title": "$item.title.S",
    "year": $item.year.N,
    "genre": "$item.genre.S",
    "director": "$item.director.S",
    "rating": $item.rating.N,
    "plot": "$item.plot.S",
    "poster": "$item.poster.S"
  }#if($foreach.hasNext),#end
#end
]
                `,
              },
            },
          ],
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      },
    );

    // POST /items -> Put a new item
    items.addMethod(
      "POST",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "PutItem",
        options: {
          credentialsRole: apiDynamoRole,
          requestTemplates: {
            "application/json": `
#set($inputRoot = $input.path('$'))
{
  "TableName": "security-scout-table",
  "Item": {
    "id": { "S": "$inputRoot.id" },
    "timestamp": { "N": "$inputRoot.timestamp" },
    "imdb_id": { "S": "$inputRoot.imdb_id" },
    "title": { "S": "$inputRoot.title" },
    "year": { "N": "$inputRoot.year" },
    "genre": { "S": "$inputRoot.genre" },
    "director": { "S": "$inputRoot.director" },
    "rating": { "N": "$inputRoot.rating" },
    "plot": { "S": "$inputRoot.plot" },
    "poster": { "S": "$inputRoot.poster" }
  }
}
          `,
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": `{"message":"Item created"}`,
              },
            },
          ],
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseModels: {
              "application/json": apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
      },
    );

    // /items/{id} resource
    const single = items.addResource("{id}");

    // GET /items/{id} -> Get single item by id
    single.addMethod(
      "GET",
      new apigateway.AwsIntegration({
        service: "dynamodb",
        action: "GetItem",
        options: {
          credentialsRole: apiDynamoRole,
          requestTemplates: {
            "application/json": `
{
  "TableName": "security-scout-table",
  "Key": {
    "id": { "S": "$input.params('id')" }
  }
}
            `,
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": `
#set($item = $input.path('$.Item'))
{
  "id": "$item.id.S",
  "timestamp": $item.timestamp.N,
  "imdb_id": "$item.imdb_id.S",
  "title": "$item.title.S",
  "year": $item.year.N,
  "genre": "$item.genre.S",
  "director": "$item.director.S",
  "rating": $item.rating.N,
  "plot": "$item.plot.S",
  "poster": "$item.poster.S"
}
                `,
              },
            },
          ],
        },
      }),
      {
        requestParameters: {
          "method.request.path.id": true,
        },
        methodResponses: [
          {
            statusCode: "200",
            responseModels: {
              "application/json": apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
      },
    );
  }
}
