"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStudents } from "@/app/(admin)/students/actions";
import type { GetStudentsParams, GetStudentsResult } from "@/types";

export function useStudents(params: GetStudentsParams): UseQueryResult<GetStudentsResult> {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => getStudents(params),
  });
}
