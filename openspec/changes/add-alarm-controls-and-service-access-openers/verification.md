# Verification

Starting commit: `1ec055c69afa3ba8d8911b6b78cb24e115253a3a`. The affected-card set is recorded in proposal.md. The existing `ensure-safe-dashboard-upgrades/tasks.md` edit was preserved.

Previewed `npm run test:affected -- --component security --component actions --component slider --plan`, then ran the selected checks serially. The current evidence covers 41 checks: 23 offline and 18 browser. After the final authored-alarm-link correction, eight affected backend checks and both native security runners passed again. The other 31 checks were reused only after matching their current input hashes and capture hashes.

Private consolidated evidence: `tests/.artifacts/verification/aggregate-rxBg0p/report.json`. Its 41 current results pass the evidence validator. Original run reports and failures remain immutable. Both successful source batches verified cleanup. Earlier source-drift attempts could not use the ordinary cleanup receipt; the recorded safe helper baseline was separately restored and verified in `.ha-test/imports/helper-recovery.json` before the successful batches.

## Covered behavior

- Builder/native-service validation, explicit selections and unknown options; generated alarm sheet identity and authored actions, including legacy `#alarm-…` fragments used by custom YAML.
- Advertised arming modes; numeric/text/no-code metadata; transient PIN cleanup after attempts, rejected services, target/config changes, closure and disconnection; redacted errors; cancelled and completed holds; authoritative state and availability guards.
- Button/switch/script opening dispatch, incomplete and vertical cancellation and exactly one completed dispatch; existing lock/cover actions and native light/fan/cover slider regressions.
- Original vacuum native command parameters and vendor dishwasher refill states; unchanged independently expected released format-2 conversion data.
- Normal/bold/200% text/200% zoom/bold plus 200% text, 320px, iPhone/Android portrait and landscape, both themes, popup geometry, contrast and action alignment.

One earlier native opener check observed no dispatch after its short fixed wait. Retained failure: `run-5Hu5eN`. The runner now centers the control, verifies the native touch hit target, preserves native touch traces on failure and waits for the observed service before the single-dispatch assertion. The final native runs passed in both phone families and themes without warnings or failed resources.

Representative safe captures were visually inspected in `tests/.artifacts/security-final-visual-review/`: bold 200% text/light, 320px/dark and iPhone landscape/dark. Normal light/dark alarm and strict-opener captures were also reviewed. All popup captures use empty PIN fields. These are synthetic fixtures on `192.168.0.28`, not the imported household configuration.

## Import

`.ha-test/imports/marao-dashboard.json` preserves all 121 identified references from the main include graph and referenced templates; 23 source views become 17 pages with eight room subviews and five navbar entries. The separate integrationtest source is excluded.

Independent audit: `.ha-test/imports/import-validation.json`. Builder validation, Visual/JSON normalization and serialization equality, backend validation and generation passed. The audit checks unchanged mounted-source fingerprints, explicit group memberships/filters, original security targets, vacuum data, five dishwasher bindings, the media remote/six sources, popup/page identities, read-only auxiliary references and secret/external-resource exclusion.

No original entities were loaded or actuated on the disposable instance. No production connection, automatic import, publication, full suite, complete mobile matrix, live historical upgrade, or real-phone inspection was performed. App source names and missing original templates remain documented conversion limitations. The change is implemented but not archived or published.
