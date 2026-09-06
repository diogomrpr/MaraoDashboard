# Contributing

Contributions are welcome. Keep changes focused and use the existing Home
Assistant integration layout. Read the root `AGENTS.md` and the
[dashboard quality contract](docs/docs/development/dashboard-quality.md) before
changing dashboard behavior.

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
5. Run only the focused test for the code or card you changed.
6. Inspect frontend changes on the disposable Home Assistant at
   `192.168.0.28`; use only the safe card-gallery helpers.
7. Before a push, tag, GitHub release, or HACS release, run
   `npm run verify:publish`.
8. Open a pull request against `main` explaining the problem and the change.

Dashboard/frontend changes can also be checked against a local Home Assistant VM
with `npm run ha:sync`. The publish verification includes the browser E2E check
and therefore requires the disposable local VM described in the development
documentation. Never run it against a live Home Assistant instance.

Fix every warning, error card, console exception, failed resource, or repeated
request at its root. Do not suppress it or treat it as expected output.

## Dashboard architecture

Marao's dashboard runtime is self-contained. Reuse Home Assistant or
browser-native capabilities and the existing Marao components; do not add,
bundle, fork, or modify third-party Lovelace cards.

When behavior changes, keep the visual builder, validation, generator, card
runtime, theme, translations, documentation, focused tests, and safe gallery
fixtures aligned wherever they consume that behavior.

By contributing, you agree that your work is licensed under the repository's
existing license.
