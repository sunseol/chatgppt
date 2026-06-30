import { describe, expect, test } from "bun:test";
import { GPPT_UI_CONTRACT, validateContractDefinition } from "./contract.mjs";

describe("GPPT UI contract definition", () => {
  test("defines exactly GPPT-UI-001 through GPPT-UI-040 with exact names", () => {
    const issues = validateContractDefinition(GPPT_UI_CONTRACT);

    expect(issues).toEqual([]);
    expect(GPPT_UI_CONTRACT).toHaveLength(40);
    expect(GPPT_UI_CONTRACT[0].id).toBe("GPPT-UI-001");
    expect(GPPT_UI_CONTRACT.at(-1)?.id).toBe("GPPT-UI-040");
    expect(GPPT_UI_CONTRACT.every((item) => item.exact === true)).toBe(true);
  });
});
