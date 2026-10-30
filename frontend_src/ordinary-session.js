import { assertNativeSupport, readMetadata } from './native-session.js';
import { canonicalDocument, classifyDashboard, classifyRecovery, convertOrdinaryDocument, createRecoveryExport, validateRecoveryExport } from './ordinary-model.js';
import { copy, SourceError } from '../custom_components/marao_dashboard/frontend/MaraoSource.js';

const fail = code => { throw new SourceError(code, '$'); };

/** Explicit replacement only: constructing, reading and staging never write HA. */
export class OrdinaryConversionSession {
  constructor(hass, root, { compatibility, packageVersion = '' } = {}) {
    if (typeof root !== 'string' || !/^[a-z0-9][a-z0-9_-]*-[a-z0-9_-]+$/.test(root)) fail('dashboard_root_needed');
    this.hass = hass; this.root = root; this.compatibility = compatibility; this.packageVersion = packageVersion;
    this._epoch = 0; this._saving = null; this._uncertain = false;
  }

  invalidate() { this._epoch++; this._invalidated = true; this.acknowledgement = null; }

  async current() {
    assertNativeSupport(this.hass);
    return this.hass.callWS({ type: 'lovelace/config', url_path: this.root, force: true });
  }

  async stage(text, context = {}) {
    if (this._saving) fail('native_conversion_busy');
    this._requireAdmin();
    const epoch = ++this._epoch;
    this.result = null; this.recovery = null; this.acknowledgement = null; this._uncertain = false;
    const baseline = await this.current();
    const classified = classifyDashboard(baseline);
    if (classified.kind === 'ordinary') fail('ordinary_conversion_unneeded');
    // Existing registrations are never recreated or silently retargeted.
    if (classified.kind === 'strategy' && baseline.strategy.dashboard_root !== this.root) fail('native_root_conflict');
    await this._requireCompatibility();
    const supplied = text ?? JSON.stringify(baseline, null, 2) + '\n';
    const input = classifyDashboard(supplied);
    if (input.kind === 'strategy' && canonicalDocument(input.document) !== canonicalDocument(baseline)) fail('native_conversion_stale');
    if (input.kind !== 'strategy' && classified.kind === 'strategy') {
      // A separate source export is accepted only when it matches the saved source.
      if (canonicalDocument(input.document) !== canonicalDocument(classified.source)) fail('native_conversion_stale');
    } else if (canonicalDocument(input.document) !== canonicalDocument(baseline)) fail('native_conversion_stale');
    const metadata = context.entities && context.areas ? context : { ...await readMetadata(this.hass), ...context };
    // A pasted source can identify the same strategy, but its outer envelope is
    // still authoritative for opaque native settings and recovery provenance.
    const conversionText = classified.kind === 'strategy' && input.kind !== 'strategy' ? JSON.stringify(baseline, null, 2) + '\n' : supplied;
    const result = convertOrdinaryDocument(conversionText, { ...metadata, dashboardRoot: this.root, language: this.hass.language });
    result.originalText = supplied;
    const recovery = await createRecoveryExport(result, { originalDocument: baseline, root: this.root, packageVersion: this.packageVersion });
    if (epoch !== this._epoch) fail('native_conversion_stale');
    this.baseline = copy(baseline); this.result = result; this.recovery = recovery;
    return { result: copy(result), recovery: copy(recovery) };
  }

  /** The caller records deliberate export/review; no automatic download is claimed. */
  async acknowledge({ recovery, exported = false, backupConfirmed = false, visibilityReviewed = false } = {}) {
    if (!this.recovery || !exported || !backupConfirmed || !visibilityReviewed) fail('native_recovery_missing');
    await validateRecoveryExport(recovery);
    if (canonicalDocument(recovery) !== canonicalDocument(this.recovery)) fail('native_recovery_changed');
    this.acknowledgement = canonicalDocument(this.recovery);
  }

  async resume(recovery) {
    if (this._saving) fail('native_conversion_busy');
    this._requireAdmin();
    await validateRecoveryExport(recovery);
    if (recovery.root !== this.root) fail('native_root_conflict');
    const current = await this.current(), state = classifyRecovery(current, recovery);
    this._epoch++; this.recovery = copy(recovery); this.baseline = copy(recovery.original_document);
    this.result = { document: copy(recovery.proposed_document) }; this.acknowledgement = null;
    this._uncertain = state === 'divergent';
    return state;
  }

  async inspectRecovery() {
    if (!this.recovery) fail('native_recovery_missing');
    await validateRecoveryExport(this.recovery);
    const state = classifyRecovery(await this.current(), this.recovery);
    this._uncertain = state === 'divergent';
    return state;
  }

  save() {
    if (this._saving) return this._saving;
    const pending = this._save().finally(() => { if (this._saving === pending) this._saving = null; });
    this._saving = pending; return pending;
  }

  async _save() {
    this._requireAdmin();
    const epoch = this._epoch;
    if (!this.recovery || !this.result || this.acknowledgement !== canonicalDocument(this.recovery)) fail('native_recovery_missing');
    if (this._uncertain) fail('native_conversion_recheck');
    await validateRecoveryExport(this.recovery);
    await this._requireCompatibility();
    const current = await this.current(), state = classifyRecovery(current, this.recovery);
    if (epoch !== this._epoch) fail('native_conversion_stale');
    if (state === 'converted') return { status: 'converted', written: false, document: copy(current) };
    if (state !== 'original') fail('native_conversion_stale');
    this._requireAdmin();
    try {
      await this.hass.callWS({ type: 'lovelace/config/save', url_path: this.root, config: copy(this.recovery.proposed_document) });
    } catch (error) {
      // HA may have accepted memory state before reporting a failure. Never retry
      // blindly: preserve both exports and require a fresh classification first.
      this._uncertain = true; this.acknowledgement = null; throw error;
    }
    return { status: 'converted', written: true, document: copy(this.recovery.proposed_document) };
  }

  async _requireCompatibility() {
    assertNativeSupport(this.hass);
    if (typeof this.compatibility !== 'function' || await this.compatibility() !== true) fail('native_host_unsupported');
  }

  _requireAdmin() { if (this._invalidated) fail('native_conversion_stale'); if (!this.hass.user?.is_admin) fail('native_conversion_admin'); }
}
