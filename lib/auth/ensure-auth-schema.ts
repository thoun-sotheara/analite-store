import postgres from "postgres";

let ensurePromise: Promise<void> | null = null;

export async function ensureAuthSchema(): Promise<void> {
  if (ensurePromise) {
    return ensurePromise;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return;
  }

  ensurePromise = (async () => {
    const sql = postgres(databaseUrl, { prepare: false });
    try {
      await sql`
        create table if not exists auth_credentials (
          id uuid primary key,
          user_email varchar(320) not null unique,
          password_hash text not null,
          email_verified_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists email_verification_tokens (
          id uuid primary key,
          user_email varchar(320) not null,
          token_hash text not null,
          expires_at timestamptz not null,
          created_at timestamptz not null default now()
        )
      `;

      await sql`create index if not exists idx_email_verification_tokens_user_email on email_verification_tokens(user_email)`;
      await sql`create index if not exists idx_email_verification_tokens_expires_at on email_verification_tokens(expires_at)`;
    } finally {
      await sql.end();
    }
  })();

  return ensurePromise;
}
