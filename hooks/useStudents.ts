"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/app/(admin)/students/actions";
import type { GetStudentsParams } from "@/types";

export function useStudents(params: GetStudentsParams) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => getStudents(params),
  });
}
