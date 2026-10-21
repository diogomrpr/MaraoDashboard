# Design

## Context

See [proposal.md](proposal.md) for the requested appearance and compatibility
decision. The user confirmed a slim title row above the video.

Planning started from checkout `68a9deb96ffd5164949ac6c20f040beed57d654d`,
which contains unrelated uncommitted work. Published v0.12.3 includes the approved
low-first startup milestone. Implementation must retain that released behavior,
not regress to the older fallback sequence still visible in some local source.
The unpublished resource-cleanup fix remains separate.

Observed ownership:

| Boundary | Existing owner and implication |
| --- | --- |
| Card shell | `frontend/MaraoCards.js` resolves `name`/`show_name`, generic icon/state rows and the full-card action. Camera setup also creates an initial placeholder before loading its adapter. |
| Playback presentation | `frontend/MaraoCamera.js` owns the media stage, poster, feedback, recovery controls and native player. Feedback currently sits below the media and retains a minimum height. |
| Shared editing | `frontend_src/MaraoNativeCardEditor.js` offers Name/Icon in the basic form and `show_name`, `show_icon`, `show_state`, `show_label` in Advanced. |
| Native wrapper | `frontend_src/MaraoNativeCards.js` adapts native cards to shared runtime behavior. Title changes must retain the camera child and player. |
| Catalog and generation | `editor.py` supplies camera options; `generator.py` already copies the common name/visibility fields and independently produces event popups. No new persisted key is needed. |
| Coverage | Existing camera Node, local-browser and disposable-browser tests cover native lifecycle, recovery and slow streams. The safe gallery and realistic dashboard provide camera examples. |

The baseline camera spec predates the completed but unarchived
`enable-native-camera-live-view` delta. This change adds presentation requirements
on top of its implemented live behavior. It does not replace that change's
transport/lifecycle requirements or complete the pending adaptive-quality work.
When synchronizing specs later, preserve the completed native-live requirements
and apply this camera-specific presentation exception after generic state rules.

## Goals / Non-Goals

**Goals:** implement the layout at the shared camera owners, use existing
configuration, keep playback mounted, and give every exceptional state one
readable place inside the media area.

**Non-Goals:** a second camera component, a configurable layout-mode system,
new streaming or bandwidth logic, changes to other cards' shared geometry,
event-sheet redesign, or removal of diagnostic error assertions.

## Decisions

### Reuse title settings and keep their existing default

Use `name` for the title and `show_name: false` to remove its whole row. Missing
visibility stays enabled; existing name resolution, including empty-name fallback,
stays unchanged. The internal accessible camera/action identity must remain
available even when no text is drawn above the video.

In the camera's basic shared form, label these controls Title and Show title,
using `frontend_src/native-labels.js` for English/Portuguese text. Do not render
the ineffective Icon, Show icon, Show state or Show label controls for this family.
Preserve their stored values and unknown configuration through the existing patch
helpers. Form defaults must describe current behavior without persisting missing
keys on open or disturbing explicit false.

A new `show_title` key would duplicate an existing supported field and require
unnecessary normalization. Making titles hidden by default would also change
existing installations more than the request requires.

### Scope the shell changes to camera cards

Use the current rounded card with an auto-height title row and a full-width
media area. Keep the existing 16:9 media reservation and fit behavior. Remove the
camera's generic decorative icon, entity-state and label sections, not the
corresponding shared features for other families. Hidden titles contribute no
row, margin or placeholder.

Both the synchronous initial placeholder in `MaraoCards.js` and the loaded
`CameraPlayback` surface must use the same geometry. Otherwise the removed
footer would briefly reappear during module loading. Keep the existing
`setConfig` identity guard and retained camera slot; name/visibility, theme,
locale and routine HA updates must not dispose the player or change quality.

A second renderer or card type would duplicate lifecycle ownership. A global
style hiding generic state/icon elements would affect unrelated card families.

### Put exceptional feedback within the media stage

Remove the permanent feedback footer and its growing minimum-height reservation.
Present concise contextual feedback in a theme-aware surface within the reserved
media area. During normal advancing playback, render no visible Live, recording
or quality text. Retain truthful internal playback state for existing semantics
and diagnostics.

Loading and snapshot-only modes remain explicitly identified. Buffering keeps
the last video frame visible behind a small indicator. Failure, blocked autoplay
and unavailability get a readable explanation; unavailable states clear stale
media. Avoid duplicate generic problem rows by routing camera-owned playback
problems to this media presentation while preserving shared problem semantics.

Long messages and recovery controls may scroll within the media area at enlarged
text sizes. They must remain reachable and readable rather than clipped or
shrunk. Preserve the native connection warning. Keep recovery controls above
the card's action surface, preserve touch-release interception if a button
disappears during recovery, and retain strong haptics and exactly-once dispatch.

Hiding every status would make a snapshot or stalled frame misleading. Keeping
the existing footer only during failures would change card height during playback
and leave the compact layout incomplete.

### Preserve generated and saved contracts

No generator restructuring, migration, new field or default write is required:
existing `name`/`show_name` forwarding covers generated cards. Assert this with
independent expected values rather than modifying every generated camera.
Native/manual cards must behave identically. Hiding a card title does not hide
or rename the event-sheet header.

The deliberate presentation change retires visible camera icon/state/label
options without deleting them. Document that boundary in the camera usage guide
and quality guide. Keep the source model, raw cards, selections, popup hashes,
provider settings, action targets and archived history intact.

## Risks / Trade-offs

- **Long feedback covers more video** → use concise copy, wrapping and internal
  scrolling; test the longest localized recovery state at 320px and enlarged text.
- **A visual update restarts playback** → assert player identity, advancing frames
  and unchanged request counts during title, theme, locale and HA state updates.
- **Invisible layers intercept taps** → remove healthy feedback from hit testing;
  test card activation and recovery gestures independently, including a recovery
  button disappearing during a touch.
- **Old options appear lost** → retain exact stored values and names through
  Visual/JSON/native edits, duplication and generation; document their retired
  camera-only visual effect.
- **Tests depend on the old Live footer** → keep decoded-frame and transport
  evidence as playback truth, and update only presentation assertions. Never
  suppress native errors or replace stream evidence with a badge check.

## Verification and rollout

Implementation will record its own starting commit and select the camera plus
reviewed shared-editor components with `test:affected --plan`. Extend the
existing camera tests for title shown/hidden, long titles, absent and explicit
visibility, quiet healthy/reduced playback, loading/snapshot/buffering/error/
unavailable states and independent event/recovery activation. Include one
non-camera renderer/editor regression to prove the exception is scoped.

Use the existing safe fixture media; no camera or network changes on production
are needed. Cover representative iPhone and Android portrait/landscape, 320px,
bold, 200% text, 200% browser zoom and bold plus 200% text. Keep representative
appearance/state checks in both themes and use one reference theme for equivalent
geometry. Update Cases and a realistic page, then inspect representative settled
states on disposable `192.168.0.28` and restore its original state afterward.

This planning step runs OpenSpec validation only. Implementation does not include
publication. A later release uses scoped publication checks. Because the design
reuses existing fields and does not change persisted structure or ownership,
it does not itself require a format migration or automatic historical upgrade
matrix. If implementation changes those boundaries, reassess scoped upgrade
proof before publication. Existing settings remain compatible with the previous
package, so presentation rollback requires no data conversion.

## Apply verification finding — 2026-10-20

The runtime presentation and both editing surfaces are implemented. Native
cancellation evidence now tracks requests per camera occurrence: another card
starting a stream must not invalidate a retained owner's advancing-video proof.
The original global request inventory and raw cancellation evidence are retained;
a restart by the same owner still fails the proof.

One disposable Android slider run reported a native HLS playlist HTTP 404. An
instrumented rerun and twenty rapid visibility cycles did not reproduce it. Its
cause is unresolved, no exception was accepted, and the failure is not claimed
fixed. Keep task 1.4 open and publication blocked on that finding even if the
remaining presentation checks pass. This note does not relax the playback or
cleanup requirements or complete the pending adaptive-quality change.

## Apply decision — 2026-10-20

The user authorized skipping additional checks during this apply when they cannot be completed. The minimal presentation remains implemented; the historical native playlist 404 is not claimed fixed and task 1.4 remains unverified. No new player or production test is authorized by this check waiver.
