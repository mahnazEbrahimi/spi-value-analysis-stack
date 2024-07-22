#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { fromAppContext } from '@signavio/lib-cdk-stack/lib/utils';
import { spiValueAnalysisStack } from '../stack/spi-value-analysis';

const app = new cdk.App();

new spiValueAnalysisStack(app, 'spiValueAnalysisStack', {
  env: { region: fromAppContext<string>(app, 'region'), account: fromAppContext<string>(app, 'account') },
  environment: fromAppContext<string>(app, 'environment'),
});
