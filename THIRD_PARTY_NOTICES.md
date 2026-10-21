# Third-party notices

Moby Family uses the following open-source components:

- **Onest** font by the Onest authors — SIL Open Font License 1.1.
  Files: `assets/fonts/onest-cyrillic.woff2`, `assets/fonts/onest-latin.woff2`.
  Source: https://fonts.google.com/specimen/Onest

- **qrcode-generator** by Kazuhiko Arase — MIT License.
  File: `js/vendor/qrcode.js`.
  Source: https://github.com/kazuhikoarase/qrcode-generator

The dev tooling (Playwright, sharp, qrcode, jsQR, pngjs) is used only for asset generation and smoke tests and is not required by the published PWA.

The portable Windows build is packaged with **pkg** (MIT) and bundles the **Node.js** runtime (MIT). Build tooling is not part of the web app.

The whale illustration and avatars are original SVG artwork created for this demo.
