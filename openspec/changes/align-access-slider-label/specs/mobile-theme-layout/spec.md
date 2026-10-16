# Spec Delta

## ADDED Requirements

### Requirement: Access slider label and thumb share a row
Strict access sliders SHALL place their visible label to the right of the resting drag thumb, with both vertically centered in the same horizontal row. This composition SHALL apply at every supported mobile size and in page, group, popup and native hosts. A narrow track SHALL NOT place its label above the thumb or anchor the thumb in a separate bottom row.

#### Scenario: A narrow Security card shows an opener
- **WHEN** a strict access slider appears in a narrow card, including a track at or below 240 CSS pixels
- **THEN** its resting thumb and label share a vertical center and occupy separate horizontal space inside the track
- **AND** the label is not presented as a heading above a lower drag button

#### Scenario: The same opener appears in another host
- **WHEN** an equivalent opener is displayed in a full-width popup, group or native-host card
- **THEN** the same label/thumb composition applies without a host-specific layout override
- **AND** the existing semantic action/target name and localized visible text remain available

#### Scenario: The entity state or availability changes
- **WHEN** an access slider displays another supported action/state label or becomes unknown, unavailable or disconnected
- **THEN** its resting label and thumb retain the same row composition
- **AND** existing authoritative state feedback, neutral disabled presentation and action guards remain intact

### Requirement: Access slider text reflows beside the thumb
Access labels SHALL retain scalable typography and wrap in the space beside the resting thumb without clipping, ellipsis, overlap or automatic shrinking. The track SHALL grow vertically for wrapped text while keeping the thumb centered beside the label block. Track and thumb SHALL retain visible dimensions of at least 48 by 48 CSS pixels and remain contained.

#### Scenario: Localized or enlarged text needs several lines
- **WHEN** a supported localized label wraps at 320px, a narrow column, landscape, 200% text, 200% browser zoom or bold plus 200% text
- **THEN** the complete label wraps beside the thumb and the track grows enough to contain both
- **AND** neither text nor thumb overlaps the other at rest, extends outside the track or creates horizontal page overflow

#### Scenario: A user begins and cancels a slide
- **WHEN** a supported touch gesture starts from the visibly centered thumb and then cancels or completes
- **THEN** the layout does not switch to stacked rows or jump during the gesture
- **AND** the existing strict horizontal-intent, completion, cancellation, single-dispatch and haptic contracts remain unchanged
