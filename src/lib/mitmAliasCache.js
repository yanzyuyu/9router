import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/dataDir.js";

const CACHE_FILE = path.join(DATA_DIR, "mitm", "aliases.json");

function writeAtomic(data) {
  const dir = path.dirname(CACHE_FILE);
  try {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${CACHE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, CACHE_FILE);
  } catch (e) {
    console.warn(`[mitmAliasCache] writeAtomic failed: ${e.message}`);
  }
}

export async function syncToJson() {
  try {
    const { getMitmAlias } = await import("@/lib/db/repos/aliasRepo.js");
    const all = await getMitmAlias();
    writeAtomic(all || {});
  } catch (e) {
    console.warn(`[mitmAliasCache] sync failed: ${e.message}`);
  }
}

export function writeAliasForTool(tool, mappings) {
  try {
    let current = {};
    if (fs.existsSync(CACHE_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      } catch {}
    }
    current[tool] = mappings || {};
    writeAtomic(current);
  } catch (e) {
    console.warn(`[mitmAliasCache] write failed: ${e.message}`);
  }
}
