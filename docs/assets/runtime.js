/*
 * Downstreet page runtime.
 *
 * Runs the same page format the design canvas uses (a template with {{holes}},
 * <sc-for> and <sc-if>, plus a `class Component extends DCLogic` script) as a
 * normal website. Each state change re-renders the template and patches the
 * page in place with morphdom, so typing, focus and scroll are kept.
 *
 * It also gives every page of a site its own web address: the component's
 * `page` state is kept in sync with the URL, and the back button works.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BOOLEAN_ATTRS = { checked: 1, disabled: 1, selected: 1, hidden: 1, required: 1, readonly: 1, open: 1, multiple: 1, autofocus: 1, novalidate: 1 };
  var HOLES = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ONE_HOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function look(path, scope) {
    path = path.trim();
    if (path === 'true') { return true; }
    if (path === 'false') { return false; }
    if (path === 'null') { return null; }
    if (/^-?\d+(\.\d+)?$/.test(path)) { return Number(path); }
    var parts = path.split('.');
    var value = scope;
    for (var i = 0; i < parts.length; i++) {
      if (value == null) { return undefined; }
      value = value[parts[i]];
    }
    return value;
  }

  function text(value) {
    return value == null || value === true || value === false ? '' : String(value);
  }

  function fill(template, scope) {
    return template.replace(HOLES, function (_, path) { return text(look(path, scope)); });
  }

  function hole(raw) {
    var m = ONE_HOLE.exec(raw || '');
    return m ? m[1] : null;
  }

  // Template nodes are either strings (text) or [tag, attrs, children].
  function build(node, scope, parent, ns) {
    if (typeof node === 'string') {
      parent.appendChild(document.createTextNode(fill(node, scope)));
      return;
    }
    var tag = node[0], attrs = node[1], kids = node[2], i;

    if (tag === 'sc-for') {
      var list = look(hole(attrs.list) || '', scope) || [];
      var as = attrs.as || 'item';
      for (i = 0; i < list.length; i++) {
        var inner = Object.create(scope);
        inner[as] = list[i];
        inner.$index = i;
        for (var k = 0; k < kids.length; k++) { build(kids[k], inner, parent, ns); }
      }
      return;
    }
    if (tag === 'sc-if') {
      if (look(hole(attrs.value) || '', scope)) {
        for (i = 0; i < kids.length; i++) { build(kids[i], scope, parent, ns); }
      }
      return;
    }

    var elNs = tag === 'svg' ? SVG_NS : ns;
    var el = elNs ? document.createElementNS(elNs, tag) : document.createElement(tag);
    var handlers = null;
    var selectValue;

    for (var name in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, name) || name.indexOf('hint-') === 0) { continue; }
      var raw = attrs[name];
      var path = hole(raw);
      if (name.length > 2 && name.slice(0, 2) === 'on') {
        var fn = path ? look(path, scope) : null;
        if (typeof fn === 'function') {
          handlers = handlers || {};
          handlers[name.slice(2)] = fn;
        }
        continue;
      }
      var value = path ? look(path, scope) : fill(raw, scope);
      if (tag === 'select' && name === 'value') { selectValue = value; continue; }
      if (!elNs && BOOLEAN_ATTRS[name]) {
        var on = path ? (value && value !== 'false') : true;
        if (on) { el.setAttribute(name, ''); }
        continue;
      }
      if (path && (value == null || (value === false && name.indexOf('aria-') !== 0))) { continue; }
      if (value === true) { value = name.indexOf('aria-') === 0 ? 'true' : ''; }
      el.setAttribute(name, String(value));
    }

    el.__dc = handlers;
    for (i = 0; i < kids.length; i++) { build(kids[i], scope, el, elNs); }

    if (tag === 'select' && selectValue != null) {
      for (i = 0; i < el.options.length; i++) {
        if (el.options[i].value === String(selectValue)) { el.options[i].setAttribute('selected', ''); }
        else { el.options[i].removeAttribute('selected'); }
      }
    }
    parent.appendChild(el);
  }

  // React's onChange fires on every keystroke for text fields and sliders.
  function eventFor(el, type) {
    if (type !== 'change') { return type; }
    var tag = el.tagName;
    var kind = (el.getAttribute('type') || '').toLowerCase();
    return tag === 'SELECT' || kind === 'checkbox' || kind === 'radio' || kind === 'file' ? 'change' : 'input';
  }

  function bind(el) {
    var handlers = el.__dc;
    if (!handlers) { return; }
    el.__dcBound = el.__dcBound || {};
    Object.keys(handlers).forEach(function (type) {
      var evt = eventFor(el, type);
      if (el.__dcBound[evt]) { return; }
      el.__dcBound[evt] = type;
      el.addEventListener(evt, function (e) {
        var fn = el.__dc && el.__dc[type];
        if (fn) { fn(e); }
      });
    });
  }

  function bindTree(node) {
    if (node.nodeType !== 1) { return; }
    bind(node);
    var all = node.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) { bind(all[i]); }
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    if (typeof patch === 'function') { patch = patch(this.state, this.props); }
    if (patch) { Object.assign(this.state, patch); }
    if (this.__schedule) { this.__schedule(); }
  };
  DCLogic.prototype.forceUpdate = function () {
    if (this.__schedule) { this.__schedule(); }
  };

  // ---- form submissions: posted to the URL in assets/config.js
  var dsLoadedAt = Date.now();

  // Which ad or tagged link brought this visitor? Saved for 30 days (see the privacy policy) and
  // sent with every form, so the Google Sheet shows where each lead came from.
  var dsAttrib = (function () {
    var KEY = 'ds-attrib', found = {}, any = false;
    var tags = {utm_source: 'Ad source', utm_medium: 'Ad medium', utm_campaign: 'Ad campaign', utm_content: 'Ad content', utm_term: 'Ad term'};
    try {
      var q = new URLSearchParams(location.search);
      for (var k in tags) { var v = q.get(k); if (v) { found[tags[k]] = v.slice(0, 200); any = true; } }
      var ids = ['gclid', 'fbclid', 'msclkid', 'wbraid', 'gbraid'];
      for (var i = 0; i < ids.length; i++) { var c = q.get(ids[i]); if (c) { found['Ad click ID'] = ids[i] + ':' + c.slice(0, 300); any = true; break; } }
    } catch (err) {}
    if (any) {
      found['Landing page'] = location.pathname;
      found._t = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (err) {}
      return found;
    }
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && Date.now() - saved._t < 30 * 864e5) { return saved; }
      localStorage.removeItem(KEY);
    } catch (err) {}
    return {};
  })();

  // Optional ad measurement. Off until an ID is pasted into assets/config.js.
  (function () {
    var cfg = window.DS_CONFIG || {};
    if (cfg.metaPixelId) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', String(cfg.metaPixelId));
      window.fbq('track', 'PageView');
    }
    if (cfg.ga4Id) {
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4Id);
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', String(cfg.ga4Id));
    }
  })();

  function dsTrackSaved(kind, lang) {
    try {
      if (window.fbq) {
        if (kind === 'homeowner-request') { window.fbq('track', 'Lead'); }
        else if (kind === 'pro-application') { window.fbq('track', 'SubmitApplication'); }
      }
      if (window.gtag) {
        var name = kind === 'homeowner-request' ? 'generate_lead' : kind === 'pro-application' ? 'sign_up' : kind.replace(/-/g, '_');
        window.gtag('event', name, {form: kind, site_language: lang});
      }
    } catch (err) {}
  }
  // Sends one form to the Google Sheet. Returns a promise that resolves once the sheet confirms
  // the row was saved, and rejects if it could not be saved (after one automatic retry).
  window.DS_SUBMIT = function (kind, data) {
    var config = window.DS_CONFIG || {};
    var each = function (sel, fn) { return Array.prototype.map.call(document.querySelectorAll(sel), fn); };
    var meta = {
      lang: (document.documentElement.getAttribute('lang') || 'en').slice(0, 2),
      msOnPage: Date.now() - dsLoadedAt,
      ua: (navigator.userAgent || '').slice(0, 200),
      referrer: (document.referrer || '').slice(0, 300)
    };
    var hp = each('input[name="ds_hp"]', function (i) { return i.value; }).join('');
    if (hp) { meta.hp = hp.slice(0, 200); }
    var consent = each('[data-consent]', function (el) { return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); })
      .filter(function (t) { return t; }).join(' | ');
    if (consent) { meta.consentText = consent; }
    var sendData = {};
    var src = data || {};
    for (var dk in src) { if (Object.prototype.hasOwnProperty.call(src, dk)) { sendData[dk] = src[dk]; } }
    for (var ak in dsAttrib) { if (ak !== '_t' && !(ak in sendData)) { sendData[ak] = dsAttrib[ak]; } }
    var payload = {
      kind: kind, data: sendData, meta: meta, page: location.href, sentAt: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    };
    if (!config.submitUrl) {
      if (window.console) { console.info('[Downstreet] Form received, but no submitUrl is set in assets/config.js yet.', payload); }
      return Promise.resolve({ok: true, saved: false});
    }
    function attempt() {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
      // No custom headers: a plain-text POST needs no CORS preflight, which Apps Script can't answer.
      return fetch(config.submitUrl, {method: 'POST', body: JSON.stringify(payload), redirect: 'follow', signal: ctrl ? ctrl.signal : undefined})
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (timer) { clearTimeout(timer); }
          if (!j || !j.ok) { throw new Error((j && j.error) || 'not saved'); }
          return j;
        }, function (err) { if (timer) { clearTimeout(timer); } throw err; });
    }
    return attempt().catch(function () {
      return new Promise(function (res) { setTimeout(res, 1500); }).then(attempt);
    }).then(function (j) { dsTrackSaved(kind, meta.lang); return j; });
  };


  // A redraw must not wipe what someone typed. Fields the template doesn't control (no value bound)
  // keep their current value; a dropdown keeps its pick unless the redraw changed its option list.
  function keepTyping(from, to) {
    var tag = from.nodeName;
    if (tag === 'INPUT') {
      if (/^(checkbox|radio|button|submit|reset|hidden|file)$/i.test(from.type || '')) { return; }
      if (!to.hasAttribute('value')) { to.value = from.value; }
    } else if (tag === 'TEXTAREA') {
      if (!to.textContent) { to.value = from.value; }
    } else if (tag === 'SELECT') {
      var picked = false, i;
      for (i = 0; i < to.options.length; i++) { if (to.options[i].hasAttribute('selected')) { picked = true; break; } }
      if (picked || to.options.length !== from.options.length) { return; }
      for (i = 0; i < to.options.length; i++) { if (to.options[i].value !== from.options[i].value) { return; } }
      for (i = 0; i < to.options.length; i++) {
        if (to.options[i].value === from.value) { to.options[i].setAttribute('selected', ''); } else { to.options[i].removeAttribute('selected'); }
      }
    }
  }

  function mount(site) {
    var root = document.getElementById('app');
    var base = (document.documentElement.getAttribute('data-site-base') || '/').replace(/\/?$/, '/');
    var routes = site.routes || {};
    var titles = site.titles || {};

    function pathFor(page) { return base + (routes[page] || ''); }
    function pageFromPath() {
      var path = decodeURIComponent(location.pathname).replace(/index\.html$/, '');
      if (path.indexOf(base) !== 0 && path + '/' !== base) { return null; }
      var rest = path.slice(base.length).replace(/^\/+/, '').replace(/\/?$/, '/');
      if (rest === '/') { rest = ''; }
      for (var page in routes) {
        if (routes[page] === rest) { return page; }
      }
      return null;
    }

    var Component = site.factory(DCLogic);
    var comp = new Component({});
    var startPage = pageFromPath();
    if (startPage && 'page' in comp.state) { comp.state.page = startPage; }

    var shownPage = comp.state.page;
    var queued = false;

    function render() {
      queued = false;
      var vals = comp.renderVals();
      var next = document.createElement('div');
      for (var i = 0; i < site.template.length; i++) { build(site.template[i], vals, next, null); }
      morphdom(root, next, {
        childrenOnly: true,
        onBeforeElUpdated: function (from, to) {
          keepTyping(from, to);
          from.__dc = to.__dc || null;
          bind(from);
          return true;
        },
        onNodeAdded: function (node) {
          bindTree(node);
          return node;
        }
      });
      var page = comp.state.page;
      if (page !== shownPage && routes[page] != null) {
        history.pushState({ page: page }, '', pathFor(page));
        shownPage = page;
      }
      if (titles[page]) { document.title = titles[page]; }
      if (site.alt) {
        var altHref = site.alt.base + (site.alt.routes[page] || '');
        var langLinks = root.querySelectorAll('[data-lang-switch]');
        for (var j = 0; j < langLinks.length; j++) { langLinks[j].setAttribute('href', altHref); }
      }
      document.documentElement.setAttribute('data-ready', '1');
    }

    comp.__schedule = function () {
      if (queued) { return; }
      queued = true;
      Promise.resolve().then(render);
    };

    window.addEventListener('popstate', function () {
      var page = pageFromPath();
      if (!page || page === comp.state.page) { return; }
      shownPage = page;
      var patch = { page: page };
      if ('menu' in comp.state) { patch.menu = false; }
      comp.setState(patch);
    });

    if (startPage) { history.replaceState({ page: startPage }, '', location.href); }
    render();
    return comp;
  }

  window.DC = { mount: mount, DCLogic: DCLogic };
})();
