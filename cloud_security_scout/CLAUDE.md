# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud Security Scout is a cloud-based application for scanning AWS resources for security vulnerabilities. The project consists of two main components:

1. **Backend Infrastructure (CDK)**: Located in `security_scout/` - AWS CDK TypeScript project that defines cloud infrastructure including DynamoDB tables, API Gateway, and IAM roles
2. **Frontend Application (Amplify)**: Located in `frontend/y/` - AWS Amplify application with authentication and data management

## Architecture

The backend uses a modular CDK stack architecture:

- `SecurityScoutDynamoDBStack`: Creates DynamoDB table with GSI indexes for flexible querying
- `SecurityScoutApiStack`: REST API with direct DynamoDB integration (no Lambda functions)
- `SecurityScoutStack`: Main application stack (currently minimal)

The API provides CRUD operations at `/items` endpoints with DynamoDB integration using VTL templates for request/response mapping.

## Development Commands

### Backend (security_scout/)

```bash
cd security_scout
npm run build          # Compile TypeScript
npm run watch          # Watch mode compilation
npm run test           # Run Jest tests
npx cdk deploy         # Deploy to AWS
npx cdk diff           # Compare with deployed stack
npx cdk synth          # Generate CloudFormation template
```

### Frontend (frontend/y/)

```bash
cd frontend/y
# Standard Amplify development workflow
```

## Key Implementation Details

- DynamoDB table uses composite key: `id` (partition) + `timestamp` (sort)
- API Gateway uses direct DynamoDB integration with IAM roles, not Lambda functions
- Frontend uses AWS Amplify with separate auth and data resources
- All stacks are configured for development with `DESTROY` removal policy

we have a .env file that has the rapid api key but wont be used in production, so we can use it for development purposes only.

the code for the dynamo db table is in the security_scout folder, and the code for the api is in the security_scout folder as well.
