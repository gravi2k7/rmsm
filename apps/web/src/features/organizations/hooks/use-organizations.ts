"use client";

import { useQuery } from "@tanstack/react-query";
import { listOrganizations } from "../api";

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
    staleTime: 60_000,
  });
}
