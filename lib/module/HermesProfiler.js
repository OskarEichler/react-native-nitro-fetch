"use strict";

let profiling = false;
export async function profileFetch(fn, outputPath) {
  const hermes = globalThis.HermesInternal;
  if (profiling || typeof hermes?.enableSamplingProfiler !== 'function' || typeof hermes.disableSamplingProfiler !== 'function' || typeof hermes.dumpSamplingProfiler !== 'function') {
    const result = await fn();
    return {
      result
    };
  }
  const path = outputPath ?? `/tmp/nitrofetch-profile-${Date.now()}.cpuprofile`;
  try {
    hermes.enableSamplingProfiler();
  } catch {
    return {
      result: await fn()
    };
  }
  profiling = true;
  let result;
  let profilePath;
  try {
    result = await fn();
  } finally {
    try {
      hermes.disableSamplingProfiler();
      hermes.dumpSamplingProfiler(path);
      profilePath = path;
    } catch {
      // Diagnostics must not change the wrapped function's result or error.
    } finally {
      profiling = false;
    }
  }
  return profilePath ? {
    result,
    profilePath
  } : {
    result
  };
}
//# sourceMappingURL=HermesProfiler.js.map