import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { fromAppContext } from '@signavio/lib-cdk-stack/lib/utils';
import { spiValueAnalysisStack } from '../stack/spi-value-analysis';

const app = new cdk.App({
  context: {
    environment: 'dev_cloud_os_eu',
    account: '857753963368',
    region: 'eu-central-1',
  },
});

const expectedGlobalTags = [
  {
    Key: 'org/group',
    Value: 'process-intelligence',
  },
  {
    Key: 'org/name',
    Value: 'signavio',
  },
  {
    Key: 'org/oncall-channel',
    Value: 'opsgenie-mok-office-3',
  },
  {
    Key: 'org/product',
    Value: 'process-intelligence',
  },
  {
    Key: 'org/subgroup',
    Value: 'PAA',
  },
  {
    Key: 'org/team',
    Value: 'neon-kraken',
  },
]

const appStack = new spiValueAnalysisStack(app, 'spiValueAnalysisStack', {
  env: { region: fromAppContext<string>(app, 'region'), account: fromAppContext<string>(app, 'account') },
  environment: fromAppContext<string>(app, 'environment'),
});

const template = Template.fromStack(appStack);

test('check appStack stack is not null', () => {
  expect(appStack).not.toBeNull();
});

// IAM
test('IAM managed policies have been created', () => {
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: 'spiValueAnalysisAdminAccessPolicy-dev_cloud_os_eu',
    PolicyDocument: {
      Statement: [
        {
          Action: 'rds-db:connect',
        },
      ],
    },
  });

  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: 'spiValueAnalysisReadAccessPolicy-dev_cloud_os_eu',
  });

  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: 'spiValueAnalysisAppAccessPolicy-dev_cloud_os_eu',
  });
});

test('IAM Roles should have Trust conditions created correctly', () => {
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Condition: {
            'ForAllValues:StringEquals': {
              'oidc.eks.eu-central-1.amazonaws.com/id/B9F82677D4A86153847DB291568D6256:sub': [
                'system:serviceaccount:spi:spiValueAnalysis-admin',
              ],
            },
          },
        },
      ],
    },
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Condition: {
            'ForAllValues:StringEquals': {
              'oidc.eks.eu-central-1.amazonaws.com/id/B9F82677D4A86153847DB291568D6256:sub': [
                'system:serviceaccount:spi:spiValueAnalysis-read',
              ],
            },
          },
        },
      ],
    },
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Condition: {
            'ForAllValues:StringEquals': {
              'oidc.eks.eu-central-1.amazonaws.com/id/B9F82677D4A86153847DB291568D6256:sub': [
                'system:serviceaccount:spi:spiValueAnalysis-app',
              ],
            },
          },
        },
      ],
    },
  });
});

// SSM
test('SSM parameters created', () => {
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Name: '/Suite/Database/spi-value-analysis/PrimaryEndpointHostName',
    Type: 'String',
  });
});

// DB
test('check RDS databases have been created', () => {
  template.hasResourceProperties('AWS::RDS::DBInstance', {
    DBInstanceIdentifier: 'spi-value-analysis',
    Engine: 'postgres',
    EngineVersion: '15',
    Tags: [
      ...expectedGlobalTags,
      {
        Key: 'RDS-Backup-Enabled',
        Value: 'Yes',
      },
    ],
  });
});
