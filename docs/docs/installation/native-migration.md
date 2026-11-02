# Migration and recovery

Choose the path matching your installation. A package update never replaces an existing dashboard with a starter.

| Existing installation | Required action |
| --- | --- |
| HACS Dashboard package with ordinary views/cards | Update and refresh; no dashboard conversion |
| Frontend dashboard using `strategy.source_json` | Explicitly convert the existing dashboard to native editing |
| Older HACS Integration installation | Back up, convert offline, remove only the old owned installation and install the Dashboard package |

Use stable Home Assistant **2025.12.0 or newer** and administrator access. Keep the same repository and dashboard address. Retain a private HA backup and the exact matching package before changing data or ownership.

## Convert a strategy dashboard to native editing

The frontend converts a complete saved strategy document to ordinary views and cards at the **same address**. Keep the HACS Dashboard registration and resource. This path does not require integration removal, dashboard recreation or an HA restart.

1. Export unsaved drafts and stop other clients from editing. Keep the matching package, complete native document, source JSON, images, custom files and a private HA backup outside public folders.
2. Open the former Marao editor address or strategy settings. Choose **Use the Home Assistant editor** and download the original configuration.
3. Select **Prepare conversion**. Preparation reads and stages data without saving or creating a registration.
4. Download the **recovery copy** and **proposed dashboard**. Review view order, cards, routes, unknown settings and retained data. Confirm the private backup and visibility review, then choose **Convert this dashboard**.
5. Continue in HA's normal dashboard editor. Marao card forms remain available; HA owns views, sections, sizing and visibility.

If native-editor compatibility cannot be established, conversion stays unavailable and the original strategy remains readable.

The ordinary native document becomes the active configuration. Source, embedded/custom YAML and accounting remain under `marao.migration` as provenance. They never regenerate over native edits. Recovery retains complete source and opaque envelope fields. HA APIs expose received configuration, not original storage-file bytes, so retain the independent HA backup.

Fixed source columns become Sections widths. Five equal columns use a native Grid card because Sections' twelve-column grid cannot express them exactly. Full-page floor plans use Panel views. Later native layouts do not inherit the old source column limits. Explicit/custom-extended external popups keep their authored ownership.

**Authenticated HA users can read the complete native configuration, including retained source data.** A hidden dashboard or administrator-only editor does not make it private. Review raw/unknown settings deliberately; privacy hints cannot identify every sensitive value.

### Recover an interrupted conversion

Keep recovery exports unchanged. They contain original/proposed documents, received source, supplied fragments, versions and integrity hashes. Use **Open a recovery copy**, then **Check saved state**:

- **Original:** current data still matches the original. Review the exports before an explicit retry.
- **Converted:** the proposed document is already saved. Continue without saving again.
- **Divergent:** current data differs from both copies. Export it and reconcile changes before retrying or rolling back.

An uncertain save is not automatically retried. A fresh baseline check detects changes already present before saving, but simultaneous saves have HA's native last-writer limitation. Keep other clients out of edit mode. Save acknowledgement/readback is not independent proof of backing-disk persistence.

To return to the strategy, export newer native edits first. Restore the exact matching old package and complete original document together, at the same address. Do not reverse-compile new edits, restore assets alone or overwrite unrelated changes from a stale whole-instance backup.

## Migrate an old Integration installation

The v0.22.0 transition changed Marao from a Python Integration to a frontend Dashboard package. **Do not select Update on an unmigrated Integration entry.** Complete this procedure for each instance. Removal needs one HA restart; later Dashboard updates need a client refresh.

### 1. Keep the complete original

Export drafts from every old editor and stop editing elsewhere. Download an HA backup containing configuration and the installed integration. Keep exact private copies of:

- Installed Marao package and matching `dashboard.json`, including alternate JSON used by generation automations.
- Complete generated dashboard directory, custom YAML and `.history` archives.
- Affected `configuration.yaml` sections/includes, resource registrations and themes.
- Dashboard address, title, icon, sidebar visibility, administrator restriction, first view and custom paths.

Preserve bytes and permissions. Store backups outside `www`, `hacsfiles`, converter output and shared repositories. Do not delete source, generated files, themes or history when removing the integration.

Review scripts, automations and external tools calling `marao_dashboard.generate_dashboard` or old management commands. Frontend import/export cannot run a generation service while the browser is closed. Resolve those dependencies before removal.

### 2. Convert offline and review

Download [marao-converter.html](https://github.com/diogomrpr/MaraoDashboard/releases/latest/download/marao-converter.html) from the stable release and open it locally. It needs no HA login or server. Paste complete old JSON, select **Translate**, download recovery, confirm backup and visibility review, then use **Copy JSON** or **Download JSON**.

Ordered migrations recognize supported inputs. For an old area-only room, supply missing entity membership; an explicit empty answer stays empty. Missing entity bindings must be supplied rather than guessed.

Keep the original dashboard address. If inference differs, enter it under **Optional extra information** before translating. For `/marao-dashboard/home`, the dashboard address is `marao-dashboard`; `home` is the view path.

If custom cards live outside the JSON, supply the original YAML or generated file with intact protected custom markers and its saved page/popup destination. Add a fragment for each destination. Exact fragments are retained. Already ordinary documents remain unchanged and are not inputs for attaching new legacy fragments.

The converter cannot recover files not supplied. For known old Marao assets, it asks for the actual full HTTP(S) address of installed `MaraoFrontend.js` or its folder. Copy the real address rather than guessing the HACS folder. Stable `MaraoAsset--…` image/font aliases survive updates. Other old file references need explicit replacements: copy the file to HA's `www` folder and supply its `/local/` URL, or use an existing web URL. The converter does not upload or copy files.

Resolve server-only `!secret`/`!include`, unknown tags, retired service actions and unresolved old asset URLs before continuing. They are not silently evaluated or dropped. Changed answers invalidate the previous result. Optional entity metadata is advanced input, not a normal prerequisite.

Supported families include v0.2.0 native JSON and its supported storage wrapper; absent/explicit format 0; format 1; released format-2 shapes; and the v0.23.4 strategy envelope. Source format 2, envelope 1, compiler contract 1, package and HA storage versions are distinct. Malformed or unsupported newer inputs are refused without modifying the original.

Review complete output. Native source is readable to authenticated users even on a hidden/admin dashboard. Resolve private raw values before importing. Nothing is uploaded or automatically saved; close/reset the converter before another instance.

### 3. Remove only the old owned installation

Before removal, confirm a stable frontend release is available with `dist/MaraoFrontend.js` and its complete assets. An integration-only stable release or prerelease alone cannot satisfy initial HACS Dashboard validation. Keep the new resource disabled until the old bootstrap is removed.

1. Delete Marao's config entry in **Settings → Devices & services**.
2. Remove its Integration package in HACS and its **Custom repositories** entry if still listed. HACS must release the old category before adding Dashboard.
3. Remove only the recorded owned `lovelace.dashboards` entry, using its exact filename. Keep unrelated registrations/settings.
4. Remove only recorded obsolete Marao bootstrap/resource/`extra_module_url` entries. Preserve unrelated resources and their order. Never edit HACS's private storage or relabel a registered category.
5. Check HA configuration and restart once. Keep source/generated/custom/history/theme files intact.

A temporary gap at the old address is expected. Close old cached editors and fully refresh HA or reopen its app. Removed Python URLs are not permanent redirects.

### 4. Install and import at the same address

Add `https://github.com/diogomrpr/MaraoDashboard` again in HACS Custom repositories, now as **Dashboard**. Download the frontend and register `/hacsfiles/MaraoDashboard/MaraoFrontend.js` once as a JavaScript module.

For YAML-managed resources, retain that mode and every existing resource; append only the Marao module, run `lovelace.reload_resources`, then refresh. Do not change ownership to bypass an unavailable native editing API.

In **Settings → Dashboards**, create a normal editable dashboard at the original address with the recorded title/icon/sidebar/admin settings. If the address exists, inspect ownership/content first; never replace an unrelated dashboard. Paste the complete converted JSON into that dashboard's raw configuration editor—JSON is valid YAML—and save. This is a complete document, not a single-card configuration.

Registration and content saving are separate operations. After interruption, inspect the same dashboard and finish importing there; do not create another dashboard or substitute a starter. Check saved configuration, first view, destinations and custom content. Confirm persistence before deleting any backup.

Configuration History/Restore is retired; archive bytes remain in the original backup. Sensor/recorder charts remain. Native Netatmo recordings use available metadata without inferred detection types. Camera playback acceptance is separate and manual.

### Return to the old installation

Export new native edits and stop other clients. Remove only the newly owned registration/resource, reinstall the **exact saved integration package**, restore matching JSON/generated/custom files and owned settings, then restart as required.

Keep that package privately: after the category transition, HACS may not accept Integration merely to select an old version. Restore the saved `custom_components/marao_dashboard` directory manually if needed, then add its HA config entry. Do not edit HACS's private registry or relabel a published release. Restore YAML dashboard registrations in normal block style; the old installer does not recognize a flow-style dashboard map.

Verify restored source and original address. Never downgrade assets alone or overwrite a whole stale HA/HACS registry. Preserve unrelated changes made since backup. Whole-instance restoration also rolls those changes back and needs deliberate review. If recovery fails, retain all copies and report the failure instead of continuing with a starter.
