// DSH Enter Customizer — Client half (web bundle).
// Module format: window.__ModuleLoader__ factory bundle (see
// @deepseek-ai/dsh-client-modules). Takes over the composer input shortcuts
// (Enter / Ctrl+Enter / Shift+Enter / Alt+Enter / send button) with four
// configurable behaviors (send / queue-while-busy / newline / no-op).
// Configuration is persisted through the client settingsScope service into
// the Host "dsh-enter-customizer" namespace (~/.dsh/settings.yaml).
//
// Build note: this bundle is intentionally dependency-free (plain JS plus
// require("react")), so it ships as-is without a bundling step.

window.__ModuleLoader__.load({
  id: "dsh-enter-customizer",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");

    const CSS =
      ".cti-page{display:flex;flex-direction:column;gap:2px;padding:4px 0 24px;}" +
      ".cti-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);margin-bottom:6px;}" +
      ".cti-toggle-row{display:flex;align-items:center;gap:8px;padding:10px 0;}" +
      ".cti-toggle-row label{font-size:13px;color:var(--dsw-alias-label-primary);}" +
      ".cti-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l1);}" +
      ".cti-row-name{width:190px;font-size:13px;color:var(--dsw-alias-label-primary);flex-shrink:0;}" +
      ".cti-row-behavior{width:230px;}" +
      ".cti-select{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:5px 8px;font-size:13px;}" +
      ".cti-desc{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.8;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l1);}" +
      ".cti-reset{margin-top:10px;align-self:flex-start;background:transparent;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer;}" +
      ".cti-float{pointer-events:none;z-index:60;display:flex;justify-content:center;align-items:flex-start;}" +
      ".cti-float-inner{background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:5px 14px;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-error-primary);box-shadow:0 4px 16px rgba(0,0,0,0.15);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;}";

    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="dsh-enter-customizer"]') === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-enter-customizer";
      tag.dataset.pluginCss = "dsh-enter-customizer";
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /** Services required by the client half. */
    const inject = ["slots", "sessions", "timer", "connection", "remote", "settingsScope"];

    /** Mounts the composer shortcut customization.
     * @param ctx - Client root context.
     */
    function apply(ctx) {
      const slots = ctx.get("slots");
      const sessions = ctx.get("sessions");
      const timer = ctx.get("timer");
      if (slots === undefined || sessions === undefined || timer === undefined) return;

      const NAMESPACE = "dsh-enter-customizer";
      const BEHAVIOR_LABELS = { send: "发送消息", queue: "繁忙时插入消息", newline: "换行", none: "无作用" };
      const BEHAVIOR_KEYS = Object.keys(BEHAVIOR_LABELS);
      const KEY_ROWS = ["enter", "ctrlEnter", "shiftEnter", "altEnter"];
      const COMBO_OF = { enter: "enter", ctrlEnter: "ctrl+enter", shiftEnter: "shift+enter", altEnter: "alt+enter" };
      const ROW_LABELS = { enter: "Enter", ctrlEnter: "Ctrl + Enter", shiftEnter: "Shift + Enter", altEnter: "Alt + Enter", sendButton: "发送按钮" };
      const DEFAULT_CONFIG = {
        enabled: true,
        enter: "send",
        ctrlEnter: "queue",
        shiftEnter: "newline",
        altEnter: "send",
        sendButton: "send",
      };
      const normalize = (raw) => {
        const src = raw && typeof raw === "object" ? raw : {};
        const out = { enabled: src.enabled !== false };
        for (const key of Object.keys(DEFAULT_CONFIG)) {
          if (key === "enabled") continue
          out[key] = BEHAVIOR_KEYS.includes(src[key]) ? src[key] : DEFAULT_CONFIG[key];
        }
        if (out.sendButton === "newline") out.sendButton = DEFAULT_CONFIG.sendButton;
        return out;
      };

      // ----- durable settings scope (persisted in the Host settings document) -----
      let scope = undefined;
      const settingsScope = ctx.get("settingsScope");
      if (settingsScope !== undefined) {
        try {
          scope = settingsScope.bind({ namespace: NAMESPACE });
        } catch (err) {
          scope = undefined;
        }
      }

      let config = normalize(null);
      const listeners = new Set();
      const store = {
        get: () => config,
        set(next) { config = next; for (const fn of Array.from(listeners)) fn() },
        subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
      };
      if (scope !== undefined) {
        const snap = scope.getSnapshot();
        if (snap && snap.value) store.set(normalize(snap.value));
        scope.subscribe(() => {
          const s = scope.getSnapshot();
          if (s && s.value) store.set(normalize(s.value));
        });
      }
      const persist = (next) => {
        const prev = store.get();
        store.set(next);
        if (scope === undefined) return;
        for (const key of Object.keys(next)) {
          if (next[key] !== prev[key]) scope.set(key, next[key]);
        }
      };
      const useConfig = () => {
        const [, force] = React.useState(0);
        React.useEffect(() => store.subscribe(() => force((n) => n + 1)), []);
        return store.get();
      };

      const eventCombo = (e) => {
        const parts = [];
        if (e.ctrlKey) parts.push("ctrl");
        if (e.altKey) parts.push("alt");
        if (e.shiftKey) parts.push("shift");
        if (e.metaKey) parts.push("meta");
        parts.push(String(e.key).toLowerCase());
        return parts.join("+");
      };
      const insertNewline = (el, actions) => {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        const next = el.value.slice(0, start) + "\n" + el.value.slice(end);
        el.value = next;
        el.setSelectionRange(start + 1, start + 1);
        actions.setDraft(next);
      };

      // ---------- interception component: dock row above the composer (toast floats over the input bar) ----------
      const StatusDock = (props) => {
        const zoneSession = props.session;
        const zoneInput = props.input;
        const [notice, setNotice] = React.useState(null);
        const [rect, setRect] = React.useState(null);
        const stateRef = React.useRef({ sessionId: undefined });
        stateRef.current = {
          sessionId: props.sessionId,
          draft: zoneInput ? zoneInput.draft : "",
          phase: zoneInput ? zoneInput.phase : "plain",
          occurrences: zoneInput ? zoneInput.occurrences : [],
          imageIds: zoneInput ? zoneInput.imageIds : [],
          running: zoneSession ? zoneSession.running : false,
          subagent: zoneSession ? zoneSession.subagent : null,
          removed: zoneSession ? zoneSession.removed : false,
        };
        const actionsRef = React.useRef(props.inputActions);
        actionsRef.current = props.inputActions;

        const submitDirect = async (behavior, st, text, flash) => {
          const binding = sessions.binding(st.sessionId);
          const session = binding === undefined ? undefined : binding.session;
          if (session === undefined) return;
          try {
            const result = await session.prompt([{ type: "text", text }], "queue");
            if (result.ok) {
              if (stateRef.current.draft === st.draft) actionsRef.current.setDraft("");
            } else {
              if (stateRef.current.draft === "") actionsRef.current.setDraft(st.draft);
              const err = result.error || {};
              flash("error", "发送失败：" + (err.code || "unknown"));
            }
          } catch (err) {
            if (stateRef.current.draft === "") actionsRef.current.setDraft(st.draft);
            flash("error", "发送失败");
          }
        };

        const flash = (kind, text) => setNotice({ kind, text, seq: Date.now() });
        const handlersRef = React.useRef({ onKeyDown: null, onClick: null });
        handlersRef.current.onKeyDown = (e) => {
          const cfg = store.get();
          if (!cfg.enabled) return;
          if (e.isComposing || e.keyCode === 229) return;
          const target = e.target;
          if (!(target instanceof HTMLElement)) return;
          if (target.tagName !== "TEXTAREA") return;
          const card = target.closest("[data-composer-card]");
          if (card === null) return;
          if (card.querySelector('[role="listbox"], [role="menu"], [role="dialog"]') !== null) return;
          const combo = eventCombo(e);
          let rowKey = null;
          for (const key of KEY_ROWS) {
            if (COMBO_OF[key] === combo) { rowKey = key; break }
          }
          if (rowKey === null) return;
          const behavior = cfg[rowKey];
          const st = stateRef.current;
          if (st.phase !== "plain" || st.removed || st.sessionId === undefined) return;
          if (behavior === "none") {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (behavior === "newline") {
            e.preventDefault();
            e.stopPropagation();
            insertNewline(target, actionsRef.current);
            return;
          }
          const text = st.draft.trim();
          if (text === "" || text.startsWith("/") || st.occurrences.length > 0 || st.imageIds.length > 0) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.repeat) return;
          submitDirect(behavior, st, text, flash);
        };
        handlersRef.current.onClick = (e) => {
          const cfg = store.get();
          if (!cfg.enabled) return;
          const behavior = cfg.sendButton;
          if (behavior === "send") return;
          const target = e.target;
          if (!(target instanceof HTMLElement)) return;
          const card = target.closest("[data-composer-card]");
          if (card === null) return;
          const btn = target.closest("button");
          if (btn === null) return;
          const buttons = card.querySelectorAll("button");
          if (buttons.length === 0 || buttons[buttons.length - 1] !== btn) return;
          const st = stateRef.current;
          if (st.running && st.subagent === null) return;
          if (st.phase !== "plain" || st.removed || st.sessionId === undefined) return;
          const text = st.draft.trim();
          if (text === "" || text.startsWith("/") || st.occurrences.length > 0 || st.imageIds.length > 0) return;
          e.preventDefault();
          e.stopPropagation();
          if (behavior === "queue") submitDirect("queue", st, text, flash);
        };

        React.useEffect(() => {
          const onKeyDown = (e) => handlersRef.current.onKeyDown(e);
          const onClick = (e) => handlersRef.current.onClick(e);
          document.addEventListener("keydown", onKeyDown, true);
          document.addEventListener("click", onClick, true);
          return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("click", onClick, true);
          };
        }, []);

        React.useEffect(() => {
          if (notice === null) return;
          const d = timer.timeout(() => setNotice(null), 3200);
          return d;
        }, [notice]);

        React.useEffect(() => {
          if (notice === null) {
            setRect(null);
            return;
          }
          const measure = () => {
            const card = document.querySelector("[data-composer-card]");
            if (card === null) return;
            const r = card.getBoundingClientRect();
            setRect({ left: r.left, width: r.width, top: r.top });
          };
          measure();
          window.addEventListener("scroll", measure, true);
          window.addEventListener("resize", measure);
          return () => {
            window.removeEventListener("scroll", measure, true);
            window.removeEventListener("resize", measure);
          };
        }, [notice]);

        const cfg = useConfig();
        if (!cfg.enabled || notice === null || rect === null) return null;
        return React.createElement(
          "div",
          {
            className: "cti-float",
            style: {
              position: "fixed",
              left: rect.left + "px",
              top: rect.top + "px",
              width: rect.width + "px",
              transform: "translateY(calc(-100% - 8px))",
            },
            role: "status",
          },
          React.createElement("div", { className: "cti-float-inner" }, notice.text),
        );
      };

      // ---------- settings page: system shortcut editor ----------
      const SettingsPage = () => {
        const cfg = useConfig();
        const setBehavior = (row, behavior) => persist({ ...store.get(), [row]: behavior });
        const toggleEnabled = () => persist({ ...store.get(), enabled: !store.get().enabled });
        const reset = () => persist(normalize(null));

        const behaviorOptions = (includeNewline) => BEHAVIOR_KEYS
          .filter((key) => includeNewline || key !== "newline")
          .map((key) => React.createElement("option", { key, value: key }, BEHAVIOR_LABELS[key]));
        const row = (key, includeNewline) => React.createElement(
          "div", { className: "cti-row" },
          React.createElement("span", { className: "cti-row-name" }, ROW_LABELS[key]),
          React.createElement("select", {
            className: "cti-select cti-row-behavior",
            value: cfg[key],
            onChange: (e) => setBehavior(key, e.target.value),
          }, ...behaviorOptions(includeNewline)),
        );

        return React.createElement(
          "div", { className: "cti-page" },
          React.createElement("div", { className: "cti-title" }, "输入快捷键"),
          React.createElement(
            "div", { className: "cti-toggle-row" },
            React.createElement("input", {
              type: "checkbox", id: "cti-enable", checked: cfg.enabled,
              onChange: toggleEnabled,
            }),
            React.createElement("label", { htmlFor: "cti-enable" }, "启用后接管系统输入快捷键"),
          ),
          ...KEY_ROWS.map((key) => row(key, true)),
          row("sendButton", false),
          React.createElement(
            "div", { className: "cti-desc" },
            React.createElement("div", null, "· 发送：空闲立即发送；忙碌时自动排队，回合结束后发送。"),
            React.createElement("div", null, "· 繁忙时插入：空闲立即发送；忙碌时进入系统队列（可查看、编辑、引导）。"),
            React.createElement("div", null, "· 换行：插入换行，不发送。"),
            React.createElement("div", null, "· 无作用：按键无任何效果。"),
            React.createElement("div", null, "· 斜杠命令、@引用、图片草稿及未列出的组合键仍按系统默认处理。"),
          ),
          React.createElement("button", { className: "cti-reset", onClick: reset }, "恢复默认"),
        );
      };

      slots.inject("settings.section", () => slots.register(
        { name: "settings.section", id: "input-triggers", order: 25, label: () => "输入快捷键" },
        () => React.createElement(SettingsPage),
      ));
      slots.inject("conversation.input.dock", () => slots.register(
        { name: "conversation.input.dock", id: "input-trigger-status", order: 30 },
        (props) => React.createElement(StatusDock, props),
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
