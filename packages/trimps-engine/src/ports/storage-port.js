const fs = require('fs');
const path = require('path');

function createMemoryStoragePort(initialValues = {}) {
  const store = new Map();
  Object.keys(initialValues || {}).forEach((key) => {
    store.set(String(key), String(initialValues[key]));
  });

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

function createFileStoragePort(options = {}) {
  const baseDir = path.resolve(options.baseDir || process.cwd());

  function resolvePath(filePath) {
    if (!filePath) throw new Error('filePath is required.');
    return path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);
  }

  return {
    baseDir,
    resolvePath,
    readText(filePath) {
      return fs.readFileSync(resolvePath(filePath), 'utf8');
    },
    writeText(filePath, content) {
      const targetPath = resolvePath(filePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, String(content), 'utf8');
      return targetPath;
    },
  };
}

module.exports = {
  createFileStoragePort,
  createMemoryStoragePort,
};
