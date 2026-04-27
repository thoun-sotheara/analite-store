#!/usr/bin/env node

/**
 * Phase 8 env validator.
 *
 * Usage:
 *   node scripts/check-env.mjs
 *   node scripts/check-env.mjs --strict
 */

const strict = process.argv.includes("--strict");

const groups = [
  {
    name: "PostgreSQL",
    required: ["DATABASE_URL"],
  },
  {
    name: "Auth",
    required: ["NEXTAUTH_SECRET", "NEXTAUTH_URL"],
    oneOf: [["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]],
  },
  {
    name: "Firebase Analytics (optional runtime)",
    required: [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    ],
    optionalInNonStrict: true,
  },
  {
    name: "Payments",
    required: ["KHPAY_PROXY_SECRET", "KHPAY_WEBHOOK_SECRET", "PAYMENT_ADMIN_SECRET"],
    oneOf: [["PAYWAY_LINK", "ABA_PAYWAY_LINK", "NEXT_PUBLIC_PAYWAY_LINK", "KHPAY_API_KEY"]],
  },
  {
    name: "Storage",
    required: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    oneOf: [["AWS_S3_BUCKET", "AWS_PRIVATE_BUCKET"]],
  },
  {
    name: "Email",
    required: ["EMAIL_SERVER_HOST", "EMAIL_SERVER_PORT", "EMAIL_SERVER_USER", "EMAIL_SERVER_PASSWORD", "EMAIL_FROM"],
  },
];

function hasValue(key) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0;
}

function checkGroup(group) {
  const missing = [];
  const missingEither = [];

  if (Array.isArray(group.required)) {
    for (const key of group.required) {
      if (!hasValue(key)) {
        missing.push(key);
      }
    }
  }

  if (Array.isArray(group.requiredExtra)) {
    for (const key of group.requiredExtra) {
      if (!hasValue(key)) {
        missing.push(key);
      }
    }
  }

  if (Array.isArray(group.oneOf)) {
    for (const optionGroup of group.oneOf) {
      if (!optionGroup.some((key) => hasValue(key))) {
        missingEither.push(optionGroup);
      }
    }
  }

  if (Array.isArray(group.oneOfExtra)) {
    for (const optionGroup of group.oneOfExtra) {
      if (!optionGroup.some((key) => hasValue(key))) {
        missingEither.push(optionGroup);
      }
    }
  }

  return { missing, missingEither };
}

let hasFailures = false;

console.log("Phase 8 env check\n");

for (const group of groups) {
  const shouldEnforce = strict || !group.optionalInNonStrict;
  const { missing, missingEither } = checkGroup(group);

  const totalMissing = missing.length + missingEither.length;
  if (!shouldEnforce && totalMissing > 0) {
    console.log(`- ${group.name}: WARN`);
    if (missing.length > 0) {
      console.log(`  Missing keys: ${missing.join(", ")}`);
    }
    for (const optionGroup of missingEither) {
      console.log(`  Missing one-of: ${optionGroup.join(" or ")}`);
    }
    continue;
  }

  if (totalMissing === 0) {
    console.log(`- ${group.name}: OK`);
    continue;
  }

  hasFailures = true;
  console.log(`- ${group.name}: FAIL`);
  if (missing.length > 0) {
    console.log(`  Missing keys: ${missing.join(", ")}`);
  }
  for (const optionGroup of missingEither) {
    console.log(`  Missing one-of: ${optionGroup.join(" or ")}`);
  }
}

if (hasFailures) {
  console.log("\nResult: FAILED");
  process.exit(1);
}

console.log("\nResult: PASS");
