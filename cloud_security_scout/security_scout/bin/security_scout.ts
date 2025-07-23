#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SecurityScoutStack } from "../lib/security_scout-stack";
import { SecurityScoutSnsStack } from "../lib/security-scout-sns";
import { SecurityScoutDynamoDBStack } from "../lib/security-scout-dynamodb";
import { SecurityScoutApiStack } from "../lib/security-scout-api";

const app = new cdk.App();

// Deploy SNS stack first since other stacks depend on it
const snsStack = new SecurityScoutSnsStack(app, "SecurityScoutSnsStack", {});

// Deploy DynamoDB stack
const dynamoDBStack = new SecurityScoutDynamoDBStack(app, "SecurityScoutDynamoDBStack", {});

// Deploy API stack (depends on DynamoDB stack)
new SecurityScoutApiStack(app, "SecurityScoutApiStack", {
  table: dynamoDBStack.securityScoutTable,
});

// Deploy main stack (depends on SNS stack)
new SecurityScoutStack(app, "SecurityScoutStack", {});
