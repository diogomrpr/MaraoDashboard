---
title: Development
layout: default
---

# Development

Run development commands from the repository root.

## Dependencies

Use Node.js 22 and Python 3.14, then install the Python test dependencies:

```sh
python -m pip install -r requirements-test.txt
```

## Tests

```sh
npm test
pytest -q
```

These commands check dashboard generation, the custom cards, camera providers,
the theme lifecycle, and the config flow. They do not start or contact a Home
Assistant instance. HACS and Home Assistant manifest validation also run in the
repository's CI workflows.

Any end-to-end browser check must target an isolated local test system and must
be explicitly approved by its owner. Never use a live Home Assistant instance
for development testing.

## Documentation

Preview the documentation site locally with:

```sh
cd docs
bundle install
bundle exec jekyll serve
```

See [CONTRIBUTING.md](https://github.com/diogomrpr/MaraoDashboard/blob/main/CONTRIBUTING.md)
for pull-request expectations.
