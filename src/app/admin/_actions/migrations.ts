"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

export type MigrationResult = {
  success: boolean;
  message: string;
  details?: string;
};

export async function runMigration(filename: string): Promise<MigrationResult> {
  try {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const filePath = path.join(migrationsDir, filename);

    // Safety: only allow files in the migrations directory
    if (!filePath.startsWith(migrationsDir)) {
      return { success: false, message: "Invalid migration path." };
    }

    const sql = await fs.readFile(filePath, "utf-8");

    const { error } = await supabaseAdmin.rpc("exec_sql", { sql_text: sql });

    if (error) {
      // Fallback: try executing via raw SQL if exec_sql doesn't exist
      // Split on semicolons and execute individually
      const statements = sql
        .split(/;\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const errors: string[] = [];
      for (const stmt of statements) {
        const { error: stmtErr } = await supabaseAdmin.rpc("exec_sql", { sql_text: stmt + ";" });
        if (stmtErr) errors.push(stmtErr.message);
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: `Migration had ${errors.length} error(s).`,
          details: errors.join("\n"),
        };
      }
    }

    return { success: true, message: `Migration ${filename} executed successfully.` };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Unknown error running migration.",
    };
  }
}

export async function listMigrationFiles(): Promise<string[]> {
  try {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const files = await fs.readdir(migrationsDir);
    return files.filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return [];
  }
}
