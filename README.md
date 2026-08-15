# DSH Enter Customizer

DSH（DeepSeek Harness）Web 插件：接管聊天输入框的系统输入快捷键，为每个快捷键独立配置行为。配置通过 DSH 用户设置持久化保存。

## 功能

- **接管系统输入快捷键**：`Enter`、`Ctrl+Enter`、`Shift+Enter`、`Alt+Enter` 和右下角发送按钮
- **每个快捷键可独立选择行为**：
  - **发送消息**：空闲立即发送；忙碌时自动排队，回合结束后发送
  - **繁忙时插入消息**：空闲立即发送；忙碌时进入系统队列（与系统内置的"在繁忙时插入消息"机制完全一致，可在输入框上方的队列栏查看、编辑、引导入回合）
  - **换行**：插入换行，不发送
  - **无作用**：按键无任何效果（也不触发系统默认行为）
- **设置持久化**：配置写入用户设置文档（`~/.dsh/settings.yaml` 的 `dsh-enter-customizer` 段），重启不丢失；系统设置页「输入快捷键」直接编辑
- **发送失败提示**：失败时在输入栏正上方浮动显示错误提示（3.2 秒后自动消失）
- **安全护栏**：中文输入法组合输入（IME）、斜杠命令菜单/弹层打开、机器忙碌（提交中）、含 @引用/图片的草稿、空草稿、停止按钮等场景自动放行给系统默认处理

## 截图

### 设置界面

设置 → 输入快捷键，每个快捷键独立配置行为：

![设置界面](assets/settings.png)

## 默认配置

| 快捷键 | 默认行为 |
|---|---|
| Enter | 发送消息 |
| Ctrl + Enter | 繁忙时插入消息 |
| Shift + Enter | 换行 |
| Alt + Enter | 发送消息 |
| 发送按钮 | 发送消息 |

## 安装

本插件是标准 DSH Web 插件（npm 包），通过 `dsh plugin` 命令安装到 web profile：

```bash
# 方式一：本地目录安装（开发/自用时推荐）
# 注意：Windows 下项目路径不能包含空格（dsh 的 pnpm 参数转发限制）。
# 含空格时请先建一个无空格的 junction 再从该路径安装：
#   New-Item -ItemType Junction -Path C:\dsh-enter-customizer -Target "E:\你的项目目录"
#   dsh plugin --profile web add C:\dsh-enter-customizer
dsh plugin --profile web add .

# 方式二：发布到 npm 后按包名安装
dsh plugin --profile web add dsh-enter-customizer
```

安装完成后**重启 dsh** 使插件生效（`dsh.client` 包扫描在启动时进行）。

> 安装时会自动完成两件事：
> 1. 把包加入 profile 依赖与 `dsh.profile.bundles` 层（通过 `dsh.bundle` 声明）
> 2. bundle patch 把插件行插入 profile 配置，Host 半部注册持久化设置命名空间，Client 半部经 `dsh.client` 声明被 Web 加载

### 验证

- 打开设置面板，左侧导航出现「**输入快捷键**」页面
- `~/.dsh/settings.yaml` 中出现 `dsh-enter-customizer:` 段（改动后自动写入）

### 卸载

```bash
dsh plugin --profile web remove dsh-enter-customizer
```

## 文件结构

```
├── package.json         # dsh.client（Web 插件）+ dsh.bundle（profile patch）声明
├── cordis.patch.yml     # bundle patch：插入插件行
├── lib/
│   ├── index.js         # Host 半部：注册持久化 settings 命名空间
│   └── client.js        # Client 半部：快捷键拦截 + 设置页 + 失败提示（__ModuleLoader__ bundle）
└── assets/
    ├── settings.png     # 设置界面截图
    └── toast.svg        # 失败提示示意图
```

## 实现要点

- 快捷键拦截：在 `conversation.input.dock` 挂载组件，使用 document 级 capture 监听 `keydown` / `click`，仅当事件目标位于 `[data-composer-card]` 内时按配置处理；`preventDefault` + `stopPropagation` 覆盖系统默认行为
- 发送/繁忙时插入均通过 `session.prompt(content, 'queue')` 提交——与系统内置队列完全同一通道，消息显示在系统队列栏
- 换行通过 DOM 写入 + `inputActions.setDraft()` 立即同步，文本区即时刷新
- 持久化：Host 半部 `settings.register` 注册 `dsh-enter-customizer` 命名空间（schemastery schema），Client 半部经 `settingsScope.bind` 读写（`scope.set` 逐字段写入，`scope.subscribe` 同步外部变更）
- Client bundle 为纯 JS（仅依赖 `react`），无需打包步骤，直接以 `__ModuleLoader__` 工厂格式发布
