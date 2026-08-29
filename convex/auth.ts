import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Normalise the email so inbound-mail lookups (by sender address) match.
      profile(params) {
        return { email: String(params.email).trim().toLowerCase() };
      },
    }),
  ],
});
