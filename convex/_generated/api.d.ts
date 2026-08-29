/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as dateUtils from "../dateUtils.js";
import type * as digests from "../digests.js";
import type * as entries from "../entries.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as inbound from "../inbound.js";
import type * as lib_agentmail from "../lib/agentmail.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_llm from "../lib/llm.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  crons: typeof crons;
  dateUtils: typeof dateUtils;
  digests: typeof digests;
  entries: typeof entries;
  habits: typeof habits;
  http: typeof http;
  inbound: typeof inbound;
  "lib/agentmail": typeof lib_agentmail;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/llm": typeof lib_llm;
  settings: typeof settings;
  users: typeof users;
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

export declare const components: {};
