# Store AI Clinic 前端用户价值优先审查

基于当前 Next.js 前端代码的逐页审查，目标是把产品感知从“工作流后台”切换成“AI 分析助手”。审查范围覆盖 `Agent`、`Tasks`、`Brands`、`Knowledge`、`Settings` 及共享壳层组件。

## 1. 信息分级

### A 类：用户价值信息，默认展示

- 当前正在发生什么
  - “已收到报表”
  - “AI 正在分析经营表现”
  - “正在生成诊断建议”
- 分析发现了什么
  - 关键异常
  - 趋势变化
  - 影响范围
- AI 给出的结论
  - 诊断摘要
  - 根因判断
  - 建议动作
- 用户下一步做什么
  - 补充缺失数据
  - 确认建议
  - 进入任务详情继续处理

### B 类：运营管理信息，折叠展示

- 进度步骤详情
- 执行时间线详细描述
- 数据准备说明
- 模型运行阶段
- RAG 准备状态
- 配置摘要

推荐统一收纳到：

- `查看详细过程`
- `高级信息`
- `开发者模式`

### C 类：开发调试信息，生产环境禁止展示

- `task_id`
- `workflow_id`
- `trace_id`
- `source`
- `fallback`
- `diagnosis_error`
- 原始接口错误
- 工作流阶段原始枚举值
- mock 标记
- 后端桥接来源

这些信息只能保留在：

- 服务端日志
- 浏览器控制台
- Feature flag 控制的 Developer Mode

## 2. 逐页审查结论

### Agent 页

当前问题：

- [message-list.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/components/message-list.tsx) 默认展示“当前任务 {taskId}”
- [result-summary.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/components/result-summary.tsx) 默认展示“阶段 / 来源 / 异常”
- [use-agent-submit.ts](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/hooks/use-agent-submit.ts) 直接把原始错误文案塞进用户界面
- [execution-timeline.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/components/execution-timeline.tsx) 的语义接近工作流执行面板

用户应看到：

- AI 已收到什么输入
- 分析当前进行到哪一步
- 最新结论是什么
- 是否需要人工确认或补数据

不应看到：

- 当前任务编号
- 来源是 `llm` 还是 `fallback`
- 原始异常文本
- `diagnose` 这种阶段枚举

### Tasks 页

当前问题：

- [tasks-shell.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/tasks-shell.tsx) 页面标题在详情页变成“任务 {id}”
- [task-list.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/task-list.tsx) 列表项展示“来源”
- [execution-log-panel.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/execution-log-panel.tsx) 默认展示执行日志和任务 ID
- [diagnosis-panel.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx) 默认展示“来源 / 异常”

用户应看到：

- 当前任务状态
- 关键发现
- 根因
- 建议动作
- 是否还需要处理

不应看到：

- 任务 ID 作为主标题
- 数据源说明
- 执行日志作为主面板
- 系统异常原文

### Brands 页

当前优势：

- 信息大多是业务配置，不属于强技术暴露
- Tab 架构合理

当前问题：

- [brands-shell.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/brands/components/brands-shell.tsx) 头部摘要有点像配置后台
- 左侧“品牌就绪度”文案偏系统导向，而非帮助用户理解为什么这些配置重要

建议：

- 保留 Tab
- 强化业务解释
- 弱化“编辑区 / 就绪度”这类后台感标签

### Knowledge 页

当前优势：

- 核心任务明确：上传、维护、准备知识源

当前问题：

- [knowledge-shell.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/knowledge/components/knowledge-shell.tsx) 默认强调“有效来源数”“自动同步状态”
- [source-list.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/knowledge/components/source-list.tsx) 和 [rag-status-panel.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/knowledge/components/rag-status-panel.tsx) 容易变成运营看板

建议：

- 默认展示“这些知识会帮助 AI 在哪些场景更准”
- RAG 状态放到“高级信息”

### Settings 页

当前问题：

- [settings-shell.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/settings/components/settings-shell.tsx) 头部展示模型名、保留时长、摘要频率，偏系统控制台

建议：

- 默认以用户理解的业务语言组织
- 例如“AI 风格与严谨度”“上传保留策略”“通知方式”
- 模型代号仅在高级设置中显示

### 共享组件

- [page-header.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/shared/ui/page-header.tsx)
  - 头部描述整体偏长，很多页面重复解释
- [app-sidebar.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/shared/ui/app-sidebar.tsx)
  - “最近任务”直接暴露任务编号
  - 应改成用户能识别的任务名或“杭州西湖店 日诊断”

## 3. 应删除的组件清单

- Agent 页中的 `当前任务 {taskId}` 标签
  - 文件：[message-list.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/components/message-list.tsx)
- Agent 结果卡中的 `来源` 字段
  - 文件：[result-summary.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/components/result-summary.tsx)
- Agent 结果卡中的 `异常` 原文
  - 文件：[result-summary.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/components/result-summary.tsx)
- Tasks 列表中的 `来源`
  - 文件：[task-list.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/task-list.tsx)
- Tasks 详情页标题中的任务 ID
  - 文件：[tasks-shell.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/tasks-shell.tsx)
- Tasks 执行日志头部中的任务 ID 胶囊
  - 文件：[execution-log-panel.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/execution-log-panel.tsx)
- Tasks 结果卡中的 `来源`
  - 文件：[diagnosis-panel.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx)
- Tasks 结果卡中的 `异常` 原文
  - 文件：[diagnosis-panel.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/features/tasks/components/diagnosis-panel.tsx)
- Sidebar 最近任务中的 `task-*` 编号
  - 文件：[app-sidebar.tsx](D:/桌面/门店数据诊断/store-ai-clinic-web/shared/ui/app-sidebar.tsx)

## 4. 应隐藏的组件清单

- `ExecutionTimeline`
  - 默认保留简版进度
  - 详细说明放到“查看详细过程”
- `ExecutionLogPanel`
  - 默认折叠
  - 仅在 Developer Mode 或“详细过程”中展开
- Knowledge 页的 `RagStatusPanel`
  - 默认折叠为“知识准备情况”
- Settings 页头部的模型代号和策略胶囊
  - 收进高级设置

## 5. 应合并的组件清单

- `MessageList` + `Composer`
  - 合并成一个连续的“与 AI 协作”主面板
  - 减少上下两个大卡片造成的分裂感
- `ExecutionTimeline` + `ResultSummary`
  - 合并成“分析进展与结论”
  - 上部是 3 到 4 步简版进度，下部是当前结论
- `TaskList` + `TaskFilters`
  - 合并为“任务收件箱”
  - 搜索、筛选、列表统一在一个容器中
- `DiagnosisPanel` + `AnomaliesChart`
  - 合并为“分析结果”
  - 图表只服务结论，不单独抢注意力

## 6. 重构后的页面结构图

### Agent 页 Wireframe

```text
+------------------------------------------------------+
| 与 AI 分析助手协作                                   |
| 上传日报 / 周报，提问，发起诊断                      |
+------------------------------------------------------+

+----------------------------------+-------------------+
| 主对话工作区                     | 当前分析           |
|                                  |                   |
| AI 引导消息                      | 进度步骤           |
| 用户输入                         | 1. 已收到报表      |
| 文件上传区                       | 2. 正在清洗数据    |
| 文本输入区                       | 3. AI 正在分析     |
| 发起诊断按钮                     | 4. 正在生成建议    |
|                                  |                   |
|                                  | 最新结论摘要       |
|                                  | 关键发现           |
|                                  | 建议动作           |
|                                  |                   |
|                                  | 查看详细过程       |
+----------------------------------+-------------------+
```

### Tasks 页 Wireframe

```text
+------------------------------------------------------+
| 诊断任务                                             |
| 查看待处理、进行中、已完成的分析任务                 |
+------------------------------------------------------+

+----------------------------------+-------------------+
| 任务收件箱                       | 分析结果           |
| 搜索 / 筛选                      |                   |
|                                  | 当前状态           |
| 店铺 + 诊断类型                  | 关键发现           |
| 任务标题                         | 根因分析           |
| 一句话摘要                       | 建议动作           |
| 当前状态                         | 人工确认入口       |
|                                  |                   |
|                                  | 查看详细过程       |
+----------------------------------+-------------------+
```

### Brands 页 Wireframe

```text
+------------------------------------------------------+
| 品牌配置                                             |
| 让 AI 更懂你的经营口径与报表结构                     |
+------------------------------------------------------+

Tab: 品牌信息 | 报表模板 | 字段映射 | 诊断规则

+------------------------------------------------------+
| 当前 Tab 内容                                        |
| 说明：为什么这项配置会影响诊断准确性                 |
| 表单 / 列表 / 编辑器                                 |
+------------------------------------------------------+
```

### Knowledge 页 Wireframe

```text
+------------------------------------------------------+
| 知识库                                               |
| 上传 SOP、规则与历史案例，让 AI 回答更贴近业务       |
+------------------------------------------------------+

+----------------------------------+-------------------+
| 上传新资料                        | 当前已接入内容     |
| 资料类型选择                      | 内容列表           |
| 名称 + 文件                        | 用途说明           |
| 提交按钮                           | 更新时间           |
|                                    |                   |
|                                    | 高级信息           |
+----------------------------------+-------------------+
```

### Settings 页 Wireframe

```text
+------------------------------------------------------+
| 设置                                                 |
| 调整 AI 协作方式、上传规则和通知偏好                 |
+------------------------------------------------------+

+------------------------------------------------------+
| AI 行为设置                                          |
+------------------------------------------------------+
| 上传与保留策略                                       |
+------------------------------------------------------+
| 通知与摘要                                           |
+------------------------------------------------------+
| 高级设置                                             |
+------------------------------------------------------+
```

## 7. 用户完整操作路径

1. 进入 `Agent`
2. 输入问题或上传日报 / 周报
3. 点击“发起诊断”
4. 页面右侧展示简明进度
5. AI 生成最新结论摘要
6. 用户直接看到“关键发现 + 建议动作”
7. 如需继续跟进，进入 `Tasks`
8. 在 `Tasks` 中查看待处理任务
9. 打开单个任务查看根因、建议和下一步动作
10. 如 AI 提示知识不足，进入 `Knowledge` 补充 SOP 或案例
11. 如诊断规则不匹配，进入 `Brands` 调整模板、字段映射或规则

## 8. 每项修改背后的 UX 理由

- 删除任务 ID
  - 用户不会基于 ID 做决策，只会增加理解负担
- 删除 `source` 和 `fallback`
  - 这是系统实现信息，不是用户价值信息
- 隐藏原始异常
  - 用户需要的是“发生了什么”和“该怎么办”，不是堆栈与接口返回
- 合并卡片
  - 当前 Agent 页信息被分成多个并列块，用户需要在脑内拼接
- 弱化执行日志
  - 大多数用户并不关心具体节点，而关心分析是否完成、结论是否可信
- 用“进度步骤”替代“工作流阶段”
  - 让 AI 行为可感知，但不暴露内部架构
- 把图表降级为证据而不是主角
  - 图表应该解释结论，而不是让用户自己推理所有结论
- Settings 改成业务语言
  - 设置是帮助用户塑造体验，不是让用户管理系统实现

## 9. Next.js + React + shadcn/ui 实现建议

### 组件结构建议

- `features/agent/components/agent-workspace.tsx`
  - 取代 `MessageList` 和 `Composer` 的分裂布局
- `features/agent/components/analysis-status.tsx`
  - 仅显示用户可理解的 3 到 4 个步骤
- `features/agent/components/analysis-details-drawer.tsx`
  - 收纳高级过程信息
- `features/tasks/components/task-inbox.tsx`
  - 合并筛选和列表
- `features/tasks/components/task-insight-panel.tsx`
  - 合并结果、根因、建议动作
- `features/common/components/developer-mode.tsx`
  - 统一承载 C 类信息

### 状态模型建议

- `TaskResultViewModel` 拆成两层
  - `userFacing`
    - `headline`
    - `summary`
    - `nextAction`
    - `progress`
    - `needsAttention`
  - `system`
    - `taskId`
    - `stage`
    - `source`
    - `error`

这样可以从类型层防止开发调试信息误进入主界面。

### 错误处理建议

- 在 [use-agent-submit.ts](D:/桌面/门店数据诊断/store-ai-clinic-web/features/agent/hooks/use-agent-submit.ts) 中增加错误映射层
  - `401 / provider auth / timeout / network`
  - 统一转成用户语言
- 示例：
  - `AI 分析服务暂时不可用，系统正在自动重试。`
  - `这次分析未完成，请稍后重新发起。`

### shadcn/ui 映射建议

- 主内容容器：`Card` 但减少嵌套层数
- 折叠高级信息：`Accordion`
- AI 状态切换：`Badge`
- 详情抽屉：`Sheet`
- 人工确认弹层：`Dialog`
- 任务筛选：`Tabs` + `Input`
- 轻量通知：`Toast`

## 10. 最终页面布局方案

### 布局总原则

- 每页只保留一个主任务
- 一个页面只允许一个视觉主角
- 二级信息只在需要时展开
- 同类信息并入同一容器
- 控制首屏内容量，减少 30% 到 50%

### 最终方案

- Agent
  - 左侧单一主工作区
  - 右侧单一结果侧栏
  - 详细过程折叠
- Tasks
  - 左侧任务收件箱
  - 右侧分析洞察
  - 执行日志移入高级区
- Brands
  - 保留 Tab
  - 强化解释文案
- Knowledge
  - 默认展示“上传 + 已接入内容”
  - RAG 细节折叠
- Settings
  - 以用户语言分组
  - 技术参数收进高级区

## 11. 优先级最高的首轮改造

如果只做第一轮，优先完成以下改动：

1. Agent 页移除 `task_id / source / raw error`
2. Tasks 页移除 `来源 / 异常 / 任务 ID 主标题`
3. 默认隐藏 `ExecutionLogPanel`
4. 建立统一的用户友好错误映射层
5. 把 `TaskResultViewModel` 拆为 `userFacing` 和 `system`

这五项能最快把产品从“后台”拉回到“AI 助手”体验。
