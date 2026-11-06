# Create or extend cards

First resolve whether an existing Sensor/Base/collection configuration satisfies the request, an existing family needs a variant, or a new native family is actually required. Clarify only missing domain, capabilities, states, actions or design requirements. Reuse existing sliders, numeric controls, availability, popup and safety behavior; do not copy whole components.

For a genuine family, use the project's OpenSpec workflow for the new public contract. Work in the proposal workspace first. Review a neighboring family and cover:
1. Catalog identity and fields in marao-catalog.json; preserve existing IDs/defaults and explicit emptiness.
2. Native composition/type mapping in frontend_src/card-composition.js and wrappers in native-cards.js; shared renderer in MaraoCards.js or an appropriate existing owner.
3. Shared validation/schema and effective defaults; native editor metadata/options. Never edit generated native bundles directly: build:editor generates them from frontend_src.
4. Actual rendering, authoritative states, capability checks, loading/error/unavailable handling and dispatch safety.
5. English/Portuguese localization and documentation manifest/fictional fixtures for materially different states and supported options.
6. Verification-map/source-consumer ownership entries, focused tests, representative safe gallery examples where needed.
7. Preview, scope decision for modified shared bases, explicit apply, minimal verification and disposable installation.

A font/layout tweak does not require reading this checklist or creating a new full OpenSpec change. A new persisted/public contract does require compatibility review. No migration by resetting existing user data.
