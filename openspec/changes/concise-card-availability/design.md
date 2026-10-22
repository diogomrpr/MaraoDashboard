# Design

## Decisions
Change the shared summary and cardProblem helpers, rather than individual generated tiles. Suppress only partial availability on aggregate summaries; preserve its full membership for counts, sheets and action guards. Remove entity names from individual partial-availability reasons. Complete availability returns its short neutral reason before retained errors; retaining stored errors lets them reappear on recovery. Keep unknown, missing, unavailable and disconnected localized statuses distinct. Remove the now unnecessary critical-battery partial-warning override so the normal minimum-battery palette remains authoritative.

## Compatibility and verification
No source or public configuration change, no migration and no source writes. Existing selections, unknown fields and saved cards remain intact. Representative lights/covers/climate/battery, legacy summaries, room-light all-off guards, individual auxiliary targets and retained errors are the affected consumers. Run the targeted card visibility checks, review shared runtime callers, and install compatible frontend assets once on disposable 192.168.0.28. Browser/physical-phone inspection is optional and remains with the user.
