const vm = require('vm');
const { createSystemClockPort } = require('./ports/clock-port');
const { createMemoryStoragePort } = require('./ports/storage-port');

function createLocalStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      const normalizedKey = String(key);
      return store.has(normalizedKey) ? store.get(normalizedKey) : null;
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

function createClassList(element) {
  const classes = new Set();
  return {
    add(...names) {
      names.forEach((name) => classes.add(String(name)));
      element.className = Array.from(classes).join(' ');
    },
    contains(name) {
      return classes.has(String(name));
    },
    remove(...names) {
      names.forEach((name) => classes.delete(String(name)));
      element.className = Array.from(classes).join(' ');
    },
    toggle(name, force) {
      const normalizedName = String(name);
      const shouldAdd = force === undefined ? !classes.has(normalizedName) : Boolean(force);
      if (shouldAdd) classes.add(normalizedName);
      else classes.delete(normalizedName);
      element.className = Array.from(classes).join(' ');
      return shouldAdd;
    },
  };
}

function createElementStub(id, ownerDocument) {
  const attributes = new Map();
  const element = {
    id: id || '',
    tagName: 'DIV',
    nodeName: 'DIV',
    nodeType: 1,
    style: {},
    children: [],
    childNodes: [],
    parentNode: null,
    className: '',
    innerHTML: '',
    innerText: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    selectedIndex: 0,
    options: [],
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    offsetHeight: 0,
    offsetWidth: 0,
    width: 0,
    height: 0,
    ownerDocument,
    addEventListener() {},
    append(...nodes) {
      nodes.forEach((node) => this.appendChild(node));
    },
    appendChild(child) {
      if (child && typeof child === 'object') child.parentNode = this;
      this.children.push(child);
      this.childNodes.push(child);
      return child;
    },
    blur() {},
    click() {},
    cloneNode() {
      return createElementStub(id, ownerDocument);
    },
    focus() {},
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    getBoundingClientRect() {
      return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
    },
    getContext() {
      return {
        clearRect() {},
        drawImage() {},
        fillRect() {},
        getImageData() { return { data: [] }; },
        putImageData() {},
      };
    },
    getElementsByClassName() {
      return [];
    },
    getElementsByTagName() {
      return [];
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    insertAdjacentElement(_position, child) {
      return this.appendChild(child);
    },
    insertAdjacentHTML() {},
    prepend(...nodes) {
      nodes.reverse().forEach((node) => {
        if (node && typeof node === 'object') node.parentNode = this;
        this.children.unshift(node);
        this.childNodes.unshift(node);
      });
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.removeChild(this);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    removeChild(child) {
      this.children = this.children.filter((node) => node !== child);
      this.childNodes = this.childNodes.filter((node) => node !== child);
      if (child && typeof child === 'object') child.parentNode = null;
      return child;
    },
    removeEventListener() {},
    replaceChild(child, oldChild) {
      const index = this.children.indexOf(oldChild);
      if (index >= 0) this.children[index] = child;
      if (child && typeof child === 'object') child.parentNode = this;
      return oldChild;
    },
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
      if (name === 'id') this.id = String(value);
      if (name === 'class') this.className = String(value);
    },
  };
  element.classList = createClassList(element);
  return element;
}

function createDocumentMock() {
  const elements = new Map();
  function getOrCreateElement(id) {
    const normalizedId = String(id);
    if (!elements.has(normalizedId)) {
      const element = createElementStub(normalizedId, document);
      if (normalizedId === 'tooltipDiv2') element.className = 'tooltipExtraNone';
      elements.set(normalizedId, element);
    }
    return elements.get(normalizedId);
  }
  const document = {
    body: null,
    documentElement: null,
    head: null,
    addEventListener() {},
    createDocumentFragment() {
      return createElementStub('', document);
    },
    createElement(tagName) {
      const element = createElementStub('', document);
      element.tagName = String(tagName).toUpperCase();
      element.nodeName = element.tagName;
      return element;
    },
    createTextNode(text) {
      return { data: String(text), nodeType: 3, textContent: String(text) };
    },
    getElementById(id) {
      return getOrCreateElement(id);
    },
    getElementsByClassName() {
      return [];
    },
    getElementsByName() {
      return [];
    },
    getElementsByTagName() {
      return [];
    },
    querySelector(selector) {
      if (String(selector).startsWith('#')) return document.getElementById(String(selector).slice(1));
      return null;
    },
    querySelectorAll() {
      return [];
    },
    removeEventListener() {},
  };
  document.body = document.getElementById('body');
  document.head = document.getElementById('head');
  document.documentElement = document.getElementById('html');
  return document;
}

function createBrowserContext(rootDir, options = {}) {
  const document = createDocumentMock();
  const clockPort = options.clockPort || createSystemClockPort();
  const localStorage = options.storagePort || createMemoryStoragePort();
  const activeTimers = new Map();

  function unrefTimer(timerId) {
    if (timerId && typeof timerId.unref === 'function') timerId.unref();
    return timerId;
  }

  function setBrowserTimeout(callback, delayMs, ...args) {
    const timerId = unrefTimer(clockPort.setTimeout((...callbackArgs) => {
      activeTimers.delete(timerId);
      callback(...callbackArgs);
    }, delayMs, ...args));
    activeTimers.set(timerId, 'timeout');
    return timerId;
  }

  function setBrowserInterval(callback, delayMs, ...args) {
    const timerId = unrefTimer(clockPort.setInterval(callback, delayMs, ...args));
    activeTimers.set(timerId, 'interval');
    return timerId;
  }

  function clearBrowserTimer(timerId) {
    const timerType = activeTimers.get(timerId);
    activeTimers.delete(timerId);
    if (timerType === 'interval') clockPort.clearInterval(timerId);
    else clockPort.clearTimeout(timerId);
  }

  const context = {
    console: {
      error: console.error.bind(console),
      log() {},
      warn() {},
    },
    document,
    localStorage,
    location: { href: 'http://localhost/', origin: 'http://localhost', search: '', hash: '' },
    navigator: { userAgent: 'trimps-headless-node' },
    performance: { now: () => clockPort.performanceNow() },
    screen: { height: 768, width: 1024 },
    innerHeight: 768,
    innerWidth: 1024,
    outerHeight: 768,
    outerWidth: 1024,
    devicePixelRatio: 1,
    XMLHttpRequest: function XMLHttpRequest() {
      this.open = function open() {};
      this.send = function send() {};
      this.setRequestHeader = function setRequestHeader() {};
    },
    addEventListener() {},
    alert(message) {
      context.console.warn(String(message));
    },
    atob(value) {
      return Buffer.from(String(value), 'base64').toString('binary');
    },
    btoa(value) {
      return Buffer.from(String(value), 'binary').toString('base64');
    },
    clearInterval(timerId) {
      clearBrowserTimer(timerId);
    },
    clearTimeout(timerId) {
      clearBrowserTimer(timerId);
    },
    confirm() {
      return false;
    },
    prompt() {
      return null;
    },
    removeEventListener() {},
    requestAnimationFrame() {
      return 0;
    },
    cancelAnimationFrame() {},
    setInterval(callback, delayMs, ...args) {
      return setBrowserInterval(callback, delayMs, ...args);
    },
    setTimeout(callback, delayMs, ...args) {
      return setBrowserTimeout(callback, delayMs, ...args);
    },
  };

  context.__trimpsClearBrowserTimers = function clearBrowserTimers() {
    Array.from(activeTimers.keys()).forEach((timerId) => clearBrowserTimer(timerId));
  };

  context.window = context;
  context.self = context;
  context.globalThis = context;
  context.global = context;
  context.mutTreeWrapper = document.getElementById('mutTreeWrapper');
  context.__trimpsHeadlessRoot = rootDir;
  return vm.createContext(context);
}

module.exports = {
  createBrowserContext,
  createDocumentMock,
  createElementStub,
  createLocalStorage,
};
