# App artwork sources

The locally shipped app marks identify configured media-player sources. They do
not require external image requests when the dashboard runs.

- YouTube, Disney+ and Prime Video: publisher-supplied 512px PNG artwork from
  Apple's public App Store lookup/artwork CDN, retrieved 2026-10-21. App IDs:
  544007664, 1446075923 and 545519333, respectively.
  Metadata: https://itunes.apple.com/lookup?id=544007664,1446075923,545519333&country=us
- Plex: vector wordmark from Simple Icons (CC0), retrieved 2026-10-28. Original
  path retained, with a gold fill and padded square viewBox for the dark tile:
  https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/plex.svg
  Brand reference: https://brand.plex.tv; license: https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md
- Netflix: flat local SVG rendition of the N symbol, removing the old app icon's
  beveled frame. Brand reference: https://brand.netflix.com/en/assets/logos/
- Spotify: unmodified green icon from the official 2024 logo download:
  https://developer.spotify.com/images/guidelines/design/2024-spotify-logo-icon.zip
  Guidelines: https://developer.spotify.com/documentation/design

- MEO: unmodified official MEO SVG linked by https://www.meo.pt/, retrieved
  2026-10-22. Uses the simple MEO mark rather than MEO Go artwork:
  https://conteudos.meo.pt/Style%20Library/consumo/images/logo-meo.svg

Apple TV artwork retains its existing file. Brand marks remain the
property of their respective owners.

- hbo-max: publisher artwork from Apple App Store ID 1666653815, retrieved 2026-11-04. Publisher image, converted to PNG without resizing: https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/4c/4a/9d/4c4a9dd8-66c9-4735-b6d3-b50d414a221f/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg

- f1-tv: publisher artwork from Apple App Store ID 1315007279, retrieved 2026-11-04. Publisher image, converted to PNG without resizing: https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/c5/bb/2e/c5bb2e3d-c18a-f0ce-c93d-f44ddf7b4136/AppIcon-0-0-1x_U007epad-0-9-0-85-220.png/512x512bb.jpg

The two 2026-11-04 additions were converted from the publisher-delivered image encoding to PNG using macOS `sips`, without resizing or redrawing. Both decode at 512 × 512.
