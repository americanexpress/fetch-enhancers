# Contributing

The following guidelines must be followed by all contributors to this repository. Please review them carefully and do not hesitate to ask for help.

### Code of Conduct

* Review and test your code before submitting a pull request.
* Be kind and professional. Avoid assumptions; oversights happen.
* Be clear and concise when documenting code; focus on value.
* Don't commit commented code to the main repo (stash locally, if needed).

See [our code of conduct](./CODE_OF_CONDUCT.md) for more details.

### Running Locally

Please see the [README](./README.md#-Usage) for details.

### Running Tests

We use [Jest](https://jestjs.io/) as the test runner for all our tests and [ESLint](https://eslint.org/)
for linting. Prior to opening a pull request make sure to run `npm test`.

To run the unit tests and linting:
```bash
$ npm test
```

If you would like to run only the unit tests:
```bash
npm run test:unit
```

Or only linting:
```bash
npm run test:lint
```

To auto fix eslint rule failures that are autofixable run `npm run test:lint -- --fix`

### Opening the PR

* [Fork the Fetch Enhancers repository](https://github.com/americanexpress/fetch-enhancers), open a PR to `main`, and follow the guidelines outlined in this document.

### Pull Request Guidelines

* Keep PRs small, there should be one change per pull request.

* All pull requests must have descriptions and a link to corresponding issue(s) if applicable.

* Keep [commit history clean](https://americanexpress.io/on-the-importance-of-commit-messages/). Follow commit message guidelines (see below) and squash commits as needed to keep a clean history. Remember that your git commit history should tell a story that should be easy to follow for anyone in the future.

* Before making substantial changes or changes to core functionality and/or architecture [open up an issue](https://github.com/americanexpress/one-app/issues/new) to propose and discuss the changes.

* Be patient. The review process will be thorough. It must be kept in mind that changes to our repos are platform wide and thus are not taken lightly. Be prepared to defend every single line of code in your pull request. Attempting to rush changes in will not work.

* Write tests for your changes. A feature is not considered done until it has tests and/or a test plan. It does not matter if code coverage shows 100%, tests are expected for *all* changes.

### Getting in Contact

- Join our [Slack channel](https://one-amex.slack.com) request an [invite](https://join.slack.com/t/one-amex/shared_invite/enQtOTA0MzEzODExODEwLTlmYzI1Y2U2ZDEwNWJjOTAxYTlmZTYzMjUyNzQyZTdmMWIwZGJmZDM2MDZmYzVjMDk5OWU4OGIwNjJjZWRhMjY)

### Git Commit Guidelines

We follow precise rules for git commit message formatting. These rules make it easier to review commit logs and improve contextual understanding of code changes. This also allows us to auto-generate the CHANGELOG from commit messages and automatically version Fetch Enhancers during releases.

For more information on the commit message guidelines we follow see [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
