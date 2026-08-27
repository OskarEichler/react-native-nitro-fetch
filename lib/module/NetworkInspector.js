"use strict";

import { generateCurl } from "./CurlGenerator.js";
class NetworkInspectorImpl {
  _enabled = false;
  _entries = [];
  _maxEntries = 500;
  _maxBodyCapture = 4096;
  _maxMessagesPerSocket = 100;
  _listeners = new Set();
  enable(options) {
    for (const [name, value] of Object.entries(options ?? {})) {
      if (value != null && (!Number.isSafeInteger(value) || value < 0)) {
        throw new RangeError(`${name} must be a non-negative safe integer.`);
      }
    }
    this._enabled = true;
    if (options?.maxEntries != null) this._maxEntries = options.maxEntries;
    if (options?.maxBodyCapture != null) this._maxBodyCapture = options.maxBodyCapture;
    if (options?.maxMessagesPerSocket != null) {
      this._maxMessagesPerSocket = options.maxMessagesPerSocket;
      for (const entry of this._entries) {
        if (entry.type === 'websocket') this._trimMessages(entry);
      }
    }
    this._trimEntries();
  }
  disable() {
    this._enabled = false;
  }
  isEnabled() {
    return this._enabled;
  }
  getEntries() {
    return this._entries;
  }
  getHttpEntries() {
    return this._entries.filter(e => e.type === 'http');
  }
  getWebSocketEntries() {
    return this._entries.filter(e => e.type === 'websocket');
  }
  getEntry(id) {
    return this._entries.find(e => e.id === id);
  }
  clear() {
    this._entries = [];
  }
  onEntry(callback) {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }
  _notify(entry) {
    for (const cb of this._listeners) {
      try {
        cb(entry);
      } catch {
        // swallow listener errors
      }
    }
  }
  _trimEntries() {
    if (this._entries.length > this._maxEntries) {
      this._entries.splice(0, this._entries.length - this._maxEntries);
    }
  }
  _trimMessages(entry) {
    if (entry.messages.length > this._maxMessagesPerSocket) {
      entry.messages.splice(0, entry.messages.length - this._maxMessagesPerSocket);
    }
  }

  // --- HTTP recording ---

  _recordStart(id, url, method, headers, body) {
    if (!this._enabled) return;
    const bodySize = body ? body.length : 0;
    const capturedBody = body?.slice(0, this._maxBodyCapture);
    const entry = {
      id,
      type: 'http',
      url,
      method,
      requestHeaders: headers.map(h => ({
        key: h.key,
        value: h.value
      })),
      requestBody: capturedBody,
      requestBodySize: bodySize,
      status: 0,
      statusText: '',
      responseHeaders: [],
      responseBodySize: 0,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      curl: generateCurl({
        url,
        method,
        headers,
        body: capturedBody
      }) + (bodySize > this._maxBodyCapture ? ' # Request body truncated by maxBodyCapture; not a complete reproduction.' : '')
    };
    this._entries.push(entry);
    this._trimEntries();
  }
  _recordEnd(id, status, statusText, headers, bodySize, error, responseBody) {
    if (!this._enabled) return;
    const entry = this._entries.find(e => e.id === id && e.type === 'http');
    if (!entry) return;
    entry.status = status;
    entry.statusText = statusText;
    entry.responseHeaders = headers.map(h => ({
      key: h.key,
      value: h.value
    }));
    entry.responseBodySize = bodySize;
    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    if (error) entry.error = error;
    if (responseBody != null) {
      entry.responseBody = responseBody.slice(0, this._maxBodyCapture);
    }
    this._notify(entry);
  }

  // --- WebSocket recording ---

  _recordWsOpen(id, url, protocols, headers) {
    if (!this._enabled) return;
    const entry = {
      id,
      type: 'websocket',
      url,
      protocols,
      requestHeaders: headers.map(h => ({
        key: h.key,
        value: h.value
      })),
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      readyState: 'CONNECTING',
      messages: [],
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0
    };
    this._entries.push(entry);
    this._trimEntries();
    this._notify(entry);
  }
  _recordWsConnected(id) {
    if (!this._enabled) return;
    const entry = this._entries.find(e => e.id === id && e.type === 'websocket');
    if (!entry) return;
    entry.readyState = 'OPEN';
    this._notify(entry);
  }
  _recordWsMessage(id, direction, data, size, isBinary) {
    if (!this._enabled) return;
    const entry = this._entries.find(e => e.id === id && e.type === 'websocket');
    if (!entry) return;
    entry.messages.push({
      direction,
      data: data.slice(0, this._maxBodyCapture),
      size,
      isBinary,
      timestamp: performance.now()
    });
    this._trimMessages(entry);
    if (direction === 'sent') {
      entry.messagesSent++;
      entry.bytesSent += size;
    } else {
      entry.messagesReceived++;
      entry.bytesReceived += size;
    }
    this._notify(entry);
  }
  _recordWsClose(id, code, reason) {
    if (!this._enabled) return;
    const entry = this._entries.find(e => e.id === id && e.type === 'websocket');
    if (!entry) return;
    entry.readyState = 'CLOSED';
    entry.closeCode = code;
    entry.closeReason = reason;
    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    this._notify(entry);
  }
  _recordWsError(id, error) {
    if (!this._enabled) return;
    const entry = this._entries.find(e => e.id === id && e.type === 'websocket');
    if (!entry) return;
    entry.error = error;
    this._notify(entry);
  }
}
export const NetworkInspector = new NetworkInspectorImpl();
//# sourceMappingURL=NetworkInspector.js.map