import { describe, expect, test } from "bun:test";
import { hasBillingConfirmationEvidencePath } from "./live-usage-billing-evidence";
import {
  confirmAndPersistLiveImageBilling,
  readLiveImageBillingConfirmationRecord,
} from "./live-image-billing-confirmation";
import { evaluateLiveUsageSummary, type LiveUsageStageSummary } from "./live-usage-summary";

describe("live image billing confirmation", () => {
  test("persists a non-synthetic confirmation record before Codex image generation", () => {
    // Given
    const storage = new MemoryStorage();

    // When
    const result = confirmAndPersistLiveImageBilling({
      projectId: "p_live_product",
      jobId: "job_live_image",
      providerId: "codex",
      storage,
      confirm: () => true,
      now: () => 1_781_987_200_000,
    });

    // Then
    switch (result.kind) {
      case "confirmed": {
        expect(result.record.evidencePath).toBe(
          "usage/p_live_product/job_live_image/image-billing-confirmation.json",
        );
        expect(hasBillingConfirmationEvidencePath(result.disclosure.confirmationEvidencePath)).toBe(
          true,
        );
        expect(readLiveImageBillingConfirmationRecord(storage, result.record.evidencePath)).toEqual(
          result.record,
        );
        expect(evaluateLiveUsageSummary([imageUsageStage(result.disclosure)])).toEqual({
          kind: "ready",
        });
        return;
      }
      case "declined":
      case "failed":
      case "unavailable":
        throw new Error(`Expected confirmed image billing result, got ${result.kind}.`);
      default:
        return assertNever(result);
    }
  });

  test("does not persist confirmation evidence when the user declines", () => {
    // Given
    const storage = new MemoryStorage();

    // When
    const result = confirmAndPersistLiveImageBilling({
      projectId: "p_live_product",
      jobId: "job_live_image",
      providerId: "codex",
      storage,
      confirm: () => false,
      now: () => 1_781_987_200_000,
    });

    // Then
    expect(result).toEqual({ kind: "declined" });
    expect(storage.length).toBe(0);
  });
});

function imageUsageStage(
  imageBillingDisclosure: LiveUsageStageSummary["imageBillingDisclosure"],
): LiveUsageStageSummary {
  return {
    stageId: "generate",
    providerKind: "codex",
    durationMs: 1200,
    retryCount: 0,
    providerUsageProvided: true,
    usage: { imageCount: 5 },
    costLabel: "hidden",
    imageBillingDisclosure,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected live image billing confirmation result: ${String(value)}`);
}

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    let currentIndex = 0;
    for (const key of this.values.keys()) {
      if (currentIndex === index) return key;
      currentIndex += 1;
    }
    return null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
