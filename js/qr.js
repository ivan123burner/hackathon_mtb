/* URL helpers and QR rendering (qrcode-generator is vendored locally). */
(function () {
  'use strict';

  function trimIndex(pathname) {
    return pathname
      .replace(/index\.html$/i, '')
      .replace(/\/{2,}/g, '/');
  }

  function appBase() {
    var cfg = window.MOBY_CONFIG || {};
    // Sharing links intentionally point to the hosted PWA so the QR works for
    // people on other networks, even when the demo is opened from localhost.
    if (cfg.productionUrl) return cfg.productionUrl;
    if (window.location.protocol === 'file:') {
      return 'https://ivan123burner.github.io/hackathon_mtb/';
    }
    var host = window.location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    if (isLocal && window.__MOBY_LAN_URL__) {
      var lan = new URL(window.__MOBY_LAN_URL__);
      lan.pathname = '/';
      lan.hash = '';
      lan.search = '';
      return lan.toString();
    }
    var base = new URL(window.location.href);
    base.hash = '';
    base.search = '';
    base.pathname = trimIndex(base.pathname);
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    return base.toString();
  }

  function urlWith(params) {
    var url = new URL(appBase());
    // Preserve Pages subpath but make links explicit.
    url.hash = '';
    if (params) {
      Object.keys(params).forEach(function (key) {
        if (params[key] !== null && typeof params[key] !== 'undefined') {
          url.searchParams.set(key, params[key]);
        }
      });
    }
    return url.toString();
  }

  function shareUrls() {
    return {
      app: urlWith({ role: 'parent', source: 'qr' }),
      giftMasha: urlWith({ gift: 'masha', source: 'gift' }),
      giftAlex: urlWith({ gift: 'alex', source: 'gift' }),
      invite: urlWith({ invite: 'child', source: 'invite' })
    };
  }

  function prettyUrl(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  function qrMarkup(text, opts) {
    opts = opts || {};
    if (typeof qrcode !== 'function') {
      return '<div class="qr-fallback">QR-код недоступен<br><span>' + text + '</span></div>';
    }
    var qr = qrcode(0, 'H');
    qr.addData(text, 'Byte');
    qr.make();
    var svg = qr.createSvgTag({
      cellSize: 4,
      margin: 0,
      scalable: true,
      alt: { text: 'QR-код: ' + text }
    });
    return '<div class="qr-live' + (opts.logo === false ? ' qr-live--plain' : '') + '">' +
      '<div class="qr-live__svg">' + svg + '</div>' +
      (opts.logo === false ? '' :
        '<span class="qr-live__logo"><img src="assets/icons/icon.svg" alt=""></span>') +
      '</div>';
  }

  function renderQr(element, text, opts) {
    if (!element) return;
    element.innerHTML = qrMarkup(text, opts);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function isLocalPreview() {
    var h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || window.location.protocol === 'file:';
  }

  window.MF = window.MF || {};
  window.MF.appBase = appBase;
  window.MF.shareUrls = shareUrls;
  window.MF.urlWith = urlWith;
  window.MF.prettyUrl = prettyUrl;
  window.MF.qrMarkup = qrMarkup;
  window.MF.renderQr = renderQr;
  window.MF.copyText = copyText;
  window.MF.isLocalPreview = isLocalPreview;
})();
