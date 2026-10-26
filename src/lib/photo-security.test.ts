import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../drizzle/migrations/0000_restrict_sensitive_farmer_photo_reads.sql", import.meta.url), "utf8");
const policies = sql.split("CREATE POLICY").slice(1);

test("KTP table SELECT restriction covers every caller and only KTP rows", () => {
  const policy = policies.find((value) => value.includes("ON public.foto_lahan"));
  expect(policy).toContain("AS RESTRICTIVE\nFOR SELECT\nTO public");
  expect(policy).toContain("tipe IS DISTINCT FROM 'ktp'");
});

test("KTP storage SELECT restriction only gates foto-lahan ktp/ objects", () => {
  const policy = policies.find((value) => value.includes("ON storage.objects"));
  expect(policy).toContain("AS RESTRICTIVE\nFOR SELECT\nTO public");
  expect(policy).toContain("bucket_id IS DISTINCT FROM 'foto-lahan'");
  expect(policy).toContain("name NOT LIKE 'ktp/%'");
});

test("both restrictions authorize exactly the five requested roles using has_role", () => {
  expect(policies).toHaveLength(2);
  for (const policy of policies) {
    const roles = [...policy.matchAll(/public\.has_role\(auth\.uid\(\), '([^']+)'::public\.app_role\)/g)].map((match) => match[1]);
    expect(roles.sort()).toEqual(["admin", "auditor", "developer", "pengawas", "staf_lapang"]);
  }
});