type TokenRefreshJsonMapping = {
    jsonPath: string;
    header: string;
    valueTemplate?: string;
};
type TokenRefreshCompositeHeader = {
    header: string;
    template: string;
    paths: Record<string, string>;
};
type TokenRefreshBodyMapping = {
    jsonPath: string;
    bodyPath: string;
    valueTemplate?: string;
};
type TokenRefreshFormDataMapping = {
    jsonPath: string;
    field: string;
    valueTemplate?: string;
};
export type TokenRefreshConfig = {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'json' | 'text';
    mappings?: TokenRefreshJsonMapping[];
    compositeHeaders?: TokenRefreshCompositeHeader[];
    textHeader?: string;
    textTemplate?: string;
    bodyMappings?: TokenRefreshBodyMapping[];
    formDataMappings?: TokenRefreshFormDataMapping[];
    bodyTextPath?: string;
    formDataTextField?: string;
    onFailure?: 'skip' | 'useStoredHeaders';
};
/**
 * Resolve a dot-notation path inside a parsed JSON object.
 */
export declare function getNestedField(obj: unknown, dotPath: string): string | undefined;
export declare function applyTemplate(template: string, value: string): string;
export declare function applyCompositeTemplate(template: string, values: Record<string, string>): string;
export {};
//# sourceMappingURL=tokenRefreshConfig.d.ts.map