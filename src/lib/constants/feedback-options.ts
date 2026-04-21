/** Topic keys must match `public.feedback.topic` CHECK in `src/sql/feedback-table.sql`. */
export const FEEDBACK_TOPIC_IDS = [
  "general",
  "bug",
  "feature",
  "ux",
  "openmap",
  "email",
  "ai",
  "other",
] as const;

export type FeedbackTopicId = (typeof FEEDBACK_TOPIC_IDS)[number];

/** Sentiment values must match `public.feedback.sentiment` CHECK (emoji literals). */
export const FEEDBACK_SENTIMENTS = ["😊", "🙂", "😐", "🙁", "😢"] as const;

export type FeedbackSentiment = (typeof FEEDBACK_SENTIMENTS)[number];
