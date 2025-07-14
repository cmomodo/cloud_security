import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";

export class SecurityScoutSnsStack extends cdk.Stack {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.topic = new sns.Topic(this, "SecurityScoutTopic", {
      displayName: "Security Scout Alerts",
    });

    this.topic.addSubscription(
      new subscriptions.EmailSubscription("ceesay.ml@outlook.com")
    );

    // Export the topic ARN for use in other stacks
    new cdk.CfnOutput(this, "SecurityScoutTopicArn", {
      value: this.topic.topicArn,
      exportName: "SecurityScoutTopicArn",
    });
  }
}
