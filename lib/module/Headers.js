"use strict";

function normalizeName(name) {
  const value = String(name);
  if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(value)) {
    throw new TypeError('Invalid header name.');
  }
  return value.toLowerCase();
}
function normalizeValue(value) {
  const normalized = String(value).replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, '');
  if (/[\0\r\n\u0100-\uffff]/.test(normalized)) {
    throw new TypeError('Invalid header value.');
  }
  return normalized;
}
export class NitroHeaders {
  constructor(init) {
    this._map = new Map();
    if (!init) return;
    if (init instanceof NitroHeaders) {
      init._map.forEach((values, key) => {
        this._map.set(key, [...values]);
      });
    } else if (typeof init === 'object' && !Array.isArray(init) && typeof init.forEach === 'function' && typeof init.get === 'function') {
      // Headers-like object (standard Headers or duck-typed)
      init.forEach((value, key) => {
        this.append(key, value);
      });
    } else if (Array.isArray(init)) {
      for (const entry of init) {
        if (Array.isArray(entry) && entry.length === 2) {
          // [string, string] tuple
          this.append(entry[0], entry[1]);
        } else if (entry && typeof entry === 'object' && 'key' in entry && 'value' in entry) {
          // NitroHeader object
          this.append(entry.key, entry.value);
        } else {
          throw new TypeError('Headers entries must contain a name and value.');
        }
      }
    } else if (typeof init === 'object' && init !== null) {
      const keys = Object.keys(init);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = init[k];
        this.append(k, String(v));
      }
    }
  }
  append(name, value) {
    const key = normalizeName(name);
    const normalized = normalizeValue(value);
    const existing = this._map.get(key);
    if (existing) existing.push(normalized);else this._map.set(key, [normalized]);
    this._sortedEntries = undefined;
  }
  delete(name) {
    if (this._map.delete(normalizeName(name))) {
      this._sortedEntries = undefined;
    }
  }
  get(name) {
    const values = this._map.get(normalizeName(name));
    if (!values || values.length === 0) return null;
    return values.join(', ');
  }
  getSetCookie() {
    return [...(this._map.get('set-cookie') ?? [])];
  }
  has(name) {
    return this._map.has(normalizeName(name));
  }
  set(name, value) {
    this._map.set(normalizeName(name), [normalizeValue(value)]);
    this._sortedEntries = undefined;
  }
  _entries() {
    if (this._sortedEntries) return this._sortedEntries;
    const entries = [];
    for (const key of Array.from(this._map.keys()).sort()) {
      const values = this._map.get(key);
      if (key === 'set-cookie') {
        for (const value of values) entries.push([key, value]);
      } else {
        entries.push([key, values.join(', ')]);
      }
    }
    this._sortedEntries = entries;
    return entries;
  }
  forEach(callback, thisArg) {
    for (const [key, value] of this.entries()) {
      callback.call(thisArg, value, key, this);
    }
  }
  entries() {
    function* gen(headers) {
      for (let index = 0;; index++) {
        // Re-read after a mutation: Headers iterators are live, not snapshots.
        const entry = headers._entries()[index];
        if (!entry) return;
        yield [entry[0], entry[1]];
      }
    }
    return gen(this);
  }
  keys() {
    const entries = this.entries();
    function* gen() {
      for (const [key] of entries) {
        yield key;
      }
    }
    return gen();
  }
  values() {
    const entries = this.entries();
    function* gen() {
      for (const [, value] of entries) {
        yield value;
      }
    }
    return gen();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}
//# sourceMappingURL=Headers.js.map