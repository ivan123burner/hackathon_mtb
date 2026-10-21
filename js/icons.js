/* Lightweight inline SVG icon set + character avatars. */
(function () {
  'use strict';

  var ICONS = {
    home: '<path d="M3.5 10.7 12 3.5l8.5 7.2"/><path d="M5.5 9.7V20a.8.8 0 0 0 .8.8h11.4a.8.8 0 0 0 .8-.8V9.7"/><path d="M9.5 20.8v-6.1h5v6.1"/>',
    users: '<path d="M15.5 20.6v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1.8"/><circle cx="8.7" cy="7.2" r="3.7"/><path d="M21.8 20.6v-1.8a4 4 0 0 0-3-3.85"/><path d="M15.8 3.6a4 4 0 0 1 0 7.5"/>',
    sparkles: '<path d="m12 3.2-1.9 5.5-5.5 1.9 5.5 1.9 1.9 5.5 1.9-5.5 5.5-1.9-5.5-1.9L12 3.2Z"/><path d="m19.2 15.8-.9 2.5-2.5.9 2.5.9.9 2.5.9-2.5 2.5-.9-2.5-.9-.9-2.5Z"/>',
    target: '<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    gift: '<rect x="3.2" y="8.2" width="17.6" height="4.2" rx="1.2"/><path d="M5.2 12.4v8.2h13.6v-8.2"/><path d="M12 8.2v12.4"/><path d="M12 8.2C8.9 8.2 7.3 7 7.3 5.4c0-1.4 1.1-2.3 2.4-2.3 2 0 2.3 2.2 2.3 5.1Z"/><path d="M12 8.2c3.1 0 4.7-1.2 4.7-2.8 0-1.4-1.1-2.3-2.4-2.3-2 0-2.3 2.2-2.3 5.1Z"/>',
    qr: '<rect x="3" y="3" width="6.5" height="6.5" rx="1.2"/><rect x="14.5" y="3" width="6.5" height="6.5" rx="1.2"/><rect x="3" y="14.5" width="6.5" height="6.5" rx="1.2"/><path d="M14.5 14.5h2.8v2.8h-2.8zM19.8 14.5h1.2M14.5 19.8v1.2M18.3 18.3h2.7v2.5h-2.7z"/>',
    chat: '<path d="M4 5.5h16a2 2 0 0 1 2 2v8.7a2 2 0 0 1-2 2h-8.1L6.5 21v-2.8H4a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"/><path d="M7.5 10h9M7.5 13.5h6"/>',
    more: '<circle cx="5" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.35" fill="currentColor" stroke="none"/>',
    eye: '<path d="M2.5 12s3.5-6.2 9.5-6.2S21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/>',
    eyeOff: '<path d="m3 3 18 18"/><path d="M10.2 6.1A10.8 10.8 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17.2 17.2 0 0 1-3 3.6"/><path d="M6.2 7.3A17.6 17.6 0 0 0 2.5 12S6 18.2 12 18.2c1.4 0 2.6-.3 3.7-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    bell: '<path d="M18 8.8a6 6 0 0 0-12 0c0 7-3 7.2-3 8.6h18c0-1.4-3-1.6-3-8.6Z"/><path d="M13.7 20.2a2 2 0 0 1-3.4 0"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.54h.05a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.05a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
    'arrow-right': '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
    'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
    'arrow-down-left': '<path d="m17 7-10 10"/><path d="M16 17H7V8"/>',
    'chevron-right': '<path d="m9 5 7 7-7 7"/>',
    'chevron-left': '<path d="m15 5-7 7 7 7"/>',
    'chevron-down': '<path d="m5 9 7 7 7-7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z"/><path d="M10.1 13.9 21 3"/>',
    shield: '<path d="M12 22s8-4 8-10V5.2L12 2 4 5.2V12c0 6 8 10 8 10Z"/><path d="m8.8 12 2.2 2.2 4.4-4.5"/>',
    lock: '<rect x="4.5" y="10.2" width="15" height="10.6" rx="2.2"/><path d="M8.2 10.2V7.5a3.8 3.8 0 0 1 7.6 0v2.7"/><path d="M12 14.6v2.2"/>',
    card: '<rect x="2.6" y="5" width="18.8" height="14" rx="2.6"/><path d="M2.6 9h18.8"/><path d="M6.2 14.2h3.6"/>',
    'id-card': '<rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.4"/><circle cx="8.3" cy="10.2" r="2.1"/><path d="M5.2 16c.5-2 1.7-3 3.1-3s2.6 1 3.1 3"/><path d="M14.6 9.8h4.2M14.6 13.2h4.2"/>',
    document: '<path d="M6.2 2.8h8l3.6 3.7V21H6.2V2.8Z"/><path d="M14.2 2.8v3.7h3.6"/><path d="M9.2 11.2h5.6M9.2 14.6h5.6M9.2 18h3.5"/>',
    currency: '<circle cx="12" cy="12" r="9"/><path d="M14.6 8.4a3.2 3.2 0 0 0-4.6 2.9v1.4a3.2 3.2 0 0 0 4.6 2.9"/><path d="M7.4 10.8h5.2M7.4 13.2h5.2"/>',
    pin: '<path d="M12 21s6.4-6.1 6.4-11.3a6.4 6.4 0 0 0-12.8 0C5.6 14.9 12 21 12 21Z"/><circle cx="12" cy="9.6" r="2.2"/>',
    bank: '<path d="M3.2 9.3 12 4l8.8 5.3"/><path d="M5.1 10.5v7.7M9.5 10.5v7.7M14.5 10.5v7.7M18.9 10.5v7.7"/><path d="M3 21h18M4.6 18.2h14.8"/>',
    wallet: '<path d="M4 6.7A2.7 2.7 0 0 1 6.7 4H19v16H6.7A2.7 2.7 0 0 1 4 17.3V6.7Z"/><path d="M4 7.8h15"/><path d="M15.5 12.2H21v4.4h-5.5a2.2 2.2 0 0 1 0-4.4Z"/>',
    flame: '<path d="M12.2 22c4.4 0 7.3-3.1 7.3-7.2 0-3-1.5-5.6-3.8-7.5.2 2.1-1.3 3.5-2.3 3.9.3-3.9-2.4-7.1-4.5-8.7.3 4-3.8 6.2-3.8 11.3 0 4.5 3 8.2 7.1 8.2Z"/><path d="M12.5 18.4c1.6 0 2.7-1.2 2.7-2.8 0-1.3-.7-2.3-1.6-3 .1 1-.6 1.5-1 1.7 0-1.4-.8-2.4-1.6-3 .1 1.6-1.3 2.6-1.3 4.3 0 1.6 1.2 2.8 2.8 2.8Z"/>',
    snowflake: '<path d="M12 2.5v19M3.8 7.3l16.4 9.4M20.2 7.3 3.8 16.7"/><path d="m9.4 4.7 2.6 2.6 2.6-2.6M9.4 19.3l2.6-2.6 2.6 2.6M4.7 10.5l3.5-.9-.9-3.5M19.3 13.5l-3.5.9.9 3.5M19.3 10.5l-3.5-.9.9-3.5M4.7 13.5l3.5.9-.9 3.5"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4Z"/><path d="M7 6H3.5v1.5A3.5 3.5 0 0 0 7 11M17 6h3.5v1.5A3.5 3.5 0 0 1 17 11"/>',
    book: '<path d="M4 4.5h6.2A2.8 2.8 0 0 1 13 7.3V21a2.8 2.8 0 0 0-2.8-2.8H4V4.5Z"/><path d="M20 4.5h-6.2A2.8 2.8 0 0 0 11 7.3V21a2.8 2.8 0 0 1 2.8-2.8H20V4.5Z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 5.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5"/>',
    share: '<circle cx="18" cy="5" r="2.7"/><circle cx="6" cy="12" r="2.7"/><circle cx="18" cy="19" r="2.7"/><path d="m8.4 10.7 7.2-4.1M8.4 13.3l7.2 4.1"/>',
    install: '<rect x="4" y="2.5" width="16" height="19" rx="3"/><path d="M9 18.5h6"/><path d="M12 6v8M9 11l3 3 3-3"/>',
    phone: '<path d="M6.6 2.8h10.8A1.6 1.6 0 0 1 19 4.4v15.2a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 19.6V4.4a1.6 1.6 0 0 1 1.6-1.6Z"/><path d="M10 18.5h4"/>',
    refresh: '<path d="M20 6v5h-5"/><path d="M19 11a7.5 7.5 0 1 0 .3 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    alert: '<path d="M10.3 3.4 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5M12 17.5h.01"/>',
    heart: '<path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
    'user-plus': '<path d="M15 20.5v-1.8a4 4 0 0 0-4-4H5.5a4 4 0 0 0-4 4v1.8"/><circle cx="8.2" cy="7.2" r="3.7"/><path d="M19 8v6M16 11h6"/>',
    camera: '<path d="M4.5 6.5h3l1.5-2h6l1.5 2h3A1.5 1.5 0 0 1 21 8v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V8a1.5 1.5 0 0 1 1.5-1.5Z"/><circle cx="12" cy="13" r="3.6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bag: '<path d="M5 7.5h14l1 13H4l1-13Z"/><path d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4"/>',
    bus: '<rect x="4" y="3.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8 21v-3M16 21v-3"/><circle cx="7.5" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none"/>',
    coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 3.5v2M11 3.5v2M15 3.5v2"/>',
    game: '<path d="M7 8h10a5 5 0 0 1 4.5 7.2l-1.2 2.5a2 2 0 0 1-3.3.6L14.5 16h-5L7 18.3a2 2 0 0 1-3.3-.6l-1.2-2.5A5 5 0 0 1 7 8Z"/><path d="M8 11v3M6.5 12.5h3M16 11.5h.01M18 14h.01"/>',
    apple: '<path d="M15.5 7.5c-1.2 0-2.3.7-3.5.7-1.2 0-2.4-.7-3.6-.7C5.7 7.5 2.5 10 2.5 14c0 4.3 3 8 5.2 8 1.3 0 2.2-.8 4.3-.8s3 .8 4.3.8c2.2 0 5.2-3.7 5.2-8 0-4-3.2-6.5-6-6.5Z"/><path d="M12 7.5c0-2.5 1.8-4.5 4.2-5 .3 2.6-1.8 5-4.2 5Z"/>',
    'piggy': '<path d="M18.5 9.5h.5a2 2 0 0 1 0 4h-.5"/><path d="M4 11.5A6.5 6.5 0 0 1 10.5 5h2a6.5 6.5 0 0 1 6.5 6.5v2a5.5 5.5 0 0 1-5.5 5.5h-4A5.5 5.5 0 0 1 4 13.5v-2Z"/><path d="M8 18v2M15 18v2M8 8 6.5 4.5"/><circle cx="16" cy="10.5" r=".8" fill="currentColor" stroke="none"/><path d="M6 13h.01"/>',
    'hand-heart': '<path d="M3 12.5v7h4v-7H3ZM7 19l4.2 1.2c.6.2 1.3.2 1.9 0l6.4-2.2a1.7 1.7 0 0 0-1.1-3.2l-3.6 1.2"/><path d="M14.7 16.9l-.3.1c-.7.2-1.5.2-2.2 0l-2.4-.8"/><path d="M15.2 4.1a2.7 2.7 0 0 0-3.8 0l-.4.4-.4-.4a2.7 2.7 0 1 0-3.8 3.8l4.2 4.2 4.2-4.2a2.7 2.7 0 0 0 0-3.8Z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    minus: '<path d="M5 12h14"/>',
    ruler: '<path d="M3 17 17 3l4 4L7 21l-4-4Z"/><path d="m8 12 2 2M11 9l2 2M14 6l2 2"/>',
    wifi: '<path d="M2 8.5a15.5 15.5 0 0 1 20 0M5.5 12a10.5 10.5 0 0 1 13 0M9 15.5a5.5 5.5 0 0 1 6 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
    headphones: '<path d="M4 14.5v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13.5" width="4.5" height="7" rx="2.2"/><rect x="16.5" y="13.5" width="4.5" height="7" rx="2.2"/>',
    bike: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="m5.5 17 4-7h5l4 7M9.5 10 12 17M14.5 6h3l1 4"/>'
  };

  function icon(name, size, cls) {
    var body = ICONS[name] || ICONS.sparkles;
    return '<svg class="icon ' + (cls || '') + '" width="' + (size || 22) + '" height="' + (size || 22) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  }

  var AVATARS = {
    anna: {
      bg: '#FFE9ED', skin: '#F3C4A5', hair: '#3A211C', shirt: '#E11933', accent: '#FFFFFF',
      hairPath: '<path d="M18 29c-1.3-12 4.7-20 14-20s15.3 8 14 20c-1.2-4.4-3.6-8-6.7-10.7-4.6 3.2-11.2 4.9-19.2 4.7-.6 2.3-1.3 4.3-2.1 6Z" fill="#3A211C"/><path d="M18.4 27.6c-1.8 8-1.1 14.6 1.8 17.4l3-3.2c-2-4-2.7-8-1.6-12.2l-3.2-2Z" fill="#3A211C"/>',
      extra: '<path d="M19 58c1.7-10 7.2-15.3 13-15.3S43.3 48 45 58" fill="#E11933"/><path d="M25 45c2.5 1.2 4.6 1.2 7 0" fill="none" stroke="#fff" stroke-width="1.2" opacity=".55"/>'
    },
    masha: {
      bg: '#E8F0FF', skin: '#F7CBB0', hair: '#7A4A2D', shirt: '#245FE0', accent: '#FFDA5C',
      hairPath: '<path d="M19.5 29c-.8-11 5-19 12.9-19 8 0 13.7 8 12.7 19-1-4.7-3.3-8.1-6.4-10.6-4 3-10.1 4.4-16.6 4.2-.8 2.3-1.6 4.2-2.6 6.4Z" fill="#7A4A2D"/><circle cx="18" cy="17.5" r="5.2" fill="#7A4A2D"/><circle cx="46" cy="17.5" r="5.2" fill="#7A4A2D"/><circle cx="18" cy="17.5" r="2.3" fill="#FFC857" opacity=".8"/><circle cx="46" cy="17.5" r="2.3" fill="#FFC857" opacity=".8"/>',
      extra: '<path d="M19 58c1.7-10 7.2-15.3 13-15.3S43.3 48 45 58" fill="#245FE0"/><path d="M32 43.5 26 58h12l-6-14.5Z" fill="#fff" opacity=".15"/><path d="M28 18c2.2-1.5 5.8-1.5 8 0" fill="none" stroke="#B46A43" stroke-width="1.1" opacity=".6"/>'
    },
    alex: {
      bg: '#E8F7F1', skin: '#EFC2A2', hair: '#2D2622', shirt: '#122E5A', accent: '#FF3148',
      hairPath: '<path d="M19 28c-1-11 5.4-19 13-19 8.2 0 14 7.8 13 19-.9-3.8-2.6-7-5.5-9.5-2.6 2.6-7.5 4.6-13.5 4.8-2.7 1-4.5 2.5-7 4.7Z" fill="#2D2622"/><path d="M24 13.5c3-3.4 10-4 15-.5-3.4 2.8-9.4 4-15 .5Z" fill="#3A312C"/>',
      extra: '<path d="M19 58c1.7-10 7.2-15.3 13-15.3S43.3 48 45 58" fill="#122E5A"/><path d="M27 43.5 23 50h18l-4-6.5" fill="#214984"/><path d="M25 29.5h14" fill="none" stroke="#1E1A18" stroke-width="1.2" opacity=".35"/>'
    },
    dmitry: {
      bg: '#EDF3FF', skin: '#E8B894', hair: '#4A352A', shirt: '#2D6A5B', accent: '#FFFFFF',
      hairPath: '<path d="M19.5 28c-.8-11 5-19 12.5-19 8 0 13.7 8 12.6 19-1.5-4-3.5-6.7-6-8.7-3.8 2.4-9.2 3.6-15.1 3.4-1.3 1.9-2.6 3.6-4 5.3Z" fill="#4A352A"/><path d="M22 39c1 6 5 9.6 10 9.6s9-3.6 10-9.6c-3 3-6.3 4.4-10 4.4S25 42 22 39Z" fill="#4A352A" opacity=".85"/>',
      extra: '<path d="M19 58c1.7-10 7.2-15.3 13-15.3S43.3 48 45 58" fill="#2D6A5B"/>'
    },
    grandma: {
      bg: '#FFF4E3', skin: '#F1C7A8', hair: '#B8BDC9', shirt: '#B8324A', accent: '#FFFFFF',
      hairPath: '<path d="M18 30c-.4-11.6 5.4-21 14-21s14.4 9.4 14 21c-1.2-4.7-3-8.4-5.8-11.1-4.4 2.8-10.5 4-17 3.8-1.5 2.1-3.3 4.6-5.2 7.3Z" fill="#B8BDC9"/><path d="M18 27c-2.7 4.7-2.4 11 1 15l2.4-2.7c-1.8-3.6-1.7-7-.2-10.3l-3.2-2Z" fill="#B8BDC9"/><path d="M46 27c2.7 4.7 2.4 11-1 15l-2.4-2.7c1.8-3.6 1.7-7 .2-10.3l3.2-2Z" fill="#B8BDC9"/>',
      extra: '<path d="M19 58c1.7-10 7.2-15.3 13-15.3S43.3 48 45 58" fill="#B8324A"/><g fill="none" stroke="#3B3B45" stroke-width="1.2"><circle cx="26.5" cy="28" r="3.4"/><circle cx="37.5" cy="28" r="3.4"/><path d="M29.9 27.8h4.2"/></g>'
    }
  };

  function avatar(id, size, cls) {
    var a = AVATARS[id] || AVATARS.masha;
    var s = size || 40;
    var eyes = '<circle cx="27" cy="28" r="1.25" fill="#2B1A14"/><circle cx="37" cy="28" r="1.25" fill="#2B1A14"/>';
    var mouth = '<path d="M28.6 34c2 1.8 4.8 1.8 6.8 0" fill="none" stroke="#9C5A45" stroke-width="1.35" stroke-linecap="round"/>';
    var blush = '<ellipse cx="23.8" cy="31.5" rx="2.3" ry="1.2" fill="#F39B97" opacity=".48"/><ellipse cx="40.2" cy="31.5" rx="2.3" ry="1.2" fill="#F39B97" opacity=".48"/>';
    if (id === 'grandma') { eyes = ''; mouth = '<path d="M29 34c1.8 1.7 4.2 1.7 6 0" fill="none" stroke="#9C5A45" stroke-width="1.3" stroke-linecap="round"/>'; }
    return '<svg class="avatar-svg ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" role="img" aria-label="Аватар">' +
      '<rect width="64" height="64" rx="32" fill="' + a.bg + '"/>' +
      '<circle cx="32" cy="35" r="23" fill="' + a.accent + '" opacity=".16"/>' +
      a.extra +
      '<circle cx="32" cy="27.5" r="12.5" fill="' + a.skin + '"/>' +
      '<path d="M19.8 29c0-7.4 5.2-13 12.2-13 7.1 0 12.2 5.6 12.2 13" fill="none" stroke="' + a.skin + '" stroke-width="0"/>' +
      a.hairPath +
      eyes + blush + mouth +
      '</svg>';
  }

  window.MF = window.MF || {};
  window.MF.icon = icon;
  window.MF.avatar = avatar;
  window.MF.icons = ICONS;
})();
