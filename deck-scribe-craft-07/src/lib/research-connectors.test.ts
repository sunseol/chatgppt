import { describe, expect, test } from "bun:test";
import {
  ResearchConnectorRegistryError,
  createResearchConnectorRegistry,
  executeResearchConnector,
  registerResearchConnector,
} from "./research-connectors";

describe("research connectors", () => {
  test("executes a custom connector and normalizes source, claim, and dataset output", () => {
    const registry = createResearchConnectorRegistry([teamConnector()]);
    const result = executeResearchConnector(registry, {
      connectorId: "team_csv",
      input: { quarter: "2026-Q1" },
    });

    expect(result.sources[0]?.id).toBe("src_team_001");
    expect(result.sources[0]?.sourceType).toBe("user_material");
    expect(result.sources[0]?.grade).toBe("B");
    expect(result.sources[0]?.usePolicy).toBe("priority");
    expect(result.claims[0]?.datasetIds).toEqual(["dataset_team_001"]);
    expect(result.claims[0]?.numericEvidence).toEqual([
      {
        id: "evidence_team_001",
        value: "42",
        unit: "USDm",
        baseYear: 2026,
        geography: "KR",
        definition: "Quarterly booked revenue",
        sourceId: "src_team_001",
        datasetId: "dataset_team_001",
        uncertain: false,
      },
    ]);
    expect(result.datasets[0]?.rows[0]?.value).toBe(42);
    expect(result.datasets[0]?.rows[0]?.year).toBe(2026);
    expect(result.datasets[0]?.rows[0]?.segment).toBe("total");
  });

  test("rejects duplicate connector registration", () => {
    expect(() =>
      registerResearchConnector(
        createResearchConnectorRegistry([teamConnector()]),
        teamConnector(),
      ),
    ).toThrow(ResearchConnectorRegistryError);
  });

  test("rejects connector payloads that violate source-grade policy", () => {
    const registry = createResearchConnectorRegistry([
      {
        ...teamConnector(),
        id: "invalid_grade",
        run: () => ({
          sources: [
            {
              id: "src_invalid",
              title: "Invalid source",
              publisher: "Unknown",
              year: 2026,
              grade: "E",
              usePolicy: "allowed",
            },
          ],
          claims: [],
          datasets: [],
        }),
      },
    ]);

    expect(() =>
      executeResearchConnector(registry, {
        connectorId: "invalid_grade",
        input: {},
      }),
    ).toThrow(ResearchConnectorRegistryError);
  });
});

function teamConnector() {
  return {
    id: "team_csv",
    displayName: "Team CSV",
    sourceType: "user_material" as const,
    defaultGrade: "B" as const,
    defaultUsePolicy: "priority" as const,
    run: () => ({
      sources: [
        {
          id: "src_team_001",
          title: "Team revenue extract",
          publisher: "Finance Ops",
          year: 2026,
          grade: "B",
          usePolicy: "priority",
        },
      ],
      claims: [
        {
          id: "claim_team_001",
          statement: "Q1 revenue reached 42M USD.",
          sourceIds: ["src_team_001"],
          datasetIds: ["dataset_team_001"],
          confidence: "high",
          hasNumber: true,
          needsUserReview: false,
          status: "supported",
          slideCandidates: [2],
          numericEvidence: [
            {
              id: "evidence_team_001",
              value: "42",
              unit: "USDm",
              baseYear: 2026,
              geography: "KR",
              definition: "Quarterly booked revenue",
              sourceId: "src_team_001",
              datasetId: "dataset_team_001",
              uncertain: false,
            },
          ],
        },
      ],
      datasets: [
        {
          id: "dataset_team_001",
          title: "Quarterly revenue",
          sourceIds: ["src_team_001"],
          unit: "USDm",
          period: "2026-Q1",
          geography: "KR",
          definition: "Quarterly booked revenue",
          rows: [{ label: "Q1", value: 42, year: 2026, segment: "total" }],
          uncertain: false,
        },
      ],
    }),
  };
}
