import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";

export interface SnsConstructProps {
  email?: string;
  phoneNumber?: string;
}

export class SnsConstruct extends Construct {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props?: SnsConstructProps) {
    super(scope, id);

    this.topic = new sns.Topic(this, "FileVaultTopic", {
      displayName: "Secure File Vault Notifications",
    });

    //add email subcription
    if (props?.email) {
      this.topic.addSubscription(new subs.EmailSubscription(props.email));
    }

    // Add SMS subscription if provided
    if (props?.phoneNumber) {
      this.topic.addSubscription(new subs.SmsSubscription(props.phoneNumber));
    }

    // Output the Topic ARN
    new cdk.CfnOutput(this, "SnsTopicArn", {
      value: this.topic.topicArn,
      description: "The ARN of the SNS Topic",
    });
  }
}
