// DeepSeek Harness 动态插件「输入行为定制」— Host 半部
// 用法：在 DSH 会话中通过 cordis_define 定义插件时，将本文件内容作为 code.host。
// 职责：保存快捷键配置（进程内存）、校验配置合法性。

return {
  apply(ctx) {
    const DEFAULT_CONFIG = {
      enabled: true,
      enter: 'send',
      ctrlEnter: 'queue',
      shiftEnter: 'newline',
      altEnter: 'send',
      sendButton: 'send',
    }
    const BEHAVIORS = ['send', 'queue', 'newline', 'none']
    const sanitize = (raw) => {
      const src = raw && typeof raw === 'object' ? raw : {}
      const out = { enabled: src.enabled !== false }
      for (const key of Object.keys(DEFAULT_CONFIG)) {
        if (key === 'enabled') continue
        out[key] = BEHAVIORS.includes(src[key]) ? src[key] : DEFAULT_CONFIG[key]
      }
      if (out.sendButton === 'newline') out.sendButton = DEFAULT_CONFIG.sendButton
      return out
    }
    let config = null
    harness.handle('composer-trigger-config-get', async () => ({ config: config === null ? DEFAULT_CONFIG : config }))
    harness.handle('composer-trigger-config-set', async (args) => {
      config = sanitize(args && args.config)
      return { ok: true }
    })
  },
}
