# Proposal

## Why

The new section containers remain fully expanded, making long editor pages difficult to scan. Repeating the word Section in every heading adds visual noise.

## What Changes

- Let each section collapse independently through a native disclosure header, initially expanded.
- Show only its current number in a compact badge, with a chevron and localized Section N accessible name.
- Retain section tools in the header; hide its cards, guidance and Add card plus while collapsed. Keep Add section outside.
- Remember collapsed sections by draft object identity while the panel is retained, including page collapse/reopening and unchanged Visual/JSON switches. Newly encountered sections start expanded; accepted document replacements may reset section disclosure.

Observed: the shared renderer creates `.page-section` elements with a heading, list and plus; section markup is reused across local updates. Intended: add presentation-only disclosure with no automatic writes. Runtime card set: empty. Consumers: flat and sectioned pages in both editor hosts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: independently collapsible editor sections and number-only badge headings.

## Impact

Shared panel renderer and CSS, existing panel tests, configuration documentation and rebuilt editor assets. Preserve released JSON, order, identities, unknown/raw data, explicit emptiness and generated output; no migration or backend work. Non-goals: persistence of disclosure across fresh panels, automatic drag expansion, drag animations, new section naming or changes to page collapse defaults.
