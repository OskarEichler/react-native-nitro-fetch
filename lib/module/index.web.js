"use strict";

// Web entry for react-native-nitro-fetch.
// Native (Cronet/URLSession) is unavailable on the web, so we delegate to the
// browser's built-in fetch and stub native-only APIs with console.warn.

import { platformFetch } from "./platformFetch.js";
import { utf8ToString } from "./utf8.js";
export { NitroHeaders as Headers } from "./Headers.js";
export { NitroResponse as Response } from "./Response.js";
export { NitroRequest as Request } from "./Request.js";
export { NetworkInspector } from "./NetworkInspector.js";
export { generateCurl } from "./CurlGenerator.js";
export { profileFetch } from "./HermesProfiler.js";
export async function fetch(input, init) {
  return platformFetch(input, init);
}
export async function nitroFetchOnWorklet(input, init, mapWorklet, _options) {
  console.warn('nitroFetchOnWorklet: worklets are not available on web; running on the JS thread');
  const res = await fetch(input, init);
  const bodyBytes = await res.arrayBuffer();
  let bodyString;
  try {
    bodyString = utf8ToString(new Uint8Array(bodyBytes));
  } catch {
    bodyString = undefined;
  }
  const headers = [];
  res.headers.forEach((v, k) => headers.push({
    key: k,
    value: v
  }));
  return mapWorklet({
    url: res.url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    redirected: res.redirected ?? false,
    headers,
    bodyBytes,
    bodyString
  });
}
export async function prefetch(_input, _init) {
  console.warn('prefetch is not available on web');
}
export async function prefetchOnAppStart(_input, _init) {
  console.warn('prefetchOnAppStart is not available on web');
}
export async function removeFromAutoPrefetch(_prefetchKey) {
  console.warn('removeFromAutoPrefetch is not available on web');
}
export async function removeAllFromAutoprefetch() {
  console.warn('removeAllFromAutoprefetch is not available on web');
}
export const NitroFetch = new Proxy({}, {
  get(_target, prop) {
    console.warn(`NitroFetch.${String(prop)} is not available on web`);
    return undefined;
  }
});
export function registerTokenRefresh(_options) {
  console.warn('registerTokenRefresh is not available on web');
}
export function clearTokenRefresh(_target) {
  console.warn('clearTokenRefresh is not available on web');
}
export async function callRefreshEndpoint(_config) {
  console.warn('callRefreshEndpoint is not available on web');
  return {};
}
export function getStoredTokenRefreshConfig(_target) {
  console.warn('getStoredTokenRefreshConfig is not available on web');
  return null;
}
export function getNestedField(obj, dotPath) {
  const parts = dotPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current != null ? String(current) : undefined;
}
export function applyTemplate(template, value) {
  return template.replace(/\{\{value\}\}/g, () => value);
}
//# sourceMappingURL=index.web.js.map