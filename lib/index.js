// DSH Enter Customizer — Host half.
// Declares the durable "dsh-enter-customizer" settings namespace through the
// plugin's Config schema (volatile fields are user-editable in Settings). The
// Host settings service picks the schema up automatically from the cordis
// entry, so no explicit register() call is needed anymore. Loaded by the
// cordis loader as a regular profile plugin row (see cordis.patch.yml).

import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by this plugin (also the cordis entry id). */
export const NAMESPACE = "dsh-enter-customizer";

/** Accepted behavior values for one input shortcut. */
export const BEHAVIORS = ["send", "queue", "newline", "none"];

/** Accepted behavior values for the send button (no newline). */
export const SEND_BEHAVIORS = ["send", "queue", "none"];

/** Durable shortcut configuration section.
 * Every field is volatile: the Host projects them into the settings form and
 * the client half persists them through the shared configuration form. */
export const Config = z.object({
  /** Master switch: when false, every shortcut falls back to system defaults. */
  enabled: z.boolean().default(true).volatile(),
  enter: z.union(BEHAVIORS).default("send").volatile(),
  ctrlEnter: z.union(BEHAVIORS).default("queue").volatile(),
  shiftEnter: z.union(BEHAVIORS).default("newline").volatile(),
  altEnter: z.union(BEHAVIORS).default("send").volatile(),
  sendButton: z.union(SEND_BEHAVIORS).default("send").volatile(),
});

/**
 * Host registration. The Config schema above is discovered automatically as the
 * "dsh-enter-customizer" settings namespace. This plugin ships its own Settings
 * page (see client.js), so it opts out of the auto-generated configuration form.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx) {
  ctx.inject(["settings"], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
}
