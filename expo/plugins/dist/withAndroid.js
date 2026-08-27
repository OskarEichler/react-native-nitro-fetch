"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withAndroidAutoPrefetch = (config) => {
    return (0, config_plugins_1.withMainApplication)(config, (mod) => {
        let content = mod.modResults.contents;
        const isJava = mod.modResults.language === 'java';
        // Add import for AutoPrefetcher
        if (!content.includes('import com.margelo.nitro.nitrofetch.AutoPrefetcher')) {
            content = content.replace(/^(\s*package\s+[^\r\n]+)$/m, `$1\n\nimport com.margelo.nitro.nitrofetch.AutoPrefetcher${isJava ? ';' : ''}`);
        }
        // Add prefetchOnStart call in onCreate before loadReactNative
        if (!/AutoPrefetcher(?:\.INSTANCE)?\.prefetchOnStart/.test(content)) {
            content = content.replace(/super\.onCreate\(\);?/, isJava
                ? 'super.onCreate();\n    try { AutoPrefetcher.INSTANCE.prefetchOnStart(this); } catch (Throwable ignored) {}'
                : 'super.onCreate()\n    try { AutoPrefetcher.prefetchOnStart(this) } catch (_: Throwable) {}');
        }
        mod.modResults.contents = content;
        return mod;
    });
};
exports.default = withAndroidAutoPrefetch;
