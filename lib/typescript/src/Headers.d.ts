import type { NitroHeader } from './NitroFetch.nitro';
type HeadersInitInput = NitroHeaders | NitroHeader[] | [string, string][] | Record<string, string> | Headers | undefined;
export declare class NitroHeaders {
    private _map;
    private _sortedEntries;
    constructor(init?: HeadersInitInput);
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    getSetCookie(): string[];
    has(name: string): boolean;
    set(name: string, value: string): void;
    private _entries;
    forEach(callback: (value: string, key: string, headers: NitroHeaders) => void, thisArg?: any): void;
    entries(): HeadersIterator<[string, string]>;
    keys(): HeadersIterator<string>;
    values(): HeadersIterator<string>;
    [Symbol.iterator](): HeadersIterator<[string, string]>;
}
export {};
//# sourceMappingURL=Headers.d.ts.map