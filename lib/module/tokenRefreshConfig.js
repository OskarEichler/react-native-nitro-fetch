"use strict";

// — Helpers —

/**
 * Resolve a dot-notation path inside a parsed JSON object.
 */
export function getNestedField(obj, dotPath) {
  const parts = dotPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current != null ? String(current) : undefined;
}
export function applyTemplate(template, value) {
  return template.replace(/\{\{value\}\}/g, () => value);
}
export function applyCompositeTemplate(template, values) {
  return template.replace(/\{\{([^{}]+)\}\}/g, (match, key) => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match);
}
//# sourceMappingURL=tokenRefreshConfig.js.map