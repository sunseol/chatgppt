import {
  evaluateResearchFallbackPolicy,
  evaluateResearchLiveSearchScope,
} from "@/lib/research-live-network-policy";

export function ProductionResearchNetworkPolicy() {
  const liveSearchScope = evaluateResearchLiveSearchScope({
    step: "research",
    webSearch: "live",
  });
  const mockFallbackPolicy = evaluateResearchFallbackPolicy({
    executionMode: "production",
    fallback: "mock_source",
  });

  return (
    <section className="mt-6 border border-border bg-paper p-5 text-sm">
      <div className="font-medium">Live research network policy</div>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        <li>{liveSearchScopeCopy(liveSearchScope)}</li>
        <li>
          Fetched source content is passed as <code>untrusted_source_content</code>, never as user
          or developer instructions.
        </li>
        <li>Source Fetcher allows GET/HEAD only.</li>
        {mockFallbackPolicy.kind === "blocked" ? (
          <li>
            <code>{mockFallbackPolicy.code}</code>: {mockFallbackPolicy.message}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function liveSearchScopeCopy(result: ReturnType<typeof evaluateResearchLiveSearchScope>): string {
  switch (result.kind) {
    case "allowed":
      return "Live web search is scoped to the Research step.";
    case "blocked":
      return result.message;
    default:
      return assertNever(result);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected research live-search scope: ${String(value)}`);
}
