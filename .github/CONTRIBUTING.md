# Contributing

Keep changes focused and use the existing native frontend architecture.
Read the root `AGENTS.md` and the
[dashboard quality contract](../docs/docs/development/dashboard-quality.md) before
changing dashboard behavior.

## Development

1. Fork and clone the repository.
2. Create a short-lived branch from `main`.
3. Install the locked development dependencies:

   ```sh
   npm ci
   python3.14 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r tests/requirements.txt
   ```

4. Make the change and add the smallest useful regression test.
5. Run only the focused test for the code or card you changed.
6. Install applicable final changes on disposable Home Assistant using the
   [development guide](../docs/docs/development/local-development.md). Use direct
   frontend sync for compatible frontend changes; use full preparation only when
   required. Any selected browser inspection uses safe helpers. Agents may use
   only `192.168.0.28`. Documentation-only work needs no HA deployment.
7. Before a push, tag, GitHub release, or HACS release, run
   `npm run verify:publish`.
8. Open a pull request against `main` explaining the problem and the change.

Dashboard/frontend changes can also be checked against the disposable Home
Assistant VM with `npm run ha:sync`. Publication verification runs affected unit
tests only; browser and upgrade checks belong to development and run when
explicitly requested. Install the final release candidate on the disposable VM
before publishing. Never use a live Home Assistant instance for these checks.

Fix every warning, error card, console exception, failed resource, or repeated
request at its root. Do not suppress it or treat it as expected output.

## Dashboard architecture

Marao's dashboard runtime is self-contained. Reuse Home Assistant or
browser-native capabilities and the existing Marao components; do not add,
bundle, fork, or modify third-party Lovelace cards.

When behavior changes, keep native card forms, shared validation/composition,
runtime, theme, translations, documentation examples, focused tests and safe
gallery fixtures aligned wherever they consume it. Historical conversion remains
compatible; ordinary native edits must never be regenerated over.

The documentation site uses Astro/Starlight and real card previews backed by
fictional devices. Add a named scenario for each materially distinct public
behavior and keep exported YAML free of simulation fields. See
[documentation maintenance](../docs/src/content/docs/development/documentation.md).
Public documentation deploys only with its matching stable release.

By contributing, you agree that your work is licensed under the repository's
existing license.
