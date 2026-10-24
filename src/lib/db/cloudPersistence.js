import fs from "node:fs";
import path from "node:path";

const ENV_PROVIDERS = [
  { env: "OPENAI_API_KEY", provider: "openai" },
  { env: "ANTHROPIC_API_KEY", provider: "anthropic" },
  { env: "GEMINI_API_KEY", provider: "gemini" },
  { env: "GROQ_API_KEY", provider: "groq" },
  { env: "DEEPSEEK_API_KEY", provider: "deepseek" },
  { env: "OPENROUTER_API_KEY", provider: "openrouter" },
  { env: "MISTRAL_API_KEY", provider: "mistral" },
  { env: "COHERE_API_KEY", provider: "cohere" },
  { env: "XAI_API_KEY", provider: "xai" },
];

let syncTimer = null;

export async function prepareCloudDatabase(targetFilePath) {
  if (fs.existsSync(targetFilePath)) return;

  const targetDir = path.dirname(targetFilePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const base64Data = process.env.SQLITE_BASE64;
  if (base64Data) {
    try {
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(targetFilePath, buffer);
      return;
    } catch (e) {
      console.warn(`[DB][Cloud] base64 restore failed: ${e.message}`);
    }
  }

  const syncUrl = process.env.DATABASE_SYNC_URL;
  if (syncUrl) {
    try {
      const headers = {};
      const syncKey = process.env.DATABASE_SYNC_KEY;
      if (syncKey) headers["Authorization"] = `Bearer ${syncKey}`;
      const res = await fetch(syncUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > 0) {
          fs.writeFileSync(targetFilePath, Buffer.from(arrayBuf));
        }
      }
    } catch (e) {
      console.warn(`[DB][Cloud] sync download failed: ${e.message}`);
    }
  }
}

export async function seedFromEnv(adapter) {
  const now = new Date().toISOString();

  const clientKey = process.env.API_KEY || process.env.NINEROUTER_API_KEY;
  if (clientKey) {
    try {
      const existing = adapter.get("SELECT id FROM apiKeys WHERE key = ?", [clientKey]);
      if (!existing) {
        adapter.run(
          "INSERT INTO apiKeys (id, key, name, machineId, isActive, createdAt, accessRestricted, accessAllow) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          ["key_env_master", clientKey, "Vercel Master Key", "serverless", 1, now, 0, null]
        );
      }
    } catch (e) {
      console.warn(`[DB][Seed] client key seed failed: ${e.message}`);
    }
  }

  const seedJson = process.env.SEED_CONFIG_JSON;
  if (seedJson) {
    try {
      const config = JSON.parse(seedJson);
      if (Array.isArray(config.providerConnections)) {
        for (const conn of config.providerConnections) {
          if (!conn.provider || !conn.id) continue;
          adapter.run(
            "INSERT OR REPLACE INTO providerConnections (id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              conn.id,
              conn.provider,
              conn.authType || "api_key",
              conn.name || conn.provider,
              conn.email || null,
              conn.priority || 1,
              conn.isActive !== false ? 1 : 0,
              typeof conn.data === "string" ? conn.data : JSON.stringify(conn.data || {}),
              conn.createdAt || now,
              conn.updatedAt || now,
            ]
          );
        }
      }
      if (Array.isArray(config.combos)) {
        for (const combo of config.combos) {
          if (!combo.id || !combo.name) continue;
          adapter.run(
            "INSERT OR REPLACE INTO combos (id, name, kind, models, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
            [
              combo.id,
              combo.name,
              combo.kind || "priority",
              typeof combo.models === "string" ? combo.models : JSON.stringify(combo.models || []),
              combo.createdAt || now,
              combo.updatedAt || now,
            ]
          );
        }
      }
    } catch (e) {
      console.warn(`[DB][Seed] SEED_CONFIG_JSON parse failed: ${e.message}`);
    }
  }

  for (const item of ENV_PROVIDERS) {
    const keyVal = process.env[item.env];
    if (!keyVal) continue;

    try {
      const connId = `conn_${item.provider}_env`;
      const existing = adapter.get("SELECT id FROM providerConnections WHERE id = ? OR provider = ?", [connId, item.provider]);
      if (!existing) {
        adapter.run(
          "INSERT INTO providerConnections (id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            connId,
            item.provider,
            "api_key",
            `${item.provider.toUpperCase()} (Env)`,
            null,
            1,
            1,
            JSON.stringify({ apiKey: keyVal }),
            now,
            now,
          ]
        );
      }
    } catch (e) {
      console.warn(`[DB][Seed] ${item.provider} seed failed: ${e.message}`);
    }
  }
}

export function scheduleCloudSync(filePath) {
  const syncUrl = process.env.DATABASE_SYNC_URL;
  if (!syncUrl) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    try {
      if (!fs.existsSync(filePath)) return;
      const data = fs.readFileSync(filePath);
      const headers = { "Content-Type": "application/octet-stream" };
      const syncKey = process.env.DATABASE_SYNC_KEY;
      if (syncKey) headers["Authorization"] = `Bearer ${syncKey}`;
      await fetch(syncUrl, {
        method: "PUT",
        headers,
        body: data,
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      console.warn(`[DB][Cloud] sync upload failed: ${e.message}`);
    }
  }, 2000);
}
