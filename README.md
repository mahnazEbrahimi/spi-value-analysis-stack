[semantic-release]: https://github.com/semantic-release/semantic-release
[shared-monitoring-service-stack]: https://github.com/signavio/shared-monitoring-service-stack

# [spi value-analysis] Service Stack

This stack creates a PostgreSQL database and IAM roles for [spi value-analysis] service.

## Dependencies

This stack depends on resources defined in the following stacks:

- [shared-monitoring-service-stack]

Be aware that in order for this stack to be deployed, the stacks mentioned above need to be deployed to the same
environment.

## Releasing

This repository uses the [semantic-release]-bot to automate NPM package releases.

Prefix merge messages with the respective keywords to control how the semantic version (`major.minor.patch`) is going to
be increased:

| Commit message                 | Release type |
| ------------------------------ | ------------ |
| `fix: description`             | Patch        |
| `feat: description`            | Minor        |
| `BREAKING CHANGE: description` | Major        |

## See also

- [SPI Cloud OS Documentation](https://wiki.one.int.sap/wiki/x/9FmYtw)
- [Service Stack Templating](https://wiki.one.int.sap/wiki/x/I1mYtw)
