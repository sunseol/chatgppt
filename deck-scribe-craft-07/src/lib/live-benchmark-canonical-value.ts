export function isCanonicalNonblankBenchmarkValue(value: string | undefined): boolean {
  return value !== undefined && value.length > 0 && value === value.trim();
}
