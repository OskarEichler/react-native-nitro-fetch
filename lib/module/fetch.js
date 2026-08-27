"use strict";

// Concrete path so Metro resolves it even with unstable_enablePackageExports: false (#103).
import 'web-streams-polyfill/dist/polyfill.js';
import { NitroFetch as NitroFetchSingleton, NitroCronetSingleton } from "./NitroInstances.js";
import { NativeStorage as NativeStorageSingleton } from "./NitroInstances.js";
import { NitroHeaders } from "./Headers.js";
import { NitroResponse } from "./Response.js";
import { NitroRequest as NitroRequestClass, consumeRawBodyOf, rawBodyOf } from "./Request.js";
import { NetworkInspector } from "./NetworkInspector.js";
import { base64FromBytes } from './blob';
import { readBlob } from "./Body.js";
import { platformFetch } from "./platformFetch.js";
const TEXT_CONTENT_TYPE = 'text/plain;charset=UTF-8';
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=UTF-8';
// Browsers send no Content-Type for byte bodies, but Cronet rejects uploads without one.
const BYTES_CONTENT_TYPE = 'application/octet-stream';
function validatePrefetchTtl(value) {
  'worklet';

  if (value !== undefined && !Number.isFinite(value)) {
    throw new RangeError('prefetchCacheTtlMs must be a finite number.');
  }
  return value;
}
function validateRequestBody(method, body) {
  'worklet';

  const normalizedMethod = method?.toUpperCase() ?? 'GET';
  if ((normalizedMethod === 'GET' || normalizedMethod === 'HEAD') && body != null) {
    throw new TypeError('GET and HEAD requests cannot have a body.');
  }
}

// A view spanning its whole buffer needs no copy.
function viewToBuffer(view) {
  'worklet';

  const buf = view.buffer;
  if (view.byteOffset === 0 && view.byteLength === buf.byteLength) return buf;
  return buf.slice(view.byteOffset, view.byteOffset + view.byteLength);
}
function applyDefaultContentType(headers, contentType) {
  'worklet';

  if (!contentType) return;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].key.toLowerCase() === 'content-type') return;
  }
  headers.push({
    key: 'Content-Type',
    value: contentType
  });
}
function applyCacheHeaders(headers, cache) {
  'worklet';

  if (cache === 'no-store') {
    headers.push({
      key: 'Cache-Control',
      value: 'no-store'
    });
  } else if (cache === 'no-cache') {
    headers.push({
      key: 'Cache-Control',
      value: 'no-cache'
    });
  } else if (cache === 'reload') {
    headers.push({
      key: 'Cache-Control',
      value: 'no-cache'
    });
    headers.push({
      key: 'Pragma',
      value: 'no-cache'
    });
  }
}
function headersToPairs(headers) {
  'worklet';

  if (!headers) return undefined;
  const pairs = [];
  if (headers instanceof Headers) {
    headers.forEach((v, k) => pairs.push({
      key: k,
      value: v
    }));
    return pairs;
  }
  if (Array.isArray(headers)) {
    // Convert tuple pairs to objects if needed
    for (const entry of headers) {
      if (Array.isArray(entry) && entry.length >= 2) {
        pairs.push({
          key: String(entry[0]),
          value: String(entry[1])
        });
      } else if (entry && typeof entry === 'object' && 'key' in entry && 'value' in entry) {
        pairs.push(entry);
      }
    }
    return pairs;
  }
  // Check if it's a plain object (Record<string, string>) first
  // Plain objects don't have forEach, so check for its absence
  if (typeof headers === 'object' && headers !== null) {
    // Check if it's a Headers instance by checking for forEach method
    const hasForEach = typeof headers.forEach === 'function';
    if (hasForEach) {
      // Headers-like object (duck typing)
      headers.forEach((v, k) => pairs.push({
        key: k,
        value: v
      }));
      return pairs;
    } else {
      // Plain object (Record<string, string>)
      // Use Object.keys to iterate since Object.entries might not work in worklets
      const keys = Object.keys(headers);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = headers[k];
        if (v !== undefined) {
          pairs.push({
            key: k,
            value: String(v)
          });
        }
      }
      return pairs;
    }
  }
  return pairs;
}
function serializeFormData(fd) {
  const parts = [];
  if (typeof fd.getParts === 'function') {
    const rnParts = fd.getParts();
    for (const part of rnParts) {
      if (part.string !== undefined) {
        parts.push({
          name: part.fieldName,
          value: String(part.string)
        });
      } else if (part.uri) {
        parts.push({
          name: part.fieldName,
          fileUri: part.uri,
          fileName: part.fileName ?? part.name ?? 'file',
          mimeType: part.type ?? 'application/octet-stream'
        });
      }
    }
    return parts;
  }
  fd.forEach((value, key) => {
    if (typeof value === 'string') {
      parts.push({
        name: key,
        value
      });
    } else if (value && typeof value === 'object') {
      parts.push({
        name: key,
        fileUri: value.uri ?? value.fileUri,
        fileName: value.name ?? value.fileName ?? 'file',
        mimeType: value.type ?? value.mimeType ?? 'application/octet-stream'
      });
    }
  });
  return parts;
}
function isFormData(body) {
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  if (body && typeof body === 'object' && typeof body.append === 'function' && typeof body.getParts === 'function') {
    return true;
  }
  return false;
}
function normalizeBody(body) {
  'worklet';

  if (body == null) return undefined;
  if (typeof body === 'string') return {
    bodyString: body,
    contentType: TEXT_CONTENT_TYPE
  };
  if (isFormData(body)) {
    return {
      bodyFormData: serializeFormData(body)
    };
  }
  if (body instanceof URLSearchParams) return {
    bodyString: body.toString(),
    contentType: FORM_CONTENT_TYPE
  };
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return {
    bodyBytes: body,
    contentType: BYTES_CONTENT_TYPE
  };
  if (ArrayBuffer.isView(body)) {
    return {
      bodyBytes: viewToBuffer(body),
      contentType: BYTES_CONTENT_TYPE
    };
  }
  throw new Error('Unsupported body type for nitro fetch');
}
const NitroFetchHybrid = NitroFetchSingleton;
let client;
function ensureClient() {
  if (client) return client;
  try {
    client = NitroFetchHybrid.createClient();
  } catch (err) {
    console.error('Failed to create NitroFetch client', err);
    // native not ready; keep undefined
  }
  return client;
}
function buildNitroRequest(input, init) {
  'worklet';

  let url;
  let method;
  let headersInit;
  let body;
  let redirectOption = init?.redirect ?? 'follow';
  let cacheOption = init?.cache;
  let credentialsOption = init?.credentials;
  if (input instanceof NitroRequestClass) {
    url = input.url;
    method = init?.method ?? input.method;
    headersInit = init?.headers ?? input.headers;
    body = init?.body ?? rawBodyOf(input) ?? null;
    if (!init?.redirect) redirectOption = input.redirect;
    if (!init?.cache) cacheOption = input.cache;
    if (!init?.credentials) credentialsOption = input.credentials;
  } else if (typeof input === 'string' || input instanceof URL) {
    url = String(input);
    method = init?.method;
    headersInit = init?.headers;
    body = init?.body ?? null;
  } else {
    // Standard Request object
    url = input.url;
    method = init?.method ?? input.method;
    headersInit = init?.headers ?? input.headers;
    body = init?.body ?? null;
    if (!init?.redirect) redirectOption = input.redirect ?? 'follow';
    if (!init?.cache) cacheOption = input.cache;
    if (!init?.credentials) credentialsOption = input.credentials;
  }
  const headers = headersToPairs(headersInit) ?? [];
  validateRequestBody(method, body);
  const normalized = normalizeBody(body);
  applyDefaultContentType(headers, normalized?.contentType);
  applyCacheHeaders(headers, cacheOption);

  // Determine followRedirects based on redirect option
  const followRedirects = redirectOption === 'follow';
  const prefetchCacheTtlMs = validatePrefetchTtl(init?.prefetchCacheTtlMs);
  return {
    url,
    method: method?.toUpperCase() ?? 'GET',
    headers: headers.length > 0 ? headers : undefined,
    bodyString: normalized?.bodyString,
    bodyBytes: normalized?.bodyBytes,
    bodyFormData: normalized?.bodyFormData,
    followRedirects,
    credentials: credentialsOption,
    prefetchCacheTtlMs
  };
}

// Pure JS version of buildNitroRequest that doesnt use anything that breaks worklets. TODO: Merge this to use Same logic for Worklets and normal Fetch
function headersToPairsPure(headers) {
  'worklet';

  if (!headers) return undefined;
  const pairs = [];
  if (Array.isArray(headers)) {
    // Convert tuple pairs to objects if needed
    for (const entry of headers) {
      if (Array.isArray(entry) && entry.length >= 2) {
        pairs.push({
          key: String(entry[0]),
          value: String(entry[1])
        });
      } else if (entry && typeof entry === 'object' && 'key' in entry && 'value' in entry) {
        pairs.push(entry);
      }
    }
    return pairs;
  }

  // Check if it's a plain object (Record<string, string>) first
  // Plain objects don't have forEach, so check for its absence
  if (typeof headers === 'object' && headers !== null) {
    // Check if it's a Headers instance by checking for forEach method
    const hasForEach = typeof headers.forEach === 'function';
    if (hasForEach) {
      // Headers-like object (duck typing)
      headers.forEach((v, k) => pairs.push({
        key: k,
        value: v
      }));
      return pairs;
    } else {
      // Plain object (Record<string, string>)
      // Use Object.keys to iterate since Object.entries might not work in worklets
      const keys = Object.keys(headers);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = headers[k];
        if (v !== undefined) {
          pairs.push({
            key: k,
            value: String(v)
          });
        }
      }
      return pairs;
    }
  }
  return pairs;
}
// Pure JS version of buildNitroRequest that doesnt use anything that breaks worklets
function normalizeBodyPure(body) {
  'worklet';

  if (body == null) return undefined;
  if (typeof body === 'string') return {
    bodyString: body,
    contentType: TEXT_CONTENT_TYPE
  };

  // Check for URLSearchParams (duck typing)
  // It should be an object, have a toString method, and typically append/delete methods
  // But mainly we care about toString() returning the query string
  if (typeof body === 'object' && body !== null && typeof body.toString === 'function' && Object.prototype.toString.call(body) === '[object URLSearchParams]') {
    return {
      bodyString: body.toString(),
      contentType: FORM_CONTENT_TYPE
    };
  }

  // Check for ArrayBuffer (using toString tag to avoid instanceof)
  if (typeof ArrayBuffer !== 'undefined' && Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
    return {
      bodyBytes: body,
      contentType: BYTES_CONTENT_TYPE
    };
  }
  if (ArrayBuffer.isView(body)) {
    return {
      bodyBytes: viewToBuffer(body),
      contentType: BYTES_CONTENT_TYPE
    };
  }
  throw new Error('Unsupported body type for nitro fetch worklet (FormData is not available in worklets)');
}
// Pure JS version of buildNitroRequest that doesnt use anything that breaks worklets
export function buildNitroRequestPure(input, init) {
  'worklet';

  let url;
  let method;
  let headersInit;
  let body;

  // Check if input is URL-like without instanceof
  const isUrlObject = typeof input === 'object' && input !== null && Object.prototype.toString.call(input) === '[object URL]';
  if (typeof input === 'string' || isUrlObject) {
    url = String(input);
    method = init?.method;
    headersInit = init?.headers;
    body = init?.body ?? null;
  } else {
    // Request object
    const req = input;
    url = req.url;
    method = init?.method ?? req.method;
    headersInit = init?.headers ?? req.headers;
    // Clone body if needed – Request objects in RN typically allow direct access
    body = init?.body ?? null;
  }
  const headers = headersToPairsPure(headersInit) ?? [];
  validateRequestBody(method, body);
  const normalized = normalizeBodyPure(body);
  applyDefaultContentType(headers, normalized?.contentType);
  const inputRequest = typeof input === 'string' || isUrlObject ? undefined : input;
  applyCacheHeaders(headers, init?.cache ?? inputRequest?.cache);
  const prefetchCacheTtlMs = validatePrefetchTtl(init?.prefetchCacheTtlMs);
  return {
    url,
    method: method?.toUpperCase() ?? 'GET',
    headers: headers.length > 0 ? headers : undefined,
    bodyString: normalized?.bodyString,
    bodyBytes: normalized?.bodyBytes,
    followRedirects: (init?.redirect ?? inputRequest?.redirect ?? 'follow') === 'follow',
    credentials: init?.credentials ?? inputRequest?.credentials,
    prefetchCacheTtlMs
  };
}
function createAbortError() {
  const err = new Error('The operation was aborted.');
  err.name = 'AbortError';
  return err;
}
async function resolveRequestBody(input, init) {
  const request = typeof input === 'object' && input !== null && 'url' in input ? input : undefined;
  const inputBody = input instanceof NitroRequestClass ? rawBodyOf(input) : request?.body ?? request?._bodyInit;
  validateRequestBody(init?.method ?? request?.method, init?.body ?? inputBody);
  if (typeof input === 'string' || input instanceof URL) return init;
  if (input instanceof NitroRequestClass) {
    if (init?.body != null) return init;
    if (typeof ReadableStream !== 'undefined' && rawBodyOf(input) instanceof ReadableStream) {
      return {
        ...(init ?? {}),
        headers: init?.headers ?? input.headers,
        body: await input.arrayBuffer()
      };
    }
    const raw = consumeRawBodyOf(input);
    if (raw != null) {
      return {
        ...(init ?? {}),
        headers: init?.headers ?? input.headers,
        body: raw
      };
    }
    return init;
  }
  if (init?.body != null) return init;
  const req = input;
  if (req.bodyUsed) throw new TypeError('Request body has already been consumed.');
  if (typeof req.clone !== 'function') return init;
  const method = (init?.method ?? req.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return init;
  // Read bytes when supported: a standard Request need not expose _bodyInit,
  // and decoding an arbitrary binary body as text irreversibly changes it.
  const raw = req._bodyInit;
  if (req.body === null || raw === null) return init;
  if (isFormData(raw) && req instanceof Request) {
    // RN's whatwg-fetch Request constructor transfers the opaque FormData
    // body and marks its input consumed without trying to serialize it in JS.
    const owned = new Request(req);
    return {
      ...(init ?? {}),
      body: owned._bodyInit
    };
  }
  if (typeof req.arrayBuffer === 'function') {
    const bytes = await req.arrayBuffer();
    return {
      ...(init ?? {}),
      body: bytes
    };
  }
  return {
    ...(init ?? {}),
    body: await req.text()
  };
}
async function resolveBlobBody(init) {
  if (!init?.body) return init;
  if (typeof Blob !== 'undefined' && init.body instanceof Blob) {
    const blob = init.body;
    const bytes = await readBlob(blob);
    // Auto-set Content-Type from Blob.type if not already provided
    let headers = init.headers;
    if (blob.type) {
      const pairs = headersToPairs(headers) ?? [];
      const hasContentType = pairs.some(h => h.key.toLowerCase() === 'content-type');
      if (!hasContentType) {
        pairs.push({
          key: 'Content-Type',
          value: blob.type
        });
        headers = pairs.map(h => [h.key, h.value]);
      }
    }
    return {
      ...init,
      body: bytes,
      headers
    };
  }
  return init;
}

// http(s) -> native client; anything else is a local resource (hot path).
function isHttpUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  const c = url.charCodeAt(0);
  if (c !== 104 && c !== 72) return false; // not 'h'/'H'
  return /^https?:/i.test(url);
}
function getUrlString(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  const u = input?.url;
  return typeof u === 'string' ? u : String(input);
}
function base64ToBytes(b64) {
  const decode = globalThis.atob;
  if (typeof decode === 'function') {
    const bin = decode(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // base64 fallback for runtimes without a global atob.
  /* eslint-disable no-bitwise */
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let clean = b64.replace(/[\t\n\f\r ]/g, '');
  if (clean.length % 4 === 0) clean = clean.replace(/[=]{1,2}$/, '');
  if (clean.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(clean)) {
    throw new TypeError('Failed to fetch: invalid base64 data');
  }
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let p = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = buf << 6 | chars.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[p++] = buf >> bits & 0xff;
    }
  }
  return out;
  /* eslint-enable no-bitwise */
}
// Cached: our nitro-text-decoder if the app bundles it (aliased require keeps it optional, not a dep), else a global TextDecoder.
let _decoder;
function resolveTextDecoder() {
  if (_decoder !== undefined) return _decoder;
  try {
    const dynamicRequire = require;
    const mod = dynamicRequire('react-native-nitro-text-decoder');
    if (mod && typeof mod.TextDecoder === 'function') {
      _decoder = new mod.TextDecoder('utf-8', {
        fatal: true
      });
      return _decoder;
    }
  } catch {
    // optional, not bundled
  }
  const GlobalTextDecoder = globalThis.TextDecoder;
  if (typeof GlobalTextDecoder === 'function') {
    _decoder = new GlobalTextDecoder('utf-8', {
      fatal: true
    });
    return _decoder;
  }
  _decoder = null;
  return _decoder;
}

// data: text via a TextDecoder; null (bytes-only) + a one-time warn if none.
let _warnedNoTextDecoder = false;
function decodeUtf8(bytes) {
  const decoder = resolveTextDecoder();
  if (decoder) {
    try {
      return decoder.decode(bytes);
    } catch {
      return null; // invalid UTF-8 -> keep bytes only
    }
  }
  if (!_warnedNoTextDecoder) {
    _warnedNoTextDecoder = true;
    console.warn('[nitro-fetch] Reading a data: URL as text needs a TextDecoder. Install ' + 'react-native-nitro-text-decoder or expose a global TextDecoder. The ' + 'body is still available via response.arrayBuffer()/bytes().');
  }
  return null;
}

// Decode a data: URL into a synthetic 200 response, entirely in JS.
function decodeDataUrl(url) {
  // URL serialization performs UTF-8 percent-encoding. Decode percent escapes
  // as bytes below, not decodeURIComponent (which rejects non-UTF-8 payloads).
  const parsed = new URL(url);
  parsed.hash = '';
  url = parsed.href;
  const comma = url.indexOf(',');
  if (comma < 0) throw new TypeError('Failed to fetch: invalid data: URL');
  const meta = url.slice(5, comma); // strip leading "data:"
  const rawData = url.slice(comma + 1).replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const isBase64 = /;base64\s*$/i.test(meta);
  const mediaType = (isBase64 ? meta.replace(/;base64\s*$/i, '') : meta).trim() || 'text/plain;charset=US-ASCII';
  let bodyString;
  let bodyBytes;
  let length;
  if (isBase64) {
    const bytes = base64ToBytes(rawData);
    length = bytes.byteLength;
    // bytes for arrayBuffer/bytes; string for text/json when a decoder exists.
    bodyBytes = bytes.buffer;
    const decoded = decodeUtf8(bytes);
    if (decoded != null) bodyString = decoded;
  } else {
    const bytes = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
    bodyBytes = bytes.buffer;
    bodyString = decodeUtf8(bytes) ?? undefined;
    length = bytes.byteLength;
  }
  return {
    url,
    status: 200,
    statusText: 'OK',
    ok: true,
    redirected: false,
    headers: [{
      key: 'Content-Type',
      value: mediaType
    }, {
      key: 'Content-Length',
      value: String(length)
    }],
    bodyString,
    bodyBytes
  };
}

// Non-http(s): decode data: in JS, reject blob:, read file/content/path natively.
async function fetchLocalResource(req) {
  const url = req.url;
  if (url.slice(0, 5).toLowerCase() === 'data:') return decodeDataUrl(url);
  if (url.startsWith('blob:')) {
    throw new TypeError('nitro-fetch cannot read blob: URLs (the React Native blob registry is not ' + 'reachable from native). Read blobs with the platform fetch/FileReader instead.');
  }
  ensureClient();
  if (!client || typeof client.request !== 'function') {
    throw new Error('NitroFetch client not available');
  }
  return client.request(req);
}
async function nitroFetchRaw(input, init) {
  const signal = init?.signal;

  // Fast-abort: reject synchronously before any bridge work.
  if (signal?.aborted) {
    throw createAbortError();
  }
  const hasNative = typeof NitroFetchHybrid?.createClient === 'function';
  if (!hasNative) {
    // Let the platform consume standard Request inputs exactly once.
    const res = await platformFetch(input, init);
    const url = res.url ?? String(input);
    const bytes = await res.arrayBuffer();
    const headers = [];
    res.headers.forEach((v, k) => headers.push({
      key: k,
      value: v
    }));
    return {
      url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      redirected: res.redirected ?? false,
      headers,
      bodyBytes: bytes,
      bodyString: undefined
    };
  }
  init = await resolveRequestBody(input, init);
  init = await resolveBlobBody(init);
  // Preparation yields to JS; an abort here must not dispatch native work.
  if (signal?.aborted) throw createAbortError();
  const req = buildNitroRequest(input, init);

  // Route non-http(s) (data:/file://content://scheme-less) off the HTTP client.
  if (!isHttpUrl(req.url)) {
    return fetchLocalResource(req);
  }

  // Inspector: record start (zero cost when disabled — single boolean check)
  let inspectorId;
  if (NetworkInspector.isEnabled()) {
    inspectorId = String(Date.now()) + '-' + String(Math.random()).slice(2, 8);
    NetworkInspector._recordStart(inspectorId, req.url, req.method ?? 'GET', req.headers ?? [], req.bodyString);
  }

  // Only allocate a requestId when a signal is present — zero overhead otherwise.
  const requestId = signal ? String(Math.random()) : undefined;
  if (requestId) req.requestId = requestId;
  ensureClient();
  if (!client || typeof client.request !== 'function') throw new Error('NitroFetch client not available');
  let abortListener;
  try {
    const res = await (signal && requestId ? new Promise((resolve, reject) => {
      abortListener = () => {
        // A request may be joining a prefetch, or native cancellation may
        // race completion. Reject immediately without waiting for native.
        reject(createAbortError());
        try {
          client.cancelRequest(requestId);
        } catch {
          /* already torn down */
        }
      };
      signal.addEventListener('abort', abortListener, {
        once: true
      });
      if (signal.aborted) {
        abortListener();
        return;
      }
      Promise.resolve(client.request(req)).then(resolve, reject);
    }) : client.request(req));
    if (signal?.aborted) throw createAbortError();
    if (inspectorId) {
      NetworkInspector._recordEnd(inspectorId, res.status, res.statusText, res.headers ?? [], res.bodyString?.length ?? 0, undefined, res.bodyString ?? undefined);
    }
    return res;
  } catch (e) {
    if (inspectorId) {
      NetworkInspector._recordEnd(inspectorId, 0, '', [], 0, String(e));
    }
    // If the signal was aborted (either before or during the request),
    // surface a spec-compliant AbortError regardless of what native threw.
    if (signal?.aborted) {
      throw createAbortError();
    }
    throw e;
  } finally {
    // Idempotent cleanup — removeEventListener is a no-op if the listener
    // already fired (thanks to { once: true }) or was never added.
    if (signal && abortListener) {
      signal.removeEventListener('abort', abortListener);
    }
  }
}

// NitroHeaders is now imported from './Headers'

async function nitroStreamFetch(input, init) {
  const signal = init?.signal;
  if (signal?.aborted) {
    throw createAbortError();
  }
  const url = getUrlString(input);
  const src = input;
  const method = (init?.method ?? src?.method)?.toUpperCase() ?? 'GET';
  const headers = headersToPairs(init?.headers ?? src?.headers) ?? [];
  const normalized = normalizeBody(init?.body);
  applyDefaultContentType(headers, normalized?.contentType);
  applyCacheHeaders(headers, init?.cache);

  // Inspector: record start
  let inspectorId;
  if (NetworkInspector.isEnabled()) {
    inspectorId = String(Date.now()) + '-' + String(Math.random()).slice(2, 8);
    NetworkInspector._recordStart(inspectorId, url, method, headers, normalized?.bodyString);
  }
  const builder = NitroCronetSingleton.newUrlRequestBuilder(url);
  builder.setHttpMethod(method);
  if (init?.credentials === 'omit') builder.disableCookies();
  // prefetchKey is an internal cache key, never sent on the server
  headers.forEach(h => {
    if (h.key.toLowerCase() === 'prefetchkey') return;
    builder.addHeader(h.key, h.value);
  });
  if (normalized?.bodyBytes) builder.setUploadBody(normalized.bodyBytes);else if (normalized?.bodyString != null) builder.setUploadBody(normalized.bodyString);
  return new Promise((resolveResponse, rejectResponse) => {
    let streamController;
    let abortListener;
    const cleanupAbortListener = () => {
      if (!signal || !abortListener) return;
      signal.removeEventListener('abort', abortListener);
      abortListener = undefined;
    };
    let terminal = false;
    let streamBytesReceived = 0;
    let responseInfo;
    let request;
    const finishInspection = (info = responseInfo, error) => {
      if (inspectorId) {
        NetworkInspector._recordEnd(inspectorId, info?.httpStatusCode ?? 0, info?.httpStatusText ?? '', info?.allHeadersAsList ?? [], streamBytesReceived, error);
      }
    };
    const cancelNative = () => {
      try {
        request?.cancel();
      } catch {
        // The request may already be torn down.
      }
    };
    const stream = new ReadableStream({
      start(controller) {
        streamController = controller;
      },
      cancel() {
        if (terminal) return;
        terminal = true;
        cleanupAbortListener();
        finishInspection(undefined, 'The operation was aborted.');
        cancelNative();
      }
    });
    let responseResolved = false;
    let redirected = false;
    const fail = error => {
      if (terminal) return;
      terminal = true;
      cleanupAbortListener();
      finishInspection(undefined, error.message);
      if (!responseResolved) rejectResponse(error);
      streamController.error(error);
      cancelNative();
    };
    const resolve = (info, wasRedirected) => {
      responseInfo = info;
      const status = info.httpStatusCode;
      const responseHeaders = new NitroHeaders(info.allHeadersAsList ?? Object.entries(info.allHeaders).map(([key, value]) => ({
        key,
        value
      })));
      const response = new NitroResponse({
        url: info.url,
        ok: status >= 200 && status < 300,
        status,
        statusText: info.httpStatusText,
        headers: responseHeaders,
        redirected: wasRedirected,
        body: stream
      });
      responseResolved = true;
      resolveResponse(response);
    };
    builder.onRedirectReceived(info => {
      if (terminal) return;
      if (init?.redirect === 'error') {
        fail(new TypeError('Redirect encountered with redirect mode "error".'));
      } else if (init?.redirect === 'manual') {
        try {
          resolve(info, false);
          terminal = true;
          cleanupAbortListener();
          finishInspection(info);
          streamController.close();
          cancelNative();
        } catch (error) {
          fail(error);
        }
      } else {
        try {
          redirected = true;
          request?.followRedirect();
        } catch (error) {
          fail(error);
        }
      }
    });
    builder.onResponseStarted(info => {
      if (terminal || responseResolved) return;
      // Android/Cronet: kick off the first buffer read.
      // iOS/URLSession handles reading automatically so this is a no-op there.
      try {
        resolve(info, redirected);
        request?.read();
      } catch (error) {
        fail(error);
      }
    });
    builder.onReadCompleted((_info, byteBuffer, bytesRead) => {
      // A cancelled stream can still receive an in-flight native read.
      if (terminal) return;
      try {
        const chunk = new Uint8Array(byteBuffer, 0, bytesRead).slice();
        streamBytesReceived += bytesRead;
        streamController.enqueue(chunk);
        if (request && !request.isDone()) request.read();
      } catch (error) {
        fail(error);
      }
    });
    builder.onSucceeded(_info => {
      if (terminal) return;
      terminal = true;
      cleanupAbortListener();
      streamController.close();
      finishInspection(_info);
    });
    builder.onFailed((_info, error) => {
      const err = signal?.aborted ? createAbortError() : new Error(error.message);
      fail(err);
    });
    builder.onCanceled(() => {
      fail(createAbortError());
    });
    try {
      request = builder.build();
      if (signal) {
        abortListener = () => fail(createAbortError());
        signal.addEventListener('abort', abortListener, {
          once: true
        });
        if (signal.aborted) {
          abortListener();
          return;
        }
      }
      request.start();
    } catch (error) {
      fail(error);
    }
  });
}
export async function nitroFetch(input, init) {
  // Both standard and Nitro Request inputs carry defaults, including a signal.
  if (typeof input === 'object' && input !== null && 'url' in input) {
    init = {
      ...init,
      signal: init?.signal !== undefined ? init.signal : input.signal,
      redirect: init?.redirect ?? input.redirect,
      cache: init?.cache ?? input.cache,
      credentials: init?.credentials ?? input.credentials
    };
  }

  // Streaming is http(s)-only; local URLs fall through to nitroFetchRaw (check runs only when streaming).
  if (init?.stream === true && typeof NitroFetchHybrid?.createClient === 'function' && isHttpUrl(getUrlString(input))) {
    if (init?.signal?.aborted) throw createAbortError();
    init = await resolveRequestBody(input, init);
    init = await resolveBlobBody(init);
    return nitroStreamFetch(input, init);
  }
  const redirectOption = init?.redirect ?? 'follow';
  const res = await nitroFetchRaw(input, init);

  // Handle redirect: "error" — if we got a 3xx back (followRedirects was false), throw
  if (redirectOption === 'error' && res.status >= 300 && res.status < 400) {
    throw new TypeError(`redirect mode is "error": redirected request to "${res.url}"`);
  }
  const response = new NitroResponse({
    url: res.url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    redirected: res.redirected,
    headers: res.headers,
    bodyBytes: res.bodyBytes,
    bodyString: res.bodyString
  });
  return response;
}

// Start a native prefetch. Requires a `prefetchKey` header on the request.
export async function prefetch(input, init) {
  // If native implementation is not present yet, do nothing
  const hasNative = typeof NitroFetchHybrid?.createClient === 'function';
  if (!hasNative) return;
  init = await resolveRequestBody(input, init);
  init = await resolveBlobBody(init);

  // Build NitroRequest and ensure prefetchKey header exists
  const req = buildNitroRequest(input, init);
  const hasKey = req.headers?.some(h => h.key.toLowerCase() === 'prefetchkey') ?? false;
  // Also support passing prefetchKey via non-standard field on init
  const fromInit = init?.prefetchKey;
  if (!hasKey && fromInit) {
    req.headers = (req.headers ?? []).concat([{
      key: 'prefetchKey',
      value: fromInit
    }]);
  }
  const finalHasKey = req.headers?.some(h => h.key.toLowerCase() === 'prefetchkey');
  if (!finalHasKey) {
    throw new Error('prefetch requires a "prefetchKey" header');
  }

  // Ensure client and call native prefetch
  ensureClient();
  if (!client || typeof client.prefetch !== 'function') return;
  await client.prefetch(req);
}
const AUTOPREFETCH_QUEUE_KEY = 'nitrofetch_autoprefetch_queue';

// Persist a request to storage so native can prefetch it on app start.
// Entries embed request headers (may hold credentials) — stored encrypted at rest.
export async function prefetchOnAppStart(input, init) {
  // Resolve request and prefetchKey
  init = await resolveRequestBody(input, init);
  init = await resolveBlobBody(init);
  const req = buildNitroRequest(input, init);
  const fromHeader = req.headers?.find(h => h.key.toLowerCase() === 'prefetchkey')?.value;
  const fromInit = init?.prefetchKey;
  const prefetchKey = fromHeader ?? fromInit;
  if (!prefetchKey) {
    throw new Error('prefetchOnAppStart requires a "prefetchKey" (header or init.prefetchKey)');
  }

  // Convert headers to a plain object for storage
  const headersObj = (req.headers ?? []).reduce((acc, {
    key,
    value
  }) => {
    acc[String(key)] = String(value);
    return acc;
  }, {});
  const entry = {
    url: req.url,
    prefetchKey,
    headers: headersObj
  };
  if (req.method && req.method !== 'GET') entry.method = req.method;
  if (req.bodyString !== undefined) entry.bodyString = req.bodyString;
  if (req.bodyBytes && req.bodyBytes.byteLength > 0) entry.bodyBytesBase64 = base64FromBytes(new Uint8Array(req.bodyBytes));
  if (req.bodyFormData && req.bodyFormData.length > 0) entry.bodyFormData = req.bodyFormData;
  if (typeof req.timeoutMs === 'number') entry.timeoutMs = req.timeoutMs;
  if (req.followRedirects === false) entry.followRedirects = false;
  if (req.credentials && req.credentials !== 'same-origin') entry.credentials = req.credentials;
  if (typeof req.prefetchCacheTtlMs === 'number') entry.prefetchCacheTtlMs = req.prefetchCacheTtlMs;

  // Write or append to storage queue
  try {
    let arr = [];
    try {
      const raw = NativeStorageSingleton.getSecureString(AUTOPREFETCH_QUEUE_KEY);
      if (raw) arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch {
      arr = [];
    }
    if (arr.some(e => e && e.prefetchKey === prefetchKey)) {
      arr = arr.filter(e => e && e.prefetchKey !== prefetchKey);
    }
    arr.push(entry);
    NativeStorageSingleton.setSecureString(AUTOPREFETCH_QUEUE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn('Failed to persist prefetch queue', e);
  }
}

// Remove one entry (by prefetchKey) from the auto-prefetch queue.
export async function removeFromAutoPrefetch(prefetchKey) {
  try {
    let arr = [];
    try {
      const raw = NativeStorageSingleton.getSecureString(AUTOPREFETCH_QUEUE_KEY);
      if (raw) arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch {
      arr = [];
    }
    const next = arr.filter(e => e && e.prefetchKey !== prefetchKey);
    if (next.length === 0) {
      NativeStorageSingleton.removeSecureString(AUTOPREFETCH_QUEUE_KEY);
    } else if (next.length !== arr.length) {
      NativeStorageSingleton.setSecureString(AUTOPREFETCH_QUEUE_KEY, JSON.stringify(next));
    }
  } catch (e) {
    console.warn('Failed to remove from prefetch queue', e);
  }
}

// Remove all entries from the auto-prefetch queue.
export async function removeAllFromAutoprefetch() {
  try {
    NativeStorageSingleton.removeSecureString(AUTOPREFETCH_QUEUE_KEY);
  } catch (e) {
    console.warn('Failed to clear prefetch queue', e);
  }
}
export function __readAutoPrefetchQueue() {
  try {
    const raw = NativeStorageSingleton.getSecureString(AUTOPREFETCH_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Optional off-thread processing using react-native-worklets

let nitroRuntime;
function ensureWorkletRuntime(name = 'nitro-fetch') {
  try {
    const {
      createWorkletRuntime
    } = require('react-native-worklets');
    nitroRuntime = nitroRuntime ?? createWorkletRuntime(name);
    return nitroRuntime;
  } catch {
    console.warn('react-native-worklets not available');
    return undefined;
  }
}
export async function nitroFetchOnWorklet(input, init, mapWorklet, options) {
  const preferBytes = options?.preferBytes === true; // default true
  let runOnRuntimeAsync;
  let rt;
  try {
    rt = ensureWorkletRuntime(options?.runtimeName);
    const worklets = require('react-native-worklets');
    runOnRuntimeAsync = worklets.runOnRuntimeAsync;
  } catch {
    // Module not available
  }
  // Fallback: if runtime is not available, do the work on JS
  if (!runOnRuntimeAsync || !rt) {
    console.warn('nitroFetchOnWorklet: no runtime, mapping on JS thread');
    const res = await nitroFetchRaw(input, init);
    const payload = {
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      redirected: res.redirected,
      headers: res.headers,
      bodyBytes: preferBytes ? res.bodyBytes : undefined,
      bodyString: preferBytes ? undefined : res.bodyString
    };
    return mapWorklet(payload);
  }
  return await runOnRuntimeAsync(rt, () => {
    'worklet';

    const nitroFetchClient = NitroFetchHybrid.createClient();
    const request = buildNitroRequestPure(input, init);
    const res = nitroFetchClient.requestSync(request);
    const payload = {
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      redirected: res.redirected,
      headers: res.headers,
      bodyBytes: preferBytes ? res.bodyBytes : undefined,
      bodyString: preferBytes ? undefined : res.bodyString
    };
    return mapWorklet(payload);
  });
}
export { NitroHeaders } from "./Headers.js";
export { NitroResponse } from "./Response.js";
export { NitroRequest as NitroRequestClass } from "./Request.js";
//# sourceMappingURL=fetch.js.map