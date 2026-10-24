## Design
Use a bounded map of released owned template IDs and owned option keys, resolving them to `md_`. Do not perform arbitrary recursive string replacement on user configuration. Normalize descriptor copies at page-entry/validation/generation boundaries and raw runtime/native editor entry points. Preserve source objects, opaque properties, actions, raw YAML and entity IDs. Editor normalization may canonicalize its working descriptors while retaining exact original container source for unchanged serialization. Recognized legacy option conflicts must fail visibly rather than silently discard values.

Active implementation/catalogs and current test/gallery examples use canonical names. Historical source/generated fixtures and archived histories remain immutable; compatibility tests keep explicit legacy inputs. Existing saved native element types remain unchanged because their names already start with `marao-native-`.

Verify old/new representative configurations generate equivalent controls, unchanged-source round trips, option conflict handling, preserved unknown data and strict access guards. Use scoped unit checks; no camera playback or device matrix. Install once after final edits on disposable 192.168.0.28 preserving configuration and safe helper state.

Current-format expected conversion documents now use independently specified md literals; only their target-document hashes were updated. Historical source/predecessor/generated fixture bytes and provenance hashes remain unchanged.
