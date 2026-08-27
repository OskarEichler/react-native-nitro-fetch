export interface CurlOptions {
    url: string;
    method: string;
    headers?: Array<{
        key: string;
        value: string;
    }>;
    body?: string;
    verbose?: boolean;
    compressed?: boolean;
}
export declare function generateCurl(options: CurlOptions): string;
//# sourceMappingURL=CurlGenerator.d.ts.map