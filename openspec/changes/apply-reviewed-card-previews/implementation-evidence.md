# Implementation evidence

Applied the consolidated reviewed preview from `.card-design/e551e952-5b00-4f1b-a5ed-fa6033c526f5` to the main sources using a 39-file baseline-aware merge. Exact before-file backups and the reviewed patch are retained in the private temporary promotion directory. Unrelated dirty work and staging were preserved. Generated editor and native assets were rebuilt from the resulting main sources.

The requested outcomes were audited against the promoted owners: shared history time placement; Access label centering and forgiving completion; Alarm options/icons/colors; Climate mode alignment; Camera Events timeline and filters; Cover target-thumb label motion/inset; Dishwasher readings/progress/icons and label option; Energy preview values; Header retirement with saved-card compatibility; Media App neutral availability; compact Number and Wallbox; People/Scene icons; label-free Glance; Weather scenery, metrics and forecasts; grouped autosaving Schedules; continuous Timeline surfaces. Existing main Activity and Energy simulation fixes were retained. Schedule feature documentation now matches the promoted controls.

Selected checks passed: card visibility/layout contracts, slider gestures, schedules, weather presentation, security controls, camera filter rebinding and timestamps, documentation examples and Energy simulation, and Python label validation. Editor/native builds and diff whitespace checks passed. No full test suite, new browser campaign, real-device actuation or camera playback testing was performed.

`prepareFrontend()` confirmed successful native installation on disposable `192.168.0.28`, with served-asset/readiness verification and preserved native dashboard configuration/helpers. Installed asset fingerprint: `0b1c55ada8f3a1cb853587406c67cb769ea8d7fbe2c4ad44c389d25ea800e3c1`. Test entry: `http://192.168.0.28:8123/marao-dashboard/overview`. Documentation stays at `http://127.0.0.1:49942/MaraoDashboard/`, using the existing single server (PID 28611).

Manual handoff: reload Home Assistant and check Cover label movement, compact layouts, forecast content and schedule popup autosaves against real test entities. No publication or archive was requested.

## Release v0.32.0

Published https://github.com/diogomrpr/MaraoDashboard/releases/tag/v0.32.0 from isolated release branch `codex/release-0-32-0`, preserving unfinished popup/editor work in the original workspace. Tag commit: `f6b6a44473c67266447352606f859d9dfa6bd2c9`; main merge: `1cbd9d3d9026555f1b76d704e5708027e0992e75`; pull request #9.

Final unit publication gate: all 74 selected groups passed. Exact-commit GitHub push, pull-request and tag unit runs, HACS and hassfest validation passed. Documentation build/link/gallery validation passed after preserving retired Header redirects and moving Schedule/Weather guidance into generator-owned sources. All 103 uploaded asset names/hashes were verified against the complete final graph plus converter. No new browser/device/playback campaign was run.

Final v0.32.0 candidate was installed and served/readiness verified on disposable `192.168.0.28`; asset identity `777c4381f0c763247268b118915f035d39f59d66109a7e1077d39b572d7e068f`. Configuration/helpers were preserved. One existing documentation server remains on port 49942.
