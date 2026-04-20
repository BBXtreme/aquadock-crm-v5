import { createGateway } from "@ai-sdk/gateway";
import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";

const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 50;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildCompanySemanticDocument(company) {
  const chunks = [];
  const push = (label, value) => {
    const normalized = normalizeText(value);
    if (normalized !== null) chunks.push(`${label}: ${normalized}`);
  };

  push("Company", company.firmenname);
  push("CustomerType", company.kundentyp);
  push("CompanyType", company.firmentyp);
  push("LegalForm", company.rechtsform);
  push("Street", company.strasse);
  push("PostalCode", company.plz);
  push("City", company.stadt);
  push("State", company.bundesland);
  push("Country", company.land);
  push("Status", company.status);
  push("WaterType", company.wassertyp);
  push("Website", company.website);
  push("Email", company.email);
  push("Phone", company.telefon);
  push("Notes", company.notes);

  return chunks.join("\n");
}

function toPgVectorLiteral(vector) {
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding dimension mismatch. Expected ${EMBEDDING_DIMENSION}.`);
  }
  return `[${vector.join(",")}]`;
}

async function run() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const gatewayApiKey = requiredEnv("AI_GATEWAY_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const gateway = createGateway({ apiKey: gatewayApiKey });

  const { count: initialPending, error: countError } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("search_embedding", null);

  if (countError) throw countError;

  let processed = 0;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Starting semantic backfill. Pending rows: ${initialPending ?? 0}`);

  while (true) {
    const { data: companies, error } = await supabase
      .from("companies")
      .select(
        "id,firmenname,kundentyp,firmentyp,rechtsform,strasse,plz,stadt,bundesland,land,notes,status,wassertyp,website,email,telefon",
      )
      .is("deleted_at", null)
      .is("search_embedding", null)
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!companies || companies.length === 0) break;

    for (const company of companies) {
      processed += 1;
      try {
        const text = buildCompanySemanticDocument(company);
        if (text.length < 10) {
          skipped += 1;
          continue;
        }

        const result = await embed({
          model: gateway.embeddingModel("openai/text-embedding-3-small"),
          value: text,
        });

        const vectorLiteral = toPgVectorLiteral(result.embedding);

        const { error: updateError } = await supabase
          .from("companies")
          .update({ search_embedding: vectorLiteral })
          .eq("id", company.id);

        if (updateError) {
          failed += 1;
          console.warn(`Update failed for ${company.id}: ${updateError.message}`);
        } else {
          succeeded += 1;
        }
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Embedding failed for ${company.id}: ${message}`);
      }
    }

    console.log(
      `Progress: processed=${processed}, succeeded=${succeeded}, skipped=${skipped}, failed=${failed}`,
    );
  }

  const { count: remaining, error: remainingError } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("search_embedding", null);

  if (remainingError) throw remainingError;

  console.log("Backfill finished.");
  console.log(
    JSON.stringify({
      initialPending: initialPending ?? 0,
      processed,
      succeeded,
      skipped,
      failed,
      remaining: remaining ?? 0,
    }),
  );
}

run().catch((err) => {
  console.error("Backfill failed.", err);
  process.exitCode = 1;
});
