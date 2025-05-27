import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
export interface SnsConstructProps {
    email?: string;
    phoneNumber?: string;
}
export declare class SnsConstruct extends Construct {
    readonly topic: sns.Topic;
    constructor(scope: Construct, id: string, props?: SnsConstructProps);
}
