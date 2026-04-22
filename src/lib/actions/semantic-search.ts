"use server";

import {
  type EmbeddingConnectionTestResult,
  type SemanticSearchSettings,
  testEmbeddingConnection,
} from "@/lib/services/semantic-search";

export async function testEmbeddingConnectionAction(
  settings: Pick<SemanticSearchSettings, "embeddingProvider" | "embeddingModel" | "semanticSearchEnabled">,
): Promise<EmbeddingConnectionTestResult> {
  const result = await testEmbeddingConnection(settings);
  return result;
}
