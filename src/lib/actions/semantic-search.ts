"use server";

import {
  type EmbeddingConnectionTestResult,
  type SemanticSearchSettings,
  testEmbeddingConnection,
} from "@/lib/services/semantic-search";

export async function testEmbeddingConnectionAction(
  settings: Pick<SemanticSearchSettings, "embeddingProvider" | "embeddingModel" | "semanticSearchEnabled">,
): Promise<EmbeddingConnectionTestResult> {
  // #region agent log
  fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "cc0d67",
    },
    body: JSON.stringify({
      sessionId: "cc0d67",
      runId: "pre-fix",
      hypothesisId: "H5",
      location: "actions/semantic-search.ts:testEmbeddingConnectionAction:start",
      message: "Server action invoked for semantic connection test",
      data: {
        provider: settings.embeddingProvider,
        model: settings.embeddingModel,
        semanticSearchEnabled: settings.semanticSearchEnabled,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {
    // debug logging is best-effort
  });
  // #endregion
  const result = await testEmbeddingConnection(settings);
  // #region agent log
  fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "cc0d67",
    },
    body: JSON.stringify({
      sessionId: "cc0d67",
      runId: "pre-fix",
      hypothesisId: "H5",
      location: "actions/semantic-search.ts:testEmbeddingConnectionAction:result",
      message: "Server action completed for semantic connection test",
      data: result,
      timestamp: Date.now(),
    }),
  }).catch(() => {
    // debug logging is best-effort
  });
  // #endregion
  return result;
}
