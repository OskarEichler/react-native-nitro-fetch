import type { RequestRedirect, RequestCache } from './Request';
export { NitroHeaders as Headers } from './Headers';
export { NitroResponse as Response } from './Response';
export { NitroRequest as Request } from './Request';
export type { RequestRedirect, RequestCache } from './Request';
export { NetworkInspector } from './NetworkInspector';
export type { NetworkEntry, NetworkEntryCallback, WebSocketEntry, WebSocketMessage, InspectorEntry, } from './NetworkInspector';
export { generateCurl } from './CurlGenerator';
export type { CurlOptions } from './CurlGenerator';
export { profileFetch } from './HermesProfiler';
export type { ProfileResult } from './HermesProfiler';
export type { NitroFormDataPart } from './NitroFetch.nitro';
export type { NitroRequest as NitroRequest, NitroResponse as NitroResponse, } from './NitroFetch.nitro';
export type TokenRefreshConfig = {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'json' | 'text';
    mappings?: {
        jsonPath: string;
        header: string;
        valueTemplate?: string;
    }[];
    compositeHeaders?: {
        header: string;
        template: string;
        paths: Record<string, string>;
    }[];
};
export declare function fetch(input: RequestInfo | URL, init?: RequestInit & {
    /**
     * Accepted for parity with the native build and ignored on web — the
     * platform `fetch` always streams `response.body`.
     */
    stream?: boolean;
    redirect?: RequestRedirect;
    cache?: RequestCache;
    prefetchCacheTtlMs?: number;
}): Promise<Response>;
export type NitroWorkletMapper<T> = (payload: {
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
    redirected: boolean;
    headers: {
        key: string;
        value: string;
    }[];
    bodyBytes?: ArrayBuffer;
    bodyString?: string;
}) => T;
export declare function nitroFetchOnWorklet<T>(input: RequestInfo | URL, init: RequestInit | undefined, mapWorklet: NitroWorkletMapper<T>, _options?: {
    preferBytes?: boolean;
    runtimeName?: string;
}): Promise<T>;
export declare function prefetch(_input: RequestInfo | URL, _init?: RequestInit & {
    prefetchKey?: string;
    prefetchCacheTtlMs?: number;
}): Promise<void>;
export declare function prefetchOnAppStart(_input: RequestInfo | URL, _init?: RequestInit & {
    prefetchKey?: string;
    prefetchCacheTtlMs?: number;
}): Promise<void>;
export declare function removeFromAutoPrefetch(_prefetchKey: string): Promise<void>;
export declare function removeAllFromAutoprefetch(): Promise<void>;
export declare const NitroFetch: unknown;
export declare function registerTokenRefresh(_options: {
    target: 'websocket' | 'fetch' | 'all';
} & TokenRefreshConfig): void;
export declare function clearTokenRefresh(_target?: 'websocket' | 'fetch' | 'all'): void;
export declare function callRefreshEndpoint(_config: TokenRefreshConfig): Promise<Record<string, string>>;
export declare function getStoredTokenRefreshConfig(_target: 'websocket' | 'fetch'): TokenRefreshConfig | null;
export declare function getNestedField(obj: unknown, dotPath: string): string | undefined;
export declare function applyTemplate(template: string, value: string): string;
//# sourceMappingURL=index.web.d.ts.map