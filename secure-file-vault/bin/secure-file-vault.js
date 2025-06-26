#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("aws-cdk-lib");
const secure_file_vault_stack_1 = require("../lib/secure-file-vault-stack");
const dotenv = require("dotenv");
// Load environment variables from .env file
dotenv.config();
const app = new cdk.App();
new secure_file_vault_stack_1.SecureFileVaultStack(
  app,
  "SecureFileVaultStack",
  {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  },
);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJlLWZpbGUtdmF1bHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZWN1cmUtZmlsZS12YXVsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtQ0FBbUM7QUFDbkMsNEVBQXNFO0FBQ3RFLGlDQUFpQztBQUVqQyw0Q0FBNEM7QUFDNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksOENBQW9CLENBQUMsR0FBRyxFQUFFLHNCQUFzQixFQUFFO0lBQ3BEOztxRUFFaUU7SUFFakU7dUVBQ21FO0lBQ25FLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFO0lBRXpGLDhGQUE4RjtDQUMvRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgU2VjdXJlRmlsZVZhdWx0U3RhY2sgfSBmcm9tICcuLi9saWIvc2VjdXJlLWZpbGUtdmF1bHQtc3RhY2snO1xuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XG5cbi8vIExvYWQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZyb20gLmVudiBmaWxlXG5kb3RlbnYuY29uZmlnKCk7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5uZXcgU2VjdXJlRmlsZVZhdWx0U3RhY2soYXBwLCAnU2VjdXJlRmlsZVZhdWx0U3RhY2snLCB7XG4gIC8qIElmIHlvdSBkb24ndCBzcGVjaWZ5ICdlbnYnLCB0aGlzIHN0YWNrIHdpbGwgYmUgZW52aXJvbm1lbnQtYWdub3N0aWMuXG4gICAqIEFjY291bnQvUmVnaW9uLWRlcGVuZGVudCBmZWF0dXJlcyBhbmQgY29udGV4dCBsb29rdXBzIHdpbGwgbm90IHdvcmssXG4gICAqIGJ1dCBhIHNpbmdsZSBzeW50aGVzaXplZCB0ZW1wbGF0ZSBjYW4gYmUgZGVwbG95ZWQgYW55d2hlcmUuICovXG5cbiAgLyogVW5jb21tZW50IHRoZSBuZXh0IGxpbmUgdG8gc3BlY2lhbGl6ZSB0aGlzIHN0YWNrIGZvciB0aGUgQVdTIEFjY291bnRcbiAgICogYW5kIFJlZ2lvbiB0aGF0IGFyZSBpbXBsaWVkIGJ5IHRoZSBjdXJyZW50IENMSSBjb25maWd1cmF0aW9uLiAqL1xuICBlbnY6IHsgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCwgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfSxcblxuICAvKiBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9jZGsvbGF0ZXN0L2d1aWRlL2Vudmlyb25tZW50cy5odG1sICovXG59KTsiXX0=
