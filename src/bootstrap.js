import fs from "node:fs";
import path from "node:path";

const STATE_DIR = process.env.OPENCLAW_STATE_DIR || "/data/.openclaw";
const MCPORTER_PATH =
  process.env.MCPORTER_CONFIG || path.join(STATE_DIR, "config", "mcporter.json");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
}

function deepMerge(target, patch) {
  if (Array.isArray(target) || Array.isArray(patch)) return patch;
  if (typeof target !== "object" || target === null) return patch;
  if (typeof patch !== "object" || patch === null) return patch;

  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out;
}

function patchOpenClawJson() {
  const cfgPath = path.join(STATE_DIR, "openclaw.json");
  if (!fs.existsSync(cfgPath)) return;

  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

  const patch = {
    channels: { telegram: { enabled: true } },
    plugins: { entries: { telegram: { enabled: true } } },
    skills: { load: { extraDirs: ["/opt/openclaw-skills"] } },
  };

  const merged = deepMerge(cfg, patch);
  fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2));
}

function writeMcporterConfig() {
  ensureDir(path.dirname(MCPORTER_PATH));

  const mcpUrl = process.env.SENPI_MCP_URL || "https://mcp.dev.senpi.ai/mcp";

  const config = {
    mcpServers: {
      senpi: {
        baseUrl: mcpUrl,
        description: "Senpi Hyperliquid MCP (remote HTTP)",
        headers: { Authorization: "Bearer $env:SENPI_MCP_TOKEN" },
      },
    },
    imports: [],
  };

  writeIfMissing(MCPORTER_PATH, JSON.stringify(config, null, 2));
}

ensureDir(STATE_DIR);
writeMcporterConfig();
patchOpenClawJson();
