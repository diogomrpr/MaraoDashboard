const DISPOSABLE_HA_HOST = "192.168.0.28";

function assertDisposableHaTarget(config, { requireSsh = false } = {}) {
  let hostname;
  try {
    hostname = new URL(config?.url).hostname;
  } catch {
    throw new Error(".ha-local.json url must be a valid Home Assistant URL.");
  }
  if (hostname !== DISPOSABLE_HA_HOST) {
    throw new Error(`Local Home Assistant tasks may target only ${DISPOSABLE_HA_HOST}.`);
  }
  if (requireSsh && config?.sshHost !== DISPOSABLE_HA_HOST) {
    throw new Error(`Local Home Assistant SSH tasks may target only ${DISPOSABLE_HA_HOST}.`);
  }
}

module.exports = { DISPOSABLE_HA_HOST, assertDisposableHaTarget };
