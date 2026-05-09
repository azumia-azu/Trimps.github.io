function getOwnDataValue(source, key) {
  if (!source || !Object.prototype.hasOwnProperty.call(source, key)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value') ? descriptor.value : undefined;
}

function toNumber(value, fallback) {
  if (typeof value === 'undefined' || value === null || value === '') return fallback;
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? fallback : numericValue;
}

function toNullableNumber(value) {
  if (typeof value === 'undefined' || value === null || value === -1) return null;
  return toNumber(value, null);
}

function toStringOrNull(value) {
  if (typeof value === 'undefined' || value === null || value === '') return null;
  return String(value);
}

function addNumberField(target, source, key) {
  const value = getOwnDataValue(source, key);
  if (typeof value !== 'undefined') target[key] = toNumber(value, 0);
}

function addStringField(target, source, key) {
  const value = getOwnDataValue(source, key);
  if (typeof value !== 'undefined' && value !== null && value !== '') target[key] = String(value);
}

function getItemEntries(collection, createItemSnapshot) {
  if (!collection) return [];
  return Object.keys(collection).map((name) => createItemSnapshot(name, collection[name]));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.keys(value).forEach((key) => deepFreeze(value[key]));
  return value;
}

module.exports = {
  addNumberField,
  addStringField,
  deepFreeze,
  getItemEntries,
  getOwnDataValue,
  toNullableNumber,
  toNumber,
  toStringOrNull,
};
