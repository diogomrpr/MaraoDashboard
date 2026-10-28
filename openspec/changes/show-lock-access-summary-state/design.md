## Context

The shared renderer suppresses normal binary state text, which includes stable lock states. Access summaries should show authoritative state consistently for locks and covers.

## Decisions

Exclude md_access_card from redundant state suppression. Keep existing localized state formatting, state visibility settings, binary colors/icons and lock actions. Do not change direct lock/unlock controls or other binary card families. No persistence or compiler changes.

## Verification

Baseline a486471752832993e8828dfff1465483ca9d5008; task snapshot /private/tmp/lock-access-state.json. Existing climate icon changes and duplicate local files remain outside this task. Four focused visibility checks pass, including live Locked/Unlocked in English and Portuguese, explicit state hiding and unchanged binary/transitional presentation. Install the final runtime on disposable 192.168.0.28; hand off visual inspection without operating any lock or cover.
