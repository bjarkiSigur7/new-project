/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as billing from "../billing.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as digest from "../digest.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_graph from "../lib/graph.js";
import type * as lib_moneyScreen from "../lib/moneyScreen.js";
import type * as mappings from "../mappings.js";
import type * as polarSync from "../polarSync.js";
import type * as qbo from "../qbo.js";
import type * as renewals from "../renewals.js";
import type * as sync from "../sync.js";
import type * as tenants from "../tenants.js";
import type * as user from "../user.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  billing: typeof billing;
  crons: typeof crons;
  dashboard: typeof dashboard;
  digest: typeof digest;
  http: typeof http;
  leads: typeof leads;
  "lib/access": typeof lib_access;
  "lib/graph": typeof lib_graph;
  "lib/moneyScreen": typeof lib_moneyScreen;
  mappings: typeof mappings;
  polarSync: typeof polarSync;
  qbo: typeof qbo;
  renewals: typeof renewals;
  sync: typeof sync;
  tenants: typeof tenants;
  user: typeof user;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
};
