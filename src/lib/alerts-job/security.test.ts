import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("service-role client boundaries", () => {
  it("keeps the service-role variable and admin import in their permitted files", () => {
    const root = join(process.cwd(), "src");
    const files = sourceFiles(root);
    const violations = files.flatMap((path) => {
      const rel = relative(process.cwd(), path).replaceAll("\\", "/");
      const contents = readFileSync(path, "utf8");
      const issues: string[] = [];
      if (contents.includes("SUPABASE_SERVICE_ROLE_KEY") && rel !== "src/lib/supabase/admin.ts" && !rel.endsWith(".test.ts")) issues.push(`${rel}:service_key`);
      const importsAdmin = /from\s+["'][^"']*supabase\/admin["']/.test(contents);
      if (importsAdmin && rel !== "src/lib/alerts-job/server.ts") issues.push(`${rel}:admin_import`);
      return issues;
    });
    expect(violations).toEqual([]);
  });
});
