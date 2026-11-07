# Spec Delta

## ADDED Requirements

### Requirement: Embedded customized popup content
Popup-capable Marao cards SHALL accept versioned embedded content owned by that card occurrence. Valid embedded content SHALL take precedence over retained automatic, linked-view and hash-backed content for that occurrence without modifying those sources. Explicit empty content SHALL remain empty. Unsupported or invalid content SHALL show an error without silently falling back to other actions.

#### Scenario: Independent occurrences
- **WHEN** two cards for the same entity save different embedded popup contents
- **THEN** each opens its own saved content with no cross-editing or duplicate popup activation

#### Scenario: Empty or unsupported content
- **WHEN** an embedded layout is explicitly empty
- **THEN** opening its popup does not regenerate default controls
- **WHEN** its content version is unsupported or malformed
- **THEN** a readable error appears and the source is preserved without activating retained legacy controls

### Requirement: Customized child configuration is authoritative
Template-created embedded content SHALL be an independent saved snapshot. Parent setting changes, entity discovery and template updates SHALL NOT rewrite its children, restore deleted cards or retarget actions. Returning to Automatic SHALL be explicit and preserve customized content for returning to it. Saved targets SHALL retain normal capability, availability and connection checks.

#### Scenario: Template or parent changes
- **WHEN** a customized popup has a renamed control and a deleted child and the parent entity, template implementation or registry changes
- **THEN** saved children, names, targets, order, visibility and explicit emptiness remain unchanged
- **AND** the editor explains that customized child bindings are edited in Popup content

#### Scenario: Temporarily return to Automatic
- **WHEN** an administrator saves Automatic and later returns to the retained customized content
- **THEN** the saved customized layout is restored without rebuilding it from the current template

### Requirement: Existing popup sources remain compatible
Cards without embedded customized content SHALL retain their released automatic, hash-backed or linked/managed behavior. Viewing, opening editors and upgrading SHALL NOT convert saved layouts or delete source views. An explicit copy into customized content SHALL preserve the original source and other owners, and SHALL fail without changes if lossless representation or source identity cannot be established.

#### Scenario: Copy a shared customized layout
- **WHEN** one opening card explicitly copies a representable linked or hash-backed layout into its popup draft and saves
- **THEN** its copy preserves sections, ordering, sizes, names, options, visibility, unknown fields and supported custom cards
- **AND** the original source, hashes and all other opening cards remain unchanged

#### Scenario: Ambiguous or unsupported source
- **WHEN** copying encounters a missing or duplicate source, unsupported metadata, or layout behavior that cannot be preserved
- **THEN** the editor explains the blocker without changing the source or draft
- **AND** normal linked-layout editing remains available where supported

### Requirement: Embedded popup scope and safety
Embedded content SHALL use the shared sheet presentation, focus/scroll lifecycle and child action safeguards. Collection summary membership SHALL derive from saved compatible child cards, including hidden children and excluding deleted ones. Embedded source resolution SHALL remain occurrence-local and SHALL NOT create routes, persist synthetic views or enable device actions in previews.

#### Scenario: Customized collection membership
- **WHEN** an administrator removes a light child and keeps another light hidden by visibility conditions
- **THEN** collection actions exclude the deleted light and retain the configured hidden light, subject to normal availability checks
- **AND** no control gains tap-based opening or unlocking behavior through template application or copying

#### Scenario: Open and leave an embedded sheet
- **WHEN** an embedded popup is opened, scrolled, closed or removed by navigation
- **THEN** the existing modal semantics, navbar layering, focus restoration and listener/child cleanup remain effective
- **AND** opening and closing send no device action or configuration write
