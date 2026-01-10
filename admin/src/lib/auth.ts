import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      tenantId: requireEnv("AZURE_AD_TENANT_ID"),
      clientId: requireEnv("AZURE_AD_CLIENT_ID"),
      clientSecret: requireEnv("AZURE_AD_CLIENT_SECRET"),
    }),
  ],
  session: { strategy: "jwt" },
  theme: {
    colorScheme: "light",
    brandColor: "#CE1126", // CSEC Red
    logo: "https://d37ygqmmhd03wh.cloudfront.net/assets/csec_primary.svg",
  },
  callbacks: {
    async signIn({ profile, account }) {
      const allowedTenant = process.env.ALLOWED_TENANT_ID;
      if (!allowedTenant) return true;

      // Azure AD typically sets account.providerAccountId; tenant is in issuer URL.
      // We'll also accept tid in the profile when present.
      const tid =
        (profile as any)?.tid ||
        (account as any)?.tenantId ||
        (account?.issuer ? String(account.issuer).split("/").pop() : undefined);

      return tid === allowedTenant;
    },
    async jwt({ token, profile }) {
      // Prefer email claim (user asked for email-based allowlist).
      const email =
        (profile as any)?.email ||
        (profile as any)?.upn ||
        (profile as any)?.preferred_username ||
        token.email;

      if (typeof email === "string") token.email = email.toLowerCase();
      return token;
    },
    async session({ session, token }) {
      if (token.email && session.user) session.user.email = String(token.email);
      return session;
    },
  },
};


