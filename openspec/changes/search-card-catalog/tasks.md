- [x] Add localized catalog search using existing input styling and in-place filtering.
- [x] Verify filtering, clearing and retained card selection with a focused check.
- [x] Build and install on disposable 192.168.0.28 without changing saved configuration.

Evidence: 65 editor-panel unit tests passed, including name/description matching, accents/case, clearing, empty results, selection identity and unchanged draft. Editor build and diff checks passed. Frontend sync verified current served assets on disposable 192.168.0.28. No browser or physical-phone inspection was run.
