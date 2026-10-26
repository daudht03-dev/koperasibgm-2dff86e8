import { describe, expect, test } from "bun:test";
import { buildPhotoPath, resolvePhotoFileUrl } from "./photo-path";

describe("photo storage rules", () => {
  test("KTP uses its restricted prefix and a sanitized code", () => {
    expect(buildPhotoPath("ktp", "user-id", "PK 1/../!", 1234)).toBe("ktp/user-id/PK1-1234.jpg");
  });

  for (const tipe of ["lahan", "rumah", "pelatihan"]) {
    test(`${tipe} keeps the existing user-prefixed path`, () => {
      expect(buildPhotoPath(tipe, "user-id", "PK1", 1234)).toBe("user-id/PK1-1234.jpg");
    });
  }

  test("new paths use the current time by default", () => {
    const before = Date.now();
    const path = buildPhotoPath("ktp", "user-id", "PK1");
    const timestamp = Number(path.match(/-(\d+)\.jpg$/)?.[1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });

  test("offline retries preserve the queued timestamp", () => {
    expect(buildPhotoPath("ktp", "user-id", "PK1", 1234)).toBe(
      buildPhotoPath("ktp", "user-id", "PK1", 1234),
    );
    expect(buildPhotoPath("ktp", "user-id", "PK1", 1234)).not.toBe(
      buildPhotoPath("ktp", "user-id", "PK1", 5678),
    );
  });

  test("KTP stores only the path and never calls the URL signer", async () => {
    let calls = 0;
    const path = "ktp/user-id/PK1-1234.jpg";
    const url = await resolvePhotoFileUrl("ktp", path, async () => {
      calls++;
      return "https://example.test/signed";
    });
    expect(url).toBe(path);
    expect(calls).toBe(0);
  });

  for (const tipe of ["lahan", "rumah", "pelatihan"]) {
    test(`${tipe} retains signed URLs with path fallback`, async () => {
      expect(await resolvePhotoFileUrl(tipe, "path.jpg", async () => "signed-url")).toBe("signed-url");
      expect(await resolvePhotoFileUrl(tipe, "path.jpg", async () => undefined)).toBe("path.jpg");
    });
  }
});