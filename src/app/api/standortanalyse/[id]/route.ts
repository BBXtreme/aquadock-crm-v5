import { NextResponse } from "next/server";
import { toStandortanalyseFormFromRows } from "@/lib/standortanalyse/persistence";
import { calculateStandortScore } from "@/lib/standortanalyse/scoring";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || user == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: analysis, error: analysisError } = await supabase
    .from("standortanalysen")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (analysisError) {
    return NextResponse.json({ error: analysisError.message }, { status: 500 });
  }
  if (analysis == null) {
    return NextResponse.json({ error: "Analyse nicht gefunden" }, { status: 404 });
  }

  const { data: scores, error: scoreError } = await supabase
    .from("standortanalyse_scores")
    .select("*")
    .eq("analysis_id", id);
  if (scoreError) {
    return NextResponse.json({ error: scoreError.message }, { status: 500 });
  }

  const formData = toStandortanalyseFormFromRows({
    analysis,
    scores: scores ?? [],
  });
  const computedScore = calculateStandortScore(formData.kriterien);

  return NextResponse.json({
    analysis: {
      id: analysis.id,
      status: analysis.status,
      createdAt: analysis.created_at,
      updatedAt: analysis.updated_at,
      submittedAt: analysis.submitted_at,
      totalPoints: analysis.total_points,
      recommendation: analysis.recommendation,
    },
    formData,
    score: computedScore,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || user == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error: deleteError } = await supabase.from("standortanalysen").delete().eq("id", id).eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
