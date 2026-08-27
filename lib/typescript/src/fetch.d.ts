import 'web-streams-polyfill/dist/polyfill.js';
import type { NitroHeader, NitroRequest as NitroRequestNative } from './NitroFetch.nitro';
import type { RequestRedirect, RequestCache } from './Request';
export declare function buildNitroRequestPure(input: RequestInfo | URL, init?: RequestInit & {
    prefetchCacheTtlMs?: number;
}): NitroRequestNative;
export declare function nitroFetch(input: RequestInfo | URL, init?: RequestInit & {
    /**
     * Opt in to the streaming transport. Required for SSE, token streams, or any
     * progressive body — omitting it is silent, not an error.
     *
     * When `true` (http(s) URLs only), the promise resolves as soon as response
     * headers arrive and `response.body` emits one chunk per native read.
     *
     * When omitted or `false`, the whole body is buffered natively and the
     * promise resolves only after the last byte. `response.body` is still a
     * `ReadableStream`, so a reader loop compiles and parses every frame
     * correctly — but it enqueues the entire body as a single chunk and closes.
     * Nothing arrives early.
     *
     * Not a free upgrade: the streaming transport is a separate native client.
     * It does not consult the prefetch cache. On iOS, body delivery is
     * push-based and does not apply backpressure to URLSession.
     *
     * @default false
     */
    stream?: boolean;
    redirect?: RequestRedirect;
    cache?: RequestCache;
    prefetchCacheTtlMs?: number;
}): Promise<Response>;
export declare function prefetch(input: RequestInfo | URL, init?: RequestInit & {
    prefetchKey?: string;
    prefetchCacheTtlMs?: number;
}): Promise<void>;
export declare function prefetchOnAppStart(input: RequestInfo | URL, init?: RequestInit & {
    prefetchKey?: string;
    prefetchCacheTtlMs?: number;
}): Promise<void>;
export declare function removeFromAutoPrefetch(prefetchKey: string): Promise<void>;
export declare function removeAllFromAutoprefetch(): Promise<void>;
export declare function __readAutoPrefetchQueue(): Array<Record<string, any>>;
export type NitroWorkletMapper<T> = (payload: {
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
    redirected: boolean;
    headers: NitroHeader[];
    bodyBytes?: ArrayBuffer;
    bodyString?: string;
}) => T;
export declare function nitroFetchOnWorklet<T>(input: RequestInfo | URL, init: RequestInit | undefined, mapWorklet: NitroWorkletMapper<T>, options?: {
    preferBytes?: boolean;
    runtimeName?: string;
}): Promise<T>;
export type { NitroFormDataPart } from './NitroFetch.nitro';
export type { NitroRequest as NitroRequestNativeType, NitroResponse as NitroResponseNativeType, } from './NitroFetch.nitro';
export { NitroHeaders } from './Headers';
export { NitroResponse } from './Response';
export { NitroRequest as NitroRequestClass } from './Request';
export type { RequestRedirect, RequestCache } from './Request';
//# sourceMappingURL=fetch.d.ts.map