// The downloaded dashboard keeps its local HA transport open to replay saved reads.
export function localConnectionReady(hass) {
  return Boolean(hass) && hass.connected !== false && hass.connection?.connected !== false;
}

export function dashboardConnectionStatus(hass) {
  if (!localConnectionReady(hass)) return 'offline';
  const status = globalThis.window?.__dashboardConnection;
  return status === 'offline' || status === 'connecting' ? status : 'online';
}

export function observeDashboardConnection(getHass, changed) {
  const target = globalThis.window;
  let previous = target?.__dashboardConnection ?? dashboardConnectionStatus(getHass());
  const onChange = ({detail}) => {
    if (!['connecting', 'offline', 'online'].includes(detail) || detail === previous) return;
    const before = previous;
    previous = detail;
    changed(dashboardConnectionStatus(getHass()), before);
  };
  target?.addEventListener?.('dashboard-connection-changed', onChange);
  return () => target?.removeEventListener?.('dashboard-connection-changed', onChange);
}

export async function isDashboardOfflineError(error) {
  if (error?.code === 'dashboard_offline' || error?.error?.code === 'dashboard_offline') return true;
  if ((error?.status_code ?? error?.status) !== 503) return false;
  if (error.body?.code === 'dashboard_offline') return true;
  if (typeof error.clone !== 'function') return false;
  try { return (await error.clone().json())?.code === 'dashboard_offline'; }
  catch { return false; }
}
