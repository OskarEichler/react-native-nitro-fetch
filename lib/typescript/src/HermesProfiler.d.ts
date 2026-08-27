export interface ProfileResult<T> {
    result: T;
    profilePath?: string;
}
export declare function profileFetch<T>(fn: () => Promise<T>, outputPath?: string): Promise<ProfileResult<T>>;
//# sourceMappingURL=HermesProfiler.d.ts.map