// Keep documentation builds local: Astro needs no analytics or global preferences.
process.env.ASTRO_TELEMETRY_DISABLED='1';
await import('../node_modules/astro/bin/astro.mjs');
