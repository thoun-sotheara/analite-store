import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureAuthSchema } from "@/lib/auth/ensure-auth-schema";
import { authCredentials, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { resolveRoleFromEmail } from "@/lib/auth/role";

const EMAIL_AUTH_ENABLED = (process.env.NEXTAUTH_ENABLE_EMAIL_PROVIDER ?? "false") === "true";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authDb = db;

const providers: NextAuthOptions["providers"] = [];

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (EMAIL_AUTH_ENABLED) {
  providers.push(
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? "587"),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  );
}

if (authDb) {
  providers.push(
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await ensureAuthSchema();

        let payload: z.infer<typeof credentialsSchema>;

        try {
          payload = credentialsSchema.parse(credentials);
        } catch {
          return null;
        }

        const email = payload.email.trim().toLowerCase();

        const [credential] = await authDb
          .select({
            passwordHash: authCredentials.passwordHash,
            emailVerifiedAt: authCredentials.emailVerifiedAt,
          })
          .from(authCredentials)
          .where(eq(authCredentials.userEmail, email))
          .limit(1);

        if (!credential?.emailVerifiedAt) {
          return null;
        }

        if (!verifyPassword(payload.password, credential.passwordHash)) {
          return null;
        }

        const [userRecord] = await authDb
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        return {
          id: userRecord?.id ?? email,
          email,
          name: userRecord?.name ?? email,
          role: userRecord?.role ?? resolveRoleFromEmail(email, ADMIN_EMAIL),
        };
      },
    }),
  );
}

const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!authDb || !email) {
        return true;
      }

      await authDb
        .insert(users)
        .values({
          email,
          name: user.name ?? email.split("@")[0],
          role: resolveRoleFromEmail(email, ADMIN_EMAIL),
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name: user.name ?? email.split("@")[0],
            role: resolveRoleFromEmail(email, ADMIN_EMAIL),
          },
        });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      const roleFromUser = (user as { role?: string } | undefined)?.role;
      if (roleFromUser) {
        token.role = roleFromUser;
      }

      if (!token.role && token.email) {
        token.role = resolveRoleFromEmail(token.email, ADMIN_EMAIL);
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        role: (token.role as string | undefined) ?? resolveRoleFromEmail(session.user?.email ?? "", ADMIN_EMAIL),
      };

      return session;
    },
  },
};

export default authOptions;
