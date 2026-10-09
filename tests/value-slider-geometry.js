// Shared by the release E2E and native pointer slider checks.
async function sliderReadings(page, selector = 'marao-card input[type="range"]') {
  return page.locator(selector).evaluateAll((inputs) => {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgb = (color) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (color) => {
      return rgb(color).reduce((sum, channel, index) => {
        const value = channel / 255;
        return sum + (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
      }, 0);
    };
    const contrast = (a, b) => {
      const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
      return (high + .05) / (low + .05);
    };
    return inputs.flatMap((input) => {
      const track = input.parentElement.querySelector('.slider-track');
      const fill = track.querySelector('.slider-fill');
      const background = track.querySelector('.slider-background');
      const thumb = track.querySelector('.slider-thumb');
      const card = input.closest('ha-card');
      const trackBox = track.getBoundingClientRect();
      if (!trackBox.width) return [];
      const inputBox = input.getBoundingClientRect();
      const outlinedBox = (shape) => {
        const box = shape.getBoundingClientRect();
        const halfStroke = Number.parseFloat(getComputedStyle(shape).strokeWidth) / 2;
        return { left: box.left - halfStroke, right: box.right + halfStroke, top: box.top - halfStroke, bottom: box.bottom + halfStroke, width: box.width + 2 * halfStroke, height: box.height + 2 * halfStroke };
      };
      const fillBox = outlinedBox(fill);
      const thumbBox = outlinedBox(thumb);
      const backgroundBox = outlinedBox(background);
      const surface = getComputedStyle(card).backgroundColor;
      const trackStyle = getComputedStyle(background);
      const fillStyle = getComputedStyle(fill);
      const thumbStyle = getComputedStyle(thumb);
      const trackColor = trackStyle.fill;
      const fillColor = fillStyle.fill;
      const thumbColor = thumbStyle.fill;
      const current = Number(input.dataset.sliderCurrent);
      const target = Number(input.value);
      const progress = Math.min(current, target);
      const issues = [];
      if (trackBox.height !== 48 || inputBox.height !== 48 || trackBox.width < 48) issues.push('visible slider below 48px');
      if (['left', 'right', 'top', 'bottom'].some((edge) => Math.abs(inputBox[edge] - trackBox[edge]) > .5)) issues.push('input inset from track');
      if (['left', 'right', 'top', 'bottom'].some((edge) => Math.abs(backgroundBox[edge] - trackBox[edge]) > .5)) issues.push('drawn track inset from native input');
      if (Math.abs(fillBox.left - trackBox.left) > .5 || Math.abs(fillBox.top - trackBox.top) > .5 || fillBox.height !== trackBox.height) issues.push('fill inset from track');
      const expectedRight = trackBox.left + 48 + progress / 100 * (trackBox.width - 48);
      if (Math.abs(fillBox.right - expectedRight) > .5 || fillBox.right > trackBox.right + .5) issues.push('fill does not meet confirmed thumb edge');
      const expectedThumbLeft = trackBox.left + target / 100 * (trackBox.width - 48);
      if (Math.abs(thumbBox.left - expectedThumbLeft) > .5 || Math.abs(thumbBox.width - 48) > .05 || Math.abs(thumbBox.height - 48) > .05 || Math.abs(thumbBox.top - trackBox.top) > .5 || thumbBox.right > trackBox.right + .5) issues.push('drawn thumb is not centered on the native target');
      if (new Set([surface, trackColor, fillColor, thumbColor].map((color) => rgb(color).join(','))).size !== 4) issues.push('slider surfaces share a background');
      if ([trackStyle, fillStyle, thumbStyle].some((style) => Number.parseFloat(style.strokeWidth) !== 1 || style.stroke === 'none')) issues.push('missing consistent thin vector boundary');
      if ([trackStyle, fillStyle].some((style) => Number.parseFloat(style.rx) !== 23.5 || Number.parseFloat(style.ry) !== 23.5)
        || Number.parseFloat(thumbStyle.r) !== 23.5) issues.push('slider curves are not consistent rounded ends');
      const boundaryContrast = Math.min(Math.max(contrast(surface, trackColor), contrast(surface, trackStyle.stroke)), contrast(trackStyle.stroke, trackColor), contrast(fillStyle.stroke, trackColor), contrast(fillStyle.stroke, fillColor), contrast(thumbStyle.stroke, thumbColor));
      if (boundaryContrast < 3) issues.push('control boundary contrast below 3:1');
      if (card.scrollWidth > card.clientWidth + 1) issues.push('card clips content');
      return [{ name: input.getRootNode().querySelector('.title').textContent.trim(), key: input.dataset.sliderKey, current, target, disabled: input.disabled, trackWidth: trackBox.width, fillWidth: fillBox.width, expectedFillWidth: expectedRight - trackBox.left, surface, trackColor, fillColor, boundaryContrast, issues }];
    });
  });
}

module.exports = { sliderReadings };
