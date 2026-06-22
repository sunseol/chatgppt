export function isCanonicalNonblankValue(value: string | undefined): boolean {
  return value !== undefined && value.length > 0 && value === value.trim();
}

export function hasNoncanonicalLineageValue(values: readonly string[]): boolean {
  return values.some((value) => !isCanonicalNonblankValue(value));
}
