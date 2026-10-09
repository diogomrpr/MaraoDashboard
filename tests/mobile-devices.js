const { devices } = require("playwright");

// Keep current mobile browser metadata while preserving the agreed CSS sizes.
// Older iOS descriptors make Home Assistant serve its legacy frontend bundle.
module.exports = {
  iphone: { ...devices["iPhone 16"], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
  android: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 }, screen: { width: 360, height: 800 } },
};
