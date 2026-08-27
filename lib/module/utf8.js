"use strict";

let encoder;
let decoder;
const NITRO_TEXT_DECODER_PKG = 'react-native-nitro-text-decoder';
function loadOptionalTextCodec() {
  try {
    // Keep the dependency optional without runtime code generation. Apps
    // using Metro should install global codecs explicitly when needed.
    const dynamicRequire = require;
    return dynamicRequire(NITRO_TEXT_DECODER_PKG);
  } catch {
    return {};
  }
}
export function stringToUTF8(str) {
  if (str.length === 0) return new Uint8Array(0);
  if (!encoder) {
    const Encoder = globalThis.TextEncoder ?? loadOptionalTextCodec().TextEncoder;
    if (!Encoder) {
      throw new TypeError('TextEncoder is unavailable; install a UTF-8 codec polyfill.');
    }
    encoder = new Encoder();
  }
  return encoder.encode(str);
}
export function utf8ToString(bytes) {
  if (bytes.byteLength === 0) return '';
  if (!decoder) {
    const Decoder = globalThis.TextDecoder ?? loadOptionalTextCodec().TextDecoder;
    if (!Decoder) {
      throw new TypeError('TextDecoder is unavailable; install a UTF-8 codec polyfill.');
    }
    decoder = new Decoder();
  }
  // Non-streaming decode resets decoder state between independent bodies.
  return decoder.decode(bytes);
}
//# sourceMappingURL=utf8.js.map