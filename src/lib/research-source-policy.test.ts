import { describe, expect, test } from "bun:test";
import {
  canSourceStandAlone,
  canSupportMajorClaim,
  canSupportMajorNumber,
  getDefaultSourcePolicy,
  getGradePolicy,
  getUncertaintyPolicy,
} from "./research-source-policy";

describe("research source policy", () => {
  test("maps preferred source types to priority grades", () => {
    expect(getDefaultSourcePolicy("government").grade).toBe("A");
    expect(getDefaultSourcePolicy("international").grade).toBe("A");
    expect(getDefaultSourcePolicy("original_data").grade).toBe("A");
    expect(getDefaultSourcePolicy("company").grade).toBe("B");
    expect(getDefaultSourcePolicy("media").grade).toBe("C");
  });

  test("allows only high quality grades for major claims and numbers", () => {
    expect(canSupportMajorClaim("A")).toBe(true);
    expect(canSupportMajorClaim("B")).toBe(true);
    expect(canSupportMajorClaim("C")).toBe(false);
    expect(canSupportMajorClaim("D")).toBe(false);
    expect(canSupportMajorClaim("E")).toBe(false);

    expect(canSupportMajorNumber("A")).toBe(true);
    expect(canSupportMajorNumber("B")).toBe(true);
    expect(canSupportMajorNumber("C")).toBe(false);
    expect(canSupportMajorNumber("D")).toBe(false);
    expect(canSupportMajorNumber("E")).toBe(false);
  });

  test("rejects invalid standalone use for restricted grades", () => {
    expect(canSourceStandAlone("A")).toBe(true);
    expect(canSourceStandAlone("B")).toBe(true);
    expect(canSourceStandAlone("C")).toBe(false);
    expect(canSourceStandAlone("D")).toBe(false);
    expect(canSourceStandAlone("E")).toBe(false);
    expect(getGradePolicy("E").forbiddenConditions).toEqual(["사용 금지"]);
  });

  test("requires uncertainty markers for low confidence and conflicting material", () => {
    expect(getUncertaintyPolicy({ confidence: "high", status: "supported" })).toEqual({
      labelRequired: false,
      reviewRequired: false,
    });
    expect(getUncertaintyPolicy({ confidence: "low", status: "supported" })).toEqual({
      labelRequired: true,
      reviewRequired: true,
      label: "uncertain",
    });
    expect(getUncertaintyPolicy({ confidence: "assumption", status: "assumption" })).toEqual({
      labelRequired: true,
      reviewRequired: true,
      label: "assumption",
    });
    expect(getUncertaintyPolicy({ confidence: "medium", status: "conflicting" })).toEqual({
      labelRequired: true,
      reviewRequired: true,
      label: "conflicting",
    });
  });
});
