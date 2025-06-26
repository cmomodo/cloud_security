#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Secure File Vault Authentication${NC}"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Configuration
USER_POOL_ID="us-east-1_NUEwLU9uL"
CLIENT_ID="172qdgljk491v0lnbtpk6mba3n"
USERNAME="admin1@example.com"
PASSWORD="SecurePassword123!"
REGION="us-east-1"

echo "Testing authentication for $USERNAME"
echo "Using User Pool: $USER_POOL_ID"
echo "Using App Client: $CLIENT_ID"
echo ""

echo "Step 1: Testing admin-get-user to verify user exists..."
aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username $USERNAME \
  --region $REGION > /tmp/user_result.json

if [ $? -eq 0 ]; then
    USER_STATUS=$(cat /tmp/user_result.json | grep UserStatus | cut -d'"' -f4)
    echo -e "${GREEN}✓ User exists${NC}"
    echo "  User status: $USER_STATUS"

    if [ "$USER_STATUS" == "FORCE_CHANGE_PASSWORD" ]; then
        echo -e "${YELLOW}⚠ User is in FORCE_CHANGE_PASSWORD state${NC}"
        echo "  This will require handling the NEW_PASSWORD_REQUIRED challenge"
    fi
else
    echo -e "${RED}✗ User does not exist or cannot be accessed${NC}"
    exit 1
fi

echo ""
echo "Step 2: Testing authentication with InitiateAuth..."
echo '{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "'$CLIENT_ID'",
  "AuthParameters": {
    "USERNAME": "'$USERNAME'",
    "PASSWORD": "'$PASSWORD'"
  }
}' > /tmp/auth_params.json

aws cognito-idp initiate-auth \
  --cli-input-json file:///tmp/auth_params.json \
  --region $REGION > /tmp/auth_result.json

if [ $? -eq 0 ]; then
    if grep -q "ChallengeName" /tmp/auth_result.json; then
        CHALLENGE=$(cat /tmp/auth_result.json | grep ChallengeName | cut -d'"' -f4)
        echo -e "${YELLOW}⚠ Authentication requires challenge: $CHALLENGE${NC}"

        if [ "$CHALLENGE" == "NEW_PASSWORD_REQUIRED" ]; then
            echo "  User needs to change password before logging in"
            echo "  Use the web interface with Debug Login button to change password"
        fi
    elif grep -q "AuthenticationResult" /tmp/auth_result.json; then
        echo -e "${GREEN}✓ Authentication successful!${NC}"
        echo "  Tokens received successfully"

        # Extract and show token info (safely)
        ID_TOKEN=$(cat /tmp/auth_result.json | grep IdToken | cut -d'"' -f4)
        ID_TOKEN_SHORT="${ID_TOKEN:0:20}..."
        EXPIRES_IN=$(cat /tmp/auth_result.json | grep ExpiresIn | cut -d':' -f2 | tr -d ' ,')

        echo "  ID Token: $ID_TOKEN_SHORT"
        echo "  Expires in: $EXPIRES_IN seconds"
    else
        echo -e "${RED}✗ Authentication failed with unknown response${NC}"
        cat /tmp/auth_result.json
    fi
else
    echo -e "${RED}✗ Authentication failed${NC}"
    cat /tmp/auth_result.json
fi

# Clean up temporary files
rm -f /tmp/user_result.json /tmp/auth_params.json /tmp/auth_result.json

echo ""
echo "Step 3: Testing S3 bucket CORS configuration..."
aws s3api get-bucket-cors \
  --bucket securefilevaultstack-filevault275e1a6fc4-lwpik561taha \
  --region $REGION > /tmp/cors_result.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ CORS configuration exists${NC}"
    cat /tmp/cors_result.json

    # Check if localhost:8080 is in allowed origins
    if grep -q "localhost:8080" /tmp/cors_result.json; then
        echo -e "${GREEN}✓ localhost:8080 is in allowed origins${NC}"
    else
        echo -e "${YELLOW}⚠ localhost:8080 is not in allowed origins${NC}"
    fi
else
    echo -e "${RED}✗ CORS configuration does not exist${NC}"
fi

rm -f /tmp/cors_result.json

echo ""
echo -e "${YELLOW}Authentication Test Complete${NC}"
echo "=================================="
echo ""
echo "To test in the browser:"
echo "1. cd frontend"
echo "2. python -m http.server 8080"
echo "3. Open http://localhost:8080/test-auth.html in your browser"
