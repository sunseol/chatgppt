export const SPLIT_RELEASE_ISSUES = {
  "DF-REL-001": 169,
  "DF-UI-001": 176,
  "DF-QA-002": 177,
  "DF-QA-003": 178,
  "DF-E2E-112": 170,
  "DF-UI-040": 179,
  "DF-REL-002": 171,
  "DF-PPT-001": 172,
  "DF-UAT-001": 173,
  "DF-SEC-001": 174,
  "DF-REL-003": 175,
};

const PARENT_ISSUE = 168;
const ISSUE_DEPENDENCIES = {
  "DF-REL-001": [],
  "DF-UI-001": [],
  "DF-QA-002": ["DF-UI-001", "DF-REL-001"],
  "DF-QA-003": ["DF-QA-002"],
  "DF-E2E-112": ["DF-REL-001", "DF-UI-001", "DF-QA-002", "DF-QA-003"],
  "DF-UI-040": ["DF-UI-001", "DF-QA-002"],
  "DF-REL-002": ["DF-REL-001"],
  "DF-PPT-001": ["DF-E2E-112"],
  "DF-UAT-001": ["DF-E2E-112", "DF-UI-040"],
  "DF-SEC-001": ["DF-QA-003", "DF-E2E-112", "DF-REL-002", "DF-PPT-001", "DF-UAT-001"],
  "DF-REL-003": [
    "DF-REL-001",
    "DF-UI-001",
    "DF-QA-002",
    "DF-QA-003",
    "DF-E2E-112",
    "DF-UI-040",
    "DF-REL-002",
    "DF-PPT-001",
    "DF-UAT-001",
    "DF-SEC-001",
  ],
};

export const OPEN_RELEASE_BLOCKERS = Object.fromEntries(
  Object.keys(SPLIT_RELEASE_ISSUES).map((ticket) => [ticket, "open"]),
);

export function issueMapTemplate(checkedAt) {
  return {
    schemaVersion: 1,
    parentIssue: PARENT_ISSUE,
    splitIssues: SPLIT_RELEASE_ISSUES,
    dependencies: ISSUE_DEPENDENCIES,
    checkedAt,
  };
}
