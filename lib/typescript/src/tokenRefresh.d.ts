import type { TokenRefreshConfig } from './tokenRefreshConfig';
export { getNestedField, applyTemplate } from './tokenRefreshConfig';
export type { TokenRefreshConfig } from './tokenRefreshConfig';
type TokenRefreshTarget = 'websocket' | 'fetch' | 'all';
export declare function callRefreshEndpoint(config: TokenRefreshConfig): Promise<Record<string, string>>;
export declare function registerTokenRefresh(options: {
    target: TokenRefreshTarget;
} & TokenRefreshConfig): void;
export declare function clearTokenRefresh(target?: TokenRefreshTarget): void;
export declare function getStoredTokenRefreshConfig(target: 'websocket' | 'fetch'): TokenRefreshConfig | null;
//# sourceMappingURL=tokenRefresh.d.ts.map