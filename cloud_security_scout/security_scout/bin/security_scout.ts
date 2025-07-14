#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SecurityScoutStack } from "../lib/security_scout-stack";
import { SecurityScoutSnsStack } from "../lib/security-scout-sns";
import { SecurityScoutDynamoDBStack } from "../lib/security-scout-dynamodb";

const app = new cdk.App();

// Deploy SNS stack first since other stacks depend on it
const snsStack = new SecurityScoutSnsStack(app, "SecurityScoutSnsStack", {});

// Deploy DynamoDB stack
new SecurityScoutDynamoDBStack(app, "SecurityScoutDynamoDBStack", {});

// Deploy main stack (depends on SNS stack)
new SecurityScoutStack(app, "SecurityScoutStack", {});
