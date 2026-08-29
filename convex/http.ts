import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth's sign-in / token-refresh / OAuth-callback routes.
auth.addHttpRoutes(http);

export default http;
