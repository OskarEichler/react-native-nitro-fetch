type ByteStream = ReadableStream<Uint8Array<ArrayBuffer>>;
interface BodySource {
    bytes?: ArrayBuffer;
    text?: string;
    stream?: ByteStream;
    blob?: Blob;
}
export declare function readBlob(blob: Blob): Promise<ArrayBuffer>;
/** Shared consumption state for buffered, Blob and streaming response bodies. */
export declare class Body {
    private source;
    private exposed;
    private state;
    constructor(source?: BodySource);
    private get present();
    get used(): boolean;
    assertUsable(): void;
    get stream(): ByteStream | null;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(type: string): Promise<Blob>;
    clone(): Body;
}
export {};
//# sourceMappingURL=Body.d.ts.map