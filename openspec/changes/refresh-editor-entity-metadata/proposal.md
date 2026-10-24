# Refresh editor entity metadata

The editor caches entity discovery for its connected lifetime, so new Home Assistant entities remain missing until a page reload. Native form controls also retain their original `hass` reference.

Reuse the live registry collections supplied by Home Assistant and forward current `hass` objects to mounted forms. Invalidate cached editor metadata when registries or state membership change, coalesce related updates, and refresh open entity searches and JSON assistance without replacing the draft or mounted forms.

This changes the visual-builder capability only. No configuration format, backend API, dependency, generated dashboard or migration changes are needed.
