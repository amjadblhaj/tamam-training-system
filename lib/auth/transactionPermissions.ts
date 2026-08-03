// No "server-only" import here deliberately — this is a pure function used
// both server-side (deciding whether to allow an undo) and client-side
// (deciding whether to render the undo button at all).
export interface TransactionScope {
  role: "admin" | "staff";
  branchId: number | null;
}

export interface TransactionForPermissionCheck {
  branch_id: number | null;
}

/** Admin can act on any transaction; staff only on their own branch's. */
export function canActOnTransaction(scope: TransactionScope, txn: TransactionForPermissionCheck): boolean {
  if (scope.role === "admin") return true;
  return txn.branch_id === scope.branchId;
}
