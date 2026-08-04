"use client";

import { useState } from "react";

/** Generic row-selection set for bulk actions over a paginated table. */
export function useBulkSelection(selectableIds: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const allSelected = selectableIds.length > 0 && selectableIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(selectableIds);
    });
  }

  function clear() {
    setSelected(new Set());
  }

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  return { selected, toggle, toggleAll, clear, allSelected, count: selected.size };
}
