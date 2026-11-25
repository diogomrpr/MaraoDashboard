// SHA-256 integrity also works on a local HTTP HA origin without SubtleCrypto.
// These hashes detect changed recovery data; they are not authentication or locks.
export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return sha256Bytes(bytes);
}

export function sha256Bytes(bytes) {
  const constants = [], initial = [];
  for (let candidate = 2; constants.length < 64; candidate++) {
    let prime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor++) if (candidate % divisor === 0) { prime = false; break; }
    if (prime) { if (initial.length < 8) initial.push((Math.sqrt(candidate) % 1 * 0x100000000) | 0); constants.push((Math.cbrt(candidate) % 1 * 0x100000000) | 0); }
  }
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64); padded.set(bytes); padded[bytes.length] = 128;
  const data = new DataView(padded.buffer), bits = bytes.length * 8;
  data.setUint32(padded.length - 8, Math.floor(bits / 0x100000000)); data.setUint32(padded.length - 4, bits >>> 0);
  const rotate = (value, count) => value >>> count | value << (32 - count), words = new Int32Array(64), state = initial;
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 64; index++) {
      if (index < 16) words[index] = data.getInt32(offset + index * 4);
      else { const a = words[index - 15], b = words[index - 2]; words[index] = words[index - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + words[index - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10); }
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index++) {
      const first = h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + constants[index] + words[index];
      const second = (rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c);
      h = g; g = f; f = e; e = d + first | 0; d = c; c = b; b = a; a = first + second | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => { state[index] = state[index] + value | 0; });
  }
  return state.map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
}
