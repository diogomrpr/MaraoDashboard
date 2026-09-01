# Contributing

Bug reports and focused pull requests are welcome. Open an issue before a large
change so the expected behavior can be agreed on first.

## Set up

1. Fork and clone `https://github.com/diogomrpr/MaraoDashboard`.
2. Create a short-lived branch from `main`.
3. Use Node.js 22 and Python 3.14, then install the Python test dependencies:

   ```sh
   python -m pip install -r requirements-test.txt
   ```

## Test changes

Run both test suites before opening a pull request:

```sh
npm test
pytest -q
```

They validate dashboard generation, the custom cards, camera providers, the
theme lifecycle, and the config flow without contacting a Home Assistant
instance.

Any browser check against Home Assistant must use an isolated local test
system. Never point development tools at a live installation, and do not access
an instance without its owner's approval.

## Pull requests

- Target `main` and keep each pull request focused on one change.
- Explain the user-visible behavior and configuration impact.
- Add or update the smallest relevant test.
- Do not commit credentials, local Home Assistant configuration, build output,
  or private network details.
- Preserve third-party license notices.

By contributing, you agree that your changes are distributed under the
repository's license.
