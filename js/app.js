/* Moby Family — interactive PWA demo for MTBank / Space Hackathon. */
(function () {
  'use strict';

  var D = MF.DATA;
  var icon = MF.icon;
  var avatar = MF.avatar;
  var STORAGE_KEY = 'moby-family-state-v1';
  var VALID_ROLES = ['parent', 'masha', 'alex', 'adult'];

  var app, view, tabbar, sheetRoot, toastRoot, confettiRoot;
  var state;
  var ui = {
    mode: 'welcome',
    sheet: null,
    mission: null,
    qrTab: null,
    giftChild: 'masha',
    giftSent: false,
    giftAmount: 25,
    giftCustom: '',
    installPrompt: null,
    lastFocus: null,
    topupChild: 'masha',
    topupPocket: 'spend',
    missionChild: 'masha',
    lastRoute: null
  };

  var nf = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nfInt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmt(n) { return nf.format(Number(n) || 0); }
  function fmtInt(n) { return nfInt.format(Number(n) || 0); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function pct(part, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round(part / total * 100)));
  }
  function plural(n, forms) {
    var abs = Math.abs(n) % 100;
    var last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }
  function todayLabel() {
    var s = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function dateShort() {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date()).replace('.', '');
  }
  function currentPerson() {
    if (state.role === 'parent') return D.people.anna;
    if (state.role === 'adult') return D.people.mashaAdult;
    return D.people[state.role] || D.people.anna;
  }
  function personByRole(role) {
    if (role === 'parent') return D.people.anna;
    if (role === 'adult') return D.people.mashaAdult;
    return D.people[role] || D.people.anna;
  }
  function childFor(id) { return D.people[id] || D.people.masha; }
  function roleLabel(role) {
    return {
      parent: 'Родитель', masha: 'Маша · 12', alex: 'Алекс · 16', adult: 'Маша · 18'
    }[role] || 'Родитель';
  }
  function genitiveName(name) {
    if (name === 'Маша') return 'Маши';
    if (name === 'Алекс') return 'Алекса';
    if (name === 'Анна') return 'Анны';
    return name;
  }
  function dativeName(name) {
    if (name === 'Маша') return 'Маше';
    if (name === 'Алекс') return 'Алексу';
    if (name === 'Анна') return 'Анне';
    return name;
  }
  function goalProgress(person) {
    if (!person || !person.goal) return 0;
    return pct(person.goal.saved, person.goal.target);
  }
  function doneCount(person) {
    var baseline = { masha: ['pockets'], alex: ['pockets', 'dropper'] };
    var base = baseline[person.id] || [];
    var extra = (state.missionsDone[person.id] || []).filter(function (id) { return base.indexOf(id) === -1; }).length;
    return (person.done || 0) + extra;
  }
  function brandMarkup(extraClass, withDemo) {
    return '<div class="brand ' + (extraClass || '') + '">' +
      '<img class="brand__mark" src="assets/icons/icon.svg" alt="">' +
      '<span class="brand__word">moby</span>' +
      '<span class="brand__family">family</span>' +
      (withDemo ? '<span class="brand__demo">demo</span>' : '') +
      '</div>';
  }
  function topActions() {
    var role = state.role || 'parent';
    var person = role === 'parent' ? D.people.anna : personByRole(role);
    return '<div class="topbar__actions">' +
      '<button class="icon-btn icon-btn--glass" type="button" data-action="notifications" aria-label="Уведомления">' +
        icon('bell', 19) + '<span class="notif-dot"></span>' +
      '</button>' +
      '<button class="avatar-btn" type="button" data-action="role-sheet" aria-label="Сменить роль">' +
        avatar(person.avatar || 'anna', 38) + '<span class="avatar-btn__status"></span>' +
      '</button>' +
      '</div>';
  }
  function subHeader(title, opts) {
    opts = opts || {};
    var person = currentPerson();
    return '<header class="subhead">' +
      '<button class="icon-btn icon-btn--soft" type="button" data-action="navigate" data-to="' + esc(opts.back || 'home') + '" aria-label="Назад">' + icon('chevron-left', 22) + '</button>' +
      '<div class="subhead__title">' +
        (opts.eyebrow ? '<span class="subhead__eyebrow">' + esc(opts.eyebrow) + '</span>' : '') +
        '<h1>' + esc(title) + '</h1>' +
      '</div>' +
      (opts.action || '<button class="avatar-btn avatar-btn--sm" type="button" data-action="role-sheet" aria-label="Профиль">' + avatar(person.avatar || 'anna', 34) + '</button>') +
      '</header>';
  }
  function sectionHead(title, action, count) {
    return '<div class="section-head">' +
      '<h2>' + esc(title) + (count ? ' <span class="head-count">' + count + '</span>' : '') + '</h2>' +
      (action || '') +
      '</div>';
  }
  function linkButton(label, action, attrs) {
    return '<button class="link-btn" type="button" data-action="' + action + '" ' + (attrs || '') + '>' +
      esc(label) + icon('chevron-right', 14) + '</button>';
  }
  function hiddenAmount(value) {
    return state.balanceHidden ? '••••••' : fmt(value);
  }
  function txRow(tx) {
    return '<div class="tx-row">' +
      '<span class="tx-icon tx-icon--' + (tx.tone || 'blue') + '">' + icon(tx.icon || 'card', 19) + '</span>' +
      '<span class="tx-main"><b>' + esc(tx.title) + '</b><span>' + esc(tx.subtitle) + '</span></span>' +
      '<span class="tx-amount ' + (tx.amount > 0 ? 'is-positive' : '') + '">' +
        (tx.amount > 0 ? '+' : '−') + fmt(Math.abs(tx.amount)) + ' <small>BYN</small></span>' +
      '</div>';
  }
  function goalRing(progress, tone) {
    var radius = 35;
    var circ = 2 * Math.PI * radius;
    var offset = circ * (1 - Math.max(0, progress) / 100);
    return '<div class="goal-ring ' + (tone || '') + '">' +
      '<svg viewBox="0 0 88 88" aria-hidden="true">' +
        '<circle class="goal-ring__bg" cx="44" cy="44" r="' + radius + '"/>' +
        '<circle class="goal-ring__value" cx="44" cy="44" r="' + radius + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 44 44)"/>' +
      '</svg>' +
      '<div class="goal-ring__center"><strong>' + progress + '%</strong><span>цели</span></div>' +
      '</div>';
  }
  function weekStrip(active) {
    return '<div class="week-strip">' + D.week.map(function (day, i) {
      var cls = day.done ? 'is-done' : '';
      if (i === 6 && active) cls += ' is-today';
      return '<span class="week-day ' + cls + '"><i>' + (day.done ? icon('check', 11) : i === 6 ? icon('flame', 12) : '') + '</i><b>' + day.d + '</b></span>';
    }).join('') + '</div>';
  }
  function seriesBanner(person) {
    var left = state.freezes[person.id] == null ? 1 : state.freezes[person.id];
    return '<div class="series-banner">' +
      '<span class="series-banner__flame">' + icon('flame', 19) + '</span>' +
      '<span class="series-banner__text"><b>' + person.streak + ' ' + plural(person.streak, ['день', 'дня', 'дней']) + ' подряд</b>' +
        '<span>+0,5% к ставке за серию</span></span>' +
      '<button class="freeze-btn" type="button" data-action="freeze-streak" data-child="' + person.id + '" ' + (left ? '' : 'disabled') + ' aria-label="Заморозить серию">' +
        icon('snowflake', 17) + '<span>' + left + '</span>' +
      '</button>' +
      '</div>';
  }
  function stageBadge(person) {
    return '<span class="stage-badge stage-badge--' + (person.stage || 'base') + '">' + esc(person.stageLabel || '') + '</span>';
  }
  function goalCard(person, options) {
    options = options || {};
    var progress = goalProgress(person);
    var goal = person.goal;
    var remaining = Math.max(0, goal.target - goal.saved);
    var tone = person.id === 'alex' ? 'blue' : 'red';
    return '<article class="goal-card ' + (options.className || '') + '">' +
      '<div class="goal-card__head">' +
        '<div><span class="kicker">' + (options.label || 'Моя цель') + '</span><h2>' + esc(goal.name) + '</h2></div>' +
        '<span class="goal-card__rate">' + goal.rate.toString().replace('.', ',') + '%</span>' +
      '</div>' +
      '<div class="goal-card__body">' +
        goalRing(progress, tone) +
        '<div class="goal-card__numbers">' +
          '<strong>' + fmt(goal.saved) + ' <small>из ' + fmt(goal.target) + ' BYN</small></strong>' +
          '<p>Осталось ' + fmt(remaining) + ' BYN</p>' +
          '<span class="goal-card__streak">' + icon('flame', 15) + person.streak + ' ' + plural(person.streak, ['день', 'дня', 'дней']) + ' в серии</span>' +
        '</div>' +
      '</div>' +
      (options.footer === false ? '' :
        '<button class="btn btn--soft ' + (tone === 'blue' ? 'btn--soft-blue' : 'btn--soft-red') + ' btn--block btn--sm" type="button" data-action="open-topup" data-child="' + person.id + '" data-pocket="save">Пополнить копилку ' + icon('plus', 15) + '</button>') +
      '</article>';
  }
  function getRoute() {
    var raw = (window.location.hash || '').replace(/^#\/?/, '');
    if (!raw) return { name: 'home', param: null };
    var parts = raw.split('/');
    return { name: parts[0] || 'home', param: parts.slice(1).join('/') || null };
  }
  function navigate(name, param, replace) {
    var hash = '#/' + name + (param ? '/' + param : '');
    if (replace) {
      history.replaceState(null, '', hash);
      render();
    } else if (window.location.hash === hash) {
      render();
    } else {
      window.location.hash = hash;
    }
  }
  function syncUrlRole(role) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('role', role);
      url.searchParams.delete('gift');
      url.searchParams.delete('invite');
      url.hash = '#/home';
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (err) { /* no-op */ }
  }
  function validScreen(screen, role) {
    var common = ['home', 'missions', 'qr', 'more', 'age', 'cards', 'about', 'install'];
    var byRole = {
      parent: common.concat(['family', 'child', 'limits']),
      masha: common.concat(['savings', 'limits']),
      alex: common.concat(['savings', 'limits']),
      adult: common.concat(['savings'])
    };
    return (byRole[role] || byRole.parent).indexOf(screen) !== -1;
  }

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadState() {
    var def = deepClone(D.defaultState);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return def;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return def;
      var merged = Object.assign(def, saved);
      merged.limits = deepClone(def.limits);
      Object.keys(def.limits).forEach(function (id) {
        merged.limits[id] = Object.assign(deepClone(def.limits[id]), (saved.limits && saved.limits[id]) || {});
      });
      merged.freezes = Object.assign(deepClone(def.freezes), saved.freezes || {});
      merged.missionsDone = Object.assign(deepClone(def.missionsDone), saved.missionsDone || {});
      merged.points = Object.assign(deepClone(def.points), saved.points || {});
      if (VALID_ROLES.indexOf(merged.role) === -1) merged.role = null;
      if (['masha', 'alex'].indexOf(merged.activeChild) === -1) merged.activeChild = 'masha';
      return merged;
    } catch (err) {
      return def;
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* private mode */ }
  }

  function setRole(role) {
    if (VALID_ROLES.indexOf(role) === -1) role = 'parent';
    state.role = role;
    if (role === 'masha' || role === 'alex') state.activeChild = role;
    ui.mode = 'app';
    ui.lastFocus = null;
    saveState();
    syncUrlRole(role);
    render(true);
    setTimeout(function () { toast('Демо: вы вошли как ' + roleLabel(role), { icon: 'users' }); }, 300);
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function boot() {
    app = $('#app'); view = $('#view'); tabbar = $('#tabbar');
    sheetRoot = $('#sheetRoot'); toastRoot = $('#toastRoot'); confettiRoot = $('#confettiRoot');
    state = loadState();

    var params = new URLSearchParams(window.location.search);
    var gift = params.get('gift');
    var invite = params.get('invite');
    var role = params.get('role');

    if (gift && D.people[gift] && (gift === 'masha' || gift === 'alex')) {
      ui.mode = 'gift';
      ui.giftChild = gift;
      ui.giftAmount = 25;
    } else if (invite) {
      ui.mode = 'invite';
    } else {
      if (VALID_ROLES.indexOf(role) !== -1) {
        state.role = role;
        saveState();
      }
      ui.mode = state.role ? 'app' : 'welcome';
    }
    if (state.role === 'masha' || state.role === 'alex') state.activeChild = state.role;
    ui.qrTab = state.role === 'parent' ? 'app' : 'gift';

    bindEvents();
    setupInstall();
    setupStatusbar();
    setupDesktopQr();
    render();
    registerServiceWorker();
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  function render(resetScroll) {
    if (!state.role) state.role = null;

    if (ui.mode === 'gift') {
      tabbar.classList.add('is-hidden');
      app.dataset.screen = 'gift';
      view.innerHTML = renderGift();
      document.title = 'Подарок для ' + genitiveName(childFor(ui.giftChild).name) + ' — Moby Family';
      afterRender('gift');
      view.scrollTop = 0;
      return;
    }

    if (ui.mode === 'welcome' || ui.mode === 'invite' || !state.role) {
      tabbar.classList.add('is-hidden');
      app.dataset.screen = 'welcome';
      view.innerHTML = renderWelcome();
      document.title = 'Moby Family — семейный банкинг МТБанка';
      afterRender('welcome');
      view.scrollTop = 0;
      return;
    }

    var route = getRoute();
    var screen = route.name;
    if (!validScreen(screen, state.role)) screen = 'home';
    var html;
    var role = state.role;

    if (screen === 'home') {
      html = role === 'parent' ? renderParentHome() : role === 'adult' ? renderAdultHome() : renderKidHome(personByRole(role));
    } else if (screen === 'family') {
      html = renderFamily();
    } else if (screen === 'missions') {
      html = renderMissions(route.param);
    } else if (screen === 'qr') {
      html = renderQR(route.param);
    } else if (screen === 'more') {
      html = renderMore();
    } else if (screen === 'child') {
      html = renderChildDetail(route.param || state.activeChild);
    } else if (screen === 'limits') {
      html = renderLimits(route.param || (role === 'parent' ? state.activeChild : (role === 'adult' ? 'masha' : role)));
    } else if (screen === 'savings') {
      html = renderSavings();
    } else if (screen === 'cards') {
      html = renderCards(route.param || (role === 'parent' ? state.activeChild : role === 'adult' ? 'masha' : role));
    } else if (screen === 'age') {
      html = renderAge();
    } else if (screen === 'about') {
      html = renderAbout();
    } else if (screen === 'install') {
      html = renderInstallPage();
    } else {
      html = renderParentHome();
    }

    view.innerHTML = html;
    app.dataset.screen = screen;
    app.dataset.role = role;
    renderTabbar(screen);
    afterRender(screen, route.param);
    if (resetScroll !== false) view.scrollTop = 0;
    document.title = screenTitle(screen);
    updateThemeColor(screen);
  }

  function screenTitle(screen) {
    var map = {
      home: state.role === 'parent' ? 'Главная — Moby Family' : 'Мои деньги — Moby Family',
      family: 'Семья — Moby Family',
      missions: 'Миссии — Moby Family',
      qr: 'Поделиться — Moby Family',
      more: 'Ещё — Moby Family',
      child: 'Профиль ребёнка — Moby Family',
      limits: 'Правила — Moby Family',
      savings: 'Копилка — Moby Family',
      cards: 'Карты и браслеты — Moby Family',
      age: 'Возрастная лестница — Moby Family',
      about: 'О проекте — Moby Family',
      install: 'Установка — Moby Family'
    };
    return map[screen] || 'Moby Family';
  }

  function updateThemeColor(screen) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var dark = screen === 'home' || screen === 'welcome' || screen === 'gift' || screen === 'adult';
    meta.setAttribute('content', dark ? '#071B3D' : '#F3F6FC');
  }

  function renderTabbar(active) {
    var role = state.role;
    var tabs;
    if (role === 'parent') {
      tabs = [
        { id: 'home', label: 'Главная', ic: 'home' },
        { id: 'family', label: 'Семья', ic: 'users' },
        { id: 'chat', label: 'Чат', ic: 'chat', disabled: true },
        { id: 'more', label: 'Ещё', ic: 'more' }
      ];
    } else if (role === 'adult') {
      tabs = [
        { id: 'home', label: 'Главная', ic: 'home' },
        { id: 'cards', label: 'Карта', ic: 'card' },
        { id: 'qr', label: 'QR', ic: 'qr', center: true },
        { id: 'missions', label: 'Миссии', ic: 'sparkles' },
        { id: 'more', label: 'Ещё', ic: 'more' }
      ];
    } else {
      tabs = [
        { id: 'home', label: 'Главная', ic: 'home' },
        { id: 'savings', label: 'Копилка', ic: 'piggy' },
        { id: 'qr', label: role === 'masha' ? 'Подарить' : 'QR', ic: 'qr', center: true },
        { id: 'missions', label: 'Миссии', ic: 'sparkles' },
        { id: 'more', label: 'Ещё', ic: 'more' }
      ];
    }
    var activeMap = { child: 'family', limits: 'family', age: 'more', about: 'more', install: 'more', cards: role === 'adult' ? 'cards' : 'more' };
    if (role !== 'parent' && active === 'limits') activeMap.limits = 'more';
    var current = activeMap[active] || active;
    if (role !== 'parent' && active === 'savings') current = 'savings';
    if (role === 'parent' && active === 'missions') current = 'family';
    if (role === 'parent' && active === 'qr') current = 'home';
    tabbar.classList.remove('is-hidden');
    tabbar.classList.toggle('tabbar--parent', role === 'parent');
    tabbar.innerHTML = tabs.map(function (tab) {
      var isActive = current === tab.id;
      if (tab.disabled) {
        return '<button class="tab tab--disabled" type="button" aria-disabled="true">' +
          '<span class="tab__icon">' + icon(tab.ic, 22) + '</span>' +
          '<span class="tab__label">' + tab.label + '</span>' +
          '</button>';
      }
      if (tab.center) {
        return '<button class="tab tab--center" type="button" data-action="navigate" data-to="' + tab.id + '" aria-label="' + tab.label + '">' +
          '<span class="tab__center-icon">' + icon('qr', 23) + '</span>' +
          '<span class="tab__label">' + tab.label + '</span>' +
          '</button>';
      }
      return '<button class="tab ' + (isActive ? 'is-active' : '') + '" type="button" data-action="navigate" data-to="' + tab.id + '" aria-current="' + (isActive ? 'page' : 'false') + '">' +
        '<span class="tab__icon">' + icon(tab.ic, 22) + '</span>' +
        '<span class="tab__label">' + tab.label + '</span>' +
        '</button>';
    }).join('');
  }

  function afterRender(screen) {
    refreshDynamicQr();
    if (screen === 'limits') initRange('limitRange');
    if (screen === 'age') initAgeScreen();
    if (screen === 'gift') {
      var selected = $('.amount-chip.is-selected');
      if (selected) selected.classList.add('is-selected');
    }
    $$('[data-copy-url]').forEach(function (el) {
      el.setAttribute('data-url', el.getAttribute('data-copy-url'));
    });
  }

  function refreshDynamicQr() {
    $$('[data-qr-url]').forEach(function (el) {
      var url = el.getAttribute('data-qr-url');
      if (!url) return;
      MF.renderQr(el, url, { logo: el.getAttribute('data-qr-logo') !== 'false' });
    });
    $$('[data-qr-link]').forEach(function (el) {
      el.textContent = MF.prettyUrl(el.getAttribute('data-qr-link'));
    });
  }

  function initRange(id) {
    var input = document.getElementById(id);
    if (!input) return;
    var update = function () {
      var min = Number(input.min) || 0;
      var max = Number(input.max) || 100;
      var val = Number(input.value);
      var p = (val - min) / (max - min) * 100;
      input.style.setProperty('--fill', p + '%');
      var output = document.querySelector('[data-range-output="' + id + '"]');
      if (output) output.textContent = fmtInt(val);
    };
    input.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Welcome                                                             */
  /* ------------------------------------------------------------------ */

  function renderWelcome() {
    var invite = ui.mode === 'invite';
    return '<section class="welcome">' +
      '<div class="welcome__noise" aria-hidden="true"></div>' +
      '<div class="welcome__orbs" aria-hidden="true"><span></span><span></span></div>' +
      '<header class="welcome__top">' + brandMarkup('brand--light') +
        '<span class="demo-pill"><i></i>demo</span>' +
      '</header>' +
      '<div class="welcome__hero">' +
        '<div class="welcome__art">' +
          '<img src="assets/img/whale-hero.svg" alt="Кит Moby" class="welcome__whale">' +
          '<span class="welcome__float welcome__float--a">' + icon('sparkles', 17) + '</span>' +
          '<span class="welcome__float welcome__float--b">' + icon('heart', 14) + '</span>' +
          '<span class="welcome__coin">BYN</span>' +
        '</div>' +
        '<div class="welcome__copy">' +
          '<span class="welcome__eyebrow">' + (invite ? 'Приглашение в семью' : 'МТБанк · семейный банкинг') + '</span>' +
          '<h1>' + (invite ? 'Тебя пригласили<br>в Moby Family' : 'Первые деньги,<br>которые не теряются.') + '</h1>' +
          '<p>' + (invite ? 'Анна приглашает тебя в семейный банкинг. Вход — по ПИН-коду или биометрии, без отдельного детского приложения.' : 'Карта и приложение, которые растут вместе с ребёнком. Права открываются возрастом, а не тарифом.') + '</p>' +
        '</div>' +
        '<div class="welcome__promise">' +
          '<div class="welcome__promise-head"><span>Один Moby для семьи</span><b>7 — 18 лет</b></div>' +
          '<div class="welcome__banks">' +
            '<span><i class="bank-dot bank-dot--spend"></i>Трачу <b>70%</b></span>' +
            '<span><i class="bank-dot bank-dot--save"></i>Коплю <b>20%</b></span>' +
            '<span><i class="bank-dot bank-dot--share"></i>Делюсь <b>10%</b></span>' +
          '</div>' +
          '<div class="welcome__banks-bar"><i style="width:70%"></i><i style="width:20%"></i><i style="width:10%"></i></div>' +
        '</div>' +
      '</div>' +
      '<div class="welcome__roles">' +
        (invite
          ? '<button class="role-primary" type="button" data-action="switch-role" data-role="masha">' +
              '<span class="role-primary__avatar">' + avatar('masha', 44) + '</span>' +
              '<span class="role-primary__text"><b>Принять приглашение</b><span>Войти как Маша, 12 лет</span></span>' +
              '<span class="role-primary__arrow">' + icon('arrow-right', 19) + '</span>' +
            '</button>'
          : '<button class="role-primary" type="button" data-action="switch-role" data-role="parent">' +
              '<span class="role-primary__avatar">' + avatar('anna', 44) + '</span>' +
              '<span class="role-primary__text"><b>Смотреть как родитель</b><span>Анна · семья Соколовых</span></span>' +
              '<span class="role-primary__arrow">' + icon('arrow-right', 19) + '</span>' +
            '</button>') +
        '<div class="role-mini">' +
          '<button class="role-mini__card" type="button" data-action="switch-role" data-role="masha">' +
            avatar('masha', 34) + '<span><b>Маша</b><i>12 лет</i></span>' + icon('chevron-right', 14) +
          '</button>' +
          '<button class="role-mini__card" type="button" data-action="switch-role" data-role="alex">' +
            avatar('alex', 34) + '<span><b>Алекс</b><i>16 лет</i></span>' + icon('chevron-right', 14) +
          '</button>' +
        '</div>' +
        '<button class="welcome__gift-link" type="button" data-action="open-gift" data-child="masha">' +
          icon('gift', 16) + 'Подарить по ссылке' + icon('arrow-up-right', 14) +
        '</button>' +
      '</div>' +
      '<div class="welcome__proof">' +
        '<span class="welcome__proof-badge">+30</span>' +
        '<p><b>баллов финграмотности</b><br>за самостоятельность и обсуждение трат</p>' +
        '<span class="welcome__proof-mark">PISA</span>' +
      '</div>' +
      '<footer class="welcome__foot">' +
        '<span>Space Hackathon · МТБанк</span>' +
        '<button type="button" data-action="open-sheet" data-sheet="about">О проекте</button>' +
      '</footer>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Parent home                                                         */
  /* ------------------------------------------------------------------ */

  function renderParentHome() {
    var family = D.family;

    return '<section class="screen home">' +
      '<header class="hero hero--parent">' +
        '<div class="hero__aurora" aria-hidden="true"></div>' +
        '<div class="hero__grid" aria-hidden="true"></div>' +
        '<div class="topbar">' + brandMarkup('brand--light', true) + topActions() + '</div>' +
        '<div class="hero__intro">' +
          '<span class="hero__date">' + todayLabel() + '</span>' +
          '<h1 class="hero__title">Привет, Анна</h1>' +
        '</div>' +
        '<div class="balance-panel">' +
          '<div class="balance-panel__head">' +
            '<span class="balance-panel__label">Семейный счёт <span class="badge-glass"><i class="dot dot--green"></i>активен</span></span>' +
            '<button class="icon-btn icon-btn--glass" type="button" data-action="toggle-balance" aria-label="' + (state.balanceHidden ? 'Показать баланс' : 'Скрыть баланс') + '">' + icon(state.balanceHidden ? 'eyeOff' : 'eye', 18) + '</button>' +
          '</div>' +
          '<div class="balance-panel__amount"><span>' + hiddenAmount(family.balance) + '</span><small>BYN</small></div>' +
          '<div class="balance-panel__meta">' + family.accountMask + '<span>·</span>счёт-донор</div>' +
        '</div>' +
        '<div class="quick-row">' +
          quickButton('plus', 'Пополнить', 'open-topup') +
          quickButton('send', 'Перевести', 'open-transfer') +
          quickButton('card', 'Оплатить') +
        '</div>' +
      '</header>' +
      '<div class="content">' +
        (!state.insightDismissed ? insightCard() : '') +
        '<section class="section history-section">' +
          sectionHead('История') +
          '<div class="tx-card tx-card--compact">' + D.transactions.masha.slice(0, 2).map(txRow).join('') + D.transactions.alex.slice(0, 1).map(txRow).join('') + '</div>' +
        '</section>' +
        '<p class="home__fineprint">Moby Family · ' + family.currentPrice.toString().replace('.', ',') + ' BYN в месяц · списание ' + family.nextCharge + '</p>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  function quickButton(ic, label, action) {
    return '<button class="quick' + (action ? '' : ' quick--static') + '" type="button" ' + (action ? 'data-action="' + action + '"' : 'aria-disabled="true"') + '>' +
      '<span class="quick__icon">' + icon(ic, 20) + '</span>' +
      '<span class="quick__label">' + label + '</span>' +
      '</button>';
  }

  function kidCard(person) {
    var spent = person.limit ? person.limit.spent : 0;
    var weekly = person.limit ? person.limit.weekly : 0;
    var progress = pct(spent, weekly);
    var teen = person.stage === 'teen';
    return '<button class="kid-card ' + (teen ? 'kid-card--blue' : 'kid-card--red') + '" type="button" data-action="open-child" data-child="' + person.id + '">' +
      '<span class="kid-card__top">' +
        '<span class="kid-card__avatar">' + avatar(person.avatar, 44) + '</span>' +
        stageBadge(person) +
      '</span>' +
      '<span class="kid-card__name">' + person.name + '</span>' +
      '<span class="kid-card__amount">' + hiddenAmount(person.balance) + ' <small>BYN</small></span>' +
      '<span class="kid-card__limit">' +
        '<span class="kid-card__limit-top"><span>' + (teen ? 'Потратил' : 'Потратила') + '</span><b>' + fmt(spent) + ' / ' + fmtInt(weekly) + '</b></span>' +
        '<span class="mini-bar"><i style="width:' + progress + '%"></i></span>' +
      '</span>' +
      '</button>';
  }

  function insightCard() {
    return '<article class="insight-card">' +
      '<span class="insight-card__spark" aria-hidden="true">' + icon('sparkles', 20) + '</span>' +
      '<div class="insight-card__body">' +
        '<span class="kicker kicker--red"><i></i>Moby подсказывает</span>' +
        '<h3>Маше 12 — пора платить онлайн?</h3>' +
        '<p>Дети её возраста уже расплачиваются в интернете. Исследования PISA: самостоятельность вместе с обсуждением трат дают <b>+30 баллов</b> финграмотности.</p>' +
        '<div class="insight-card__actions">' +
          '<button class="btn btn--red btn--xs" type="button" data-action="open-limits" data-child="masha">Настроить лимит</button>' +
          '<button class="text-btn" type="button" data-action="dismiss-insight">Позже</button>' +
        '</div>' +
      '</div>' +
      '</article>';
  }

  function missionTeaser(missionId, person) {
    var mission = D.missionsById[missionId];
    return '<button class="mission-card" type="button" data-action="open-mission" data-mission="' + mission.id + '" data-child="' + person.id + '">' +
      '<span class="mission-card__icon">' + icon(mission.icon, 24) + '</span>' +
      '<span class="mission-card__body">' +
        '<span class="mission-card__kicker"><i></i>Миссия · ' + mission.duration + ' мин</span>' +
        '<b class="mission-card__title">' + esc(mission.title) + '</b>' +
        '<span class="mission-card__text">' + esc(mission.lead) + '</span>' +
        '<span class="mission-card__meta">' +
          '<span class="mission-card__points">+' + mission.points + ' баллов</span>' +
          '<span class="mission-card__play">Начать ' + icon('play', 12) + '</span>' +
        '</span>' +
      '</span>' +
      '<span class="mission-card__deco" aria-hidden="true"></span>' +
      '</button>';
  }

  /* ------------------------------------------------------------------ */
  /* Child / teen home                                                   */
  /* ------------------------------------------------------------------ */

  function renderKidHome(person) {
    var isTeen = person.stage === 'teen';
    var pockets = person.pockets || { spend: 0, save: 0, share: 0 };
    var split = person.split || { spend: 70, save: 20, share: 10 };
    var limit = state.limits[person.id] || person.limit;
    var spent = limit.spent == null ? person.limit.spent : limit.spent;
    var limitPct = pct(spent, limit.weekly);
    var featured = isTeen ? 'dropper' : 'snacks';

    return '<section class="screen home home--kid ' + (isTeen ? 'is-teen' : '') + '">' +
      '<header class="hero ' + (isTeen ? 'hero--teen' : 'hero--child') + '">' +
        '<div class="hero__aurora" aria-hidden="true"></div>' +
        '<div class="hero__grid" aria-hidden="true"></div>' +
        '<div class="topbar">' + brandMarkup('brand--light', true) + topActions() + '</div>' +
        '<div class="hero__intro hero__intro--kid">' +
          '<div><span class="hero__date">' + todayLabel() + '</span><h1 class="hero__title">Привет, ' + person.name + '!</h1></div>' +
          '<span class="age-pill">' + person.age + ' ' + plural(person.age, ['год', 'года', 'лет']) + ' · ' + (isTeen ? 'свой счёт' : 'субсчёт') + '</span>' +
        '</div>' +
        '<div class="kid-hero__balance">' +
          '<span>' + (isTeen ? 'Мой счёт' : 'Твои деньги') + '</span>' +
          '<strong>' + fmt(person.balance) + ' <small>BYN</small></strong>' +
          (isTeen ? '<span class="account-legal">' + icon('shield', 13) + 'Ст. 25 ГК РБ</span>' : '<span class="hero__meta">На счёте у мамы · ты пользуешься</span>') +
        '</div>' +
        '<div class="pockets">' +
          pocketTile('spend', 'Трачу', pockets.spend, 'card', false) +
          pocketTile('save', 'Коплю', pockets.save, 'piggy', true) +
          pocketTile('share', 'Делюсь', pockets.share, 'heart', false) +
        '</div>' +
        '<div class="split-line">' +
          '<span class="split-line__bar"><i style="width:' + split.spend + '%;background:#FF5A6A"></i><i style="width:' + split.save + '%;background:#77A6FF"></i><i style="width:' + split.share + '%;background:#8FE0C6"></i></span>' +
          '<span class="split-line__text">Каждое поступление: ' + split.spend + ' / ' + split.save + ' / ' + split.share + ' <button type="button" data-action="pocket-info" data-child="' + person.id + '" data-pocket="split">' + icon('info', 13) + '</button></span>' +
        '</div>' +
        (isTeen ? '' : '') +
      '</header>' +
      '<div class="content">' +
        (isTeen ? teenRightsCard() : '') +
        '<section class="section">' +
          goalCard(person, { label: isTeen ? 'Цель накопления' : 'Моя цель' }) +
        '</section>' +
        seriesBanner(person) +
        '<section class="section">' +
          sectionHead('Миссии', linkButton('Все', 'navigate', 'data-to="missions"')) +
          missionTeaser(featured, person) +
        '</section>' +
        (isTeen ? limitCard(person, spent, limit, limitPct) : giftMiniCard(person)) +
        '<section class="section">' +
          sectionHead('Последние операции', linkButton('Все', 'navigate', 'data-to="more"')) +
          '<div class="tx-card">' + D.transactions[person.id].map(txRow).join('') + '</div>' +
        '</section>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  function pocketTile(pocket, label, amount, ic, accent) {
    return '<button class="pocket ' + (accent ? 'pocket--accent' : '') + '" type="button" data-action="pocket-info" data-pocket="' + pocket + '">' +
      '<span class="pocket__top"><span class="pocket__icon">' + icon(ic, 17) + '</span><span>' + label + '</span></span>' +
      '<strong>' + fmt(amount) + '</strong>' +
      '<span class="pocket__currency">BYN</span>' +
      '</button>';
  }

  function teenRightsCard() {
    return '<article class="rights-card">' +
      '<span class="rights-card__icon">' + icon('shield', 23) + '</span>' +
      '<div>' +
        '<span class="kicker kicker--blue">С 14 лет · ст. 25 ГК РБ</span>' +
        '<h3>Это твой счёт. По-настоящему.</h3>' +
        '<p>С 19.11.2024 подросток владеет счётом с базовыми условиями без согласия родителя на каждую трату. Мама видит операции и задаёт правила.</p>' +
        '<button class="text-btn text-btn--blue" type="button" data-action="navigate" data-to="age">Что изменится в 18? ' + icon('arrow-right', 14) + '</button>' +
      '</div>' +
      '</article>';
  }

  function limitCard(person, spent, limit, progress) {
    return '<article class="limit-card">' +
      '<div class="limit-card__top">' +
        '<span class="limit-card__icon">' + icon('ruler', 19) + '</span>' +
        '<div><b>Родительские правила</b><span>Лимит недели</span></div>' +
        '<span class="limit-card__value">' + fmt(spent) + ' / ' + fmtInt(limit.weekly) + '</span>' +
      '</div>' +
      '<span class="limit-bar"><i style="width:' + progress + '%"></i></span>' +
      '<div class="limit-card__foot"><span>Осталось ' + fmt(Math.max(0, limit.weekly - spent)) + ' BYN</span><button class="text-btn" data-action="navigate" data-to="limits">Подробнее ' + icon('chevron-right', 13) + '</button></div>' +
      '</article>';
  }

  function giftMiniCard(person) {
    return '<button class="gift-mini" type="button" data-action="open-gift" data-child="' + person.id + '">' +
      '<span class="gift-mini__icon">' + icon('gift', 20) + '</span>' +
      '<span class="gift-mini__text"><b>Подарок по ссылке</b><span>Бабушка может пополнить «Коплю» без Moby</span></span>' +
      icon('chevron-right', 17) +
      '</button>';
  }

  /* ------------------------------------------------------------------ */
  /* Adult home                                                          */
  /* ------------------------------------------------------------------ */

  function renderAdultHome() {
    var person = D.people.mashaAdult;
    return '<section class="screen home home--adult">' +
      '<header class="hero hero--adult">' +
        '<div class="hero__aurora" aria-hidden="true"></div>' +
        '<div class="hero__grid" aria-hidden="true"></div>' +
        '<div class="topbar">' + brandMarkup('brand--light', true) +
          '<div class="adult-top">' + '<span class="adult-chip">18+</span>' +
          '<button class="avatar-btn" type="button" data-action="role-sheet" aria-label="Профиль">' + avatar('masha', 38) + '</button></div>' +
        '</div>' +
        '<div class="adult-badge">' + icon('sparkles', 16) + 'Счёт открыт автоматически</div>' +
        '<h1 class="hero__title adult-title">Маша, добро<br>пожаловать во взрослый Moby</h1>' +
        '<p class="adult-lead">В день 18-летия счёт и история перешли во взрослый профиль. Без визита в банк, нового приложения и повторной идентификации.</p>' +
        '<div class="adult-whale"><img src="assets/img/whale-hero.svg" alt=""></div>' +
      '</header>' +
      '<div class="content">' +
        '<div class="adult-balance">' +
          '<div><span>Доступно</span><strong>' + fmt(person.balance) + ' <small>BYN</small></strong></div>' +
          '<span class="badge-glass badge-glass--dark"><i class="dot dot--green"></i>Взрослый счёт</span>' +
        '</div>' +
        '<div class="adult-stats">' +
          '<div><b>11</b><span>лет с Moby</span></div>' +
          '<div><b>47</b><span>миссий пройдено</span></div>' +
          '<div><b>3</b><span>банки внутри</span></div>' +
        '</div>' +
        '<section class="section">' +
          sectionHead('Твой путь с Moby') +
          '<div class="path-card">' +
            adultPath('7', 'Первый браслет', 'Субсчёт мамы и первые карманные') +
            adultPath('14', 'Свой счёт по ст. 25 ГК РБ', 'Собственная карта и правила вместо разрешений') +
            adultPath('18', 'Взрослый Moby', 'Автоматический переход. Всё осталось на месте') +
          '</div>' +
        '</section>' +
        '<section class="section">' +
          sectionHead('Что дальше') +
          '<div class="adult-actions">' +
            '<button class="action-tile" type="button" data-action="navigate" data-to="cards"><span>' + icon('card', 21) + '</span><b>Карта</b><i>Moby Card уже с тобой</i></button>' +
            '<button class="action-tile" type="button" data-action="navigate" data-to="savings"><span>' + icon('piggy', 21) + '</span><b>Копилка</b><i>Серия 31 день</i></button>' +
          '</div>' +
        '</section>' +
        '<button class="btn btn--soft btn--block" type="button" data-action="role-sheet">Вернуться в семейное демо</button>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  function adultPath(age, title, text) {
    return '<div class="path-row"><span class="path-row__age">' + age + '</span><span><b>' + title + '</b><i>' + text + '</i></span></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Family                                                              */
  /* ------------------------------------------------------------------ */

  function renderFamily() {
    var family = D.family;
    var people = D.people;
    return '<section class="screen page page--family">' +
      subHeader('Семья', {
        eyebrow: 'Moby Family · 4 + близкие',
        action: '<button class="icon-btn icon-btn--soft" type="button" data-action="open-invite" aria-label="Пригласить в семью">' + icon('user-plus', 19) + '</button>'
      }) +
      '<div class="page__body">' +
        '<div class="family-hero">' +
          '<div class="family-hero__pattern" aria-hidden="true"></div>' +
          '<div class="family-hero__head"><span class="family-hero__label">Семейный пакет</span><span class="badge-glass"><i class="dot"></i>активен</span></div>' +
          '<h2>Соколовы</h2>' +
          '<p>Один пакет · счёт-донор ' + family.accountMask + '</p>' +
          '<div class="family-avatars">' +
            ['anna', 'dmitry', 'masha', 'alex', 'irina'].map(function (id) {
              return '<span class="family-avatars__item">' + avatar(people[id].avatar, 38) + '</span>';
            }).join('') +
            '<button class="family-avatars__add" type="button" data-action="open-invite" aria-label="Добавить участника">' + icon('plus', 16) + '</button>' +
          '</div>' +
          '<div class="family-hero__foot"><span><b>' + fmt(family.currentPrice) + ' BYN</b> / месяц</span><button class="family-hero__package" type="button" data-action="navigate" data-to="more">Пакет <span aria-hidden="true">›</span></button></div>' +
        '</div>' +

        '<section class="section">' +
          sectionHead('Дети', '<button class="link-btn link-btn--static" type="button" aria-disabled="true">Больше ' + icon('chevron-right', 14) + '</button>', '2') +
          '<div class="kids-grid">' + kidCard(people.masha) + kidCard(people.alex) + '</div>' +
        '</section>' +

        '<section class="section">' +
          sectionHead('Миссии', linkButton('Все миссии', 'navigate', 'data-to="missions"')) +
          missionTeaser('snacks', people.masha) +
        '</section>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Миссии                                                              */
  /* ------------------------------------------------------------------ */

  function renderMissions(param) {
    var isParent = state.role === 'parent';
    var selectedId = isParent ? (param === 'masha' || param === 'alex' ? param : (state.activeChild || 'masha')) : (state.role === 'adult' ? 'masha' : state.role);
    var person = childFor(selectedId);
    var points = state.points[selectedId] || 0;
    var done = state.missionsDone[selectedId] || [];
    var doneTotal = doneCount(person);
    var featured = D.missions.filter(function (m) { return done.indexOf(m.id) === -1; })[0] || D.missions[0];

    return '<section class="screen page page--missions">' +
      subHeader('Миссии', {
        eyebrow: isParent ? 'Прогресс семьи' : '3–5 минут · на твоих данных',
        action: '<button class="icon-btn icon-btn--soft" type="button" data-action="open-sheet" data-sheet="about" aria-label="О миссиях">' + icon('info', 19) + '</button>'
      }) +
      '<div class="page__body">' +
        '<div class="missions-hero">' +
          '<div class="missions-hero__glow" aria-hidden="true"></div>' +
          '<div class="missions-hero__head"><span class="kicker kicker--light">Обучение Moby</span><img src="assets/img/whale-hero.svg" alt="" class="missions-hero__whale"></div>' +
          '<h2>' + (isParent ? 'Учимся на реальных данных' : 'Твоя следующая миссия') + '</h2>' +
          '<p>' + (isParent ? 'Moby превращает реальные траты и цели детей в короткие игры. Родитель видит прогресс, ребёнок — смысл.' : 'Короткие задания о деньгах, безопасности и привычках. Без скучных лекций.') + '</p>' +
          '<div class="missions-stats">' +
            '<div><b>' + doneTotal + '</b><span>миссий пройдено</span></div>' +
            '<div><b>' + points + '</b><span>баллов Moby</span></div>' +
            '<div><b>' + person.streak + '</b><span>дней в серии</span></div>' +
          '</div>' +
          (isParent ? '<div class="mission-select">' +
            '<button class="' + (selectedId === 'masha' ? 'is-active' : '') + '" type="button" data-action="navigate" data-to="missions" data-param="masha">' + avatar('masha', 24) + 'Маша</button>' +
            '<button class="' + (selectedId === 'alex' ? 'is-active' : '') + '" type="button" data-action="navigate" data-to="missions" data-param="alex">' + avatar('alex', 24) + 'Алекс</button>' +
          '</div>' : '') +
        '</div>' +
        (isParent ? '<p class="demo-note">' + icon('info', 13) + 'Демо-прохождение идёт за ' + person.name + '. В продукте миссии открываются в детском профиле.</p>' : '') +

        '<button class="featured-mission" type="button" data-action="open-mission" data-mission="' + featured.id + '" data-child="' + selectedId + '">' +
          '<span class="featured-mission__top"><span class="mission-cat">' + icon(featured.icon, 15) + esc(featured.category) + '</span><span class="featured-mission__time">' + featured.duration + ' мин</span></span>' +
          '<span class="featured-mission__title">' + esc(featured.title) + '</span>' +
          '<span class="featured-mission__text">' + esc(featured.lead) + '</span>' +
          '<span class="featured-mission__bottom"><span class="featured-mission__points">+' + featured.points + ' баллов Moby</span><span class="featured-mission__play">Пройти ' + icon('play', 13) + '</span></span>' +
        '</button>' +

        '<section class="section">' +
          sectionHead('Все миссии', '<span class="head-hint">' + doneTotal + ' из 12</span>') +
          '<div class="mission-list">' + D.missions.map(function (mission) {
            var isDone = done.indexOf(mission.id) !== -1;
            return '<button class="mission-row mission-row--' + mission.tone + ' ' + (isDone ? 'is-done' : '') + '" type="button" data-action="open-mission" data-mission="' + mission.id + '" data-child="' + selectedId + '">' +
              '<span class="mission-row__icon">' + icon(mission.icon, 21) + '</span>' +
              '<span class="mission-row__body"><span class="mission-row__cat">' + esc(mission.category) + ' · ' + mission.duration + ' мин</span><b>' + esc(mission.title) + '</b><span class="mission-row__text">' + esc(mission.lead) + '</span></span>' +
              '<span class="mission-row__right">' + (isDone ? '<i class="mission-done-tick">' + icon('check', 13) + '</i>' : '<i class="mission-points">+' + mission.points + '</i>') + '<span>' + (isDone ? 'Пройдено' : 'Начать') + '</span></span>' +
              '</button>';
          }).join('') + '</div>' +
        '</section>' +

        '<div class="mission-locked">' +
          '<span class="mission-locked__icon">' + icon('lock', 18) + '</span>' +
          '<span><b>Скоро: Инфляция и мороженое</b><i>Новая миссия откроется в ноябре</i></span>' +
          '<span class="mission-locked__chip">Уровень 2</span>' +
        '</div>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* QR / sharing                                                        */
  /* ------------------------------------------------------------------ */

  function renderQR(param) {
    var isParent = state.role === 'parent';
    var allowed = isParent ? ['app', 'gift', 'invite'] : ['app', 'gift'];
    var tab = allowed.indexOf(param) !== -1 ? param : (allowed.indexOf(ui.qrTab) !== -1 ? ui.qrTab : (isParent ? 'app' : 'gift'));
    ui.qrTab = tab;
    var giftChildId = (state.role === 'masha' || state.role === 'alex')
      ? state.role
      : (['masha', 'alex'].indexOf(state.activeChild) !== -1 ? state.activeChild : 'masha');
    var giftChild = childFor(giftChildId);
    var urls = MF.shareUrls();
    var content = {
      app: {
        title: 'Семейный банкинг в одном QR',
        text: 'Наведите камеру телефона — Moby Family откроется в браузере. Установка не нужна.',
        url: urls.app,
        eyebrow: 'PWA · демо',
        linkLabel: 'Скопировать ссылку на демо'
      },
      gift: {
        title: 'Подарить ' + dativeName(giftChild.name) + ' без Moby',
        text: 'Бабушке или дедушке не нужно приложение. По ссылке — сумма, сообщение и банка «Коплю».',
        url: MF.urlWith({ gift: giftChild.id, source: 'qr' }),
        eyebrow: 'Близкие · без установки',
        linkLabel: 'Скопировать ссылку-подарок'
      },
      invite: {
        title: 'Пригласить ребёнка в семью',
        text: 'Ребёнок скачает Moby и войдёт по приглашению. Вход защищён биометрией или ПИН-кодом.',
        url: urls.invite,
        eyebrow: 'Семья · приглашение',
        linkLabel: 'Скопировать приглашение'
      }
    }[tab];

    var qrCode = '<div class="qr-screen__code" data-qr-url="' + esc(content.url) + '" data-qr-logo="true"></div>';
    var host = window.location.hostname;
    var isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    var localLan = isLocalHost && !!window.__MOBY_LAN_URL__;
    var isLocalNoLan = (window.location.protocol === 'file:' || (isLocalHost && !window.__MOBY_LAN_URL__));

    return '<section class="screen page page--qr">' +
      subHeader('Поделиться', { eyebrow: 'Moby Family' }) +
      '<div class="page__body">' +
        '<div class="segmented segmented--3">' +
          '<button class="' + (tab === 'app' ? 'is-active' : '') + '" type="button" data-action="qr-tab" data-tab="app">Приложение</button>' +
          '<button class="' + (tab === 'gift' ? 'is-active' : '') + '" type="button" data-action="qr-tab" data-tab="gift">Подарок</button>' +
          (isParent ? '<button class="' + (tab === 'invite' ? 'is-active' : '') + '" type="button" data-action="qr-tab" data-tab="invite">Приглашение</button>' : '') +
        '</div>' +
        '<div class="qr-screen">' +
          '<div class="qr-screen__head"><span class="kicker kicker--red"><i></i>' + content.eyebrow + '</span><span class="qr-screen__logo">' + brandMarkup('brand--ink') + '</span></div>' +
          '<h2>' + content.title + '</h2>' +
          '<p>' + content.text + '</p>' +
          '<div class="qr-screen__stage"><span class="qr-corner qr-corner--tl"></span><span class="qr-corner qr-corner--tr"></span><span class="qr-corner qr-corner--bl"></span><span class="qr-corner qr-corner--br"></span>' + qrCode + '</div>' +
          '<div class="qr-screen__link"><span data-qr-link="' + esc(content.url) + '">' + esc(MF.prettyUrl(content.url)) + '</span><button class="mini-icon" type="button" data-action="copy-link" data-url="' + esc(content.url) + '" aria-label="Скопировать">' + icon('copy', 16) + '</button></div>' +
          '<button class="btn btn--red btn--block" type="button" data-action="copy-link" data-url="' + esc(content.url) + '">' + icon('copy', 16) + content.linkLabel + '</button>' +
          (tab === 'gift' && isParent ?
            '<div class="qr-gift-children">' +
              '<button class="' + (giftChildId === 'masha' ? 'is-active' : '') + '" type="button" data-action="select-gift-child" data-child="masha">' + avatar('masha', 26) + 'Маша</button>' +
              '<button class="' + (giftChildId === 'alex' ? 'is-active' : '') + '" type="button" data-action="select-gift-child" data-child="alex">' + avatar('alex', 26) + 'Алекс</button>' +
              '<button class="qr-gift-open" type="button" data-action="open-gift" data-child="' + giftChildId + '">Открыть страницу подарка ' + icon('arrow-up-right', 13) + '</button>' +
            '</div>' : '') +
          (tab === 'gift' && !isParent ?
            '<div class="qr-gift-children qr-gift-children--single"><span>Подарок получит ' + giftChild.name + '</span><button class="qr-gift-open" type="button" data-action="open-gift" data-child="' + giftChildId + '">Открыть страницу подарка ' + icon('arrow-up-right', 13) + '</button></div>' : '') +
          (tab === 'app' ?
            '<div class="qr-features"><span>' + icon('camera', 15) + 'Камерой телефона</span><span>' + icon('install', 15) + 'Можно установить</span><span>' + icon('shield', 15) + 'Работает офлайн</span></div>' : '') +
        '</div>' +
        (localLan ? '<p class="qr-wifi-note">' + icon('wifi', 14) + 'Телефон и ноутбук должны быть в одной Wi-Fi сети.</p>' : '') +
        (isLocalNoLan ? '<p class="qr-note">' + icon('info', 14) + 'Для сканирования с телефона запустите <b>npm start</b> и откройте демо по сетевому адресу — QR подставится автоматически.</p>' : '') +
        (tab === 'app' ?
          '<div class="install-banner">' +
            '<span class="install-banner__icon">' + icon('install', 23) + '</span>' +
            '<span><b>Сохранить на экран «Домой»</b><i>Moby Family откроется как приложение и будет работать офлайн</i></span>' +
            '<button class="btn btn--red btn--xs" type="button" data-install>Установить</button>' +
          '</div>' : '') +
        '<p class="qr-legal">Демо-ссылка. Все данные вымышлены. В продукте ссылки подписываются и действуют ограниченное время.</p>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* More                                                                */
  /* ------------------------------------------------------------------ */

  function renderMore() {
    var person = currentPerson();
    var isParent = state.role === 'parent';
    var version = String(window.MOBY_CONFIG.version || '').replace(/-demo$/, '');
    return '<section class="screen page page--more">' +
      subHeader('Ещё', { eyebrow: 'Профиль и настройки' }) +
      '<div class="page__body">' +
        '<div class="profile-card">' +
          '<div class="profile-card__pattern" aria-hidden="true"></div>' +
          '<div class="profile-card__avatar">' + avatar(person.avatar || 'anna', 58) + '<span>' + (state.role === 'adult' ? '18+' : isParent ? 'owner' : 'kid') + '</span></div>' +
          '<div class="profile-card__text"><span class="kicker kicker--light">' + roleLabel(state.role) + '</span><h2>' + person.fullName + '</h2><p>' + (isParent ? 'Владелец семейного пакета' : person.stageLabel || 'Участник семьи') + '</p></div>' +
          '<button class="btn btn--glass btn--xs" type="button" data-action="role-sheet">Сменить роль</button>' +
        '</div>' +

        (isParent ? '<section class="section package-section" id="packageBlock">' +
          sectionHead('Пакет') +
          '<article class="package-card">' +
            '<div class="package-card__head">' +
              '<div><span class="kicker kicker--light">Подключён сейчас</span><h2>Moby Family</h2><p>Семейный пакет · Маша и Алекс</p></div>' +
              '<span class="badge-glass"><i class="dot dot--green"></i>активен</span>' +
            '</div>' +
            '<div class="package-card__price"><strong>' + fmt(D.family.currentPrice) + '</strong><span>BYN / месяц</span></div>' +
            '<div class="package-card__stats">' +
              '<div><b>2</b><span>ребёнка</span></div>' +
              '<div><b>2 из 3</b><span>условий</span></div>' +
              '<div><b>1 ноя</b><span>списание</span></div>' +
            '</div>' +
            '<div class="package-card__bar"><span style="width:66%"></span></div>' +
            '<div class="package-card__chips"><span>Оборот по карте</span><span>Остаток или цель</span><span>Миссия</span></div>' +
            '<div class="package-card__foot"><span>Следующее списание ' + D.family.nextCharge + '</span><button class="package-card__all" type="button" aria-disabled="true">Все пакеты ' + icon('chevron-right', 12) + '</button></div>' +
          '</article>' +
        '</section>' : '') +

        '<div class="more-menu">' +
          moreRow('id-card', 'Персональные данные', 'blue', 'data-action="demo-info" data-title="Персональные данные"') +
          moreRow('document', 'Документы', 'blue', 'data-action="demo-info" data-title="Документы"') +
          moreRow('bell', 'Уведомления', 'blue', 'data-action="notifications"') +
          moreRow('currency', 'Курсы валют', 'blue', 'data-action="demo-info" data-title="Курсы валют"') +
          moreRow('star', 'Манички. Вход в программу приятностей', 'white', 'data-action="demo-info" data-title="Манички"') +
          moreRow('refresh', 'Обменник Moby', 'pink', 'data-action="demo-info" data-title="Обменник Moby"') +
          moreRow('pin', 'Банк на карте', 'blue', 'data-action="demo-info" data-title="Банк на карте"') +
          moreRow('bank', 'О банке', 'blue', 'data-action="demo-info" data-title="О банке"') +
          moreRow('shield', 'Ваша безопасность', 'blue', 'data-action="open-sheet" data-sheet="legal"') +
        '</div>' +

        '<div class="more-version">Версия приложения ' + esc(version) + '</div>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  function moreRow(ic, title, tone, attrs) {
    return '<button class="more-row" type="button" ' + (attrs || '') + '>' +
      '<span class="more-row__icon more-row__icon--' + (tone || 'blue') + '">' + icon(ic, 20) + '</span>' +
      '<span class="more-row__title">' + title + '</span>' +
      icon('chevron-right', 16) +
      '</button>';
  }

  /* ------------------------------------------------------------------ */
  /* Child detail                                                        */
  /* ------------------------------------------------------------------ */

  function renderChildDetail(childId) {
    var person = childFor(childId);
    if (childId !== 'masha' && childId !== 'alex') person = childFor(state.activeChild);
    var limit = state.limits[person.id] || person.limit;
    var limitPct = pct(limit.spent == null ? person.limit.spent : limit.spent, limit.weekly);
    var isTeen = person.stage === 'teen';
    var legalTitle = isTeen ? 'Собственный счёт подростка' : 'Субсчёт к счёту родителя';
    var legalText = isTeen ? 'Ст. 25 ГК РБ в редакции с 19.11.2024: базовые условия доступны с 14 лет без согласия родителя на каждую операцию.' : 'Инструкция НБ № 34, п. 17: владелец счёта — родитель, ребёнок — пользователь.';
    return '<section class="screen page page--child">' +
      subHeader(person.name + ', ' + person.age, {
        eyebrow: isTeen ? 'Подросток · свой счёт' : 'Ребёнок · субсчёт',
        action: '<button class="icon-btn icon-btn--soft" type="button" data-action="open-limits" data-child="' + person.id + '" aria-label="Правила">' + icon('ruler', 19) + '</button>'
      }) +
      '<div class="page__body">' +
        '<div class="child-profile">' +
          '<div class="child-profile__top">' +
            '<span class="child-profile__avatar">' + avatar(person.avatar, 54) + '</span>' +
            '<span class="child-profile__id"><b>' + person.fullName + '</b><span>' + (isTeen ? 'Свой счёт с 14 лет' : 'Базовый профиль') + '</span></span>' +
            stageBadge(person) +
          '</div>' +
          '<div class="child-profile__balance"><span>Баланс</span><strong>' + fmt(person.balance) + ' <small>BYN</small></strong></div>' +
          '<div class="child-pockets">' +
            '<span><i>Трачу</i><b>' + fmt(person.pockets.spend) + '</b></span>' +
            '<span><i>Коплю</i><b>' + fmt(person.pockets.save) + '</b></span>' +
            '<span><i>Делюсь</i><b>' + fmt(person.pockets.share) + '</b></span>' +
          '</div>' +
          '<div class="child-profile__actions">' +
            '<button type="button" data-action="navigate" data-to="cards" data-param="' + person.id + '">' + icon('card', 16) + (isTeen ? 'Карта' : 'Браслет') + '</button>' +
            '<button type="button" data-action="open-limits" data-child="' + person.id + '">' + icon('ruler', 16) + 'Правила</button>' +
            '<button type="button" data-action="switch-role" data-role="' + person.id + '">' + icon('eye', 16) + 'Открыть</button>' +
          '</div>' +
        '</div>' +

        '<div class="legal-strip"><span>' + icon(isTeen ? 'shield' : 'info', 18) + '</span><div><b>' + legalTitle + '</b><p>' + legalText + '</p></div></div>' +

        '<section class="section">' + goalCard(person, { label: 'Цель' }) + seriesBanner(person) + '</section>' +

        '<section class="section">' +
          sectionHead('Родительские правила', linkButton('Изменить', 'open-limits', 'data-child="' + person.id + '"')) +
          '<div class="rules-summary">' +
            '<div class="rules-summary__head"><span class="rules-summary__icon">' + icon('ruler', 18) + '</span><span><b>' + fmtInt(limit.weekly) + ' BYN в неделю</b><i>' + (isTeen ? 'Правила вместо разрешений' : 'Лимит и категории') + '</i></span><span>' + fmt(limit.spent == null ? person.limit.spent : limit.spent) + ' / ' + fmtInt(limit.weekly) + '</span></div>' +
            '<span class="limit-bar"><i style="width:' + limitPct + '%"></i></span>' +
            '<div class="rules-summary__tags"><span class="' + (limit.online ? 'is-on' : '') + '">Онлайн ' + (limit.online ? 'до ' + fmtInt(limit.online) + ' BYN' : 'выкл') + '</span><span class="' + (limit.transfers ? 'is-on' : '') + '">Переводы ' + (limit.transfers ? 'разрешены' : 'выкл') + '</span><span class="' + (limit.cash ? 'is-on' : '') + '">Наличные ' + (limit.cash ? 'да' : 'выкл') + '</span></div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          sectionHead('Миссии и серия') +
          '<button class="progress-card" type="button" data-action="navigate" data-to="missions" data-param="' + person.id + '">' +
            '<span class="progress-card__icon">' + icon('sparkles', 21) + '</span>' +
            '<span class="progress-card__text"><b>' + doneCount(person) + ' из 12 миссий</b><span>Следующая: «Снеки против цели»</span></span>' +
            '<span class="progress-card__streak">' + icon('flame', 14) + person.streak + '</span>' +
          '</button>' +
        '</section>' +

        '<section class="section">' +
          sectionHead('Операции') +
          '<div class="tx-card">' + D.transactions[person.id].map(txRow).join('') + '</div>' +
        '</section>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Limits                                                              */
  /* ------------------------------------------------------------------ */

  function renderLimits(childId) {
    var editable = state.role === 'parent';
    var targetId = ['masha', 'alex'].indexOf(childId) !== -1 ? childId : (['masha', 'alex'].indexOf(state.activeChild) !== -1 ? state.activeChild : 'masha');
    if (!editable && (state.role === 'masha' || state.role === 'alex')) targetId = state.role;
    var person = childFor(targetId);
    var limit = state.limits[targetId] || person.limit;
    var spent = person.limit.spent;
    var remaining = Math.max(0, limit.weekly - spent);
    var isTeen = person.stage === 'teen';
    var onlineOn = Number(limit.online) > 0;
    var cashOn = Number(limit.cash) > 0;
    var transfersOn = !!limit.transfers;
    var ruleRow = function (ic, title, subtitle, rule, on) {
      return '<button class="rule-row" type="button" ' + (editable ? 'data-action="toggle-rule" data-rule="' + rule + '"' : 'disabled') + ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="rule-row__icon">' + icon(ic, 18) + '</span>' +
        '<span class="rule-row__text"><b>' + title + '</b><i>' + subtitle + '</i></span>' +
        '<span class="switch ' + (on ? 'is-on' : '') + '"><i></i></span>' +
        '</button>';
    };
    return '<section class="screen page page--limits">' +
      subHeader('Правила для ' + genitiveName(person.name), {
        eyebrow: editable ? 'Родительский контроль' : 'Твои правила',
        back: editable ? 'child/' + person.id : 'home'
      }) +
      '<div class="page__body">' +
        '<div class="limits-hero">' +
          '<div class="limits-hero__person">' + avatar(person.avatar, 46) + '<div><b>' + person.name + ', ' + person.age + '</b><span>' + stageBadge(person) + '</span></div><span class="limits-hero__round">' + (isTeen ? 'ст. 25' : 'НБ №34') + '</span></div>' +
          '<div class="limits-hero__value"><strong data-range-output="limitRange">' + fmtInt(limit.weekly) + '</strong><span>BYN в неделю</span></div>' +
          '<p>' + (isTeen ? 'У Алекса свой счёт. Эти правила — не разрешения, а рамка, о которой договорилась семья.' : 'Лимит и категории помогают Маше учиться тратить безопасно. Изменения применяются сразу.') + '</p>' +
        '</div>' +
        '<div class="limits-slider">' +
          '<div class="limits-slider__labels"><span>Лимит на неделю</span><b><span data-range-output="limitRange">' + fmtInt(limit.weekly) + '</span> BYN</b></div>' +
          '<input id="limitRange" class="range" type="range" min="10" max="200" step="5" value="' + limit.weekly + '" ' + (editable ? '' : 'disabled') + ' aria-label="Недельный лимит">' +
          '<div class="range-ticks"><span>10</span><span>50</span><span>100</span><span>150</span><span>200</span></div>' +
          '<div class="limit-usage"><span>Потрачено ' + fmt(spent) + ' BYN</span><span>Осталось <b>' + fmt(remaining) + ' BYN</b></span></div>' +
          '<div class="limit-usage__bar"><span style="width:' + pct(spent, limit.weekly) + '%"></span></div>' +
        '</div>' +
        '<div class="rules-card">' +
          ruleRow('bag', 'Покупки в интернете', onlineOn ? 'До ' + fmtInt(limit.online) + ' BYN в неделю' : 'Отключены', 'online', onlineOn) +
          ruleRow('card', 'Снятие наличных', cashOn ? 'До ' + fmtInt(limit.cash) + ' BYN в неделю' : 'Отключено', 'cash', cashOn) +
          ruleRow('send', 'Переводы друзьям', transfersOn ? 'Разрешены в пределах лимита' : 'Только внутри семьи', 'transfers', transfersOn) +
          '<div class="rule-row rule-row--static"><span class="rule-row__icon">' + icon('bell', 18) + '</span><span class="rule-row__text"><b>Уведомления родителю</b><i>Каждая операция и запрос</i></span><span class="switch is-on is-locked"><i></i></span></div>' +
        '</div>' +
        '<div class="hint-card">' +
          '<span class="hint-card__icon">' + icon('sparkles', 18) + '</span>' +
          '<div><b>Moby подсказывает</b><p>По PISA самостоятельность + обсуждение трат дают +30 баллов финграмотности. Попробуйте расширить лимит и включить миссию про онлайн-покупки.</p></div>' +
        '</div>' +
        (editable ?
          '<button class="btn btn--red btn--block save-limits" type="button" data-action="save-limits" data-child="' + person.id + '">Сохранить правила</button>' :
          '<button class="btn btn--soft btn--block" type="button" data-action="request-limit">Попросить маму изменить</button>') +
        '<p class="sheet__note page-note">' + icon('lock', 13) + 'Изменения сохраняются в демо-состоянии. В продукте — с подтверждением родителя по биометрии.</p>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Savings                                                             */
  /* ------------------------------------------------------------------ */

  function renderSavings() {
    var person = currentPerson();
    var isAdult = state.role === 'adult';
    var goal = person.goal || { name: 'Резервный фонд', target: 1000, saved: person.pockets.save, rate: 4.4 };
    var saved = isAdult ? person.pockets.save : goal.saved;
    var progress = pct(saved, goal.target);
    var left = state.freezes[person.id] == null ? 1 : state.freezes[person.id];
    return '<section class="screen page page--savings">' +
      subHeader('Копилка', { eyebrow: isAdult ? 'Взрослый Moby' : 'Цель и серия', back: 'home' }) +
      '<div class="page__body">' +
        '<div class="savings-hero">' +
          '<div class="savings-hero__glow" aria-hidden="true"></div>' +
          '<div class="savings-hero__head"><span class="kicker kicker--light">' + (isAdult ? 'Мои накопления' : 'Моя цель') + '</span><span class="flame-pill">' + icon('flame', 15) + person.streak + '</span></div>' +
          '<div class="savings-hero__main">' +
            goalRing(progress, isAdult ? 'blue' : '') +
            '<div><h2>' + esc(goal.name) + '</h2><strong>' + fmt(saved) + ' <small>из ' + fmt(goal.target) + ' BYN</small></strong><p>Осталось ' + fmt(Math.max(0, goal.target - saved)) + ' BYN</p></div>' +
          '</div>' +
          '<div class="savings-hero__rate"><span>' + icon('chart', 15) + 'Ставка <b>' + goal.rate.toString().replace('.', ',') + '%</b> годовых</span><span>+0,5% за серию</span></div>' +
          '<button class="btn btn--red btn--block" type="button" data-action="open-topup" data-child="' + person.id + '" data-pocket="save">Пополнить копилку ' + icon('plus', 15) + '</button>' +
        '</div>' +
        '<article class="series-full">' +
          '<div class="series-full__head"><div><span class="kicker kicker--red">Серия накоплений</span><h3>' + person.streak + ' ' + plural(person.streak, ['день', 'дня', 'дней']) + ' подряд</h3></div><span class="flame-pill flame-pill--light">' + icon('flame', 15) + '+' + (0.5).toString().replace('.', ',') + '%</span></div>' +
          weekStrip(true) +
          '<div class="series-full__foot"><span>Пополняй копилку каждый день — ставка растёт.</span><button class="freeze-btn freeze-btn--large" type="button" data-action="freeze-streak" data-child="' + person.id + '" ' + (left ? '' : 'disabled') + '>' + icon('snowflake', 15) + 'Заморозка · ' + left + '</button></div>' +
        '</article>' +
        '<section class="section">' +
          sectionHead('Как растёт ставка') +
          '<div class="rate-ladder">' +
            '<div class="rate-row"><span>Базовая ставка</span><b>3,0%</b></div>' +
            '<div class="rate-row is-active"><span>Серия 7+ дней</span><b>+0,5%</b></div>' +
            '<div class="rate-row"><span>Цель выполнена</span><b>+0,5%</b></div>' +
            '<p>Ставка пересчитывается каждый день. Одна заморозка в квартал сохраняет серию, если пропустил пополнение.</p>' +
          '</div>' +
        '</section>' +
        '<section class="section">' +
          sectionHead('Пополнения') +
          '<div class="tx-card">' +
            '<div class="tx-row"><span class="tx-icon tx-icon--red">' + icon('plus', 17) + '</span><span class="tx-main"><b>Автопополнение</b><span>Каждое воскресенье · 5 BYN</span></span><span class="tx-amount is-positive">+5,00 <small>BYN</small></span></div>' +
            '<div class="tx-row"><span class="tx-icon tx-icon--blue">' + icon('gift', 17) + '</span><span class="tx-main"><b>Подарок от бабушки</b><span>В «Коплю» · 12 октября</span></span><span class="tx-amount is-positive">+10,00 <small>BYN</small></span></div>' +
            '<div class="tx-row"><span class="tx-icon tx-icon--sand">' + icon('sparkles', 17) + '</span><span class="tx-main"><b>Бонус за серию</b><span>Ставка +0,5% · 1 октября</span></span><span class="tx-amount is-positive">+0,42 <small>BYN</small></span></div>' +
          '</div>' +
        '</section>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Cards & wearable                                                    */
  /* ------------------------------------------------------------------ */

  function renderCards(param) {
    var id = ['masha', 'alex', 'mashaAdult'].indexOf(param) !== -1 ? param : (state.role === 'parent' ? (state.activeChild || 'masha') : state.role === 'adult' ? 'mashaAdult' : state.role);
    if (id === 'parent') id = 'masha';
    var person = D.people[id] || D.people.masha;
    var isAdult = id === 'mashaAdult';
    var isTeen = person.stage === 'teen' || isAdult;
    var cardLast = { masha: '2207', alex: '4417', mashaAdult: '9914' }[id] || '2207';
    var translit = { masha: 'M. SOKOLOVA', alex: 'A. SOKOLOV', mashaAdult: 'M. SOKOLOVA' }[id];
    return '<section class="screen page page--cards">' +
      subHeader('Карты и браслеты', { eyebrow: 'Один SKU на возраст' }) +
      '<div class="page__body">' +
        '<div class="carrier-toggle">' +
          '<button class="' + (!isTeen ? 'is-active' : '') + '" type="button" data-action="navigate" data-to="cards" data-param="masha">' + avatar('masha', 25) + 'Маша · 12</button>' +
          '<button class="' + (isTeen && !isAdult ? 'is-active' : '') + '" type="button" data-action="navigate" data-to="cards" data-param="alex">' + avatar('alex', 25) + 'Алекс · 16</button>' +
        '</div>' +
        '<div class="bank-card bank-card--' + (id === 'alex' ? 'blue' : id === 'mashaAdult' ? 'adult' : 'red') + '">' +
          '<div class="bank-card__pattern" aria-hidden="true"></div>' +
          '<div class="bank-card__top"><span class="bank-card__brand">moby <i>family</i></span><span class="bank-card__contactless">' + icon('wifi', 18) + '</span></div>' +
          '<div class="bank-card__chip"><i></i><i></i><i></i></div>' +
          '<div class="bank-card__number">•••• &nbsp;•••• &nbsp;•••• &nbsp;' + cardLast + '</div>' +
          '<div class="bank-card__bottom"><span><b>' + translit + '</b><i>' + (isAdult ? 'ADULT' : isTeen ? 'TEEN' : 'FAMILY') + '</i></span><span class="bank-card__mir">MIR</span></div>' +
        '</div>' +
        '<div class="carrier-caption"><span>' + (isTeen ? 'Moby Card' : 'Moby Band + карта по требованию') + '</span><span class="carrier-status"><i></i>активна</span></div>' +
        (!isTeen ?
        '<div class="band-card">' +
          '<div class="band-visual" aria-hidden="true"><span class="band-visual__strap"></span><span class="band-visual__module"><img src="assets/icons/icon.svg" alt=""></span><span class="band-visual__strap band-visual__strap--b"></span></div>' +
          '<div class="band-card__text"><span class="kicker kicker--red">Moby Band</span><h3>Браслет, который не теряется</h3><p>Пассивный NFC без зарядки. Для детей 7–13 лет — на руке, а не в рюкзаке.</p><div class="band-chips"><span>без зарядки</span><span>NFC</span><span>один SKU</span></div></div>' +
        '</div>' : '') +
        '<div class="carrier-actions">' +
          '<button class="btn btn--red btn--block" type="button" data-action="order-carrier" data-type="' + (isTeen ? 'card' : 'band') + '">' + icon('plus', 16) + (isTeen ? 'Заказать карту' : 'Выпустить браслет') + '</button>' +
          '<button class="btn btn--soft btn--block" type="button" data-action="order-carrier" data-type="pin">' + icon('lock', 15) + 'ПИН-код и безопасность</button>' +
        '</div>' +
        '<section class="section">' +
          sectionHead('Почему так') +
          '<div class="cards-feature-grid">' +
            '<div><span>' + icon('shield', 19) + '</span><b>Безопасно</b><i>NFC-браслет без экрана и зарядки</i></div>' +
            '<div><span>' + icon('users', 19) + '</span><b>По возрасту</b><i>Карта по требованию с 10 / 14 лет</i></div>' +
            '<div><span>' + icon('wallet', 19) + '</span><b>Один SKU</b><i>Проще логистика и поддержка банка</i></div>' +
            '<div><span>' + icon('ruler', 19) + '</span><b>Под правилами</b><i>Лимиты и уведомления в Moby</i></div>' +
          '</div>' +
        '</section>' +
        '<div class="legal-strip"><span>' + icon('info', 18) + '</span><div><b>' + (isTeen ? 'Карта на имя подростка' : 'Браслет на имя ребёнка') + '</b><p>В демо выпуск не подключён к реальной логистике. В продукте — заказ из Moby и доставка курьером.</p></div></div>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Age ladder                                                          */
  /* ------------------------------------------------------------------ */

  function stageRightsMarkup(stage) {
    return stage.rights.map(function (right) {
      return '<li>' + icon('check', 14) + '<span>' + esc(right) + '</span></li>';
    }).join('');
  }

  function ageStageFor(age) {
    if (age >= 18) return D.stages[2];
    if (age >= 14) return D.stages[1];
    return D.stages[0];
  }

  function renderAge() {
    var age = Number(state.agePreview) || 12;
    if (age < 7 || age > 18) age = 12;
    var stage = ageStageFor(age);
    return '<section class="screen page page--age">' +
      subHeader('Возрастная лестница', { eyebrow: 'Права открываются возрастом' }) +
      '<div class="page__body">' +
        '<div class="age-hero">' +
          '<div class="age-hero__pattern" aria-hidden="true"></div>' +
          '<span class="kicker kicker--light">Симулятор · Маша</span>' +
          '<div class="age-hero__age"><strong id="ageValue">' + age + '</strong><span>лет</span></div>' +
          '<p class="age-hero__stage" id="ageStageName">' + stage.title + '</p>' +
          '<div class="age-slider-wrap">' +
            '<input id="ageSlider" class="range range--age" type="range" min="7" max="18" step="1" value="' + age + '" aria-label="Возраст Маши">' +
            '<div class="range-ticks"><span>7</span><span>14</span><span>18</span></div>' +
          '</div>' +
          '<div class="age-stage-chips">' +
            D.stages.map(function (s, i) {
              return '<button class="' + (s.id === stage.id ? 'is-active' : '') + '" type="button" data-action="set-age" data-age="' + (i === 0 ? 10 : i === 1 ? 15 : 18) + '">' + s.age + '<span>' + s.short + '</span></button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="age-detail" id="ageDetail">' +
          '<div class="age-detail__head"><span class="stage-badge stage-badge--' + (stage.id === 'teen' ? 'teen' : stage.id === 'adult' ? 'adult' : 'base') + '" id="ageBadge">' + stage.badge + '</span><span class="age-detail__law" id="ageLaw">' + stage.law + '</span></div>' +
          '<p class="age-detail__lead" id="ageLead">' + stage.lead + '</p>' +
          '<ul class="age-rights" id="ageRights">' + stageRightsMarkup(stage) + '</ul>' +
          '<div class="age-notes"><div><b>Родитель</b><span id="ageParentNote">' + stage.parent + '</span></div><div><b>' + (stage.id === 'adult' ? 'Человек' : 'Ребёнок') + '</b><span id="ageChildNote">' + stage.child + '</span></div></div>' +
          '<div id="ageCta">' + (stage.id === 'adult' ? '<button class="btn btn--red btn--block" type="button" data-action="open-adult">Открыть взрослый Moby ' + icon('arrow-right', 16) + '</button>' : '<p class="age-hint">' + icon('sparkles', 15) + 'Продолжайте двигать ползунок — права откроются автоматически.</p>') + '</div>' +
        '</div>' +
        '<section class="section">' +
          sectionHead('Три этапа') +
          '<div class="stage-list">' + D.stages.map(function (s, i) {
            return '<button class="stage-card ' + (s.id === stage.id ? 'is-current' : '') + '" type="button" data-action="set-age" data-age="' + (i === 0 ? 10 : i === 1 ? 15 : 18) + '" data-stage-card="' + s.id + '">' +
              '<span class="stage-card__age">' + s.age + '</span>' +
              '<span class="stage-card__body"><b>' + s.short + '</b><i>' + s.title + '</i></span>' +
              '<span class="stage-card__law">' + s.law + '</span>' +
              '</button>';
          }).join('') + '</div>' +
        '</section>' +
        '<div class="age-legal-note">' + icon('shield', 16) + 'Юридическая логика: субсчёт по Инструкции НБ №34, собственный счёт с 14 лет по ст. 25 ГК РБ, автопереход в 18. Демо-формулировки упрощены.</div>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* About page                                                          */
  /* ------------------------------------------------------------------ */

  function renderAbout() {
    return '<section class="screen page page--about">' +
      subHeader('О проекте', { eyebrow: 'Moby Family' }) +
      '<div class="page__body">' +
        '<div class="about-page-hero">' +
          '<img src="assets/img/whale-hero.svg" alt="Кит Moby" class="about-page-hero__whale">' +
          '<span class="kicker kicker--light">МТБанк × Space Hackathon</span>' +
          '<h1>Деньги, которые растут вместе с ребёнком</h1>' +
          '<p>Не отдельное детское приложение, а семейный сценарий внутри Moby: от браслета в 7 лет до собственного счёта в 18.</p>' +
          '<button class="btn btn--red btn--sm" type="button" data-action="navigate" data-to="qr">Открыть QR для жюри</button>' +
        '</div>' +
        '<div class="about-page-stats"><div><b>7 → 18</b><span>лет с ребёнком</span></div><div><b>3 банки</b><span>Трачу / Коплю / Делюсь</span></div><div><b>2,99</b><span>BYN за пакет</span></div></div>' +
        '<section class="section">' +
          sectionHead('Что внутри') +
          '<div class="about-pillars">' +
            '<div><span>' + icon('ruler', 19) + '</span><b>Возраст вместо тарифа</b><p>Субсчёт по Инструкции НБ №34, свой счёт с 14 лет по ст. 25 ГК РБ, автопереход в 18.</p></div>' +
            '<div><span>' + icon('wallet', 19) + '</span><b>Три банки</b><p>Автосплит 70/20/10 в момент зачисления. Привычка формируется без ручных переводов.</p></div>' +
            '<div><span>' + icon('sparkles', 19) + '</span><b>Инверсия контроля</b><p>Банк сам предлагает родителю следующий шаг самостоятельности на основе возраста, данных и PISA.</p></div>' +
            '<div><span>' + icon('flame', 19) + '</span><b>Серия как в Duolingo</b><p>Ставка растёт за регулярность. Одна заморозка в квартал, чтобы привычка не ломалась.</p></div>' +
          '</div>' +
        '</section>' +
        '<section class="section">' +
          sectionHead('Экономика') +
          '<div class="econ-card">' +
            '<div class="econ-row"><span>Пакет Moby Family</span><b>2,99 BYN / мес</b></div>' +
            '<div class="econ-row"><span>Второй ребёнок</span><b>−50%</b></div>' +
            '<div class="econ-row"><span>Третий и многодетные</span><b>0 BYN</b></div>' +
            '<div class="econ-row econ-row--accent"><span>Бесплатно при 2 из 3 условий</span><b>оборот · остаток · миссия</b></div>' +
            '<p>К 18 годам МТБанк получает взрослого клиента с историей, продуктами и нулевой стоимостью привлечения.</p>' +
          '</div>' +
        '</section>' +
        '<section class="section">' +
          sectionHead('Демо-сценарии') +
          '<div class="demo-scenarios">' +
            '<button type="button" data-action="switch-role" data-role="parent"><span>' + avatar('anna', 34) + '</span><b>Родитель</b><i>Лимиты, подсказки, семья</i></button>' +
            '<button type="button" data-action="switch-role" data-role="masha"><span>' + avatar('masha', 34) + '</span><b>Маша, 12</b><i>Три банки и цель</i></button>' +
            '<button type="button" data-action="switch-role" data-role="alex"><span>' + avatar('alex', 34) + '</span><b>Алекс, 16</b><i>Свой счёт</i></button>' +
            '<button type="button" data-action="switch-role" data-role="adult"><span>' + avatar('masha', 34) + '</span><b>Маша, 18</b><i>Автопереход</i></button>' +
          '</div>' +
        '</section>' +
        '<button class="btn btn--soft btn--block" type="button" data-action="open-sheet" data-sheet="legal">Юридическая база</button>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Install page                                                        */
  /* ------------------------------------------------------------------ */

  function renderInstallPage() {
    var urls = MF.shareUrls();
    return '<section class="screen page page--install">' +
      subHeader('Установка', { eyebrow: 'PWA · работает офлайн' }) +
      '<div class="page__body">' +
        '<div class="install-page-hero">' +
          '<img src="assets/icons/icon.svg" alt="Иконка Moby Family" class="install-page-hero__icon">' +
          '<span class="kicker kicker--red">Moby Family</span>' +
          '<h1>Приложение в кармане — без магазина</h1>' +
          '<p>Добавьте Moby Family на экран «Домой». Откроется как обычное приложение, сохранит доступ офлайн и будет работать по ссылке.</p>' +
          '<button class="btn btn--red btn--block" type="button" data-install>Установить Moby Family</button>' +
        '</div>' +
        '<div class="install-steps">' +
          '<div><span>1</span><b>Откройте меню браузера</b><p>Три точки в Chrome или «Поделиться» в Safari.</p></div>' +
          '<div><span>2</span><b>Выберите установку</b><p>«Установить приложение» или «На экран Домой».</p></div>' +
          '<div><span>3</span><b>Готово</b><p>Иконка Moby Family появится рядом с другими приложениями.</p></div>' +
        '</div>' +
        '<div class="install-qr"><div data-qr-url="' + esc(urls.app) + '"></div><span><b>Или отсканируйте QR</b><i>Откроется в браузере телефона</i></span></div>' +
        (!window.isSecureContext ? '<p class="qr-legal">Установка PWA работает по HTTPS. Локальное демо по Wi-Fi открывается в браузере без установки.</p>' : '') +
        '<p class="qr-legal">Установка не требует App Store или Google Play. В демо PWA-режим полностью функционален.</p>' +
        '<div class="tabbar-spacer"></div>' +
      '</div>' +
      '</section>';
  }

  function initAgeScreen() {
    var input = document.getElementById('ageSlider');
    if (!input) return;
    initRange('ageSlider');
    updateAgeUi(Number(input.value));
  }

  function updateAgeUi(age) {
    if (!Number.isFinite(age)) return;
    state.agePreview = age;
    saveState();
    var stage = ageStageFor(age);
    var valueEl = document.getElementById('ageValue');
    var stageName = document.getElementById('ageStageName');
    var badge = document.getElementById('ageBadge');
    var law = document.getElementById('ageLaw');
    var lead = document.getElementById('ageLead');
    var rights = document.getElementById('ageRights');
    var parentNote = document.getElementById('ageParentNote');
    var childNote = document.getElementById('ageChildNote');
    var cta = document.getElementById('ageCta');
    if (valueEl) valueEl.textContent = age;
    if (stageName) stageName.textContent = stage.title;
    if (badge) {
      badge.textContent = stage.badge;
      badge.className = 'stage-badge stage-badge--' + (stage.id === 'teen' ? 'teen' : stage.id === 'adult' ? 'adult' : 'base');
    }
    if (law) law.textContent = stage.law;
    if (lead) lead.textContent = stage.lead;
    if (rights) rights.innerHTML = stageRightsMarkup(stage);
    if (parentNote) parentNote.textContent = stage.parent;
    if (childNote) childNote.textContent = stage.child;
    if (cta) cta.innerHTML = stage.id === 'adult'
      ? '<button class="btn btn--red btn--block" type="button" data-action="open-adult">Открыть взрослый Moby ' + icon('arrow-right', 16) + '</button>'
      : '<p class="age-hint">' + icon('sparkles', 15) + 'Продолжайте двигать ползунок — права откроются автоматически.</p>';
    $$('.stage-card').forEach(function (card) {
      card.classList.toggle('is-current', card.getAttribute('data-stage-card') === stage.id);
    });
    $$('.age-stage-chips button').forEach(function (chip) {
      chip.classList.toggle('is-active', (chip.getAttribute('data-age') === String(age)) || (stage.id === 'base' && chip.getAttribute('data-age') === '10') || (stage.id === 'teen' && chip.getAttribute('data-age') === '15') || (stage.id === 'adult' && chip.getAttribute('data-age') === '18'));
    });
    var slider = document.getElementById('ageSlider');
    if (slider && Number(slider.value) !== age) slider.value = age;
  }

  function setAge(age) {
    var slider = document.getElementById('ageSlider');
    if (slider) {
      slider.value = age;
      updateAgeUi(age);
    }
    if (age >= 18) setTimeout(function () { toast('Маше 18 — взрослый счёт готов', { icon: 'sparkles' }); }, 200);
    else if (age >= 14) setTimeout(function () { toast('С 14 лет — собственный счёт', { icon: 'shield' }); }, 200);
  }

  /* ------------------------------------------------------------------ */
  /* Sheets                                                              */
  /* ------------------------------------------------------------------ */

  function openSheet(type, payload) {
    payload = payload || {};
    ui.lastFocus = document.activeElement;
    ui.sheet = { type: type, payload: payload };
    var content = sheetContent(type, payload);
    if (!content) return;
    sheetRoot.innerHTML = '<div class="ui-layer">' +
      '<div class="ui-backdrop" data-action="close-sheet"></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" tabindex="-1" aria-label="' + esc(sheetTitle(type)) + '">' +
        '<div class="sheet__handle"></div>' + content +
      '</div></div>';
    requestAnimationFrame(function () {
      var layer = $('.ui-layer', sheetRoot);
      if (layer) layer.classList.add('is-open');
      var sheet = $('.sheet', sheetRoot);
      if (sheet) sheet.focus({ preventScroll: true });
    });
    refreshDynamicQr();
  }

  function closeSheet() {
    var layer = $('.ui-layer', sheetRoot);
    ui.sheet = null;
    if (!layer) { sheetRoot.innerHTML = ''; return; }
    layer.classList.remove('is-open');
    setTimeout(function () {
      if (!ui.sheet) sheetRoot.innerHTML = '';
    }, 260);
    if (ui.lastFocus && typeof ui.lastFocus.focus === 'function') {
      try { ui.lastFocus.focus({ preventScroll: true }); } catch (err) { /* no-op */ }
    }
    ui.lastFocus = null;
  }

  function sheetTitle(type) {
    return {
      roles: 'Сменить роль', notifications: 'Уведомления', about: 'О проекте', legal: 'Юридическая база',
      install: 'Установить приложение', topup: 'Пополнить', transfer: 'Перевод', pocket: 'Карманы',
      invite: 'Пригласить в семью', member: 'Участник семьи', reset: 'Сбросить демо', gift: 'Ссылка-подарок'
    }[type] || 'Moby Family';
  }

  function sheetHead(title, subtitle) {
    return '<div class="sheet__head"><div>' +
      (subtitle ? '<span class="sheet__eyebrow">' + subtitle + '</span>' : '') +
      '<h2>' + title + '</h2></div>' +
      '<button class="icon-btn icon-btn--soft" type="button" data-action="close-sheet" aria-label="Закрыть">' + icon('close', 20) + '</button></div>';
  }

  function sheetContent(type, data) {
    if (type === 'roles') {
      var roles = [
        { id: 'parent', title: 'Анна, мама', text: 'Семейный счёт, лимиты и миссии', person: 'anna' },
        { id: 'masha', title: 'Маша, 12', text: 'Субсчёт, три банки и своя цель', person: 'masha' },
        { id: 'alex', title: 'Алекс, 16', text: 'Свой счёт и правила вместо разрешений', person: 'alex' },
        { id: 'adult', title: 'Маша, 18', text: 'Взрослый счёт после автоперехода', person: 'mashaAdult' }
      ];
      return sheetHead('Смотреть как', 'Демо-режим') +
        '<div class="role-list">' + roles.map(function (r) {
          var active = state.role === r.id;
          return '<button class="role-row ' + (active ? 'is-active' : '') + '" type="button" data-action="switch-role" data-role="' + r.id + '">' +
            '<span class="role-row__avatar">' + avatar(D.people[r.person].avatar, 44) + '</span>' +
            '<span class="role-row__text"><b>' + r.title + '</b><span>' + r.text + '</span></span>' +
            '<span class="role-row__check">' + (active ? icon('check', 17) : icon('chevron-right', 16)) + '</span>' +
            '</button>';
        }).join('') + '</div>' +
        '<p class="sheet__note">' + icon('lock', 14) + 'В реальном Moby вход и переключение профилей защищены биометрией или ПИН-кодом.</p>' +
        '<button class="sheet__link" type="button" data-action="go-welcome">' + icon('arrow-right', 16) + 'Показать экран входа</button>';
    }

    if (type === 'notifications') {
      return sheetHead('Уведомления') +
        '<div class="notif-list">' +
          notifRow('sparkles', 'red', 'Подсказка для Маши', 'Пора настроить лимит на онлайн-покупки', 'сейчас') +
          notifRow('flame', 'blue', 'Серия накоплений', '12 дней подряд — ставка выросла на 0,5%', '1 ч назад') +
          notifRow('shield', 'green', 'Алекс прошёл миссию', '«Стоп, дроппер!» — +15 баллов Moby', 'вчера') +
        '</div>' +
        '<button class="btn btn--soft btn--block btn--sm" type="button" data-action="navigate" data-to="missions">К миссиям</button>';
    }

    if (type === 'about') {
      return sheetHead('Moby Family', 'МТБанк × Space Hackathon') +
        '<div class="about-hero"><img src="assets/img/whale-hero.svg" alt=""><div><b>Деньги растут вместе с ребёнком</b><span>От первого браслета в 7 лет до собственного счёта в 18.</span></div></div>' +
        '<div class="about-stats"><div><b>7–18</b><span>лет сценария</span></div><div><b>3</b><span>банки внутри</span></div><div><b>2,99</b><span>BYN / месяц</span></div></div>' +
        '<div class="about-copy">' +
          '<h3>Почему это работает</h3>' +
          '<p>Карта и приложение не заканчиваются на детском тарифе. Права открываются возрастом: субсчёт по Инструкции НБ №34, собственный счёт с 14 лет по ст. 25 ГК РБ и автоматический переход во взрослый Moby в 18.</p>' +
          '<h3>Три банки</h3><p>Каждое поступление автоматически делится на «Трачу», «Коплю» и «Делюсь» — 70 / 20 / 10. Ребёнок учится на реальных, но ограниченных суммах.</p>' +
          '<h3>Инверсия контроля</h3><p>Банк сам подсказывает родителю, когда пора расширить самостоятельность: на основе возраста, лимитов и исследований PISA. Это не надзор, а следующий шаг.</p>' +
          '<h3>Экономика</h3><p>2,99 BYN в месяц. Второй ребёнок — 50%, третий и многодетные — бесплатно. Пакет бесплатен при выполнении 2 из 3 условий. Ценность — взрослый клиент в 18 лет с нулевой стоимостью привлечения.</p>' +
        '</div>' +
        '<button class="btn btn--red btn--block btn--sm" type="button" data-action="close-sheet">Продолжить демо</button>';
    }

    if (type === 'legal') {
      return sheetHead('Юридическая база', 'Как это работает в РБ') +
        '<div class="legal-list">' +
          legalRow('7–13 лет', 'Субсчёт к счёту родителя', 'Инструкция НБ № 34, п. 17. Родитель — владелец, ребёнок — пользователь.') +
          legalRow('14–17 лет', 'Собственный счёт подростка', 'Ст. 25 ГК РБ в редакции с 19.11.2024. Базовые условия без обязательного согласия родителя на каждый шаг.') +
          legalRow('18 лет', 'Переход во взрослый счёт', 'Автоматически внутри Moby, без визита в банк и повторной идентификации.') +
        '</div>' +
        '<p class="sheet__note">Демо-прототип. Юридические формулировки упрощены для презентации; продакшн-версия требует согласования с юридическим департаментом МТБанка.</p>';
    }

    if (type === 'install') {
      return sheetHead('Установить Moby Family', 'PWA · без магазина приложений') +
        '<div class="install-art">' + icon('install', 34) + '</div>' +
        '<ol class="steps">' +
          '<li><b>Откройте меню браузера</b><span>Три точки в Chrome или «Поделиться» в Safari.</span></li>' +
          '<li><b>Выберите «Установить приложение»</b><span>Или «На экран Домой» на iPhone.</span></li>' +
          '<li><b>Готово</b><span>Moby Family откроется как обычное приложение и будет работать офлайн.</span></li>' +
        '</ol>' +
        '<button class="btn btn--red btn--block" type="button" data-action="install-native">' + icon('install', 17) + 'Попробовать установить</button>' +
        (!window.isSecureContext ? '<p class="sheet__note">' + icon('info', 14) + 'Установка PWA требует HTTPS. По локальной сети демо работает в браузере без установки. Опубликуйте его на GitHub Pages — и кнопка заработает.</p>' : '') +
        '<p class="sheet__note">Если кнопка недоступна — браузер не поддерживает установку. Демо всё равно работает по ссылке.</p>';
    }

    if (type === 'topup') {
      var childId = data.child || ui.topupChild || 'masha';
      var pocket = data.pocket || ui.topupPocket || 'spend';
      var child = childFor(childId);
      return sheetHead('Пополнить', 'Семейный счёт · ' + fmt(D.family.balance) + ' BYN') +
        '<div class="sheet-child">' + avatar(child.avatar, 44) + '<div><b>' + child.name + ', ' + child.age + '</b><span>' + (pocket === 'save' ? 'В банку «Коплю»' : 'В банку «Трачу»') + '</span></div>' + stageBadge(child) + '</div>' +
        '<div class="amount-chips">' +
          [10, 20, 50, 100].map(function (n) {
            return '<button class="amount-chip ' + (n === 20 ? 'is-selected' : '') + '" type="button" data-action="select-amount" data-amount="' + n + '">' + n + ' <small>BYN</small></button>';
          }).join('') +
        '</div>' +
        '<div class="sheet-row"><span>Списать с семейного счёта</span><b>' + D.family.accountMask + '</b></div>' +
        '<button class="btn btn--red btn--block" type="button" data-action="topup-confirm" data-child="' + child.id + '" data-pocket="' + pocket + '">Пополнить на <span data-amount-label>20 BYN</span></button>' +
        '<p class="sheet__note">В демо деньги не списываются. В продукте пополнение проходит внутри Moby за пару секунд.</p>';
    }

    if (type === 'transfer') {
      return sheetHead('Перевод', 'Внутри Moby Family') +
        '<div class="recipient-row">' +
          '<button class="recipient is-selected" type="button" data-action="pick-recipient" data-name="Маше">' + avatar('masha', 38) + '<span>Маша</span></button>' +
          '<button class="recipient" type="button" data-action="pick-recipient" data-name="Алексу">' + avatar('alex', 38) + '<span>Алекс</span></button>' +
          '<button class="recipient" type="button" data-action="pick-recipient" data-name="Ирине">' + avatar('grandma', 38) + '<span>Ирина</span></button>' +
        '</div>' +
        '<label class="amount-input"><span>Сумма</span><span class="amount-input__field"><input type="text" inputmode="decimal" value="25,00" aria-label="Сумма перевода"><i>BYN</i></span></label>' +
        '<div class="sheet-row"><span>Со счёта</span><b>Семейный · 1 248,50 BYN</b></div>' +
        '<button class="btn btn--red btn--block" type="button" data-action="transfer-confirm">Перевести</button>' +
        '<p class="sheet__note">Перевод внутри семьи — мгновенно и без комиссии.</p>';
    }

    if (type === 'pocket') {
      var pocketPerson = childFor(data.child || state.activeChild);
      var pocketId = data.pocket || 'spend';
      var info = {
        spend: { title: 'Трачу', amount: pocketPerson.pockets.spend, text: 'Деньги на повседневные покупки. Родитель видит операции и может задать лимит.', icon: 'card' },
        save: { title: 'Коплю', amount: pocketPerson.pockets.save, text: 'Копилка с целью и ставкой. Регулярные пополнения растят серию и ставку.', icon: 'piggy' },
        share: { title: 'Делюсь', amount: pocketPerson.pockets.share, text: 'Маленькая доля на подарки, помощь и добрые дела. Учит не только копить, но и делиться.', icon: 'heart' },
        split: { title: 'Сплит поступлений', amount: null, text: 'Каждое зачисление автоматически делится между банками по правилам семьи. Пропорции настраивает родитель.', icon: 'refresh' }
      }[pocketId] || null;
      if (!info) return '';
      return sheetHead(info.title, pocketPerson.name + ' · ' + pocketPerson.age + ' лет') +
        '<div class="pocket-sheet__icon">' + icon(info.icon, 30) + '</div>' +
        (info.amount != null ? '<div class="pocket-sheet__amount">' + fmt(info.amount) + ' <small>BYN</small></div>' : '') +
        '<p class="pocket-sheet__text">' + info.text + '</p>' +
        (state.role === 'parent' && pocketPerson.stage !== 'teen' ?
          '<button class="btn btn--soft btn--block" type="button" data-action="open-limits" data-child="' + pocketPerson.id + '">Настроить правила</button>' : '') +
        (state.role !== 'parent' && pocketId === 'save' ?
          '<button class="btn btn--red btn--block" type="button" data-action="open-topup" data-child="' + pocketPerson.id + '" data-pocket="save">Пополнить копилку</button>' : '');
    }

    if (type === 'invite') {
      var urls = MF.shareUrls();
      return sheetHead('Пригласить в семью', 'По ссылке или QR') +
        '<div class="invite-qr" data-qr-url="' + esc(urls.invite) + '"></div>' +
        '<p class="invite-hint">Ребёнок скачает Moby и войдёт по приглашению. ПИН-код и биометрия защищают вход, отдельное приложение не нужно.</p>' +
        '<div class="link-box"><span>' + esc(MF.prettyUrl(urls.invite)) + '</span><button class="mini-icon" type="button" data-action="copy-link" data-url="' + esc(urls.invite) + '" aria-label="Скопировать ссылку">' + icon('copy', 16) + '</button></div>' +
        '<button class="btn btn--soft btn--block btn--sm" type="button" data-action="share-link" data-url="' + esc(urls.invite) + '">' + icon('share', 16) + 'Поделиться приглашением</button>' +
        '<p class="sheet__note">В демо ссылка открывает экран принятия приглашения.</p>';
    }

    if (type === 'member') {
      var member = D.people[data.id] || D.people.anna;
      return sheetHead(member.fullName, member.roleLabel) +
        '<div class="member-card">' + avatar(member.avatar || 'anna', 64) +
          '<div><b>' + member.fullName + '</b><span>' + (member.phone || member.note || '') + '</span></div>' +
        '</div>' +
        '<div class="member-details">' +
          '<div><span>Роль</span><b>' + member.roleLabel + '</b></div>' +
          '<div><span>Доступ</span><b>' + (member.role === 'co-parent' ? 'Видит и пополняет' : member.role === 'owner' ? 'Полный доступ' : member.role === 'close' ? 'Только подарки по ссылке' : 'Свой профиль') + '</b></div>' +
        '</div>' +
        (member.role === 'child' || member.role === 'teen' ? '<button class="btn btn--red btn--block btn--sm" type="button" data-action="switch-role" data-role="' + member.id + '">Открыть профиль ' + member.name + '</button>' : '') +
        (member.role === 'owner' ? '<p class="sheet__note">Владелец пакета управляет подключением счетов и составом семьи.</p>' : '');
    }

    if (type === 'reset') {
      return sheetHead('Сбросить демо?', 'Данные прототипа') +
        '<p class="sheet__text">Вернутся исходные балансы, лимиты, серии и экран приветствия. Это удобно перед новым показом.</p>' +
        '<div class="sheet-actions"><button class="btn btn--soft" type="button" data-action="close-sheet">Отмена</button><button class="btn btn--red" type="button" data-action="confirm-reset">Сбросить</button></div>';
    }

    return '';
  }

  function notifRow(ic, tone, title, text, time) {
    return '<div class="notif-row"><span class="notif-row__icon tx-icon--' + tone + '">' + icon(ic, 19) + '</span><span class="notif-row__text"><b>' + title + '</b><span>' + text + '</span></span><i>' + time + '</i></div>';
  }

  function legalRow(age, title, text) {
    return '<div class="legal-row"><span class="legal-row__age">' + age + '</span><div><b>' + title + '</b><p>' + text + '</p></div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Toasts, confetti, install                                           */
  /* ------------------------------------------------------------------ */

  function toast(message, opts) {
    opts = opts || {};
    if (!toastRoot) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (opts.tone === 'info' ? 'toast--info' : '');
    el.innerHTML = '<span class="toast__icon">' + icon(opts.icon || 'check', 17) + '</span><span>' + esc(message) + '</span>';
    toastRoot.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
    while (toastRoot.children.length > 2) toastRoot.firstElementChild.remove();
  }

  function confetti(tone) {
    if (!confettiRoot) return;
    confettiRoot.innerHTML = '';
    var colors = tone === 'blue' ? ['#2F6BFF', '#77A6FF', '#FF3148', '#FFFFFF'] : ['#FF3148', '#FF7B88', '#2F6BFF', '#FFD166', '#FFFFFF'];
    for (var i = 0; i < 34; i++) {
      var piece = document.createElement('i');
      piece.style.left = (12 + Math.random() * 76) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 0.22) + 's';
      piece.style.animationDuration = (1.15 + Math.random() * 0.9) + 's';
      piece.style.transform = 'rotate(' + (Math.random() * 180) + 'deg)';
      piece.style.width = (5 + Math.random() * 6) + 'px';
      piece.style.height = (7 + Math.random() * 9) + 'px';
      piece.style.borderRadius = Math.random() > 0.55 ? '2px' : '50%';
      confettiRoot.appendChild(piece);
    }
    setTimeout(function () { if (confettiRoot) confettiRoot.innerHTML = ''; }, 2600);
  }

  function setupStatusbar() {
    var timeEl = $('.statusbar__time');
    if (!timeEl) return;
    var update = function () {
      timeEl.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };
    update();
    setInterval(update, 30000);
  }

  function setupDesktopQr() {
    var holder = $('#desktopQr');
    if (!holder) return;
    var urls = MF.shareUrls();
    MF.renderQr(holder, urls.app, { logo: true });
    var link = $('#desktopQrLink');
    if (link) link.textContent = MF.prettyUrl(urls.app);
    holder.setAttribute('data-url', urls.app);
  }

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      ui.installPrompt = e;
    });
    window.addEventListener('appinstalled', function () {
      ui.installPrompt = null;
      toast('Moby Family установлен', { icon: 'check' });
    });
  }

  function installApp() {
    if (ui.installPrompt) {
      ui.installPrompt.prompt();
      ui.installPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') toast('Спасибо! Приложение установлено');
        ui.installPrompt = null;
      });
      return;
    }
    openSheet('install');
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(function () { /* demo-safe */ });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var installBtn = e.target.closest('[data-install]');
      if (installBtn) { e.preventDefault(); installApp(); return; }

      var trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      var action = trigger.getAttribute('data-action');
      var ds = trigger.dataset;

      switch (action) {
        case 'navigate':
          navigate(ds.to || 'home', ds.param || null);
          break;
        case 'switch-role':
          closeSheet();
          setTimeout(function () { setRole(ds.role); }, 80);
          break;
        case 'role-sheet':
          openSheet('roles');
          break;
        case 'notifications':
          openSheet('notifications');
          break;
        case 'toggle-balance':
          state.balanceHidden = !state.balanceHidden;
          saveState();
          render(false);
          break;
        case 'dismiss-insight':
          state.insightDismissed = true;
          saveState();
          render(false);
          toast('Подсказка скрыта. Вернётся при следующем событии', { icon: 'info', tone: 'info' });
          break;
        case 'open-child':
          state.activeChild = ds.child || 'masha';
          saveState();
          navigate('child', ds.child || 'masha');
          break;
        case 'open-limits':
          openLimitsFor(ds.child || state.activeChild);
          break;
        case 'open-topup':
          closeSheet();
          ui.topupChild = ds.child || state.activeChild || 'masha';
          ui.topupPocket = ds.pocket || 'spend';
          setTimeout(function () { openSheet('topup', { child: ui.topupChild, pocket: ui.topupPocket }); }, 100);
          break;
        case 'open-transfer':
          openSheet('transfer');
          break;
        case 'open-gift-link':
          closeSheet();
          ui.qrTab = 'gift';
          navigate('qr', 'gift');
          break;
        case 'open-gift':
          openGift(ds.child || 'masha');
          break;
        case 'freeze-streak':
          freezeStreak(ds.child || 'masha');
          break;
        case 'pocket-info':
          openSheet('pocket', { pocket: ds.pocket || 'spend', child: ds.child || state.activeChild });
          break;
        case 'open-mission':
          startMission(ds.mission, ds.child || state.activeChild || 'masha');
          break;
        case 'mission-answer':
          answerMission(Number(ds.index));
          break;
        case 'mission-next':
          nextMissionStep();
          break;
        case 'mission-close':
          closeMission();
          break;
        case 'mission-finish':
          finishMissionOverlay();
          break;
        case 'mission-restart':
          if (ui.mission) {
            ui.mission.step = 0;
            ui.mission.selected = null;
            ui.mission.answered = false;
            ui.mission.finished = false;
            renderMission();
          }
          break;
        case 'qr-tab':
          ui.qrTab = ds.tab || 'app';
          navigate('qr', ui.qrTab);
          break;
        case 'select-gift-child':
          state.activeChild = ds.child === 'alex' ? 'alex' : 'masha';
          saveState();
          ui.qrTab = 'gift';
          navigate('qr', 'gift');
          break;
        case 'copy-link':
          var copyUrl = ds.url || (ui.qrTab === 'gift' ? MF.shareUrls().giftMasha : MF.shareUrls().app);
          MF.copyText(copyUrl).then(function () {
            toast('Ссылка скопирована', { icon: 'copy' });
            trigger.classList.add('is-copied');
            setTimeout(function () { trigger.classList.remove('is-copied'); }, 1200);
          }).catch(function () { toast('Не удалось скопировать ссылку', { icon: 'alert' }); });
          break;
        case 'share-link':
          shareLink(ds.url || MF.shareUrls().app, trigger);
          break;
        case 'open-full':
          window.open(MF.appBase(), '_blank', 'noopener');
          break;
        case 'open-sheet':
          openSheet(ds.sheet || 'about');
          break;
        case 'demo-info':
          toast('«' + (ds.title || 'Раздел') + '» — в демо недоступно', { icon: 'info', tone: 'info' });
          break;
        case 'close-sheet':
          closeSheet();
          break;
        case 'go-welcome':
          closeSheet();
          ui.mode = 'welcome';
          tabbar.classList.add('is-hidden');
          render();
          break;
        case 'select-amount':
          selectAmount(trigger);
          break;
        case 'topup-confirm':
          confirmTopup(ds.child, ds.pocket, trigger);
          break;
        case 'pick-recipient':
          $$('.recipient', trigger.parentElement).forEach(function (r) { r.classList.remove('is-selected'); });
          trigger.classList.add('is-selected');
          break;
        case 'transfer-confirm':
          closeSheet();
          toast('Перевод отправлен. Демо: деньги не списаны', { icon: 'send' });
          break;
        case 'toggle-rule':
          toggleRule(trigger);
          break;
        case 'save-limits':
          saveLimits(trigger);
          break;
        case 'request-limit':
          toast('Запрос отправлен маме. Демо: без реального уведомления', { icon: 'send' });
          break;
        case 'order-carrier':
          if (ds.type === 'pin') toast('ПИН-код можно изменить в Moby. Демо-режим', { icon: 'lock' });
          else toast('Заявка на выпуск отправлена. Демо: без доставки', { icon: 'check' });
          break;
        case 'set-age':
          setAge(Number(ds.age));
          break;
        case 'open-adult':
          closeSheet();
          setRole('adult');
          confetti();
          break;
        case 'open-invite':
          openSheet('invite');
          break;
        case 'open-member':
          openSheet('member', { id: ds.id });
          break;
        case 'about':
          openSheet('about');
          break;
        case 'legal':
          openSheet('legal');
          break;
        case 'install-native':
          closeSheet();
          setTimeout(installApp, 180);
          break;
        case 'reset':
          openSheet('reset');
          break;
        case 'confirm-reset':
          confirmReset();
          break;
        case 'gift-amount':
          selectGiftAmount(trigger, Number(ds.amount));
          break;
        case 'gift-send':
          sendGift(trigger);
          break;
        case 'gift-again':
          ui.giftSent = false;
          ui.giftAmount = 25;
          ui.giftMessage = '';
          render();
          break;
        case 'gift-open-app':
          closeGiftToApp(ds.role || 'masha');
          break;
        case 'choose-role':
          setRole(ds.role);
          break;
        default:
          break;
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'ageSlider') updateAgeUi(Number(e.target.value));
      if (e.target.id === 'limitRange') {
        var out = $('[data-range-output="limitRange"]');
        if (out) out.textContent = fmtInt(Number(e.target.value));
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (ui.mission) { closeMission(); return; }
      if (ui.sheet) { closeSheet(); }
    });

    window.addEventListener('hashchange', function () {
      if (ui.mode === 'app') render();
    });
  }

  function openLimitsFor(childId) {
    closeSheet();
    if (state.role !== 'parent') {
      navigate('limits', childId);
      return;
    }
    state.activeChild = childId || state.activeChild;
    saveState();
    navigate('limits', state.activeChild);
  }

  function freezeStreak(childId) {
    if (!state.freezes[childId]) {
      toast('Заморозка уже использована в этом квартале', { icon: 'snowflake', tone: 'info' });
      return;
    }
    state.freezes[childId] = 0;
    saveState();
    render(false);
    toast('Серия защищена. Заморозка спишет 1 пропуск', { icon: 'snowflake' });
  }

  function selectAmount(button) {
    var wrap = button.parentElement;
    $$('.amount-chip', wrap).forEach(function (c) { c.classList.remove('is-selected'); });
    button.classList.add('is-selected');
    var label = $('[data-amount-label]');
    if (label) label.textContent = button.dataset.amount + ' BYN';
  }

  function confirmTopup(childId, pocket, button) {
    var amountEl = $('.amount-chip.is-selected', button.closest('.sheet'));
    var amount = amountEl ? amountEl.dataset.amount : '20';
    var person = childFor(childId);
    closeSheet();
    toast(person.name + (person.id === 'masha' ? ' получила +' : ' получил +') + amount + ' BYN в банку «' + (pocket === 'save' ? 'Коплю' : 'Трачу') + '». Демо.', { icon: 'check' });
  }

  function toggleRule(button) {
    if (button.disabled) return;
    var next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', next ? 'true' : 'false');
    var sw = $('.switch', button);
    if (sw) sw.classList.toggle('is-on', next);
  }

  function saveLimits(button) {
    var childId = button.getAttribute('data-child') || state.activeChild;
    var person = childFor(childId);
    var range = document.getElementById('limitRange');
    var weekly = range ? Number(range.value) : (state.limits[childId] || person.limit).weekly;
    var read = function (rule) {
      var row = $('.rule-row[data-rule="' + rule + '"]', button.closest('.page') || document);
      return row ? row.getAttribute('aria-pressed') === 'true' : false;
    };
    var prev = state.limits[childId] || person.limit;
    state.limits[childId] = {
      weekly: weekly,
      online: read('online') ? (Number(prev.online) > 0 ? Number(prev.online) : 30) : 0,
      cash: read('cash') ? (Number(prev.cash) > 0 ? Number(prev.cash) : 20) : 0,
      transfers: read('transfers')
    };
    saveState();
    toast('Правила для ' + person.name + ' обновлены', { icon: 'check' });
    navigate('child', childId);
  }

  function shareLink(url, trigger) {
    if (navigator.share) {
      navigator.share({ title: 'Moby Family', text: 'Демо семейного банкинга МТБанка', url: url }).catch(function () { /* cancelled */ });
    } else {
      MF.copyText(url).then(function () {
        toast('Ссылка скопирована', { icon: 'copy' });
        if (trigger) { trigger.classList.add('is-copied'); setTimeout(function () { trigger.classList.remove('is-copied'); }, 1000); }
      });
    }
  }

  function confirmReset() {
    closeSheet();
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* no-op */ }
    state = deepClone(D.defaultState);
    ui.mode = 'welcome';
    ui.qrTab = 'app';
    ui.mission = null;
    ui.sheet = null;
    sheetRoot.innerHTML = '';
    try {
      var url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      history.replaceState(null, '', url.pathname);
    } catch (err) { /* no-op */ }
    render();
    toast('Демо сброшено', { icon: 'refresh' });
  }

  /* ------------------------------------------------------------------ */
  /* Gift flow (full screen)                                             */
  /* ------------------------------------------------------------------ */

  function openGift(childId) {
    ui.mode = 'gift';
    ui.giftChild = childId === 'alex' ? 'alex' : 'masha';
    ui.giftAmount = 25;
    ui.giftMessage = '';
    ui.giftSent = false;
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('gift', ui.giftChild);
      url.searchParams.delete('role');
      history.replaceState(null, '', url.pathname + url.search);
    } catch (err) { /* no-op */ }
    render();
  }

  function closeGiftToApp(role) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete('gift');
      url.searchParams.set('role', role || 'masha');
      url.hash = '#/home';
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (err) { /* no-op */ }
    ui.mode = 'app';
    if (role) state.role = role;
    saveState();
    render();
  }

  function selectGiftAmount(button, amount) {
    ui.giftAmount = amount;
    $$('.gift-amount', button.parentElement).forEach(function (b) { b.classList.remove('is-selected'); });
    button.classList.add('is-selected');
    var label = $('#giftSendAmount');
    if (label) label.textContent = fmtInt(amount) + ' BYN';
  }

  function sendGift(button) {
    var message = $('.gift-message textarea');
    ui.giftMessage = message ? message.value.slice(0, 120) : '';
    button.classList.add('is-loading');
    button.disabled = true;
    var original = button.innerHTML;
    button.innerHTML = '<span class="spinner"></span>Отправляем подарок…';
    setTimeout(function () {
      button.innerHTML = original;
      button.disabled = false;
      button.classList.remove('is-loading');
      ui.giftSent = true;
      render();
      confetti();
    }, 1250);
  }

  function renderGift() {
    var child = childFor(ui.giftChild);
    if (ui.giftSent) {
      return '<section class="gift-page gift-page--success">' +
        '<header class="gift-top"><div class="brand brand--light"><img class="brand__mark" src="assets/icons/icon.svg" alt=""><span class="brand__word">moby</span><span class="brand__family">family</span></div><span class="demo-pill"><i></i>demo</span></header>' +
        '<div class="gift-success">' +
          '<div class="success-ring">' + icon('check', 40) + '<span></span><span></span></div>' +
          '<span class="gift-success__eyebrow">Подарок доставлен</span>' +
          '<h1>' + fmtInt(ui.giftAmount) + ' BYN<br>уже у ' + genitiveName(child.name) + ' в «Коплю»</h1>' +
          '<p>' + (ui.giftMessage ? '«' + esc(ui.giftMessage) + '»' : 'Тёплый привет от бабушки Ирины.') + '</p>' +
          '<div class="gift-success__receipt">' +
            '<span class="gift-receipt-avatar">' + avatar(child.avatar, 42) + '</span>' +
            '<span><b>' + child.name + '</b><i>Цель: ' + child.goal.name + '</i></span>' +
            '<strong>+' + fmtInt(ui.giftAmount) + ' <small>BYN</small></strong>' +
          '</div>' +
          '<button class="btn btn--red btn--block" type="button" data-action="gift-again">Подарить ещё</button>' +
          '<button class="text-btn" type="button" data-action="gift-open-app" data-role="masha">Посмотреть глазами Маши ' + icon('arrow-right', 14) + '</button>' +
          '<p class="gift-legal">Демо-режим. Деньги не списываются, но сценарий — настоящий.</p>' +
        '</div>' +
        '</section>';
    }
    return '<section class="gift-page">' +
      '<header class="gift-top"><div class="brand brand--light"><img class="brand__mark" src="assets/icons/icon.svg" alt=""><span class="brand__word">moby</span><span class="brand__family">family</span></div><button class="icon-btn icon-btn--glass" type="button" data-action="gift-open-app" data-role="'+ui.giftChild+'" aria-label="Открыть Moby">' + icon('close', 20) + '</button></header>' +
      '<div class="gift-art"><img src="assets/img/whale-hero.svg" alt="Кит Moby"><span class="gift-art__badge">' + icon('gift', 22) + '</span></div>' +
      '<div class="gift-copy">' +
        '<span class="gift-eyebrow"><i></i>Подарок без установки Moby</span>' +
        '<h1>Подарок<br>для ' + genitiveName(child.name) + '</h1>' +
        '<p>Бабушка Ирина передаёт привет. Подарок попадёт сразу в банку «Коплю» — на цель «' + (child.goal ? child.goal.name : 'мечта') + '».</p>' +
      '</div>' +
      (child.goal ?
        '<div class="gift-goal">' +
          '<span class="gift-goal__avatar">' + avatar(child.avatar, 40) + '</span>' +
          '<span class="gift-goal__body"><b>' + child.name + ', ' + child.age + '</b><i>Копит на ' + child.goal.name.toLowerCase() + ' · ' + goalProgress(child) + '%</i>' +
            '<span class="gift-goal__bar"><i style="width:' + goalProgress(child) + '%"></i></span>' +
          '</span>' +
          '<strong>' + fmt(child.goal.saved) + '<small> / ' + fmtInt(child.goal.target) + ' BYN</small></strong>' +
        '</div>' +
        '<div class="gift-perks">' +
          '<span>' + icon('piggy', 14) + 'Сразу в «Коплю»</span>' +
          '<span>' + icon('shield', 14) + 'Без установки</span>' +
          '<span>' + icon('heart', 14) + 'С сообщением</span>' +
        '</div>' : '') +
      '<div class="gift-form">' +
        '<span class="gift-label">Сумма подарка</span>' +
        '<div class="gift-amounts">' +
          [5, 10, 25, 50].map(function (n) {
            return '<button class="gift-amount ' + (n === ui.giftAmount ? 'is-selected' : '') + '" type="button" data-action="gift-amount" data-amount="' + n + '">' + n + ' <small>BYN</small></button>';
          }).join('') +
        '</div>' +
        '<label class="gift-message"><span>Сообщение <i>необязательно</i></span><textarea maxlength="120" placeholder="На наушники, о которых ты мечтаешь"></textarea></label>' +
        '<button class="btn btn--red btn--block gift-send" type="button" data-action="gift-send">' +
          '<span class="gift-send__icon">' + icon('gift', 18) + '</span><span>Подарить <b id="giftSendAmount">' + fmtInt(ui.giftAmount) + ' BYN</b></span>' +
        '</button>' +
        '<p class="gift-legal">Платёж проведёт МТБанк. Это PWA-демо: реальные деньги не списываются.</p>' +
        '<button class="gift-back" type="button" data-action="gift-open-app" data-role="' + ui.giftChild + '">' + icon('arrow-right', 14) + 'Открыть Moby Family</button>' +
      '</div>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Mission overlay                                                     */
  /* ------------------------------------------------------------------ */

  function startMission(missionId, childId) {
    var mission = D.missionsById[missionId];
    if (!mission) return;
    ui.mission = { id: missionId, childId: childId || 'masha', step: 0, selected: null, answered: false, finished: false, gained: 0 };
    renderMission();
  }

  function renderMission() {
    if (!ui.mission) return;
    var m = ui.mission;
    var mission = D.missionsById[m.id];
    var child = childFor(m.childId);
    var q = mission.questions[m.step];
    var total = mission.questions.length;
    var progress = m.finished ? 100 : Math.round((m.step / total) * 100);

    if (m.finished) {
      var already = (state.missionsDone[m.childId] || []).indexOf(mission.id) !== -1;
      sheetRoot.innerHTML = '<div class="ui-layer mission-layer is-open">' +
        '<div class="mission-screen mission-screen--done">' +
          '<div class="mission-done__glow"></div>' +
          '<button class="icon-btn icon-btn--glass mission-close" type="button" data-action="mission-close" aria-label="Закрыть">' + icon('close', 20) + '</button>' +
          '<div class="mission-done__brand">' + brandMarkup('brand--light') + '</div>' +
          '<div class="mission-done__hero">' +
            '<div class="trophy">' + icon('trophy', 42) + '</div>' +
            '<span class="mission-done__kicker">Миссия выполнена</span>' +
            '<h1>' + (already ? 'Миссия пройдена' : 'Отлично!') + '</h1>' +
            '<p>' + esc(mission.result) + '</p>' +
          '</div>' +
          '<div class="mission-rewards">' +
            '<div><span>+' + mission.points + '</span><b>баллов Moby</b></div>' +
            '<div><span>+1</span><b>день серии</b></div>' +
            '<div><span>' + (doneCount(child)) + '</span><b>миссий у ' + child.name + '</b></div>' +
          '</div>' +
          '<button class="btn btn--red btn--block" type="button" data-action="mission-finish">Забрать награду</button>' +
          '<p class="mission-done__legal">Демо-награда. В продукте баллы обмениваются на бонусы МТБанка.</p>' +
        '</div></div>';
      confetti();
      return;
    }

    var correct = m.answered && m.selected === q.correct;
    var feedback = '';
    if (m.answered) {
      feedback = '<div class="mission-feedback ' + (correct ? 'is-correct' : 'is-wrong') + '">' +
        '<span class="mission-feedback__icon">' + icon(correct ? 'check' : 'info', 18) + '</span>' +
        '<div><b>' + (correct ? 'Верно!' : 'Почти! Вот как точнее') + '</b><p>' + esc(q.note) + '</p></div>' +
        '</div>' +
        '<button class="btn btn--red btn--block" type="button" data-action="mission-next">' + (m.step === total - 1 ? 'Завершить миссию' : 'Следующий вопрос') + ' ' + icon('arrow-right', 16) + '</button>';
    }

    sheetRoot.innerHTML = '<div class="ui-layer mission-layer is-open">' +
      '<div class="mission-screen">' +
        '<div class="mission-top">' +
          '<button class="icon-btn icon-btn--glass" type="button" data-action="mission-close" aria-label="Закрыть">' + icon('close', 20) + '</button>' +
          '<div class="mission-top__center"><span>Миссия</span><b>' + child.name + ' · ' + child.age + '</b></div>' +
          '<span class="mission-top__points">' + icon('sparkles', 14) + '+' + mission.points + '</span>' +
        '</div>' +
        '<div class="mission-progress"><span style="width:' + progress + '%"></span></div>' +
        '<div class="mission-body">' +
          '<span class="mission-cat">' + icon(mission.icon, 15) + esc(mission.category) + '</span>' +
          '<h2>' + esc(mission.title) + '</h2>' +
          '<p class="mission-question">' + esc(q.q) + '</p>' +
          '<div class="mission-options">' + q.options.map(function (opt, index) {
            var cls = '';
            if (m.answered) {
              if (index === q.correct) cls = 'is-correct';
              else if (index === m.selected) cls = 'is-wrong';
            } else if (index === m.selected) cls = 'is-picked';
            return '<button class="mission-option ' + cls + '" type="button" data-action="mission-answer" data-index="' + index + '" ' + (m.answered ? 'disabled' : '') + '>' +
              '<span class="mission-option__letter">' + String.fromCharCode(65 + index) + '</span><span>' + esc(opt) + '</span>' +
              '<span class="mission-option__mark">' + (m.answered && index === q.correct ? icon('check', 15) : '') + '</span>' +
              '</button>';
          }).join('') + '</div>' +
          feedback +
        '</div>' +
        '<div class="mission-foot"><span>' + (m.step + 1) + ' / ' + total + '</span><span>' + esc(mission.tag) + '</span></div>' +
      '</div></div>';
  }

  function answerMission(index) {
    if (!ui.mission || ui.mission.answered) return;
    ui.mission.selected = index;
    ui.mission.answered = true;
    renderMission();
  }

  function nextMissionStep() {
    if (!ui.mission) return;
    var mission = D.missionsById[ui.mission.id];
    if (ui.mission.step < mission.questions.length - 1) {
      ui.mission.step += 1;
      ui.mission.selected = null;
      ui.mission.answered = false;
      renderMission();
      return;
    }
    completeMission();
  }

  function completeMission() {
    if (!ui.mission) return;
    var m = ui.mission;
    var mission = D.missionsById[m.id];
    state.missionsDone[m.childId] = state.missionsDone[m.childId] || [];
    var isNew = state.missionsDone[m.childId].indexOf(mission.id) === -1;
    if (isNew) {
      state.missionsDone[m.childId].push(mission.id);
      state.points[m.childId] = (state.points[m.childId] || 0) + mission.points;
      m.gained = mission.points;
    }
    saveState();
    m.finished = true;
    renderMission();
  }

  function finishMissionOverlay() {
    ui.mission = null;
    sheetRoot.innerHTML = '';
    render(false);
    toast('Награда зачислена. Серия стала длиннее!', { icon: 'trophy' });
  }

  function closeMission() {
    ui.mission = null;
    sheetRoot.innerHTML = '';
    render(false);
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
