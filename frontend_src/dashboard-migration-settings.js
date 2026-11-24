import { archiveFromBackup, detachMigrationProvenance, restoreMigrationProvenance } from './migration-archive.js';
import { ensureMigrationArchive, fetchMigrationArchive } from './migration-archive-store.js';

const translations = {
  en: { title:'Migration recovery', backup:'Download original dashboard backup',
    archive:'I saved the backup. Move the migration record to Home Assistant archive storage when I save.',
    export:'Export saved dashboard with recovery data', restore:'Restore archive from file',
    restored:'The migration archive is available.', loading:'Reading migration archive…',
    error:'Could not read or verify the archive. Check the connection or restore the matching recovery file.',
    invalid:'The saved migration record could not be archived.' },
  pt: { title:'Recuperação da migração', backup:'Descarregar cópia do dashboard original',
    archive:'Guardei a cópia. Mover o registo de migração para o arquivo do Home Assistant ao guardar.',
    export:'Exportar dashboard guardado com dados de recuperação', restore:'Restaurar arquivo a partir de ficheiro',
    restored:'O arquivo de migração está disponível.', loading:'A ler o arquivo de migração…',
    error:'Não foi possível ler ou verificar o arquivo. Verifique a ligação ou restaure o ficheiro de recuperação correspondente.',
    invalid:'Não foi possível arquivar o registo de migração guardado.' },
};

function download(documentValue, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(documentValue,null,2)+'\n'], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// The settings module is loaded by an explicit action. Mounting this section
// looks only at the reference already present in the saved dashboard.
export function mountMigrationSettings(parent, { baseline, hass, path, language, valid }) {
  const reference = baseline.marao?.migration;
  if (![1, 2, 3].includes(reference?.version)) return;
  const t = translations[language] || translations.en;
  const callWS = message => hass.callWS(message);
  const section = document.createElement('section');
  section.className = 'shortcuts migration-recovery';
  const heading = document.createElement('h3');
  heading.textContent = t.title;
  section.append(heading);
  parent.append(section);
  const button = label => {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    section.append(node);
    return node;
  };
  if (reference.version < 3) {
    const backup = button(t.backup);
    const label = document.createElement('label');
    const archive = document.createElement('input');
    archive.type = 'checkbox';
    archive.disabled = true;
    label.append(archive, t.archive);
    section.append(label);
    backup.onclick = () => {
      if (!valid()) return;
      download(baseline, 'marao-dashboard-before-archive.json');
      archive.disabled = false;
    };
    return async () => {
      if (!archive.checked || archive.disabled) return;
      const staged = await detachMigrationProvenance(baseline);
      if (!staged.archive || !valid()) throw new Error(t.invalid);
      const ref = staged.document.marao.migration;
      try { await ensureMigrationArchive(callWS, ref, staged.archive, valid); }
      catch { throw new Error(t.invalid); }
      return ref;
    };
  }

  const exportButton = button(t.export);
  exportButton.dataset.exportMigration = '';
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'application/json,.json';
  picker.dataset.restoreMigration = '';
  const label = document.createElement('label');
  label.append(t.restore, picker);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  section.append(label, status);
  async function perform(action) {
    if (!valid() || exportButton.disabled) return;
    exportButton.disabled = picker.disabled = true;
    status.textContent = t.loading;
    try {
      await action();
      if (valid()) status.textContent = t.restored;
    } catch {
      if (valid()) status.textContent = t.error;
    } finally {
      exportButton.disabled = picker.disabled = false;
      picker.value = '';
    }
  }
  exportButton.onclick = () => perform(async () => {
    const current = await callWS({type:'lovelace/config', url_path:path, force:true});
    if (!valid()) return;
    const archive = await fetchMigrationArchive(callWS, current.marao?.migration);
    const restored = await restoreMigrationProvenance(current, archive);
    if (valid()) download(restored, 'marao-dashboard-with-migration.json');
  });
  picker.onchange = () => {
    const file = picker.files[0];
    if (!file) return;
    return perform(async () => {
      const archive = await archiveFromBackup(reference, JSON.parse(await file.text()));
      if (valid()) await ensureMigrationArchive(callWS, reference, archive, valid);
    });
  };
}
