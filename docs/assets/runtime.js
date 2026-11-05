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
  window.DS_SUBMIT = function (kind, data) {
    var config = window.DS_CONFIG || {};
    var payload = { kind: kind, data: data || {}, page: location.href, sentAt: new Date().toISOString() };
    if (!config.submitUrl) {
      if (window.console) { console.info('[Downstreet] Form received, but no submitUrl is set in assets/config.js yet.', payload); }
      return;
    }
    try {
      fetch(config.submitUrl, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(function () {});
    } catch (err) {}
  };

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
