## ADDED Requirements
### Requirement: Reviewed compact control geometry
Number SHALL show a large left value and the shared Climate up/down buttons at right without empty vertical rows. Wallbox without shortcuts SHALL collapse unused shortcut space. People default icons SHALL use the shared circular background. Scene selector icons SHALL align with the top of the title/state header. Existing controls SHALL retain their touch targets.

#### Scenario: Shortcuts are absent
- **WHEN** a Wallbox card renders no shortcuts
- **THEN** unused shortcut rows and their empty spacing are removed

### Requirement: Independent Cover label motion
Cover state labels SHALL follow the target thumb independently from animated current fill. Side transitions SHALL move horizontally out through an edge and reenter from the opposite edge, honor reduced motion and cancel superseded animation. Labels SHALL have a 16px horizontal inset.

#### Scenario: A report matches the requested target
- **WHEN** current fill is still interpolating
- **THEN** the target thumb and label do not move back to the fill position

### Requirement: Clean card and status surfaces
Access labels SHALL center across the full track without a thumb offset. Media App SHALL omit redundant visible availability text and question-mark overlays while retaining details and disabled actions. Timeline and Schedules SHALL render full-width continuous rounded surfaces without inline background fragments. History times SHALL sit smaller below event icons.

#### Scenario: A Timeline history request fails
- **WHEN** its error state renders
- **THEN** the card background remains continuous and Error/Retry remain visible
