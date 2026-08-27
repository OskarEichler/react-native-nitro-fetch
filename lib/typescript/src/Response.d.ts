import { NitroHeaders } from './Headers';
import type { NitroHeader } from './NitroFetch.nitro';
export type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect';
export interface NitroResponseInit {
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
    redirected: boolean;
    headers: NitroHeader[] | NitroHeaders;
    bodyBytes?: ArrayBuffer;
    bodyString?: string;
    body?: ReadableStream<Uint8Array<ArrayBuffer>>;
    type?: ResponseType;
}
export declare class NitroResponse {
    readonly url: string;
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly redirected: boolean;
    readonly headers: NitroHeaders;
    readonly type: ResponseType;
    private _body;
    constructor(body?: BodyInit | null, init?: ResponseInit);
    constructor(init: NitroResponseInit);
    get bodyUsed(): boolean;
    get body(): ReadableStream<Uint8Array<ArrayBuffer>> | null;
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    bytes(): Promise<Uint8Array<ArrayBuffer>>;
    clone(): NitroResponse;
    formData(): Promise<never>;
    static error(): NitroResponse;
    static json(data: unknown, init?: ResponseInit): NitroResponse;
    static redirect(url: string, status?: number): NitroResponse;
}
//# sourceMappingURL=Response.d.ts.map