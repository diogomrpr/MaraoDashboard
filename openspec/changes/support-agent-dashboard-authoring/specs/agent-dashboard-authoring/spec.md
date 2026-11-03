# Spec Delta

## Purpose

Let external agents discover installed Marao contracts and prepare coherent ordinary Home Assistant dashboard edits without a browser or direct write access.

## ADDED Requirements

### Requirement: Installed-version authoring discovery
The release manifest SHALL identify a versioned authoring index with matching package version, native-card schema, examples, guide and portable planner. Native definitions SHALL cover public families, supported aliases, root settings and popup ownership without replacing historical source schemas.

#### Scenario: Agent discovers an installed package
- **WHEN** an agent follows the installed release manifest's authoring reference
- **THEN** it can locate matching hashed assets and supported native configuration definitions
- **AND** discovering metadata performs no dashboard write

### Requirement: Portable read-only planning
A local Node CLI SHALL accept JSON through stdin for describe, validate and plan operations and return JSON through stdout. It SHALL perform no network requests, credential handling, device actions or filesystem writes. Invalid requests SHALL return blocking diagnostics and no writable payload.

#### Scenario: Invalid configuration
- **WHEN** a proposed Marao configuration or required planning context is invalid
- **THEN** diagnostics identify the affected path
- **AND** no ready-to-save payload is returned

### Requirement: Coherent popup authoring
Planning SHALL reuse native validation and popup reconciliation, preserving custom content, unknown fields, explicit emptiness, order, deletions and retained families. Creating or adopting a source SHALL require an explicit popup-edit request. Ambiguous ownership and unsupported versions SHALL block planning without changing the input.

#### Scenario: Parent changes with no browser open
- **WHEN** an agent plans a valid functional change to a parent with a managed popup
- **THEN** the result includes coherent parent and source changes while retaining authored layout
- **AND** planning the resulting document again is a no-op

#### Scenario: First popup edit
- **WHEN** an agent explicitly requests editing an unambiguous automatic popup
- **THEN** the planner creates and links one managed source in the proposed document only

### Requirement: Bounded reviewed save payload
Successful plans SHALL return configuration, ownership information, diagnostics and at most 100 supported JSON Patch operations reproducing the result from the original document. The caller's MCP hash SHALL remain unchanged. Unsafe or unbounded results SHALL omit the save payload. Documentation SHALL require fresh reads, diff review, hash-checked saves and authoritative readback with retained recovery input.

#### Scenario: Literal keys and collection changes
- **WHEN** edited keys contain slashes or tildes and arrays change
- **THEN** the emitted patch applies literally to reproduce the complete proposed document without losing unrelated data

#### Scenario: Save cannot be confirmed
- **WHEN** a writer reports an uncertain save result
- **THEN** the guide directs authoritative readback before any retry or recovery
- **AND** it does not promise global compare-and-swap or automatically invoke a rollback
