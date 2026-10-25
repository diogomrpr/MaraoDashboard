export function lightColorCapabilities(state) {
  const attrs = state?.attributes || {};
  const modes = Array.isArray(attrs.supported_color_modes) ? attrs.supported_color_modes : [];
  const color = modes.some(mode => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(mode));
  const minKelvin = attrs.min_color_temp_kelvin, maxKelvin = attrs.max_color_temp_kelvin;
  const temperature = modes.includes('color_temp') && Number.isFinite(minKelvin)
    && Number.isFinite(maxKelvin) && minKelvin > 0 && maxKelvin > minKelvin;
  return {
    color, temperature,
    brightness: color || modes.some(mode => ['color_temp', 'brightness', 'white'].includes(mode)),
    minKelvin: temperature ? minKelvin : null,
    maxKelvin: temperature ? maxKelvin : null,
  };
}

// HA supplies converted RGB for HS, XY, RGBW, RGBWW and white-temperature modes.
export function lightColorAppearance(state) {
  const caps = lightColorCapabilities(state), rgb = state?.attributes?.rgb_color;
  if (state?.state !== 'on' || !(caps.color || caps.temperature) || !Array.isArray(rgb)
    || rgb.length !== 3 || !rgb.every(value => Number.isFinite(value) && value >= 0 && value <= 255)) return null;
  const foreground = colorForeground(rgb);
  const darkText = foreground === '#000';
  const background = `rgb(${rgb.map(Math.round).join(', ')})`;
  return { background, text:foreground, icon:foreground,
    iconBackground:darkText ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)', accent:background, unavailable:false };
}

export function colorForeground(rgb) {
  const channels = rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  const darkText = (luminance + .05) / .05 >= 1.05 / (luminance + .05);
  return darkText ? '#000' : '#fff';
}
