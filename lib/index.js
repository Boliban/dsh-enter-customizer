// DSH Enter Customizer — Host half.
// Registers the durable "dsh-enter-customizer" settings namespace so the
// client half can persist the composer shortcut configuration in the user
// settings document (~/.dsh/settings.yaml). Loaded by the cordis loader as a
// regular profile plugin row (see cordis.patch.yml).

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

/**
 * Register the durable section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(NAMESPACE), schema);
  });
}
