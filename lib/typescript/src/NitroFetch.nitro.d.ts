import type { HybridObject } from 'react-native-nitro-modules';
export type NitroRequestMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
export type NitroRequestCredentials = 'include' | 'omit' | 'same-origin';
export interface NitroHeader {
    key: string;
    value: string;
}
export interface NitroFormDataPart {
    name: string;
    value?: string;
    fileUri?: string;
    fileName?: string;
    mimeType?: string;
}
export interface NitroRequest {
    url: string;
    method?: NitroRequestMethod;
    headers?: NitroHeader[];
    bodyString?: string;
    bodyBytes?: ArrayBuffer;
    bodyBytesBase64?: string;
    bodyFormData?: NitroFormDataPart[];
    timeoutMs?: number;
    followRedirects?: boolean;
    credentials?: NitroRequestCredentials;
    prefetchCacheTtlMs?: number;
    requestId?: string;
}
export interface NitroResponse {
    url: string;
    status: number;
    statusText: string;
    ok: boolean;
    redirected: boolean;
    headers: NitroHeader[];
    bodyString?: string;
    bodyBytes?: ArrayBuffer;
}
export interface NitroFetchClient extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    request(req: NitroRequest): Promise<NitroResponse>;
    prefetch(req: NitroRequest): Promise<void>;
    requestSync(req: NitroRequest): NitroResponse;
    cancelRequest(requestId: string): void;
}
export interface NitroFetch extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    createClient(): NitroFetchClient;
}
export interface NativeStorage extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getString(key: string): string;
    setString(key: string, value: string): void;
    removeString(key: string): void;
    /** AES-GCM at rest in the same prefs/suite as getString; key material in Keystore / Keychain. */
    getSecureString(key: string): string;
    setSecureString(key: string, value: string): void;
    removeSecureString(key: string): void;
}
//# sourceMappingURL=NitroFetch.nitro.d.ts.map