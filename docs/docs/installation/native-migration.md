---
title: Frontend migration
layout: page
parent: Installation
nav_order: 1.6
---

# Move an existing installation to the frontend package

**v0.22.0 is a breaking transition from Integration to Dashboard.** Keep the
existing `diogomrpr/MaraoDashboard` repository. **Do not update the old Integration
in place.** Follow the steps below separately for every Home Assistant instance.
They preserve the dashboard address and saved configuration through a guided
manual migration. Export drafts and keep a recoverable backup before removal.

Download the [v0.22.1 converter](https://github.com/diogomrpr/MaraoDashboard/releases/download/v0.22.1/marao-converter.html)
and open the HTML file locally. It needs only a browser: no Home Assistant login,
dashboard builder, local server, command line or intermediate Marao release.
Migration needs administrator access, stable HA **2026.10.0 or newer**, and a
one-time Home Assistant restart. Later updates use the HACS **Dashboard** package
and a client refresh. Do not repeat this migration for normal frontend updates.

The disposable development installation retained its original 59-page source,
settings and files through native saves, independent disk comparison, restart and
matching legacy rollback. The same repository was removed from HACS as Integration,
re-added as Dashboard and installed as v0.22.0. A real HACS update to the test
prerelease v0.22.1-beta.1 retained an open draft until explicit discard, then loaded
the new editor/worker graph without an HA restart or integration reload. Source,
routes and settings stayed unchanged. One authenticated Core WebSocket session
remained connected throughout; no stop event, browser error or retired backend
request was observed. v0.22.1 adds visible administrator editor access and in-app
Open dashboard/save navigation. Already migrated installations update normally.

No camera playback or physical-device acceptance is claimed. Removal requires one
restart; an additional restart after import is a retention check, and rollback can
require further restarts. Later normal Dashboard updates do not use those steps.

## 1. Keep a recoverable original

Export unsaved JSON from every open Marao editor and stop editing on all clients.
Create and download a Home Assistant backup containing the configuration and the
installed custom integration. Keep an exact private copy of:

- The installed Marao version/package and its matching `dashboard.json`, including
  an alternate JSON file if a generation automation uses one.
- The complete generated dashboard directory, custom YAML and `.history` archives.
- The affected `configuration.yaml` sections/includes, old resource registrations
  and installed theme files. Record the dashboard's address, title, icon, sidebar
  visibility, administrator restriction, first view and custom view paths.

Keep these outside `www`, `hacsfiles`, the converter output and any shared/public
repository. Retain exact bytes and permissions; the disposable migration check
records hashes/modes without publishing private content. Do not delete the old
source, generated files, theme copies or history when removing the integration.

Check automations/scripts/external tools for `marao_dashboard.generate_dashboard`
and old management commands. Interactive import/export replaces the authoring
workflow, but cannot run a generation service while the browser is closed. Resolve
those callers before removing the integration.

## 2. Paste, translate and download

Open the supplied `marao-converter.html` locally. Paste the complete old JSON,
select **Translate**, then **Copy JSON** or **Download JSON**. It detects supported
historical formats, runs adjacent migrations and assumes harmless presentation
defaults. Complete current configurations need no questions. An area-only old room
may need a simple list of entity IDs; an explicitly empty answer stays empty.
An old energy load or native card missing its entity asks for that one entity ID.

Use the existing dashboard address. If the inferred address differs, enter the
original under **Optional extra information** before translating. This retains
links and bookmarks. For example, `/marao-dashboard/home` uses address
`marao-dashboard`; the view path stays `home`.

If custom cards live outside the JSON, use **Optional extra information** to paste
their YAML or generated file with intact protected custom markers and specify the
saved page/popup destination. The converter retains the exact custom fragment.
For fragments on different pages/popups, copy the converted JSON back into the
input and add the next fragment before the final download. No HA save is required.
It cannot recover files you have not supplied. Known Marao files are redirected
automatically, including absolute old addresses. A reference to another old file
asks for its replacement address: copy that file into HA's `www` folder and enter
its `/local/` URL, or supply an existing web URL. Changing an answer invalidates
the previous result. The converter does not upload or copy files. Server-only
`!secret`/`!include` tags, unknown tags and retired service actions must be resolved
before conversion; they are never silently evaluated or dropped. Entity metadata
JSON is optional advanced input, not a normal prerequisite.

Review the result and keep the downloaded native dashboard JSON alongside the
private original. **The complete source becomes readable through authenticated
Home Assistant native configuration APIs.** Hiding a dashboard or making its
editor administrator-only does not make source private. Review raw/unknown
settings and remove or resolve private values deliberately before importing.
Path-only hints cannot detect every secret. Nothing is uploaded or automatically
saved by the offline converter; reset/close it before converting another instance.

Supported inputs: v0.2.0 native dashboard JSON and its supported HA storage wrapper;
unversioned/explicit format 0; format 1; all released format-2 shapes; and the
current native envelope. Source format 2, native envelope 1 and compiler contract 1
are separate from package and HA storage versions. Unsupported newer or malformed
inputs refuse conversion and leave the original unchanged.

## 3. Remove the old integration, then restart

Download the converter and verify that HACS/GitHub offers stable **v0.22.0 or later**
before starting removal. The package must contain `dist/MaraoFrontend.js` and its
complete accompanying assets.
Keep its resource disabled until the old frontend bootstrap is removed.
If HACS still identifies the latest stable as v0.21.1, stop here: adding the
repository as Dashboard will fail its package-layout check. A prerelease alone
does not change initial HACS validation. Do not choose Update on an unmigrated
Integration entry; complete this manual migration on each instance instead.

1. Delete Marao's config entry in **Settings → Devices & services**.
2. Remove its **Integration** package in HACS. In **Custom repositories**, also
   remove `diogomrpr/MaraoDashboard` if it is still listed. The repository must
   leave HACS's store before it can be added under a different category.
3. Remove only the recorded Marao YAML entry from `lovelace.dashboards`, following
   its exact owned filename. Retain all other dashboard registrations/settings.
4. Remove only obsolete Marao bootstrap/resource/`extra_module_url` entries
   identified in your recorded configuration or legacy Repair. Leave unrelated
   resources and their order alone. Never change HACS's private storage files or
   try to mutate its category while it is still registered.
5. Check HA configuration and restart Home Assistant once the removals are ready.
   Keep the original source/generated/custom/history/theme files intact.

A short period without the dashboard at that address is expected. An old cached
editor cannot safely keep working during migration: export drafts first, close it
and fully refresh HA or reopen the companion app after this step. Removed Python
URLs are not redirected permanently.

## 4. Create and import through Home Assistant

Add `https://github.com/diogomrpr/MaraoDashboard` again in HACS **Custom repositories**,
select **Dashboard**, then download the frontend release. This reuses the same
GitHub repository after removing the old HACS registration. Verify
`/hacsfiles/MaraoDashboard/MaraoFrontend.js` is registered once as a JavaScript module. With
HA-managed resources, use HACS/the native resource UI. If the existing installation
uses `lovelace.resource_mode: yaml`, keep that mode and every existing resource;
append only the Marao URL/type to its YAML resource list, then run HA’s built-in
`lovelace.reload_resources` action and refresh the page. The native resource-edit
API is intentionally unavailable in YAML mode; do not switch unrelated resource
settings to work around it. A stable resource URL still loads the installed
frontend manifest after later package updates. Use HA
2026.10.0 or later stable; earlier/development versions are not accepted for writes.

In **Settings → Dashboards**, create a normal editable dashboard at the recorded
original address, with the recorded title/icon/sidebar/admin settings. If that
address is already registered, inspect its owner/content first; do not replace an
unrelated dashboard. Open HA's native raw configuration editor and paste the
complete downloaded JSON (JSON is valid YAML), then save. Do not paste it into
Marao's source editor: this output is the complete native strategy document.

Creating the registration and saving its content are separate HA operations.
If interrupted, inspect that same dashboard and finish importing the downloaded
JSON there. Do not create another dashboard or generate a new starter to replace
the migration source. The disposable instance keeps only `/marao-dashboard`, with
Cases at `/marao-dashboard/card-test`.

Check the saved source, original first view, all configured navigation entries and
custom content. Administrators open the editor with **Edit dashboard** at the top
of the landing page, even when the cache reset button is disabled. The Marao editor
is at the `editor_path` recorded in the converted
`strategy` object, for example `/marao-dashboard/marao-editor`; collisions receive a
different internal path while user view paths stay unchanged. Confirm the dashboard
survives a restart and the Python package/config entry is absent before declaring
migration successful. Native save acknowledgment/readback alone does not prove
backing-disk persistence; this is HA's accepted native save behavior.

Configuration History/Restore is removed. Old archive bytes remain in your backup
and original directory. Sensor/recorder charts remain. Netatmo can use basic native
recordings; typed detection headings/filters are removed. Camera playback remains
a manual acceptance check.

## If you need to return to the old installation

Keep a separate export/backup of any new native edits before rollback. Stop editing
and compare current state with the migration changes. Remove only the newly owned
native registration/resource, reinstall the **exact saved old integration package**,
restore its matching JSON/generated/custom files and owned registration/settings,
and restart HA as required. Keep the exact old package in your private backup:
after this category change, do not rely on HACS accepting the repository as
Integration before an old version can be selected.
In that case restore the saved `custom_components/marao_dashboard` directory
manually, then add its HA config entry; do not alter HACS's private registry or
relabel a published release. Restore YAML dashboard registrations in normal block style:
the released installer does not recognize a flow-style `{...}` dashboard map.
Verify the restored source and original dashboard root.

Never downgrade package files alone, overwrite a whole stale HA/HACS registry, or
silently replace unrelated settings changed since backup. Restore only reviewed
owned entries; a whole-instance backup restore also rolls back unrelated later
changes and needs deliberate administrator review. If restoration fails, keep all
private copies and report that failure rather than continuing with a starter.

## Próximos passos em português

Faça o processo em cada instância separadamente: exporte os rascunhos, faça uma
cópia privada completa, abra o conversor local, cole o JSON e selecione **Traduzir**.
Responda apenas às perguntas necessárias e guarde o JSON traduzido. Confirme o
endereço original e reveja dados privados: a configuração nativa é legível pelos
utilizadores autenticados do HA, mesmo num dashboard oculto ou só de administração.

Remova a integração antiga e apenas os seus registos YAML/recursos, mantendo
JSON, ficheiros gerados, cartões personalizados, temas e histórico. Reinicie o HA.
Remova também o registo antigo nos repositórios personalizados do HACS e adicione
o mesmo `diogomrpr/MaraoDashboard` com a categoria **Dashboard**. Este passo exige
que a versão estável já contenha o pacote frontend; a versão antiga v0.21.1 ou
apenas uma pré-versão nova não permitem concluir a validação inicial. Se os recursos forem
geridos em YAML, mantenha esse modo e acrescente apenas o URL do Marao; use a
ação nativa `lovelace.reload_resources` e atualize a página. Crie o dashboard nativo no
mesmo endereço e cole o documento completo no editor nativo de configuração.
Confirme conteúdo, navegação e persistência após reiniciar. Uma interrupção exige
inspecionar esse mesmo dashboard e concluir a importação ou restaurar a cópia;
não crie outro dashboard nem substitua dados por uma configuração inicial.

Para regressar, guarde primeiro as novas alterações nativas. Restaure o pacote
antigo exato juntamente com os seus dados e definições próprias, sem substituir
alterações alheias. Os reinícios desta migração são pontuais; as atualizações
seguintes usam o pacote Dashboard e uma atualização do cliente, sem reiniciar o HA.
