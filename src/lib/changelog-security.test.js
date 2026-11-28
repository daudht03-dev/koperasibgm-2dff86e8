import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../drizzle/migrations/0003_restrict_public_changelog_reads.sql", import.meta.url), "utf8");
const policies = sql.split("CREATE POLICY").slice(1);

test("public changelog reads require the latest-release flag", () => {
  const policy = policies.find((value) => value.includes('"Public can view latest changelog"'));
  expect(sql).toContain('DROP POLICY IF EXISTS "Everyone can view changelog"');
  expect(policy).toContain("FOR SELECT TO anon, authenticated USING (is_latest IS TRUE)");
});

test("older changelog releases are readable only by authorized staff", () => {
  const policy = policies.find((value) => value.includes('"Authorized staff can view changelog history"'));
  expect(policy).toContain("FOR SELECT TO authenticated");
  expect(policy).toContain("public.has_any_role(auth.uid()");
  const roles = [...(policy ?? "").matchAll(/'([^']+)'/g)].map((match) => match[1]);
  expect(roles.sort()).toEqual(["admin", "auditor", "developer", "pengawas", "staf_lapang"]);
  expect(policies).toHaveLength(2);
});