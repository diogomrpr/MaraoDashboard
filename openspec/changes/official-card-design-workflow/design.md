# Design

Published galleries use public/gallery compact assets built from the documented source. Local galleries use the dev middleware/live bundle; configuration playgrounds use a separate baseline bundle. Existing authored prose refinements live in card-reference-overrides.json alongside the example manifest. Generated pages remain generated.

card:context resolves catalog aliases and routes intent to narrow owners/anchors. The curated ownership map is guidance; final diff/call-site review determines consumers. docs:design records a source snapshot and baseline hashes in a task-specific ignored Git workspace, reuses dependencies with local caches, reports drift and never overwrites an existing proposal. Main apply is an explicit reviewed patch workflow, not directory sync.

The skill separates design approval, shared-consumer scope and apply authority. Shared all-consumer changes modify one base; scoped changes use family selectors/variants with unchanged unrelated defaults. No safety contract change follows from visual scope approval.
