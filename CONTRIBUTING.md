# Contributing

Contributions are welcome. Keep changes focused and use the existing Home
Assistant integration layout.

## Development

1. Fork and clone the repository.
2. Create a short-lived branch from `main`.
3. Install the locked development dependencies:

   ```sh
   npm ci
   python3.14 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r requirements-test.txt
   ```

4. Make the change and add the smallest useful regression test.
5. Run `npm test`.
6. Open a pull request against `main` explaining the problem and the change.

Dashboard/frontend changes can also be checked against a local Home Assistant VM
with `npm run ha:sync`. The browser e2e check is opt-in: run
`npm run test:ha:e2e` only when the local VM is configured.

## Dashboard dependencies

Marao's third-party cards are independent HACS Dashboard repositories. Do not
copy their JavaScript distributions into Marao's source tree or release
package. When changing a dependency baseline, update the installation and
upgrade documentation, test with a normal HACS installation, and describe any
compatibility impact in the pull request.

By contributing, you agree that your work is licensed under the repository's
existing license.
