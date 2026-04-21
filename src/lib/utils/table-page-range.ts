/** Range of rows shown on the current page within a filtered/paginated dataset (1-based indices). */
export function getTablePageRange(input: {
  pageIndex: number;
  pageSize: number;
  rowCountOnPage: number;
  totalFiltered: number;
}): { from: number; to: number; total: number } {
  const { pageIndex, pageSize, rowCountOnPage, totalFiltered } = input;
  if (totalFiltered <= 0) {
    return { from: 0, to: 0, total: 0 };
  }
  const from = pageIndex * pageSize + 1;
  const to = Math.min(from + rowCountOnPage - 1, totalFiltered);
  return { from, to, total: totalFiltered };
}
