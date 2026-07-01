# 2026-06-26 前端重设计交接文档

## 1. 本次目标

根据用户提供的参考截图，将前端整体改为「体检报告质检 / 数据合规筛查工作台」风格。

目标不是继续沿用原来的门店诊断对话界面，而是把当前 POC 前端统一成医疗体检报告数据质检产品：白色左侧栏、浅灰工作区、顶部操作栏、数据集选择器、KPI 卡片、横向流程、问题表格、右侧证据详情面板。

本次重设计必须继续遵守 `agent.md` 的第一阶段边界：

- 只筛查、圈出问题、保留证据。
- 不自动修复 PDF。
- 不 P 图。
- 不伪造合规。
- 疑似问题必须进入人工复核。
- 结论必须回到证据。

## 2. 当前可访问地址

当前已启动并验证的前端地址：

```text
http://localhost:3003/quality
```

说明：

- `3003` 是本次重新启动的干净 Next.js dev server。
- 旧的 `3002` 服务曾出现 `.next` 缓存损坏，浏览器报错 `Cannot find module './611.js'`。
- 旧的 `3001` / `3002` 进程可能仍在运行，但本次交付以 `3003` 为准。

## 3. 已重设计页面

所有工作区页面已切到同一套质检产品外壳：

| 路由 | 新页面定位 |
| --- | --- |
| `/quality` | 批量检测工作台 |
| `/tasks` | 问题清单 |
| `/tasks/[taskId]` | 单报告详情 |
| `/agent` | 单报告详情 |
| `/agent/[sessionId]` | 单报告详情 |
| `/brands` | 人工复核 |
| `/knowledge` | 规则库 |
| `/settings` | 报告导出 |

导航文案已改为：

- 批量检测
- 问题清单
- 单报告详情
- 人工复核
- 规则库
- 报告导出
- 系统管理

## 4. 主要实现文件

### 4.1 核心工作台组件

```text
store-ai-clinic-web/features/quality/components/quality-shell.tsx
```

该组件现在是全站主要界面组件，支持以下视图：

```ts
export type QualityWorkspaceView =
  | "batch"
  | "issues"
  | "detail"
  | "review"
  | "rules"
  | "export";
```

内部包含：

- 顶部工具栏：暂停任务、重新运行、导出结果。
- 数据集选择器：示例为 `D:/桌面/数据/5人`。
- KPI 卡片：年龄段、PDF、Excel、问题、待复核。
- 检测流程：文件扫描、Excel 解析、PDF 转图、AI 评审、人工复核。
- 问题表格：问题类型、严重程度、报告文件、页码、证据、置信度、状态、发现时间。
- 右侧证据详情：体检报告页面预览、AI 判断、规则依据、处理建议。
- 规则库和报告导出视图。

### 4.2 页面路由

这些页面已改为渲染 `QualityShell` 的不同 view：

```text
store-ai-clinic-web/app/(workspace)/quality/page.tsx
store-ai-clinic-web/app/(workspace)/tasks/page.tsx
store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx
store-ai-clinic-web/app/(workspace)/agent/page.tsx
store-ai-clinic-web/app/(workspace)/agent/[sessionId]/page.tsx
store-ai-clinic-web/app/(workspace)/brands/page.tsx
store-ai-clinic-web/app/(workspace)/knowledge/page.tsx
store-ai-clinic-web/app/(workspace)/settings/page.tsx
```

### 4.3 工作区布局和侧栏

```text
store-ai-clinic-web/app/(workspace)/layout.tsx
store-ai-clinic-web/shared/ui/app-sidebar.tsx
store-ai-clinic-web/shared/config/nav.ts
```

改动内容：

- 移除旧的玻璃拟态大圆角外壳。
- 改成固定白色侧栏 + 浅灰内容区。
- 侧栏品牌改为「体检报告质检」。
- 副标题改为「数据合规筛查工作台」。
- active 菜单使用浅青背景和青绿色文字。

### 4.4 全局主题

```text
store-ai-clinic-web/styles/tokens.css
store-ai-clinic-web/styles/theme.css
```

改动内容：

- 从暖色米白 / 玻璃拟态切换为企业后台冷灰白底。
- 主色改为青绿色 `rgb(11 154 154)`。
- 表面层以白色、浅灰、细边框为主。
- 减弱阴影，减少装饰感。

### 4.5 测试和 lint 小修

```text
store-ai-clinic-web/tests/unit/inspection-redesign.test.tsx
store-ai-clinic-web/components/ui/input.tsx
```

说明：

- 新增/修正 `inspection-redesign.test.tsx`，验证 `/quality`、`/tasks`、`/agent` 已进入新质检产品界面。
- `components/ui/input.tsx` 原本有空接口：

```ts
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}
```

已改为等价类型别名，解决 `@typescript-eslint/no-empty-object-type`：

```ts
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
```

## 5. 验证结果

### 5.1 通过的验证

```bash
npm test -- tests/unit/inspection-redesign.test.tsx
```

结果：通过，3/3。

```bash
./node_modules/.bin/eslint 'app/(workspace)/quality/page.tsx' 'app/(workspace)/tasks/page.tsx' 'app/(workspace)/tasks/[taskId]/page.tsx' 'app/(workspace)/agent/page.tsx' 'app/(workspace)/agent/[sessionId]/page.tsx' 'app/(workspace)/brands/page.tsx' 'app/(workspace)/knowledge/page.tsx' 'app/(workspace)/settings/page.tsx' 'features/quality/components/quality-shell.tsx' 'shared/ui/app-sidebar.tsx' 'shared/config/nav.ts' 'tests/unit/inspection-redesign.test.tsx' --max-warnings=0
```

结果：通过。

```bash
npm run build
```

结果：通过。Next.js 生产构建、lint、类型检查、静态页面生成均完成。

### 5.2 浏览器验证

已在 in-app browser 验证：

- `/quality` 标题为「批量检测工作台」。
- 侧栏存在「体检报告质检 / 数据合规筛查工作台」。
- 顶部工具栏存在「暂停任务 / 重新运行 / 导出结果」。
- 页面存在「证据详情 / 体检报告页面预览」。
- 页面存在检测流程「文件扫描 / AI 评审」。
- `/tasks` 标题为「问题清单」。
- `/agent` 标题为「单报告详情」。
- `/knowledge` 标题为「规则库」。
- `/settings` 标题为「报告导出」。
- `/agent` 不再出现旧文案「持续对话诊断工作区」。

## 6. 当前遗留问题

### 6.1 全量测试仍有旧断言失败

```bash
npm test
```

当前全量测试会失败，主要原因不是构建失败，而是旧测试仍在断言旧产品页面，例如：

- `tests/unit/quality-page.test.tsx` 仍断言旧版 POC 文案和唯一数字。
- `tests/unit/tasks-page.test.tsx` 仍断言旧任务页的「诊断证据中心」「搜索任务」「根据任务上下文生成的分析摘要」等内容。
- `tests/unit/knowledge-page.test.tsx` 仍断言旧知识库页面的资料接入文案。

这些页面已经按用户要求重设计为质检工作台，所以测试需要按新产品语义更新。

建议下一步处理：

1. 将旧的 tasks / knowledge / settings 页面测试改写为新视图测试。
2. 保留 API、store、conversation hook 等非页面逻辑测试。
3. 对 `QualityShell` 增加交互测试，例如筛选问题类型、选择问题行后右侧证据面板更新。

### 6.2 旧 dev server 状态

`http://localhost:3002/quality` 曾返回 500，原因是 `.next` 缓存缺失 chunk：

```text
Cannot find module './611.js'
```

当前可用服务是：

```text
http://localhost:3003/quality
```

如果后续继续开发，建议先停止旧的 `3001` / `3002` 进程，清理 `.next` 后统一只保留一个 dev server。

## 7. 后续建议

### 7.1 产品层

- 把当前 mock 数据替换为 `D:/桌面/数据/` 的真实目录扫描结果。
- 将 `agent.md` 中的文件盘点、规则抽取、结构化数据检测、PDF/OCR 检测拆成可执行流水线。
- 让右侧证据面板展示真实 PDF 页面截图、OCR 命中框、Excel 字段证据。
- 人工复核动作需要真正写入复核记录，而不只是按钮。

### 7.2 前端层

- 为移动端补一个可收起侧栏或顶部菜单。
- 问题表格后续可以接 TanStack Table，支持排序、分页、列冻结和批量选择。
- 右侧证据面板建议拆成独立组件，便于测试和后续接真实数据。
- 规则库和导出页目前是同风格静态面板，后续需要接真实规则 CRUD 和导出任务。

### 7.3 测试层

优先更新这些测试：

```text
store-ai-clinic-web/tests/unit/quality-page.test.tsx
store-ai-clinic-web/tests/unit/tasks-page.test.tsx
store-ai-clinic-web/tests/unit/knowledge-page.test.tsx
```

建议新增：

- `/brands` 人工复核页面测试。
- `/settings` 报告导出页面测试。
- `AppSidebar` 新导航文案和 active 状态测试。

## 8. 交接结论

本次前端重设计已经完成核心页面和统一视觉风格，当前可以通过 `http://localhost:3003/quality` 直接查看。

构建已通过，新设计专项测试已通过。剩余主要工作是把旧单元测试迁移到新产品语义，并把 mock 质检数据接入真实数据处理链路。

## 9. 2026-06-26 后续进展补充

### 9.1 当前运行入口

后续开发过程中前端已重新回到常用开发端口：

```text
http://localhost:3000/quality
```

浏览器已验证 `/quality` 页面可见以下入口：

- `导入数据清洗文件`
- `导入文件`
- `开始数据清洗`

如果本机仍存在 `3001`、`3002`、`3003` 的旧进程，以当前浏览器实际打开的 `3000` 为准。

### 9.2 旧单元测试已更新

此前第 6 节提到的旧断言失败已经处理。当前前端单元测试已按新质检工作台语义更新，包括：

```text
store-ai-clinic-web/tests/unit/quality-page.test.tsx
store-ai-clinic-web/tests/unit/tasks-page.test.tsx
store-ai-clinic-web/tests/unit/knowledge-page.test.tsx
store-ai-clinic-web/tests/unit/settings-page.test.tsx
store-ai-clinic-web/tests/unit/brands-page.test.tsx
store-ai-clinic-web/tests/unit/agent-page.test.tsx
store-ai-clinic-web/tests/unit/conversation-page.test.tsx
store-ai-clinic-web/tests/unit/quality-pagination.test.tsx
store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx
```

最新前端验证结果：

```bash
npm test
```

结果：通过，`72 passed`，`2 skipped`。

```bash
npm run lint
```

结果：通过，`eslint . --max-warnings=0` 无错误。

```bash
npm run build
```

结果：通过，Next.js 生产构建、类型检查和静态页面生成均完成。

### 9.3 mock 质检数据已接入真实扫描链路

前端 mock 质检数据已经改为优先读取真实目录扫描结果。核心实现位于：

```text
store-ai-clinic-web/features/quality/lib/dataset-scanner.ts
store-ai-clinic-web/features/quality/lib/default-dataset.ts
```

当前能力边界：

- 扫描真实数据目录中的 PDF、XLSX 等文件。
- 按目录和文件名生成分组、档案号、文件清单。
- 读取 PDF 页数证据，产出页数边界、疑似扫描异常等问题。
- 解析 Excel 首个工作表字段，产出字段缺失、字段异常、结构化数据证据。
- 将扫描结果映射到 `QualityShell` 的 KPI、流程、问题表格和右侧证据面板。

相关测试：

```text
store-ai-clinic-web/tests/unit/quality-dataset-scanner.test.ts
store-ai-clinic-web/tests/unit/default-dataset.test.ts
```

### 9.4 PDF/OCR、Excel 字段证据和人工复核记录

后端已新增质量工作流接口和服务层，核心文件：

```text
src/store_ai_clinic/services/quality.py
src/store_ai_clinic/api/routers/quality.py
src/store_ai_clinic/schemas/quality.py
src/store_ai_clinic/api/main.py
```

当前能力：

- 扫描数据集目录。
- 生成 PDF 页数与 OCR 相关证据。
- 生成 Excel 字段证据和异常字段线索。
- 接收人工复核记录。
- 将复核记录持久化为 JSONL。
- 支持导出或查询复核记录。

相关后端测试：

```text
tests/unit/test_quality_backend.py
```

后端测试最近一次验证结果：`149 passed`。

### 9.5 人工复核按钮已修复为可见反馈

右侧证据面板中的人工复核动作现在会给出明确反馈，并同步更新当前问题状态。涉及文件：

```text
store-ai-clinic-web/features/quality/components/quality-shell.tsx
store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx
```

行为：

- 点击 `确认问题` 后显示 `记录中：...`，请求成功后显示 `已记录：...`。
- 点击 `驳回判断` 后将问题状态更新为 `已驳回`。
- 点击 `标记争议` 后将问题状态更新为 `AI 评审`。
- 请求体会带上 `datasetPath`，便于后端把复核记录关联回数据集。

### 9.6 文件导入和数据清洗入口已补齐

用户反馈“怎么导入文件进行数据清洗，没有发现这个功能”后，已在质量工作台补齐入口。涉及文件：

```text
store-ai-clinic-web/features/quality/components/quality-shell.tsx
store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx
store-ai-clinic-web/app/api/agent/upload/route.ts
```

当前交互：

1. 打开 `/quality`。
2. 在数据集工具条下方找到 `导入数据清洗文件`。
3. 点击 `导入文件`，选择 CSV、XLS、XLSX 或 PDF。
4. 页面展示已导入文件数量、总大小、文件名。
5. 点击 `开始数据清洗`。
6. 顶部状态显示：`数据清洗任务已创建：N 个文件进入目录扫描、PDF/OCR 和 Excel 字段证据流程。`

当前技术边界：

- 前端已经接入 `/api/agent/upload`，可以上传文件并得到文件摘要。
- `/api/agent/upload` 目前仍是 BFF 层 mock 摘要接口，返回 `persisted: false`。
- 下一步需要把该入口改接真实后端持久化目录或清洗任务队列。

新增测试覆盖：

```text
quality workspace interactions > lets users import source files and start a data-cleaning task
```

该测试覆盖：文件选择、multipart 上传、导入摘要展示、点击开始数据清洗、顶部状态更新。

### 9.7 下一步建议

优先级建议如下：

1. 新增后端上传/导入接口，例如 `/api/quality/import`，替代当前 `/api/agent/upload` mock 摘要接口。
2. 将上传文件落盘到受控数据集目录，生成 `dataset_id` 或 `task_id`。
3. 点击 `开始数据清洗` 时调用后端质量扫描任务，而不是只更新前端状态。
4. 前端用任务状态轮询或事件流展示目录扫描、PDF/OCR、Excel 解析、人工复核队列进度。
5. 导出页接入真实导出结果，包括问题清单、可能合规清单、人工复核记录。

### 9.8 真实上传、扫描和视觉 AI 调用已接入

用户继续反馈“点击开始数据清洗没有反应”“导入文件失败”“为什么没有 AI 判断、规则依据、处理建议”后，后端质量工作流已经从前端 mock 入口升级为真实导入和真实扫描链路。

当前能力：

- `/api/quality/import` 可接收上传文件并落盘到 `data/quality/imports/quality-import-*`。
- `/api/quality/imports/{task_id}/scan` 可对导入任务执行质量扫描。
- 图片文件 `jpg` / `jpeg` / `png` / `webp` 会直接送入视觉模型分析。
- PDF 文件在启用配置后会先抽取或渲染页面图片，再送入视觉模型分析。
- 视觉模型成功返回后，问题会使用 `R-VISION-001`，并填充右侧证据详情需要的：
  - `AI 判断`
  - `规则依据`
  - `处理建议`
  - `置信度`
- 如果视觉模型不可用或调用失败，系统会保留原 fallback：
  - PDF 返回 `R-OCR-001 / OCR 待处理`
  - 图片返回 `R-IMAGE-001 / 图片待识别`

核心文件：

```text
src/store_ai_clinic/services/quality.py
src/store_ai_clinic/services/quality_vision.py
src/store_ai_clinic/services/quality_pdf_render.py
src/store_ai_clinic/config.py
src/store_ai_clinic/api/routers/quality.py
```

新增或更新测试：

```text
tests/unit/test_quality_backend.py
tests/unit/services/test_quality_pdf_render.py
tests/unit/services/test_quality_vision.py
tests/unit/test_config.py
```

### 9.9 PDF 不是直接原样发给视觉模型

这次排查中确认：体检 PDF 多数是图片型或扫描型 PDF，但“PDF 文件本身”不等于模型接口可直接识别的图片。

当前处理策略：

1. 上传 PDF。
2. 后端先尝试从 PDF 内部提取最大的嵌入 JPEG 页面图。
3. 如果没有可提取的 JPEG，再 fallback 到 Chrome headless 截图渲染。
4. 把得到的页面图片作为 `input_image` 传给 OpenAI-compatible Responses API。
5. 将模型返回的结构化 JSON 转为 `QualityIssueData`。

重要修复：

- 最初使用 Chrome PDF 截图时，样本页截图是近似纯黑图，视觉模型只能判断“黑屏/空白”。
- 后续改为优先提取 PDF 内嵌 DCT/JPEG 图片后，真实样本可被模型正常识别。
- 当前 PDF JPEG 提取是轻量实现，已覆盖本次样本；若未来遇到 Flate、JPX、object stream 等 PDF，需要考虑引入 PyMuPDF、pdfium 或其他更完整的 PDF 渲染/解析库。

### 9.10 当前 AI 配置

`.env` 已配置真实视觉模型调用参数。交接时注意不要在文档、日志或截图中暴露完整 API Key。

当前有效配置项：

```text
OPENAI_API_KEY=已配置，禁止明文外传
OPENAI_VISION_BASE_URL=https://necair.ttoto.net/pt/rm_cpt_cx
OPENAI_VISION_MODEL=gpt-5.5
OPENAI_VISION_PDF_ENABLED=true
```

后端需要重启后才会读取最新 `.env`。

当前后端健康检查：

```text
http://127.0.0.1:8000/health
```

最近一次返回：

```json
{"status":"ok"}
```

### 9.11 真实样本验证结果

用户指定测试目录：

```text
D:\桌面\数据\5人\35-44
```

该目录包含 7 个 PDF 和 1 个 Excel。已使用其中 PDF 样本进行真实后端导入和扫描验证。

验证链路：

1. 调用 `/api/quality/import` 上传 PDF。
2. 调用 `/api/quality/imports/{task_id}/scan` 执行扫描。
3. 后端从 PDF 中提取页面图片。
4. 调用真实视觉 AI。
5. 返回 `R-VISION-001` 问题。

一次成功扫描任务：

```text
task_id: quality-import-7360de23cbf8
ruleId: R-VISION-001
issueType: 超声提示肝右叶囊肿需复核
confidence: 0.92
```

另一次直接视觉调用也成功识别出：

```text
心电图自动诊断异常需复核
```

这说明当前不是单纯 mock，也不是只返回 `OCR 待处理`；在配置可用、PDF 页面可转成图片、外部模型可访问时，已经能返回真实 AI 判断、规则依据和处理建议。

### 9.12 最新验证结果

后端相关测试：

```text
14 passed
```

完整后端单元测试：

```text
156 passed
```

运行测试时如果遇到 Windows 临时目录权限或路径问题，可先设置：

```powershell
$env:TMP='D:\桌面\AI智能体\门店数据诊断智能体\.pytest-tmp'
$env:TEMP='D:\桌面\AI智能体\门店数据诊断智能体\.pytest-tmp'
$env:PYTHONPATH='src'
```

### 9.13 当前遗留和下一步

前端当前入口仍建议使用：

```text
http://localhost:3000/quality
```

下一步优先级：

1. 用浏览器完整验证前端上传 PDF、点击 `开始数据清洗`、问题表格出现 `R-VISION-001`、右侧显示真实 `AI 判断 / 规则依据 / 处理建议`。
2. 如果页面仍显示 `OCR 待处理`，优先检查：
   - `.env` 是否有 `OPENAI_VISION_PDF_ENABLED=true`。
   - 后端是否已重启。
   - 后端日志中是否有视觉模型调用失败。
   - 当前 PDF 是否能提取出非空页面图片。
3. 体检报告页面预览目前仍可能只展示导入文件元信息或原始文件链接；如需“PDF 页面预览显示为导入图片/渲染页”，建议新增后端预览图端点或在扫描结果中附带提取后的页面图片 URL。
4. 若后续样本 PDF 格式更复杂，应替换轻量 PDF 图片提取逻辑，避免只覆盖当前样本类型。

### 9.14 2026-06-29 AI 内容级判断显示修复交接

用户反馈：批量检测页清洗后，右侧 `证据详情` 仍显示 `R-OCR-001 / 需要补充 OCR 证据`，看起来“当前 AI 真正内容级 AI 判断没有生成”。

本次排查结论：

- 后端真实视觉模型链路可用，最新真实扫描能返回 `R-VISION-001`，不是纯 mock，也不是只能返回 OCR 占位。
- 代表性真实任务：`quality-import-4409950bc2bd`。
- 通过前端扫描路由重跑后，接口返回 `done`，耗时约 80 秒，结果为 `R-VISION-001 = 3`、`R-OCR-001 = 0`。
- 本次问题的主要用户可见原因是：前端扫描完成后默认选中返回数组里的第一个问题；如果列表里存在 OCR 占位项或格式类视觉项，右侧面板会先展示这些内容，用户会误以为没有生成真正内容级 AI 判断。

已修复前端选择策略：

- 文件：`store-ai-clinic-web/features/quality/components/quality-shell.tsx`
- 扫描完成后不再固定选择 `nextIssues[0]`。
- 新增 `selectPrimaryImportedIssue`：
  - 第一优先级：内容级数据错误或未脱敏类视觉发现，包括 `findingType=data_error`、`findingType=privacy_leak`、`category=content`、`category=privacy`。
  - 第二优先级：其他真实视觉发现，例如页面方向、格式类 `R-VISION-001`。
  - 第三优先级：非 OCR 占位问题。
  - 最后兜底：第一个问题。
- 这样右侧 `证据详情` 会优先展示用户真正关心的内容级 AI 判断、页码、bbox 框选和处理建议。

已补充回归测试：

- 文件：`store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx`
- 新增用例：`selects real vision findings ahead of OCR placeholders after cleaning`
- 覆盖场景：后端同时返回 `R-OCR-001`、格式类 `R-VISION-001`、内容级 `R-VISION-001` 时，右侧面板必须自动展示内容级 `R-VISION-001`，并跳到对应页码、显示 bbox。

本次验证命令和结果：

```powershell
npm test -- tests/unit/quality-shell-interactions.test.tsx
# 14 passed

npm test -- tests/unit/quality-import-route.test.ts
# 4 passed

$env:TMP='D:\桌面\AI智能体\门店数据诊断智能体\.pytest-tmp'
$env:TEMP='D:\桌面\AI智能体\门店数据诊断智能体\.pytest-tmp'
$env:PYTHONPATH='src'
.\.venv\Scripts\python.exe -m pytest tests/unit/services/test_quality_pdf_render.py tests/unit/services/test_quality_vision.py tests/unit/test_quality_backend.py -q
# 20 passed, 3 warnings
```

真实接口验证：

```text
POST http://127.0.0.1:3000/api/quality/import/quality-import-4409950bc2bd/scan
status: done
elapsed: about 80s
R-VISION-001: 3
R-OCR-001: 0
preview pages: 2
```

当前本地服务状态：

```text
前端：http://127.0.0.1:3000/quality  -> 200
后端：http://127.0.0.1:8000/health   -> {"status":"ok"}
```

注意事项：

- 真实视觉模型扫描多页 PDF 可能需要 60-100 秒，前端 scan route 当前超时已调到 180 秒。
- 不要在 Next dev server 正运行时随意执行 `next build`；本次验证中 `next build` 会覆盖 `.next` 临时产物，导致 dev server 短暂报缺少 chunk，需要重启前端 dev server 后恢复。
- 文档和日志里禁止写入完整 API Key；只记录模型链路状态，不记录密钥明文。
- 如果页面仍显示 `需要补充 OCR 证据`，优先检查当前右侧选中的是否是旧任务/旧问题；其次检查后端日志、视觉模型配置、PDF 页面图是否提取成功。

后续建议：

1. 在前端清洗完成提示中增加“已生成真实视觉 AI 判断 N 个 / OCR 占位 N 个”的摘要，减少用户误判。
2. 在问题列表里给 `R-VISION-001`、`R-OCR-001` 增加更明显的来源标签，例如“视觉 AI 已判读”“等待 OCR/视觉证据”。
3. 如果格式类视觉问题过多，可以在清洗结果区单独分组：内容错误、未脱敏、格式/页面质量，避免格式问题压住内容级复核路径。

### 9.15 2026-06-30 问题清单布局回调与 500 排查交接

用户这轮最新要求是：`/tasks` 页面不要继续使用“按类型分组的大块卡片”布局，要回到图一方向，保持：

- 页面主标题为 `问题清单`
- 左侧是单一 `问题列表`
- 右侧是 `分诊证据摘要`
- 问题类型固定收敛为 `未脱敏 / 疑似缺字 / 页数边界 / 历史对比`
- `问题类型` 放在右侧摘要顶部，`分诊证据摘要` 与其并列展示

本次实际处理结果：

- 直接重建了 `store-ai-clinic-web/features/quality/components/quality-shell.tsx`
- 放弃了前一轮错误方向的“按类型分组大块边界框”
- 当前 `issues` 视图已经恢复为：
  - 左侧：单表格问题列表
  - 右侧：分诊证据摘要
- `batch / detail / review / rules / export` 视图都保留了可编译的简化实现，足够支撑当前路由和测试

本次 `quality-shell.tsx` 的关键状态：

- 统一问题类型映射到 4 类：
  - `未脱敏`
  - `疑似缺字`
  - `页数边界`
  - `历史对比`
- 问题列表表头包含 `类型`
- `tasks` 页面保留：
  - `问题列表`
  - `用于批量分诊和跳转详情`
  - `分诊证据摘要`
  - `当前选中 / 命中规则 / 下一步`
  - `查看单报告详情`
- 分页仍是 `20 条/页`

本次还额外排查到一个容易误判的问题：

- 浏览器里看到的 `http://127.0.0.1:3000/tasks -> Internal Server Error`
- 根因不是最新代码继续报错，而是旧的 Next dev server 在组件“半写入”阶段进入了中间态，之后没有重启，导致 3000 端口持续返回 500
- 重新起一个干净的 dev server 到 `3001` 后，`/tasks` 已返回 `200`

本次用于确认的服务现象：

```text
旧服务：http://127.0.0.1:3000/tasks -> 500 Internal Server Error
新服务：http://127.0.0.1:3001/tasks -> 200
```

因此如果后续同事再次看到本地 `3000` 端口白屏或 `Internal Server Error`，优先不要怀疑这份交接里的布局改动本身，先重启前端 dev server。

本次验证命令和结果：

```powershell
npm test -- tests/unit/tasks-page.test.tsx tests/unit/inspection-redesign.test.tsx tests/unit/quality-pagination.test.tsx tests/unit/quality-page.test.tsx
# 9 passed
```

本次通过的覆盖范围：

- `tasks-page.test.tsx`
  - 验证 `问题清单 / 问题列表 / 分诊证据摘要`
  - 验证搜索为空时显示 `当前筛选条件下暂无质检问题。`
- `inspection-redesign.test.tsx`
  - 验证 `批量检测工作台 / 问题清单 / 单报告详情`
- `quality-pagination.test.tsx`
  - 验证问题列表分页仍然是每页 20 条
- `quality-page.test.tsx`
  - 验证真实数据扫描页的筛选和右侧证据面板联动

这次修改涉及的主要文件：

- `store-ai-clinic-web/features/quality/components/quality-shell.tsx`

后续注意事项：

1. 如果只看到浏览器 500，不要先改页面 JSX，先确认当前访问的是不是旧的 3000 dev server 进程。
2. 这份 `quality-shell.tsx` 现在是“为当前页面与测试收敛后的简化版实现”，后续若继续扩展导入、真实扫描和更复杂的证据预览，建议保持现有布局关系不变，避免再次回到“按类型大块分组”的错误方向。
3. Windows PowerShell 直接整段回写大文件时容易引入编码或中间态问题；后续若继续修改这个文件，优先小步编辑并及时跑测试。

### 9.16 2026-06-30 导出骨架后续补完排查交接

本轮是沿着 `2026-06-30-quality-export-skeleton.md` 继续往下做，没有回到旧的门店诊断产品语义，而是继续收敛在当前 `体检报告质检 / 数据合规筛查工作台`。

本轮已完成的确认：

1. 已重新阅读：
   - `agent.md`
   - `docs/2026-06-26-frontend-redesign-handoff.md`
   - `docs/superpowers/plans/2026-06-30-quality-export-skeleton.md`
   - `store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx`
2. 已按当前约束重新对齐工作方式：
   - 按 root-cause 方式排查，不再凭感觉补 UI。
   - 继续以现有测试作为行为真值，而不是重写产品语义。
3. 已重新确认“生成交付包”这一段前一次修复没有丢：
   - 当前导出页仍保留 `报告导出原型`
   - 当前仍保留交付物勾选、`当前导出类型`、POST `/api/quality/exports`、成功消息和下载链接逻辑

本轮重新跑前端交互测试后的最新结论：

```bash
npm test -- --run tests/unit/quality-shell-interactions.test.tsx
```

当前结果：

- `22` 个用例里 `16 failed`
- 当前失败已经不只是一两个文案问题，而是 `QualityShell` 这版文件被“简化过头”后，丢掉了整批真实交互能力

已确认的根因：

当前文件：

```text
store-ai-clinic-web/features/quality/components/quality-shell.tsx
```

虽然保住了：

- 导出页原型
- 规则库最小交互
- 基础表格外壳

但仍缺少或退化了以下真实行为，因此整套交互测试无法通过：

1. `batch` 视图缺失：
   - `数据资产盘点`
   - `导入数据清洗文件`
   - `选择待清洗文件`
   - 上传后文件摘要展示
   - 点击 `开始数据清洗` 后的真实前端状态切换
   - `清洗结果` 分组区
2. 清洗后证据链能力缺失：
   - 真实 issue 选择策略
   - PDF 多页预览翻页
   - 只在命中页显示标注框
   - 图片/PDF 预览图来源切换
   - 按问题类型显示 `数据错误标注 / 未脱敏标注 / 页数边界标注 / 历史对比标注`
3. `issues/detail` 视图也有回退：
   - 过滤器目前是 chip，不是测试要求的 menu button + `menuitem`
   - `detail` 视图当前没有恢复 `确认问题 / 驳回判断 / 标记争议` 这组动作
   - 证据面板中 `规则依据`、可见反馈和关闭/重开交互没有完全对齐测试语义

本轮尚未落地的新代码：

- 还没有把新的 `quality-shell.tsx` 成功写回仓库
- 原因不是方案未想清，而是这台 Windows 环境下：
  - `apply_patch` 当前无法正常对该工作区落盘
  - PowerShell 单次整文件回写又触发了命令长度上限
- 因此当前仓库中的 `quality-shell.tsx` 仍是“导出修复后、但批处理交互未恢复完成”的状态

建议下一位继续时直接这样接：

1. 不要再回头排查后端导出逻辑，这段已经确认不是当前主阻塞。
2. 继续只改：

```text
store-ai-clinic-web/features/quality/components/quality-shell.tsx
```

3. 优先恢复下面这三批测试，再扩散：
   - `renders the real asset inventory summary in batch view`
   - `shows metric cards before the import cleaning panel`
   - `lets users import source files and start a data-cleaning task`
4. 然后继续恢复：
   - `summarizes cleaned data errors and privacy leaks in the batch result area`
   - `selects real vision findings ahead of OCR placeholders after cleaning`
   - PDF 预览、多页翻页、标注框、按问题类型切换证据
5. 如果还要整文件重写，优先避开 PowerShell 长命令回写；建议用可编程文件写入方式分段落地，避免再次卡在 Windows 命令长度限制。

本轮结论：

- 交付包导出这段没有回退
- 当前真正未补完的是 `QualityShell` 的批处理工作台和证据交互
- 现阶段最重要的是把 `quality-shell-interactions.test.tsx` 的 16 个失败收敛掉，再做 lint 和页面联调

### 9.17 2026-06-30 三个核心质检页面截图复刻交接

本轮目标是按用户连续提供的截图，完成 `体检报告质检 / 数据合规筛查工作台` 的三个核心页面复刻，并把之前 `QualityShell` 交互回退的问题收敛掉。

本轮已完成页面：

1. `/quality`：批量检测工作台
   - 保留截图式顶部工具栏：`暂停任务 / 重新运行 / 导出结果 / admin`
   - 保留数据集工具栏、KPI 卡片、检测流程、数据资产盘点、导入清洗、清洗结果、问题表格和右侧证据详情
   - 恢复真实导入清洗交互：`POST /api/quality/import` 与 `POST /api/quality/import/{task_id}/scan`
   - 恢复 PDF/图片预览、bbox 标注、多页翻页、AI 判断、规则依据和复核动作

2. `/tasks`：问题清单
   - 新增 `issueListVariant="screenshot"`，只让 `/tasks` 走截图复刻版，避免影响组件交互测试里的默认 `issues` 视图
   - 页面结构按截图实现：顶部 `问题清单` 标题、副标题、`批量标记`、`进入详情`
   - 四张统计卡：`疑似缺字 12`、`页数边界 8`、`疑似未脱敏 9`、`历史对比 8`
   - 筛选条改为下拉菜单样式：`问题类型 / 严重程度 / 年龄段 / 处理状态`，并保留关键词输入和 `筛选` 按钮
   - 表格按截图列展示：`类型 / 严重 / 报告文件 / 页码 / 证据摘要 / 规则 / 状态`
   - 右侧复刻 `分诊证据摘要`，包含 `当前选中 / 命中规则 / 下一步 / 查看单报告详情`

3. `/agent`、`/agent/[sessionId]`、`/tasks/[taskId]`：单报告详情
   - 新增 `reportDetailVariant="screenshot"`，只让上述真实路由走截图复刻版，默认 `detail` 视图保留给既有组件测试
   - 页面结构按截图实现：顶部 `单报告详情` 标题、副标题、`上一份 / 下一份 / 进入人工复核`
   - 三栏布局：
     - 左栏 `PDF 页面预览`，包含 `王五_体检报告.pdf，第 2 / 5 页`、模拟报告表格、未脱敏红框、Excel 对照蓝框、页码按钮
     - 中栏 `证据核查工作区`，包含 OCR 文本片段、结构化 Excel 对照、命中规则、同报告问题和绿色提示
     - 右栏 `AI 判断与建议`，包含 AI 判断、处理建议、证据完整性标签和 `提交到人工复核`

本轮涉及的主要文件：

```text
store-ai-clinic-web/features/quality/components/quality-shell.tsx
store-ai-clinic-web/app/(workspace)/tasks/page.tsx
store-ai-clinic-web/app/(workspace)/agent/page.tsx
store-ai-clinic-web/app/(workspace)/agent/[sessionId]/page.tsx
store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx
store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx
store-ai-clinic-web/tests/unit/quality-page.test.tsx
store-ai-clinic-web/tests/unit/tasks-page.test.tsx
store-ai-clinic-web/tests/unit/agent-page.test.tsx
store-ai-clinic-web/tests/unit/conversation-page.test.tsx
store-ai-clinic-web/tests/unit/inspection-redesign.test.tsx
```

关键实现说明：

- `QualityShell` 现在保留默认视图与截图复刻视图两套入口：
  - 默认 `issues/detail` 继续服务原组件交互测试
  - `/tasks` 使用 `issueListVariant="screenshot"`
  - `/agent`、`/agent/[sessionId]`、`/tasks/[taskId]` 使用 `reportDetailVariant="screenshot"`
- 这样做是为了避免把截图原型页面的静态结构强塞到所有测试场景，导致既有导入、清洗、证据面板、复核 API 行为回退。
- 之前 9.16 里记录的 `quality-shell-interactions.test.tsx` 大面积失败状态已经过期。本轮已经恢复并通过该测试文件的 `22` 个用例。
- Windows 环境里 `apply_patch` 仍会因为 restricted-token sandbox 报错；本轮文件写入继续使用显式 UTF-8：`[IO.File]::ReadAllText(..., [Text.Encoding]::UTF8)` 与 `[IO.File]::WriteAllText(..., [Text.UTF8Encoding]::new($false))`。后续继续编辑中文文件时务必保持这个方式，避免乱码。

本轮验证命令和结果：

```bash
npm test -- --run tests/unit/quality-shell-interactions.test.tsx --reporter=dot
# 22 passed

npm test -- --run tests/unit/quality-page.test.tsx tests/unit/tasks-page.test.tsx tests/unit/inspection-redesign.test.tsx --reporter=dot
# 8 passed

npm test -- --run tests/unit/agent-page.test.tsx tests/unit/conversation-page.test.tsx tests/unit/tasks-page.test.tsx tests/unit/inspection-redesign.test.tsx tests/unit/quality-page.test.tsx --reporter=dot
# 14 passed

npm run build
# Next.js production build compiled successfully; type checking, linting, and static generation completed
```

本地联调状态：

```text
当前已启动 dev server：npm run dev -- -p 3000
当前确认可访问：http://localhost:3000/agent -> 200
```

后续接手建议：

1. 如果用户继续要求复刻 `人工复核 / 规则库 / 报告导出`，建议继续沿用 variant 分支方式，不要破坏默认 `QualityShell` 交互测试路径。
2. 如果用户反馈 `/agent` 看到的仍是旧详情页，优先确认浏览器是否连到了旧 dev server 进程，必要时重启 `npm run dev -- -p 3000`。
3. 不要在文档、日志或截图中暴露 `.env` 里的任何完整 API Key。
4. 现在最可信的回归入口是：先跑 `quality-shell-interactions.test.tsx`，再跑页面级 `quality-page/tasks-page/agent-page/conversation-page/inspection-redesign`，最后跑 `npm run build`。
### 9.18 2026-06-30 导航切换提速与静态首屏交接

本轮目标是解决用户反馈的“导航栏切换不流畅”“报告导出页面加载太久”“还能不能更快”。处理方向是把导航交互改成客户端即时反馈，并把几个截图复刻型页面从默认数据加载链路里剥离出来，避免首屏被本地数据扫描、导出记录扫描阻塞。

已完成的导航体验改动：

1. 新增 `store-ai-clinic-web/shared/ui/app-nav-link.tsx`
   - 主导航统一走客户端 `router.push`
   - hover/focus 时调用 `router.prefetch`
   - 点击后进入 pending 状态，带 `aria-busy`、`data-pending`，文案显示 `打开中`
   - 保留同路由点击、Ctrl/Meta/Shift/Alt 点击、新窗口打开等浏览器默认行为
2. 更新导航入口：
   - `store-ai-clinic-web/shared/ui/app-sidebar.tsx`
   - `store-ai-clinic-web/shared/ui/app-mobile-nav.tsx`
3. 新增路由级加载占位：
   - `store-ai-clinic-web/app/(workspace)/loading.tsx`
   - 页面切换期间显示 `正在打开页面`

已完成的报告导出页提速：

1. 根因：`/settings/page.tsx` 原本在服务端首屏里等待 `loadDefaultQualityDataset()` 和 `loadDefaultQualityExports()`，导致进入“报告导出”页面前必须先扫默认数据和导出目录。
2. 当前改为直接渲染：

```tsx
import { QualityShell } from "@/features/quality/components/quality-shell";

export default async function SettingsPage() {
  return <QualityShell view="export" exportVariant="screenshot" />;
}
```

3. 配套测试：`store-ai-clinic-web/tests/unit/settings-page.test.tsx`
   - mock 默认数据/导出 loader
   - 断言 `/settings` 初始渲染不再调用这些阻塞 loader
4. 此轮 `npm run build` 曾验证 `/settings` 已变为静态路由：`○ /settings`

已完成的进一步首屏提速：

1. 根因：`/agent`、`/brands`、`/knowledge` 是截图复刻型静态页面，但仍调用 `loadDefaultQualityDataset()`，热切换虽然已在 170ms-220ms 左右，冷启动和首次进入仍有不必要阻塞。
2. 新增性能守卫测试：
   - `store-ai-clinic-web/tests/unit/static-snapshot-pages-performance.test.tsx`
   - 初始失败时能观察到 loader 被调用 3 次
3. 已改为静态首屏直出：
   - `store-ai-clinic-web/app/(workspace)/agent/page.tsx`
   - `store-ai-clinic-web/app/(workspace)/brands/page.tsx`
   - `store-ai-clinic-web/app/(workspace)/knowledge/page.tsx`
4. 当前渲染入口：

```tsx
// /agent
return <QualityShell view="detail" reportDetailVariant="screenshot" />;

// /brands
return <QualityShell view="review" reviewVariant="screenshot" />;

// /knowledge
return <QualityShell view="rules" rulesVariant="screenshot" />;
```

规则库页面同步改动：

1. `store-ai-clinic-web/features/quality/components/quality-shell.tsx` 中的 `RulesLibrarySnapshotPage` 已按用户“图一仿照图二，且要实现可交互”重做。
2. 当前是紧凑三栏式规则库：
   - 左侧分类按钮可切换分类
   - 中间搜索框可筛选规则
   - 点击规则行会更新右侧详情面板
   - 状态按钮可在 `启用` / `待补齐` 间切换
3. `store-ai-clinic-web/tests/unit/knowledge-page.test.tsx` 已补交互测试。

本轮已跑过的验证：

```bash
npm run test -- tests/unit/static-snapshot-pages-performance.test.tsx
# 1 passed

npm run test -- tests/unit/static-snapshot-pages-performance.test.tsx tests/unit/agent-page.test.tsx tests/unit/brands-page.test.tsx tests/unit/knowledge-page.test.tsx tests/unit/settings-page.test.tsx tests/unit/app-shell-smoke.test.tsx
# 6 files passed, 13 tests passed

npm run test -- tests/unit/settings-page.test.tsx tests/unit/app-shell-smoke.test.tsx tests/unit/quality-shell-interactions.test.tsx
# 3 files passed, 29 tests passed
```

此前浏览器真实点击测速，尚未包含 `/agent`、`/brands`、`/knowledge` 静态化后的再次测速：

```text
/tasks:     avg 216ms, min 200ms, max 236ms
/agent:     avg 189ms, min 182ms, max 200ms
/brands:    avg 184ms
/knowledge: avg 179ms, min 170ms, max 184ms
/settings:  avg 169ms, min 168ms, max 169ms
/quality:   avg 176ms, min 161ms, max 198ms
```

当前未完成/接手注意：

1. 在 `/agent`、`/brands`、`/knowledge` 静态化之后，最新一次 `npm run build` 已启动但被用户新消息打断，最终结果未知，接手后需要重新跑。
2. 为避免 `.next` 互相写入导致 `Internal Server Error`、`routes-manifest.json` 缺失或 chunk 异常，跑 build 前先停掉 `next dev`，build 完成后再重启 dev server。
3. 由于 build 前曾停止 dev server，当前本地前端服务可能处于未启动状态，接手后先确认端口。
4. 不要在文档、日志或截图里暴露 `.env` 中的 OpenAI/API Key。

建议接手命令：

```bash
cd store-ai-clinic-web
npm run test -- tests/unit/static-snapshot-pages-performance.test.tsx tests/unit/agent-page.test.tsx tests/unit/brands-page.test.tsx tests/unit/knowledge-page.test.tsx tests/unit/settings-page.test.tsx tests/unit/app-shell-smoke.test.tsx
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3000
```

### 9.19 2026-07-01 批量检测页重设计、文件夹导入、可视化总览与项目清理交接

#### 背景

新接手者（项目克隆自队友）在完整阅读了 `agent.md`、所有交接文档、12 个 plan、8 个 spec 后，对项目做了以下改动。

#### 已完成的项目治理

1. **创建 `.gitignore`**：项目之前没有 `.gitignore`，导致 `node_modules`（546 MB）、`.next`（184 MB）、`__pycache__`、`.pytest-tmp`、`codex_pytest_tmp`、`data/quality/pdf-pages`（316 MB OCR 缓存）等全部计入仓库体积。清理后从 ~35860 个文件 / ~1.4 GB 降到 ~1592 个文件 / ~399 MB。
2. **补装 `pypdf` 依赖**：队友代码中 `knowledge_ingestion.py` 使用了 `from pypdf import PdfReader`，但 `pyproject.toml` 和 `uv.lock` 未记录。已在 `pyproject.toml` 的 `dependencies` 中添加 `"pypdf>=5.0"`，并执行 `uv lock` 更新锁文件。
3. **环境搭建完成**：`uv sync` 安装全部 Python 依赖，`npm install`（npmmirror 镜像）安装前端依赖，后端 FastAPI app 可加载（38 个路由），前端 `node_modules` 完整。

#### 已完成的前端改动

##### 改动 1：批量检测页（`/quality`）布局重设计

用户反馈："页面太杂了，每一个页面展示的东西都太多太紧凑了"。

按用户要求重新设计 batch 视图为三段式布局：

```text
顶部：大标题 + 数据集选择
├── 【导入区】（ImportCleaningHeroPanel）
│   - 大卡片样式，带图标和说明
│   - 两个入口：导入文件夹 + 导入文件
│   - 已上传文件列表（表格：文件名/大小/类型）
│   - 大按钮：开始数据清洗
├── 【可视化总览】（BatchDetectionOverview）
│   - 4 张统计卡片：总文件数 / 总档案数 / 发现问题 / 高严重度·待复核
│   - 3 个饼图（ECharts）：合规情况占比 / 男女比例 / 年龄段分布
│   - 历史检测记录（最近 10 条，点击跳转 /tasks）
└── 【检测流程】（DetectionFlow）
    - 文件扫描 / Excel 解析 / PDF 转图 / AI 评审 / 人工复核
```

**移除的内容**（从 batch 视图移到 detail/issues 视图）：
- MetricGrid（KPI 卡片）
- AssetInventoryPanel（数据资产盘点）
- CleaningResultPanel（清洗结果分组）
- IssuePanel（问题列表）
- 证据详情面板

**新增文件**：
- `store-ai-clinic-web/features/quality/components/batch-overview.tsx`：可视化总览组件（ECharts 饼图 + 统计卡片 + 历史记录）
- `store-ai-clinic-web/features/quality/lib/quality-export-types.ts`：共享的导出任务类型定义

**修改文件**：
- `store-ai-clinic-web/features/quality/components/quality-shell.tsx`：
  - 导入 `BatchDetectionOverview`、`FolderOpen`、`FileUp`、`FileCheck2`、`X` 图标
  - 导入 `useEffect`（之前只有 `useMemo`、`useState`）
  - 新增 `exportHistory` state + `useEffect` 自动 fetch `/api/quality/exports`
  - 重排 batch 视图 JSX 顺序：导入区 → 可视化总览 → 检测流程
  - 用 `ImportCleaningHeroPanel` 替换旧 `ImportCleaningPanel`
- `store-ai-clinic-web/tests/unit/quality-page.test.tsx`：更新断言匹配新布局

##### 改动 2：文件夹导入

用户反馈："只能导入文件吗，我希望可以导入文件夹，自动识别里面的内容"。

在 `ImportCleaningHeroPanel` 中新增"导入文件夹"入口，使用 `webkitdirectory` + `directory` 属性（非标准但浏览器广泛支持），递归读取目录下所有文件。

```tsx
<input
  type="file"
  multiple
  webkitdirectory=""
  directory=""
  className="sr-only"
  onChange={(event) => void onImportFiles(event.currentTarget.files)}
/>
```

后端 `POST /api/quality/import` 接口无需改动——前端把文件夹里的文件作为 `FormData` 逐个上传，后端照常处理。

##### 改动 3：ECharts 饼图接入

使用项目已安装的 `echarts@5.5.1` 核心包（未安装 `echarts-for-react` 包装），直接用 `echarts/core` + `echarts/charts`（PieChart）+ `echarts/components`（Tooltip/Legend/Title）+ `echarts/renderers`（CanvasRenderer）手写 React 包装组件。

**测试环境兼容**：jsdom 没有真实 canvas，ECharts 初始化和 dispose 会崩。用 `process.env.NODE_ENV === "test"` 检测测试环境，跳过 `echarts.init()` 和 `echarts.dispose()`。

#### 当前测试状态

```bash
# 已通过的测试
npx vitest run tests/unit/quality-page.test.tsx           # 1 passed
npx vitest run tests/unit/inspection-redesign.test.tsx     # 3 passed

# 未完成的测试修复（12 个失败）
npx vitest run tests/unit/quality-shell-interactions.test.tsx  # 10 passed, 12 failed
```

**12 个失败的根因**：这些测试用 `view="batch"` 渲染，但断言的是旧 batch 视图里的元素（MetricGrid、AssetInventoryPanel、CleaningResultPanel、证据面板），这些已按用户要求从 batch 视图移除。

**修复方向**（未完成，接手者继续）：
1. 测旧 batch KPI/资产盘点的测试 → 更新断言为新元素（合规情况占比、总文件数等）
2. 测证据面板/问题详情的测试 → 改成 `view="detail"` 或 `view="issues"`
3. 测导入交互的测试 → 保留 `view="batch"`，删掉对已移除组件的断言

#### 用户反馈记录

用户（作为使用者）提出的核心意见：

1. **页面太杂**："每一个页面展示的东西都太多太紧凑了"
2. **批量检测页改版要求**：
   - 导入文件/文件夹板块放最上面，做明显一点
   - 不展示每个文件的问题和证据详情
   - 展示处理进度 + 总体情况可视化（饼图等图形化）
   - 最下面放历史检测记录
3. **PDF 预览真实性怀疑**："页面预览更像是 AI 生成的假的"——确认右侧 PDF 页面预览确实是静态示例（`reportDetailVariant="screenshot"`），不接真实数据，这是已知空缺
4. **可视化需求**：合规/不合规/待审核占比饼图、总文件数量、男女比例、年龄比例

#### 接手者注意事项

1. **先修复 12 个失败测试**：`quality-shell-interactions.test.tsx` 里的 12 个失败是当前唯一阻塞项
2. **ECharts 在测试环境会崩**：已用 `process.env.NODE_ENV === "test"` 跳过，但如果新增图表组件要同样处理
3. **`webkitdirectory` 是非标准属性**：TypeScript DOM 类型未收录，已用 `@ts-expect-error` 抑制
4. **`pypdf` 已加入 `pyproject.toml`**：队友 clone 后 `uv sync` 即可，不会再缺包
5. **`.gitignore` 已创建**：后续不会再把 `node_modules`、`.next`、缓存等提交到仓库
6. **真实数据目录 `D:\桌面\数据` 在当前电脑不存在**：需要用户自己准备体检报告 PDF + Excel 样本
7. **`.env` 里有真实 API 密钥**：用户明确要求保留不删，但不要在文档/日志/截图中暴露
## 10. 2026-07-01 导航性能与根路径 404 修复

### 10.1 问题现象

本次接手后用户反馈两个问题：

1. 切换左侧导航栏时明显变慢。
2. 直接打开前端根地址 `http://127.0.0.1:3000/` 会返回 404。

### 10.2 导航变慢根因

排查发现慢点主要来自静态截图式页面在首屏渲染时做了不必要的重活：

- `/tasks`、`/tasks/[taskId]`、`/agent/[sessionId]`、`/settings` 等页面原先会触发默认质检数据扫描或导出历史加载。
- `QualityShell` 静态引入 `BatchDetectionOverview`，间接把 ECharts 图表代码带到不需要图表的页面。
- `QualityShell` 与 `ReportExportWorkspace` 都会读取 `/api/quality/exports`，导致普通导航页面也等待导出历史接口。

### 10.3 已完成修复

主要改动如下：

- `store-ai-clinic-web/features/quality/components/quality-shell.tsx`
  - 将 `BatchDetectionOverview` 改为 `React.lazy` + `Suspense`，只有批量检测页才加载图表模块。
  - 新增 `shouldLoadExportHistory`，只有 `/quality` 批量页和非截图式导出页加载导出历史。
  - 导出 `QualityAssetSummary` 类型，保证生产构建通过。
- `store-ai-clinic-web/features/quality/components/report-export-workspace.tsx`
  - 新增 `loadExportHistory` 属性。
  - `/settings` 的截图式导出页关闭导出历史请求，避免导航时额外打 `/api/quality/exports`。
- `store-ai-clinic-web/app/(workspace)/tasks/page.tsx`
- `store-ai-clinic-web/app/(workspace)/tasks/[taskId]/page.tsx`
- `store-ai-clinic-web/app/(workspace)/agent/[sessionId]/page.tsx`
- `store-ai-clinic-web/app/(workspace)/settings/page.tsx`
  - 改为静态截图式渲染入口，不再阻塞首屏去扫描默认数据。
- `store-ai-clinic-web/features/quality/components/report-export-workspace.tsx`
  - 补充顶部 `导出结果` 按钮逻辑：已有下载地址时直接跳转，否则提示先生成交付包。
- `store-ai-clinic-web/app/page.tsx`
  - 新增根路由，访问 `/` 时自动 `redirect('/quality')`，修复直接打开 `http://127.0.0.1:3000/` 返回 404 的问题。

### 10.4 新增与更新测试

相关测试文件：

```text
store-ai-clinic-web/tests/unit/static-snapshot-pages-performance.test.tsx
store-ai-clinic-web/tests/unit/settings-page.test.tsx
store-ai-clinic-web/tests/unit/quality-page.test.tsx
store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx
store-ai-clinic-web/tests/unit/root-page.test.ts
```

覆盖点：

- 静态截图式导航页面不触发默认数据扫描。
- 静态截图式导航页面不触发 `/api/quality/exports`。
- 静态截图式导航页面不加载批量检测图表模块。
- 批量检测页首屏先显示轻量占位，图表随后懒加载。
- 根路径 `/` 自动跳转到 `/quality`。

### 10.5 最新验证结果

已运行并通过：

```bash
npm run test -- tests/unit/static-snapshot-pages-performance.test.tsx tests/unit/settings-page.test.tsx tests/unit/quality-page.test.tsx tests/unit/quality-shell-interactions.test.tsx -- --run
npm run test -- tests/unit/root-page.test.ts tests/unit/quality-page.test.tsx -- --run
npm run build
```

浏览器实测结果：

- `http://127.0.0.1:3000/` 最终跳转到 `http://127.0.0.1:3000/quality`，返回 200。
- `/tasks`、`/agent`、`/brands`、`/knowledge`、`/settings` 切换时不再触发 `/api/quality/exports`。
- 静态导航页面首屏可见时间约为 90-160ms。
- `/quality` 保留导出历史请求和图表懒加载，因为该页面确实需要批量检测总览能力。

### 10.6 当前服务地址

当前本地服务状态：

```text
frontend: http://127.0.0.1:3000
backend:  http://127.0.0.1:8000
```

如果再次看到 404，优先确认访问的是根路径还是具体路由；根路径现在应自动跳到 `/quality`。
## 11. 2026-07-01 交付包导出修复与 GitHub PR 交接

### 11.1 本次用户问题

用户反馈：生成交付包失败，前端提示“请确认后端服务已启动，且数据集路径存在”。实际排查后确认：

- 后端 `/health` 正常返回 `200`。
- 真实数据目录 `D:\桌面\数据\5人` 存在。
- 前端 `POST /api/quality/exports` 返回 `500`。
- 直接调用后端导出接口会卡住/超时。

根因不是后端没启动，而是 `create_export_task()` 生成交付包时复用了完整质量扫描链路，间接触发 PDF 页面渲染与视觉分析，真实数据集下导出包生成过重，导致请求超时或 500。

### 11.2 已完成修复

已在分支 `fix/quality-export-delivery-package` 完成以下改动：

- 导出包生成改为轻量扫描，不再渲染 PDF 页面。
- 修复导出链路中的变量错误，避免 `resolved_issues` 未定义导致 500。
- `build_quality_export_summary()` 支持复用已扫描出的 issues，避免导出时重复重型扫描。
- 交付包 zip 命名改为客户可识别格式：
  - `体检报告质检交付包_{数据集名}_{年月日_时分}_{任务ID}.zip`
  - 示例：`体检报告质检交付包_5人_20260701_0534_071da105af12.zip`
- 交付包内新增客户直观看的 HTML 入口：
  - `00-交付包说明.html`
  - `01-批次质检总报告.html`
  - `02-逐份报告问题说明/*.html`
- 补齐质量页面按钮操作记录真实后端接口：
  - 后端：`GET/POST /api/quality/actions`
  - 前端 BFF：`store-ai-clinic-web/app/api/quality/actions/route.ts`
  - 前端质量页按钮会记录到真实后端，而不是只做本地假交互。

### 11.3 GitHub 分支与 PR 信息

已执行：

```bash
git pull --ff-only
```

结果：`Already up to date.`

当前 Git 仓库路径：

```text
D:\桌面\医疗夹\github-sync-tijianbaogao
```

注意：实际运行/调试目录曾是：

```text
D:\桌面\医疗夹\tijianbaogao
```

最终已把相关改动同步到 Git 仓库，并提交到新分支：

```text
branch: fix/quality-export-delivery-package
commit: ef80f85 Fix quality export delivery package
remote: origin/fix/quality-export-delivery-package
```

PR 尚未由 CLI 创建，因为本机没有安装 `gh` 命令。GitHub 已返回可创建 PR 链接：

```text
https://github.com/shiyuan-1229/tijianbaogao/pull/new/fix/quality-export-delivery-package
```

如果同事说“没有收到”，需要告诉他：GitHub 不会自动通知，因为现在只是分支已推送，还没有实际创建 PR。请把上面的链接直接发给同事，或让他在 GitHub 仓库里手动选择：

```text
base: main
compare: fix/quality-export-delivery-package
```

建议 PR 标题：

```text
Fix quality export delivery package
```

建议 PR 描述：

```md
## Summary
- Add real backend action recording for quality page interactions.
- Generate customer-readable quality delivery packages with clear dataset/time bundle names and HTML entrypoints.
- Avoid expensive PDF page rendering during export package generation to prevent timeout/500 errors.

## Test Plan
- uv run --extra dev pytest tests/unit/test_quality_backend.py -q
- npm test -- tests/unit/quality-shell-interactions.test.tsx
```

### 11.4 已验证命令

在 Git 仓库 `D:\桌面\医疗夹\github-sync-tijianbaogao\门店数据诊断智能体` 中已通过：

```bash
uv run --extra dev pytest tests/unit/test_quality_backend.py -q
```

结果：`27 passed, 3 warnings`

在前端目录 `D:\桌面\医疗夹\github-sync-tijianbaogao\门店数据诊断智能体\store-ai-clinic-web` 中已通过：

```bash
npm test -- tests/unit/quality-shell-interactions.test.tsx
```

结果：`23 passed`

另外在本地真实服务上验证过：

- 后端：`http://127.0.0.1:8000/health` 返回 `200 {"status":"ok"}`。
- 前端：`http://127.0.0.1:3000/quality` 返回 `200`。
- 通过前端 BFF 调用 `POST http://127.0.0.1:3000/api/quality/exports` 返回 `200`。
- 真实数据集 `D:/桌面/数据/5人` 生成交付包成功，artifact_count 为 `61`。

### 11.5 本次 PR 变更文件

```text
门店数据诊断智能体/src/store_ai_clinic/api/routers/quality.py
门店数据诊断智能体/src/store_ai_clinic/schemas/quality.py
门店数据诊断智能体/src/store_ai_clinic/services/quality.py
门店数据诊断智能体/store-ai-clinic-web/app/api/quality/actions/route.ts
门店数据诊断智能体/store-ai-clinic-web/features/quality/components/quality-shell.tsx
门店数据诊断智能体/store-ai-clinic-web/tests/unit/quality-shell-interactions.test.tsx
门店数据诊断智能体/tests/unit/test_quality_backend.py
```

### 11.6 接手注意事项

1. 不要把 `D:\桌面\医疗夹\tijianbaogao` 当成 Git 仓库；要提交/PR 请使用 `D:\桌面\医疗夹\github-sync-tijianbaogao`。
2. 不要把 `.env`、真实 API Key、真实客户数据、`质检交付/` 生成包、`.codex-run/` 日志提交到仓库。
3. 如果前端 API 路由突然返回 HTML 500，并伴随 `Cannot find module './xxx.js'`，优先清理 `store-ai-clinic-web/.next` 并重启前端 dev server。这次遇到过 `.next` chunk 缺失，不是业务接口错误。
4. 如果再次看到“请确认后端服务已启动，且数据集路径存在”，先分别检查：
   - `http://127.0.0.1:8000/health`
   - 数据集路径是否存在
   - 前端 BFF `/api/quality/exports` 是否返回 JSON，而不是 Next 错误页
5. 交付包生成不应再触发 PDF 渲染；如果后续改动重新调用 `_default_pdf_page_renderer()`，会导致真实数据集导出再次变慢或超时。
