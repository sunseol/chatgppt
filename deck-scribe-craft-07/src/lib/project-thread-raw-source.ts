const RAW_CONVERSATION_FIELDS = [
  "rawConversation",
  "rawConversationText",
  "rawConversationHistory",
  "conversationTranscript",
  "conversationHistory",
  "threadTranscript",
] as const;

const RAW_SOURCE_VALUES = new Set([
  "raw_conversation",
  "rawConversation",
  "conversation",
  "conversation_history",
  "long_running_thread",
  "thread_history",
]);

export function hasRawConversationSource(value: object): boolean {
  return hasRawConversationSourceValue(value, new WeakSet());
}

function hasRawConversationSourceValue(value: unknown, seen: WeakSet<object>): boolean {
  if (value === null || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return (
    RAW_CONVERSATION_FIELDS.some((field) => hasMeaningfulValue(fieldValue(value, field))) ||
    isRawConversationSource(fieldValue(value, "sourceOfTruth")) ||
    Object.values(value).some((item) => hasRawConversationSourceValue(item, seen))
  );
}

function fieldValue(value: object, field: string): unknown {
  return Object.entries(value).find(([key]) => key === field)?.[1];
}

function hasMeaningfulValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isRawConversationSource(value: unknown): boolean {
  return typeof value === "string" && RAW_SOURCE_VALUES.has(value.trim());
}
