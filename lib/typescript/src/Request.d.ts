import { NitroHeaders } from './Headers';
export type RequestRedirect = 'follow' | 'error' | 'manual';
export type RequestCache = 'default' | 'no-store' | 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached';
export interface NitroRequestInit {
    method?: string;
    headers?: HeadersInit | NitroHeaders;
    body?: BodyInit | null;
    redirect?: RequestRedirect;
    signal?: AbortSignal | null;
    cache?: RequestCache;
    credentials?: RequestCredentials;
    mode?: RequestMode;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    integrity?: string;
    keepalive?: boolean;
}
export declare class NitroRequest {
    readonly url: string;
    readonly method: string;
    readonly headers: NitroHeaders;
    readonly redirect: RequestRedirect;
    readonly signal: AbortSignal;
    readonly cache: RequestCache;
    readonly credentials: RequestCredentials;
    readonly mode: RequestMode;
    readonly referrer: string;
    readonly referrerPolicy: ReferrerPolicy;
    readonly integrity: string;
    readonly keepalive: boolean;
    readonly destination: RequestDestination;
    private _body;
    private _bodyState;
    private _bodyUsed;
    constructor(input: string | URL | NitroRequest | Request, init?: NitroRequestInit);
    get bodyUsed(): boolean;
    get body(): ReadableStream<Uint8Array<ArrayBuffer>> | null;
    private _throwIfBodyUsed;
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    bytes(): Promise<Uint8Array<ArrayBuffer>>;
    private _consumeBody;
    clone(): NitroRequest;
    formData(): Promise<never>;
}
export declare function rawBodyOf(req: NitroRequest): BodyInit | null;
export declare function consumeRawBodyOf(req: NitroRequest): BodyInit | null;
//# sourceMappingURL=Request.d.ts.map