# Design

## Context

See `proposal.md` for motivation and scope. The shared `_entityRow()` in `frontend_src/MaraoDashboardPanel.js` renders move/edit/delete controls and `_roomAction()` mutates the selected draft container before `_setDirty()` and `_refreshCards()`. Page-section coordinates already flow through these controls. `editor-model.js` provides deep cloning, random identity allocation and page-duplication reference handling.

`compile-dashboard.js` rejects conflicting local card IDs and derives page-scoped popup hashes from occurrence IDs, but explicit popup/mode-selector hashes override those defaults. Entity-group IDs also identify generated group content. `ha_card` descriptors keep exact YAML strings, and `lovelace-editor.js` assigns descriptor IDs when creating native cards. Existing row-action CSS wraps controls and enforces 48px targets.

## Goals / Non-Goals

**Goals:** one shared duplication operation, independent occurrences and generated sheets, exact authored data preservation, and reuse of current draft/render/save mechanisms.

**Non-Goals:** new storage APIs, changing the compiler's ordinary layout semantics, rewriting embedded YAML links or duplicating separately authored raw popup definitions outside the selected descriptor.

## Decisions

1. **Deep-copy one descriptor in the model layer.** Add a small helper in `editor-model.js` used by the shared panel action. Resolve the current editable container and selected index, clone the descriptor, assign a fresh collision-free ID and splice immediately after it. Preserve the original name, including localization metadata; avoid inventing a localized “copy” suffix that would change configured labels. Reusing the form creation path was rejected because it can normalize values, omit unknown fields or reserialize YAML. Do not normalize or migrate the complete draft as part of this action.

2. **Separate generated identities from authored destinations.** Allocate a new descriptor identity even when the original omitted its ID. For Marao-owned popup/mode-selector definitions on the copied descriptor and nested group members, allocate fresh hashes and remap only references to those definitions within the clone. Reuse the relevant mapping logic from page duplication where appropriate without broad changes to page-copy behavior. Missing hashes stay missing so the existing compiler derives them. Preserve unrelated navigation paths, entity IDs, group member identity/bindings and all opaque YAML. A blind recursive string replacement is inappropriate because authored links may intentionally target another existing card or page. Explicit descriptor-owned `popup_hash` and `mode_selector_hash` overrides need fresh values too: changing the ID alone does not prevent those collisions.

3. **Expose one immediate, local action.** Add a content-copy semantic button near Edit/Delete with a localized Duplicate card name in English and Portuguese. Route through `_roomAction()` using existing container adapters, dirty state, haptics and section refresh. No dialog, automatic Save, entity service or new metadata request is needed. Preserve unrelated focus, expanded pages and scroll through the existing targeted refresh contract. Retain wrapping and 48px targets; change shared row CSS only if the added action needs it.

4. **Keep the existing persistence and generation contracts.** The copy is another ordinary descriptor, not a new card type or source format. Native `validateSource()` and `compileDashboard()` and the retained integration generator consume it normally. No schema/default/backend change is intended. Check the retained generator only for an actual equivalent identity discrepancy; do not expand this feature into the ongoing native migration. Shared card runtime, theme tokens, action safety and normal generated grouping remain unchanged.

5. **Use targeted regression coverage and existing safe examples.** Extend the model/panel tests for independent nested configuration, same-container placement, current section coordinates and draft semantics. Add a narrow compiler assertion for two copies with distinct generated sheet targets, since hash collision is the concrete risk. Include exact YAML preservation and unknown/empty field cases in those existing tests. Update `docs/docs/installation/configuration.md` and use existing safe cards in the disposable editor; no new gallery matrix or test harness is needed.

## Risks / Trade-offs

- [Explicit popup overrides survive a naive clone] → Remap clone-owned definitions and their internal references; assert generated targets differ while original/external references stay intact.
- [Nested data is accidentally shared or YAML reformatted] → Clone the descriptor as data; assert independent edits and byte-for-byte YAML preservation.
- [One more action crowds narrow rows] → Reuse wrapping row controls and 48px buttons; include a short manual mobile watch list without a new automated layout campaign.
- [Automatic layout groups cards after saving] → Source insertion remains adjacent; retain existing automatic-layout guidance and fixed-column exact ordering.
- [Native distribution work changes build/install entry points] → Use the current compatible build and disposable installer at apply time; preserve unrelated work and do not reopen its migration tasks.

## Migration Plan

No migration: existing released descriptors remain untouched, and the new copy uses the current source schema. Existing explicit save validation, backups and recovery remain responsible for writes. Build editor/distribution assets through existing scripts and install the final applicable assets once on disposable `192.168.0.28` using the fastest compatible helper. If deployment fails, report not installed / not ready for test. Code rollback removes the new action/helper; already saved copies remain valid ordinary descriptors, so no data downgrade or historical fixture rewrite is needed.
