# Requirements Document

## Introduction

Discord Bot 工坊是一个 Web 端 Discord 机器人可视化创建和编辑平台。用户可以在网站上通过可视化界面创建、编辑、配置 Discord 机器人，并一键将其接入自己的 DC 社区。平台底层基于 discord.js 等开源项目作为技术引擎，并内置项目搜索引擎，可跨 GitHub、npm、MCP 索引发现新的能力模块。

**部署架构**: 前端部署在 GitHub Pages，后端部署在 Render，Bot 由后端直接托管运行（非代码生成模式）。

## Glossary

- **Bot**: Discord 机器人，一个自动化程序，通过 Discord API 在服务器中执行任务
- **Token**: Discord Bot 的身份令牌，用于认证和连接
- **Slash Command**: Discord 斜杠命令，用户输入 `/命令名` 触发
- **Embed**: Discord 富文本卡片消息，包含标题、描述、颜色、图片等元素
- **Event**: Discord 网关事件，如消息发送、成员加入、成员离开等
- **MCP**: Model Context Protocol，AI 模型与外部工具交互的标准协议
- **DC 社区**: 用户创建的 Discord 服务器

## Requirements

### Requirement 1: Bot 管理

**User Story:** 作为社区主理人，我想要创建和管理多个 Bot，以便为我的 DC 社区配置不同的机器人。

#### Acceptance Criteria

1. WHEN 用户点击"创建 Bot"，THE 系统 SHALL 显示 Bot 创建表单，包含名称、头像上传、Token 输入字段
2. WHEN 用户提交创建表单，THE 系统 SHALL 使用 Token 连接 Discord API 验证有效性，验证通过后保存 Bot 配置
3. THE 系统 SHALL 在 Bot 列表页面展示所有已创建的 Bot，包含名称、头像、在线状态
4. WHEN 用户点击某个 Bot，THE 系统 SHALL 进入该 Bot 的编辑页面
5. WHEN 用户选择删除 Bot，THE 系统 SHALL 弹出二次确认，确认后删除该 Bot 的所有配置数据

### Requirement 2: 可视化命令编辑器

**User Story:** 作为社区主理人，我想要通过可视化表单创建斜杠命令，以便不写代码就能给 Bot 添加交互功能。

#### Acceptance Criteria

1. THE 系统 SHALL 提供命令列表视图，展示 Bot 下所有已配置的斜杠命令
2. WHEN 用户点击"添加命令"，THE 系统 SHALL 显示命令编辑表单，包含命令名称、描述、参数配置区域
3. WHEN 用户添加命令参数，THE 系统 SHALL 支持六种参数类型选择：STRING、INTEGER、BOOLEAN、USER、CHANNEL、ROLE
4. WHEN 用户填写命令回复内容，THE 系统 SHALL 提供文本输入框，支持 Discord Markdown 语法
5. WHEN 用户保存命令，THE 系统 SHALL 在后台生成对应的 discord.js 命令注册代码
6. THE 系统 SHALL 支持对已创建命令的编辑和删除操作

### Requirement 3: Embed 消息构建器

**User Story:** 作为社区主理人，我想要可视化拼装 Discord 卡片消息，以便制作美观的公告和回复。

#### Acceptance Criteria

1. THE 系统 SHALL 提供 Embed 编辑器，包含标题、描述、颜色选择器、缩略图 URL、大图 URL、页脚文本字段
2. THE 系统 SHALL 提供实时预览面板，展示 Embed 消息在 Discord 中的渲染效果
3. WHEN 用户在颜色选择器中选取颜色，THE 系统 SHALL 实时更新预览中 Embed 左侧色条颜色
4. THE 系统 SHALL 支持在一个命令回复中配置多个 Embed 卡片

### Requirement 4: 事件行为配置

**User Story:** 作为社区主理人，我想要配置 Bot 对服务器事件的自动响应，以便实现欢迎消息、关键词回复等功能。

#### Acceptance Criteria

1. THE 系统 SHALL 提供事件列表，包含 memberJoin（成员加入）、messageCreate（消息发送）、memberLeave（成员离开）
2. WHEN 用户配置 memberJoin 事件，THE 系统 SHALL 支持设置欢迎消息文本和发送目标频道
3. WHEN 用户配置 messageCreate 事件，THE 系统 SHALL 支持设置关键词匹配规则和对应的回复内容
4. WHEN 用户保存事件配置，THE 系统 SHALL 在后台生成对应的事件监听代码

### Requirement 5: 项目搜索引擎

**User Story:** 作为社区主理人，我想要搜索 GitHub、npm 和 MCP 上的开源项目，以便发现可以扩展 Bot 能力的新模块。

#### Acceptance Criteria

1. THE 系统 SHALL 提供统一搜索框，支持按关键字搜索 Discord Bot 相关的开源项目
2. WHEN 用户执行搜索，THE 系统 SHALL 同时查询 GitHub Repository Search API、npm Registry Search API 和 MCP 项目索引
3. THE 系统 SHALL 在搜索结果中展示每个项目的名称、描述、Star 数、开源协议、主页链接
4. WHEN 用户点击搜索结果中的项目，THE 系统 SHALL 展示项目详情，包含 README 摘要、安装命令、代码示例
5. THE 系统 SHALL 支持按数据源（GitHub / npm / MCP）和编程语言筛选搜索结果
6. IF 搜索 API 请求失败，THE 系统 SHALL 展示降级结果并提示用户部分数据源暂时不可用

### Requirement 6: Bot 部署与社区连接

**User Story:** 作为社区主理人，我想要一键将配置好的 Bot 上线，使其接入我的 DC 社区。

#### Acceptance Criteria

1. WHEN 用户点击"启动"，THE 系统 SHALL 在后端启动该 Bot 的 discord.js 客户端进程，连接 Discord Gateway
2. THE 系统 SHALL 在 Bot 管理页实时显示 Bot 运行状态（在线/离线/启动中/错误）
3. WHEN Bot 在线，THE 系统 SHALL 提供"停止"和"重启"操作按钮
4. THE 系统 SHALL 提供 OAuth2 邀请链接，用户点击可将 Bot 加入 DC 服务器
5. WHEN Bot 运行出错，THE 系统 SHALL 在前端展示错误日志摘要
6. THE 系统 SHALL 在后端持久化保存 Bot 配置，重启后端服务后自动恢复所有 Bot 运行状态

### Requirement 7: 社区信息面板

**User Story:** 作为社区主理人，我想要在网站上查看我的 DC 社区基本信息，以便了解社区运行状况。

#### Acceptance Criteria

1. WHEN Bot Token 已验证有效，THE 系统 SHALL 调用 Discord API 获取服务器基本信息
2. THE 系统 SHALL 在面板中展示服务器名称、成员总数、频道数量、角色数量
3. THE 系统 SHALL 展示当前 Bot 在服务器中的权限列表
