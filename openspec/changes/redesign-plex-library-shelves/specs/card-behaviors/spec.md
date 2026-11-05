# Spec Delta

## ADDED Requirements

### Requirement: Three-shelf Plex library home
The enabled Plex library home SHALL show exactly three content shelves, ordered Continue Watching, Movies and TV Series, in both inline and automatic-popup media presentations. Each shelf SHALL retain its localized heading when empty or failed. Shared target, navigation and status controls SHALL remain available without becoming additional content shelves.

#### Scenario: Open the configured Apple TV library
- **WHEN** its library home finishes loading
- **THEN** Continue Watching, Movies and TV Series appear in that order
- **AND** Recently Added and library-directory tiles do not form extra home shelves

#### Scenario: A shelf has no returned titles
- **WHEN** a successful library read returns no matching movie or series titles, or Continue Watching is empty
- **THEN** that shelf retains its heading and a localized empty explanation
- **AND** missing recommendations remain distinguishable from an empty Continue Watching list

#### Scenario: A library read fails
- **WHEN** a movie, series or recommendation read reports a failure
- **THEN** the failure is readable and an explicit retry is available
- **AND** usable content remains accessible without treating the failed read as a successful empty result

### Requirement: Open shelves poster presentation
Shelves SHALL use the selected Open shelves design: portrait artwork at a 2:3 ratio, approximately 160 by 240 CSS pixels within approximately 176-pixel title tiles, rounded covers, and readable wrapping titles below. Tiles SHALL remain visually open without an additional filled enclosing card. Marao themes, typography, semantic actions and minimum 48-pixel controls SHALL apply.

#### Scenario: Covers appear at ordinary mobile scale
- **WHEN** a shelf is rendered with normal text sizing
- **THEN** its tiles are approximately twice the preceding 88-pixel width and keep the cover ratio
- **AND** titles appear below the covers without metadata overlays or the alternative framed-card treatment

#### Scenario: The host is narrow or text is enlarged
- **WHEN** the card is displayed at 320 CSS pixels or with supported enlarged text
- **THEN** titles wrap, shelf height can grow and horizontal overflow is contained in the shelf
- **AND** the page has no added horizontal overflow and controls remain visibly at least 48 by 48 pixels

#### Scenario: Artwork cannot load
- **WHEN** a title has missing or failed artwork
- **THEN** a neutral fallback keeps its portrait dimensions and readable title
- **AND** credentials and raw Plex image URLs do not enter rendered sources or saved configuration

### Requirement: Independent horizontal shelf navigation
Each shelf SHALL remain one horizontal row with native touch scrolling and visible previous/next controls. Vertical page or popup scrolling SHALL remain available. Scroll controls SHALL describe their shelf, reflect its current boundaries, and move only that rail. All returned items SHALL remain reachable through bounded rendering and explicit load-more where needed.

#### Scenario: Scroll a populated shelf
- **WHEN** the user swipes or presses Next in Movies
- **THEN** only the Movies rail changes horizontal position
- **AND** no playback, TV wake, source launch, client scan or dashboard write occurs

#### Scenario: Reach a row boundary
- **WHEN** the rail is at its beginning, its end or has no overflow
- **THEN** the corresponding previous/next control is disabled
- **AND** item names and actions remain available without hover

#### Scenario: Browse a long library
- **WHEN** the returned library exceeds the initial rendering batch
- **THEN** subsequent titles remain reachable in the same rail in returned order
- **AND** rendering additional items neither creates another content row nor resets the current scroll position

#### Scenario: Receive an unrelated state update
- **WHEN** Home Assistant updates another entity while a shelf is scrolled
- **THEN** its attached controls and scroll position remain intact without a new library read

### Requirement: Plex shelves group actual library contents
Movies and TV Series SHALL contain returned movie and show entries from the selected Plex server's libraries. Classification SHALL use media metadata, with direct-child media types as a fallback, rather than translated names or title searches. Matching libraries SHALL merge in returned order; only identical content references SHALL deduplicate. Non-video content SHALL NOT be substituted into these shelves.

#### Scenario: Libraries have custom names or another language
- **WHEN** movie and series libraries expose their media types under custom names
- **THEN** their movie and show entries populate the correct shelf without requiring English library names
- **AND** audio, photo, recommendation and playlist folders do not appear as movie or show titles

#### Scenario: Library classification metadata is absent
- **WHEN** a library's returned descriptor lacks a usable content class
- **THEN** returned direct children can establish their movie or show type
- **AND** the card does not infer a type from the folder's label or fabricate titles

#### Scenario: Multiple libraries contain similar titles
- **WHEN** two matching libraries return duplicate references or different titles with the same displayed name
- **THEN** identical references appear once and different references remain distinct
- **AND** the selected content ID, type, server and resume indication are retained

### Requirement: Shelf selection preserves playback and folder ownership
A completed playable-title tap SHALL retain the existing guarded Plex/Rivulet launch to the currently selected Apple TV, with one strong haptic and exact content identity. A TV-series or season tap SHALL browse descendants through the existing single modal owner. Browsing and returning SHALL preserve the selected TV, mapping and relevant home-shelf positions.

#### Scenario: Resume a title from Continue Watching
- **WHEN** a returned resumable movie or episode is activated
- **THEN** the existing selected-app launch receives that exact title and its resume semantics
- **AND** no title search, automatic fallback TV or duplicate playback request is introduced

#### Scenario: Browse a TV series from the inline card
- **WHEN** a series is activated from its TV Series shelf
- **THEN** its seasons and episodes open through the shared library sheet with the same selected TV
- **AND** no arbitrary episode starts and returning retains the home shelves' horizontal positions

#### Scenario: Browse a TV series inside the media popup
- **WHEN** a series is activated while the media sheet already owns modality
- **THEN** descendants open inside that modal owner with a Back action to the three-shelf home
- **AND** no second modal trap is created

#### Scenario: Existing settings or preview mode are used
- **WHEN** a saved Apple TV card is loaded or previewed with the new presentation
- **THEN** its Plex/Rivulet options, remote, apps, unknown fields and TV/server bindings remain unchanged
- **AND** missing/false Plex settings retain their disabled behavior and previews never dispatch device actions
