const DEFAULT_LABELS = {
  dependencyId: "ID",
  hacs: "Open in HACS",
  installed: "Installed",
  noDependencies: "No dependencies reported.",
  notDetected: "Not detected",
  optional: "Optional",
  repository: "Repository",
  required: "Required",
  testedVersion: "Tested version",
  usedBy: "Used by",
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

function externalUrl(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function dependenciesFromPayload(payload) {
  return Array.isArray(payload?.dependencies) ? payload.dependencies : [];
}

export async function recheckDependencies(hass) {
  return dependenciesFromPayload(await hass.callWS({
    type: "marao_dashboard/dependencies/recheck",
  }));
}

export function renderDependencyChecklist(dependencies, translations = {}) {
  const labels = { ...DEFAULT_LABELS, ...translations };
  if (!Array.isArray(dependencies) || dependencies.length === 0) {
    return `<div class="empty">${escapeHtml(labels.noDependencies)}</div>`;
  }

  return `<div class="dependency-list" role="list">${dependencies.map((dependency) => {
    const installed = String(dependency?.status || "").toLowerCase() === "installed";
    const required = Boolean(dependency?.required);
    const usedBy = Array.isArray(dependency?.used_by)
      ? dependency.used_by.join(", ")
      : dependency?.used_by;
    const hacsUrl = externalUrl(dependency?.hacs_url);
    const repositoryUrl = externalUrl(dependency?.repository);
    return `<article class="dependency-row" role="listitem" data-dependency-id="${escapeHtml(dependency?.id)}">
      <div class="dependency-main">
        <strong>${escapeHtml(dependency?.name || dependency?.id)}</strong>
        <div class="dependency-meta">
          <span><b>${escapeHtml(labels.dependencyId)}:</b> <code>${escapeHtml(dependency?.id || "—")}</code></span>
          <span><b>${escapeHtml(labels.testedVersion)}:</b> ${escapeHtml(dependency?.tested_version || "—")}</span>
          <span><b>${escapeHtml(labels.usedBy)}:</b> ${escapeHtml(usedBy || "—")}</span>
        </div>
        <div class="dependency-links">
          ${hacsUrl ? `<a href="${escapeHtml(hacsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(labels.hacs)}</a>` : ""}
          ${repositoryUrl ? `<a href="${escapeHtml(repositoryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(labels.repository)}</a>` : ""}
        </div>
      </div>
      <div class="dependency-badges">
        <span class="dependency-badge ${installed ? "is-installed" : "is-missing"}">${escapeHtml(installed ? labels.installed : labels.notDetected)}</span>
        <span class="dependency-badge ${required ? "is-required" : "is-optional"}">${escapeHtml(required ? labels.required : labels.optional)}</span>
      </div>
    </article>`;
  }).join("")}</div>`;
}
