/**
 * Must run before any file imports `react`. Tells React 19 the test runner supports `act`,
 * which avoids "The current testing environment is not configured to support act(...)"
 * when using Suspense / concurrent features (e.g. dashboard KPI refetch tests).
 */
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
