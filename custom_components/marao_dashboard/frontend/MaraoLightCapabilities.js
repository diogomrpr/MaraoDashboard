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
