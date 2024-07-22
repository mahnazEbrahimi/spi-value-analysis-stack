import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ServiceStack, ServiceStackProps, TemplateRenderer } from '@signavio/lib-cdk-stack';
import { DBResourceHandler, Postgres, PostgresProps } from '@signavio/lib-database';
import { IamRoleBase, RoleBaseProps } from '@signavio/lib-iam';
import path from 'path';

class DbResourceIds {
  rdsDbResourceId = 'CHANGE_ME';
}

export class spiValueAnalysisStack extends ServiceStack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    const renderer = this.createTemplateRenderer(props);
    const dbResourceIds = this.createRdsInstances(renderer);
    this.createIamPoliciesAndRoles(renderer, id, dbResourceIds);
    this.addTags();
  }

  private createTemplateRenderer(props: ServiceStackProps) {
    const valueFile = path.join(__dirname, '../config/values.yaml');
    const templatesDir = path.join(__dirname, '../config/templates');

    return new TemplateRenderer({
      environment: props.environment,
      parameters: {
        environment: props.environment,
        account: cdk.Stack.of(this).account,
        region: cdk.Stack.of(this).region,
      },
      valueFile,
      templatesDir,
    });
  }

  private createRdsInstances(renderer: TemplateRenderer): DbResourceIds {
    const dbResourceIds = new DbResourceIds();
    const rds = renderer.renderByType<Record<string, PostgresProps>>('rds');

    Object.entries(rds).forEach(([resourceName, props]) => {
      if (!props.instanceIdentifier) {
        throw new Error(`Resource ${resourceName}: instanceIdentifier must be set when creating RDS instance`);
      }
      if (!props.init) {
        throw new Error(`Could not create RDS instance ${resourceName}: init script for database must be defined`);
      }
      const sqlFilePath = path.join(__dirname, '..', props.init.path);
      // AWS does not let you set IOPS if allocated storage is below 400GB
      const iops = () => {
        const allocatedStorage: number | undefined = props.allocatedStorage;
        if (allocatedStorage !== undefined) {
          if (allocatedStorage >= 400) {
            return props.iops;
          } else {
            return undefined;
          }
        } else {
          throw new Error("allocatedStorage is undefined");
        }
      };
      const dbInstance = this.createRDS({
        ...props,
        init: {
          ...props.init,
          path: sqlFilePath,
        },
        iops: iops(),
      });

      const dbResourceIdHandler = new DBResourceHandler(this, `custom-${props.instanceIdentifier}`, {
        instanceIdentifier: props.instanceIdentifier,
      });
      dbResourceIdHandler.node.addDependency(dbInstance);

      dbResourceIds.rdsDbResourceId =
        dbResourceIdHandler.customResource.getResponseField('DBInstances.0.DbiResourceId');
    });
    return dbResourceIds;
  }

  private createIamPoliciesAndRoles(renderer: TemplateRenderer, id: string, dbResourceIds: DbResourceIds) {
    const iam = renderer.renderByType<Record<string, RoleBaseProps>>('iam', {
      rdsDbResourceId: dbResourceIds.rdsDbResourceId,
    });
    Object.values(iam).forEach(props => new IamRoleBase(this, `${id}-iam`, props));
  }

  private createRDS(props: PostgresProps): Postgres {
    return new Postgres(this, `${props.instanceIdentifier}`, {
      ...props,
      engineVersion: props.engineVersion,
    });
  }

  private addTags() {
    // Necessary tags are documented here: https://wiki.one.int.sap/wiki/display/SIGCOS/Crossplane+Tagging+Strategy
    //
    // These tags should match our Kubernetes resource tags in `suite-k8sconfig`. Note that they
    // are defined in multiple places there.
    const tags = cdk.Tags.of(this);

    // Business: Opsgenie channel where alerts will be sent to
    tags.add('org/oncall-channel', 'opsgenie-mok-office-3');
    // Business: Organization name
    tags.add('org/name', 'signavio');
    // Business: Group of the resource
    tags.add('org/group', 'process-intelligence');
    // Business: Subgroup of the resource
    tags.add('org/subgroup', 'PAA');
    // Business: Owner of the resource
    tags.add('org/team', 'neon-kraken');
    // Business: The business unit of the application
    tags.add('org/product', 'process-intelligence');
  }
}
