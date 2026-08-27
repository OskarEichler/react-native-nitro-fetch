"use strict";

import { NitroHeaders } from "./Headers.js";
import { Body } from "./Body.js";
export class NitroRequest {
  _bodyUsed = false;
  constructor(input, init) {
    if (input instanceof NitroRequest) {
      if (init?.body == null) input._throwIfBodyUsed();
      // Clone from another NitroRequest
      this.url = input.url;
      this.method = (init?.method ?? input.method).toUpperCase();
      this.headers = new NitroHeaders(init?.headers ? init.headers instanceof NitroHeaders ? init.headers : init.headers : input.headers);
      this.redirect = init?.redirect ?? input.redirect;
      this.signal = init?.signal === null ? new AbortController().signal : init?.signal ?? input.signal;
      this.cache = init?.cache ?? input.cache;
      this.credentials = init?.credentials ?? input.credentials;
      this.mode = init?.mode ?? input.mode;
      this.referrer = init?.referrer ?? input.referrer;
      this.referrerPolicy = init?.referrerPolicy ?? input.referrerPolicy;
      this.integrity = init?.integrity ?? input.integrity;
      this.keepalive = init?.keepalive ?? input.keepalive;
      this._body = init?.body ?? input._body;
    } else if (typeof input === 'object' && input !== null && 'url' in input && 'method' in input && 'headers' in input && !(input instanceof URL)) {
      // Construct from a Request-like object (standard Request or duck-typed)
      this.url = input.url;
      this.method = (init?.method ?? input.method).toUpperCase();
      this.headers = new NitroHeaders(init?.headers ? init.headers instanceof NitroHeaders ? init.headers : init.headers : input.headers);
      this.redirect = init?.redirect ?? input.redirect ?? 'follow';
      this.signal = init?.signal === null ? new AbortController().signal : init?.signal ?? input.signal;
      this.cache = init?.cache ?? input.cache ?? 'default';
      this.credentials = init?.credentials ?? input.credentials ?? 'same-origin';
      this.mode = init?.mode ?? input.mode ?? 'cors';
      this.referrer = init?.referrer ?? input.referrer ?? 'about:client';
      this.referrerPolicy = init?.referrerPolicy ?? input.referrerPolicy ?? '';
      this.integrity = init?.integrity ?? input.integrity ?? '';
      this.keepalive = init?.keepalive ?? input.keepalive ?? false;
      if (init?.body == null && (input.bodyUsed || input.body?.locked)) {
        throw new TypeError('Request body has already been consumed or is locked.');
      }
      if (init?.body != null) {
        this._body = init.body;
      } else {
        this._body = input.body ?? input._bodyInit ?? null;
      }
    } else {
      this.url = String(input);
      this.method = (init?.method ?? 'GET').toUpperCase();
      this.headers = new NitroHeaders(init?.headers ? init.headers instanceof NitroHeaders ? init.headers : init.headers : undefined);
      this.redirect = init?.redirect ?? 'follow';
      this.signal = init?.signal ?? new AbortController().signal;
      this.cache = init?.cache ?? 'default';
      this.credentials = init?.credentials ?? 'same-origin';
      this.mode = init?.mode ?? 'cors';
      this.referrer = init?.referrer ?? 'about:client';
      this.referrerPolicy = init?.referrerPolicy ?? '';
      this.integrity = init?.integrity ?? '';
      this.keepalive = init?.keepalive ?? false;
      this._body = init?.body ?? null;
    }
    this.destination = '';
    if ((this.method === 'GET' || this.method === 'HEAD') && this._body != null) {
      throw new TypeError('GET and HEAD requests cannot have a body.');
    }
    // Transfer only after validation, so a rejected construction leaves the
    // input usable. RN's Request stores opaque FormData in _bodyInit.
    if (input instanceof Request && init?.body == null) {
      const owned = new Request(input);
      this._body = owned.body ?? owned._bodyInit ?? null;
    }
    this._bodyState = new Body();
    if (typeof URLSearchParams !== 'undefined' && this._body instanceof URLSearchParams) {
      this._body = this._body.toString();
      if (!this.headers.has('content-type')) this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    }
    if (typeof this._body === 'string') {
      this._bodyState = new Body({
        text: this._body
      });
      if (!this.headers.has('content-type')) this.headers.set('content-type', 'text/plain;charset=UTF-8');
    } else if (this._body instanceof ArrayBuffer || ArrayBuffer.isView(this._body)) {
      const value = this._body;
      this._body = value instanceof ArrayBuffer ? value.slice(0) : value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      this._bodyState = new Body({
        bytes: this._body
      });
    } else if (typeof Blob !== 'undefined' && this._body instanceof Blob) {
      this._bodyState = new Body({
        blob: this._body
      });
      if (this._body.type && !this.headers.has('content-type')) this.headers.set('content-type', this._body.type);
    } else if (typeof ReadableStream !== 'undefined' && this._body instanceof ReadableStream) {
      this._bodyState = new Body({
        stream: this._body
      });
    }
    if (input instanceof NitroRequest && init?.body == null && this._body != null) {
      input._bodyUsed = true;
    }
  }
  get bodyUsed() {
    return this._bodyUsed || this._bodyState.used;
  }
  get body() {
    return this._bodyState.stream;
  }
  _throwIfBodyUsed() {
    if (this.bodyUsed) {
      throw new TypeError('Body has already been consumed.');
    }
    this._bodyState.assertUsable();
  }
  async text() {
    this._consumeBody();
    return this._bodyState.text();
  }
  async json() {
    return JSON.parse(await this.text());
  }
  async arrayBuffer() {
    this._consumeBody();
    return this._bodyState.arrayBuffer();
  }
  async blob() {
    this._consumeBody();
    const contentType = this.headers.get('content-type') ?? '';
    return this._bodyState.blob(contentType);
  }
  async bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }
  _consumeBody() {
    this._throwIfBodyUsed();
    if (typeof FormData !== 'undefined' && this._body instanceof FormData) {
      throw new TypeError('Reading FormData bodies is not supported in NitroRequest.');
    }
    this._bodyUsed = this._body != null;
  }
  clone() {
    this._throwIfBodyUsed();
    const clone = new NitroRequest(this, {
      body: this._body
    });
    if (typeof ReadableStream !== 'undefined' && this._body instanceof ReadableStream) {
      clone._bodyState = this._bodyState.clone();
      this._body = this._bodyState.stream;
      clone._body = clone._bodyState.stream;
    }
    return clone;
  }
  async formData() {
    throw new TypeError('formData() is not supported in NitroRequest');
  }
}

// Raw BodyInit for buildNitroRequest; the spec `body` getter hands back a stream.
export function rawBodyOf(req) {
  return req._body;
}
export function consumeRawBodyOf(req) {
  if (req.bodyUsed) throw new TypeError('Request body has already been consumed.');
  const internal = req;
  internal._bodyState.assertUsable();
  if (internal._body != null) internal._bodyUsed = true;
  return internal._body;
}
//# sourceMappingURL=Request.js.map