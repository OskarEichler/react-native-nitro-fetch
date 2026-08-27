"use strict";

import { stringToUTF8, utf8ToString } from "./utf8.js";
import { bytesToBlob } from './blob';
export function readBlob(blob) {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject(new TypeError('Blob reading was aborted.'));
    reader.readAsArrayBuffer(blob);
  });
}

/** Shared consumption state for buffered, Blob and streaming response bodies. */
export class Body {
  state = {
    used: false
  };
  constructor(source = {}) {
    this.source = source;
  }
  get present() {
    return this.source.bytes != null || this.source.text != null || this.source.stream != null || this.source.blob != null;
  }
  get used() {
    return this.state.used;
  }
  assertUsable() {
    if (this.used || this.exposed?.locked || this.source.stream?.locked) {
      throw new TypeError('Body has already been consumed or is locked.');
    }
  }
  get stream() {
    if (!this.present) return null;
    if (this.exposed) return this.exposed;
    // Capture state rather than `this`: tee() replaces the original body's
    // state, and reading its old stream must not disturb the new branch.
    const source = this.source;
    const state = this.state;
    const alreadyUsed = state.used;
    let reader;
    this.exposed = new ReadableStream({
      async pull(controller) {
        state.used = true;
        if (alreadyUsed) {
          controller.close();
          return;
        }
        if (source.stream) {
          reader ??= source.stream.getReader();
          try {
            const {
              done,
              value
            } = await reader.read();
            if (done) {
              reader.releaseLock();
              controller.close();
            } else {
              // Default stream tee() shares chunks; each exposed branch
              // needs independent bytes, as does a buffered body reader.
              controller.enqueue(value.slice());
            }
          } catch (error) {
            reader.releaseLock();
            throw error;
          }
        } else {
          const bytes = source.blob ? new Uint8Array(await readBlob(source.blob)) : source.bytes ? new Uint8Array(source.bytes.slice(0)) : stringToUTF8(source.text ?? '');
          controller.enqueue(bytes);
          controller.close();
        }
      },
      async cancel(reason) {
        state.used = true;
        if (reader) {
          try {
            await reader.cancel(reason);
          } finally {
            reader.releaseLock();
          }
        } else {
          await source.stream?.cancel(reason);
        }
      }
    },
    // Do not mark a body used merely because its getter was accessed.
    {
      highWaterMark: 0
    });
    return this.exposed;
  }
  async text() {
    this.assertUsable();
    if (!this.exposed && !this.source.stream && !this.source.blob) {
      this.state.used = this.present;
      if (this.source.text != null) {
        // Fetch text decoding strips a leading UTF-8 BOM; native string fast
        // paths must match the byte decoder without re-encoding the body.
        const text = this.source.text;
        return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
      }
      return this.source.bytes ? utf8ToString(new Uint8Array(this.source.bytes)) : '';
    }
    return utf8ToString(new Uint8Array(await this.arrayBuffer()));
  }
  async arrayBuffer() {
    this.assertUsable();
    if (!this.exposed && !this.source.stream) {
      this.state.used = this.present;
      if (this.source.blob) return readBlob(this.source.blob);
      if (this.source.bytes) return this.source.bytes.slice(0);
      const bytes = stringToUTF8(this.source.text ?? '');
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    const stream = this.stream;
    this.state.used = true;
    const reader = stream.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.byteLength;
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  }
  async blob(type) {
    this.assertUsable();
    if (!this.exposed && !this.source.stream && !this.source.bytes) {
      this.state.used = this.present;
      if (this.source.blob) {
        return this.source.blob.slice(0, this.source.blob.size, type);
      }
      // Keep text-backed blobs on the JS path; no UTF-8/base64 native roundtrip.
      return new Blob([this.source.text ?? ''], {
        type
      });
    }
    return bytesToBlob(await this.arrayBuffer(), type);
  }
  clone() {
    this.assertUsable();
    if (!this.exposed && !this.source.stream) {
      // Buffered sources are private; arrayBuffer() and stream chunks copy
      // before exposing mutable bytes. Blob and string sources are immutable.
      return new Body(this.source);
    }
    const [original, clone] = this.stream.tee();
    this.source = {
      stream: original
    };
    this.exposed = undefined;
    this.state = {
      used: false
    };
    return new Body({
      stream: clone
    });
  }
}
//# sourceMappingURL=Body.js.map