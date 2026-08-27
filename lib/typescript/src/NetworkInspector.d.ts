export interface NetworkEntry {
    id: string;
    type: 'http';
    url: string;
    method: string;
    requestHeaders: Array<{
        key: string;
        value: string;
    }>;
    requestBody: string | undefined;
    requestBodySize: number;
    status: number;
    statusText: string;
    responseHeaders: Array<{
        key: string;
        value: string;
    }>;
    responseBody?: string;
    responseBodySize: number;
    startTime: number;
    endTime: number;
    duration: number;
    curl: string;
    error?: string;
}
export interface WebSocketMessage {
    direction: 'sent' | 'received';
    data: string;
    size: number;
    isBinary: boolean;
    timestamp: number;
}
export interface WebSocketEntry {
    id: string;
    type: 'websocket';
    url: string;
    protocols: string[];
    requestHeaders: Array<{
        key: string;
        value: string;
    }>;
    startTime: number;
    endTime: number;
    duration: number;
    readyState: string;
    messages: WebSocketMessage[];
    messagesSent: number;
    messagesReceived: number;
    bytesSent: number;
    bytesReceived: number;
    closeCode?: number;
    closeReason?: string;
    error?: string;
}
export type InspectorEntry = NetworkEntry | WebSocketEntry;
export type NetworkEntryCallback = (entry: InspectorEntry) => void;
declare class NetworkInspectorImpl {
    private _enabled;
    private _entries;
    private _maxEntries;
    private _maxBodyCapture;
    private _maxMessagesPerSocket;
    private _listeners;
    enable(options?: {
        maxEntries?: number;
        maxBodyCapture?: number;
        maxMessagesPerSocket?: number;
    }): void;
    disable(): void;
    isEnabled(): boolean;
    getEntries(): ReadonlyArray<InspectorEntry>;
    getHttpEntries(): ReadonlyArray<NetworkEntry>;
    getWebSocketEntries(): ReadonlyArray<WebSocketEntry>;
    getEntry(id: string): InspectorEntry | undefined;
    clear(): void;
    onEntry(callback: NetworkEntryCallback): () => void;
    private _notify;
    private _trimEntries;
    private _trimMessages;
    _recordStart(id: string, url: string, method: string, headers: Array<{
        key: string;
        value: string;
    }>, body?: string): void;
    _recordEnd(id: string, status: number, statusText: string, headers: Array<{
        key: string;
        value: string;
    }>, bodySize: number, error?: string, responseBody?: string): void;
    _recordWsOpen(id: string, url: string, protocols: string[], headers: Array<{
        key: string;
        value: string;
    }>): void;
    _recordWsConnected(id: string): void;
    _recordWsMessage(id: string, direction: 'sent' | 'received', data: string, size: number, isBinary: boolean): void;
    _recordWsClose(id: string, code: number, reason: string): void;
    _recordWsError(id: string, error: string): void;
}
export declare const NetworkInspector: NetworkInspectorImpl;
export {};
//# sourceMappingURL=NetworkInspector.d.ts.map