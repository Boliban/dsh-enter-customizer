// DSH Enter Customizer — Host half.
// Registers the durable "dsh-enter-customizer" settings namespace so the
// client half can persist the composer shortcut configuration in the user
// settings document (~/.dsh/settings.yaml). Browser reads and writes travel
// over a plugin-owned webServer route (/dsh-enter-customizer), because the
// api-gateway settings RPCs only expose the framework's hard-coded namespace
// allowlist — a third-party namespace is invisible to settings.describe and
// refused by settings.mutate until the framework opens registration.

import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by this plugin. */
export const NAMESPACE = "dsh-enter-customizer";

/** Accepted behavior values for one input shortcut. */
export const BEHAVIORS = ["send", "queue", "newline", "none"];

/** Durable shortcut configuration section. */
export const schema = z.object({
  /** Master switch: when false, every shortcut falls back to system defaults. */
  enabled: z.boolean().default(true),
  enter: z.union(BEHAVIORS).default("send"),
  ctrlEnter: z.union(BEHAVIORS).default("queue"),
  shiftEnter: z.union(BEHAVIORS).default("newline"),
  altEnter: z.union(BEHAVIORS).default("send"),
  sendButton: z.union(["send", "queue", "none"]).default("send"),
});

/** The webServer route prefix owned by this plugin. */
const ROUTE = "/dsh-enter-customizer";

/** True when the request's Origin matches its Host — required on every write. */
function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin === undefined || host === undefined) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

/** Read and parse a JSON request body, rejecting anything over 4 KiB. */
async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 4096) throw new Error("request body too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** The namespace's current resolved value, or null while unregistered. */
function currentView(settings) {
  const descriptor = settings
    .describe({ redactSecrets: true })
    .find((candidate) => String(candidate.ns) === NAMESPACE);
  return descriptor === undefined ? null : descriptor.value;
}

/**
 * Register the durable section and the browser configuration route once the
 * settings and webServer providers exist.
 * @param ctx - Host context whose optional services own this plugin's needs.
 */
export function apply(ctx) {
  ctx.inject(["settings", "webServer"], (hostCtx) => {
    const settings = hostCtx.settings;
    settings.register(settingsNamespace(NAMESPACE), schema);
    const disposer = hostCtx.webServer.register({
      kind: "prefix",
      path: ROUTE,
      handler: async (request, response) => {
        if (request.method === "GET") {
          sendJson(response, 200, { ok: true, value: currentView(settings) });
          return;
        }
        if (request.method === "POST") {
          if (!sameOrigin(request)) {
            sendJson(response, 403, { ok: false, error: "untrusted origin" });
            return;
          }
          let patch;
          try {
            patch = await readJsonBody(request);
          } catch {
            sendJson(response, 400, { ok: false, error: "invalid body" });
            return;
          }
          try {
            await settings.update(settingsNamespace(NAMESPACE), patch);
            sendJson(response, 200, { ok: true, value: currentView(settings) });
          } catch (error) {
            sendJson(response, 400, {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          return;
        }
        response.writeHead(405);
        response.end();
      },
    });
    hostCtx.effect(() => disposer, "dsh-enter-customizer: http route");
  });
}
