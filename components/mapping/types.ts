import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

/**
 * Shared shapes for the mapping screen, derived straight from the Convex
 * query so the UI can never drift from the server contract.
 */
export type MappingData = NonNullable<
  FunctionReturnType<typeof api.mappings.getMappingData>
>;
export type MappingTenant = MappingData["tenants"][number];
export type MappingCustomer = MappingData["customers"][number];
export type MappingSku = MappingTenant["skus"][number];
export type MappingLine = MappingTenant["lines"][number];

/** Radix Select forbids empty-string item values — sentinel for "null". */
export const NONE_VALUE = "__none__";

export function lineLabel(line: MappingLine): string {
  return line.itemName ?? line.description ?? line.key;
}

export function intervalSuffix(months: number): string {
  if (months === 12) return "/yr";
  if (months === 1) return "/mo";
  return `/${months}mo`;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong. Try again.";
}
