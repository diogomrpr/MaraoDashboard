# Proposal

## Why

The dashboard editor's header scrolls with its long form, taking save actions and editing-mode navigation out of reach. Keep it visible so users can finish or change modes without returning to the top.

## What Changes

- Keep the editor title, draft/save state, action toolbar and Visual/JSON tabs in a sticky header in both editing modes.
- Give the header an opaque theme surface and appropriate stacking below dialogs and selectors; account for the actual HA scrolling container and any shell/safe-area inset without a guessed fixed toolbar height.
- Reflow the existing controls on narrow screens and large text. Keep Save & Generate and mode switching directly available; retain access to every other existing action with a compact secondary-action presentation when short viewports cannot accommodate all buttons inline.
- Preserve normal page and JSON scrolling, draft state, keyboard access, action disabled/busy states, dialogs and explicit save/discard behavior.
- Add a focused browser regression for real scrolling, header geometry, content access and interaction, and update the editor workflow documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `visual-builder`: persistent, responsive editor header with safe stacking, scrolling and unchanged document/action behavior.

## Impact

Source inspection confirms `_renderShell` renders `.toolbar` and `.tabs` as ordinary siblings within `.page`; neither has sticky positioning. The toolbar already wraps actions and becomes a column below 850px. The JSON editor has its own bounded scroll surface, and dialog actions already have independent sticky styling. A read-only disposable browser inspection at 1280×720 found the toolbar at top 24px and computed `position: static` in a roughly 7,460px editor page. This is source/geometry evidence; an end-to-end scroll reproduction and physical-phone inspection were not established during planning.

Affected source is `frontend_src/MaraoDashboardPanel.js`, `panel.css`, their generated editor assets, existing editor browser checks (or one small check using installed Playwright), and the local-development/editor documentation. The **affected dashboard-card set is empty**: no renderer, card options, generator, gallery card or safe entity behavior changes are needed. Use the existing disposable editor document as the realistic fixture, not a new gallery example. Reassess if implementation reaches shared dashboard code.

Assumption: “header” includes the current title/action toolbar and its Visual/JSON navigation. Do not make each room/section heading sticky. Coordinate with planned editor startup and folding changes without implementing them here. No new dependency, backend API, JSON key, schema conversion or migration; saved configuration and generated output remain identical. Non-goals: editor redesign, changes to the dashboard's native header/navbar, general notch fixes, automatic saving, a new test framework or publication. Planning edits only; application code and unrelated work remain untouched.
