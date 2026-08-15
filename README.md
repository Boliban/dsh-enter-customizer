# DSH 输入行为定制插件（Composer Trigger Customizer）

DeepSeek Harness 动态 Cordis 插件：接管聊天输入框的系统输入快捷键，为每个快捷键独立配置行为。

## 功能

- **接管系统输入快捷键**：`Enter`、`Ctrl+Enter`、`Shift+Enter`、`Alt+Enter` 和右下角发送按钮
- **每个快捷键可独立选择行为**：
  - **发送消息**：空闲立即发送；忙碌时自动进入系统队列，当前回合结束后自动发送
  - **繁忙时插入消息**：空闲立即发送；忙碌时加入系统队列（与系统内置的"在繁忙时插入消息"机制完全一致，可在输入框上方的队列栏查看、编辑、引导入回合）
  - **换行**：插入换行，不发送
  - **无作用**：按键无任何效果（也不触发系统默认行为）
- **设置界面**：设置 → 输入快捷键，直接编辑系统快捷键
- **发送失败提示**：失败时在输入栏正上方浮动显示错误提示（3.2 秒后自动消失）
- **安全护栏**：中文输入法组合输入（IME）、斜杠命令菜单/弹层打开、机器忙碌（提交中）、含 @引用/图片的草稿、空草稿、停止按钮等场景自动放行给系统默认处理

## 默认配置

| 快捷键 | 默认行为 |
|---|---|
| Enter | 发送消息 |
| Ctrl + Enter | 繁忙时插入消息 |
| Shift + Enter | 换行 |
| Alt + Enter | 发送消息 |
| 发送按钮 | 发送消息 |

## 安装（在 DSH 会话中）

本插件是 DSH 动态插件，通过 cordis 工具定义并运行：

1. 打开任意 DSH 会话
2. 使用 `cordis_define` 定义插件（`idPrefix: "input"`），`code.host` 使用 [`host.js`](host.js) 内容，`code.client` 使用 [`client.js`](client.js) 内容
3. 使用 `cordis_run` 激活（首次需要批准）
4. 打开 **设置 → 输入快捷键** 进行配置

> 配置保存在插件 Host 端进程内存中：刷新页面不丢失；宿主进程重启后恢复默认。

## 文件结构

- `host.js` — Host 半部：配置存储与校验（`composer-trigger-config-get` / `composer-trigger-config-set` 私有 RPC）
- `client.js` — Client 半部：快捷键拦截（`conversation.input.dock`）、设置页（`settings.section`）

## 实现要点

- 快捷键拦截通过在 `conversation.input.dock` 挂载组件，使用 document 级 capture 监听 `keydown` / `click`，仅当事件目标位于 `[data-composer-card]` 内时按配置处理；`preventDefault` + `stopPropagation` 覆盖系统默认行为
- 繁忙时插入/发送均通过 `session.prompt(content, 'queue')` 提交——与系统内置队列完全同一通道，消息显示在系统队列栏
- 换行通过 DOM 写入 + `inputActions.setDraft()` 立即同步，文本区即时刷新
- 发送失败提示为 `fixed` 定位浮动气泡，位置跟随输入栏（滚动/缩放时重测）
