# 2026-06-27 OCR 与视觉模型接入文档

## 1. 接入目标

本阶段接入 OCR 证据与视觉模型证据，用于补齐 PDF 类体检报告的自动排查能力。

系统当前只负责三件事：

- 读取 PDF 的基础信息，例如页数。
- 读取 OCR 或视觉模型输出的证据。
- 把疑似问题转成 `QualityIssueData[]`，进入前端质量排查页面和人工复核流程。

本阶段不做自动修复 PDF、不做自动合规结论、不替代人工确认。涉及隐私、缺字、裁切、遮挡、扫描质量等问题时，只标记为“疑似问题”，并保留证据给人工复核。

## 2. 已实现文件

核心扫描器：

```text
store-ai-clinic-web/features/quality/lib/dataset-scanner.ts
```

OCR sidecar provider：

```text
store-ai-clinic-web/features/quality/lib/sidecar-ocr-provider.ts
```

视觉模型 sidecar provider：

```text
store-ai-clinic-web/features/quality/lib/sidecar-vision-provider.ts
```

单元测试：

```text
store-ai-clinic-web/tests/unit/quality-dataset-scanner.test.ts
```

## 3. 数据流

```text
数据集目录
  -> collectDatasetFiles()
  -> 扫描 PDF / Excel
  -> 读取 PDF 页数
  -> 读取同名 OCR sidecar
  -> 读取同名视觉模型 sidecar
  -> 生成 QualityIssueData[]
  -> QualityShell 前端展示
  -> 人工复核
```

扫描器入口：

```ts
await scanQualityDataset(datasetPath);
```

默认行为：

- PDF 没有 OCR 或视觉模型证据时，生成 `R-OCR-001 / OCR 待处理`。
- PDF 有 OCR 或视觉模型证据时，不再重复生成 `R-OCR-001`。
- OCR 文本中命中身份证号或手机号时，生成 `R-PRIVACY-003 / 疑似未脱敏`。
- 视觉模型 sidecar 中的 finding 会直接转换成质量问题。
- provider 报错会被捕获，扫描流程继续执行。

## 4. OCR Sidecar 接入

### 4.1 文件命名

把 OCR 结果文件放在 PDF 同目录，支持以下命名：

```text
02250201.pdf
02250201.ocr.json
```

或：

```text
02250201.pdf
02250201.pdf.ocr.json
```

纯文本 OCR 也支持：

```text
02250201.ocr.txt
02250201.pdf.ocr.txt
```

优先级按代码中的候选顺序查找：

1. `文件名.ocr.json`
2. `完整 PDF 文件名.ocr.json`
3. `文件名.ocr.txt`
4. `完整 PDF 文件名.ocr.txt`

### 4.2 OCR JSON 格式

推荐格式：

```json
{
  "pages": [
    {
      "page": 3,
      "text": "姓名：李四 手机号：13900139000",
      "confidence": 0.89,
      "blocks": [
        {
          "text": "手机号：13900139000",
          "confidence": 0.9,
          "bbox": [100, 240, 360, 272]
        }
      ]
    }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `page` | 否 | PDF 页码，从 1 开始，默认 1。 |
| `text` | 否 | 当前页完整 OCR 文本。 |
| `confidence` | 否 | OCR 置信度，默认 1。 |
| `blocks` | 否 | 当前页的文本块，适合保留坐标证据。 |
| `bbox` | 否 | 文本块坐标，格式为 `[x1, y1, x2, y2]`。 |

也支持直接传数组：

```json
[
  {
    "page": 1,
    "text": "手机号：13900139000",
    "confidence": 0.91
  }
]
```

### 4.3 OCR 命中规则

当前扫描器会从 OCR 文本和 block 文本中排查：

- 18 位大陆身份证号。
- 大陆手机号。

命中后生成：

```text
ruleId: R-PRIVACY-003
issueType: 疑似未脱敏
category: privacy
severity: high
```

展示证据中会对敏感号码做掩码处理，只保留必要定位信息。

## 5. 视觉模型 Sidecar 接入

### 5.1 文件命名

把视觉模型结果文件放在 PDF 同目录，支持以下命名：

```text
02250201.pdf
02250201.vision.json
```

或：

```text
02250201.pdf
02250201.pdf.vision.json
```

### 5.2 视觉 JSON 格式

推荐格式：

```json
{
  "findings": [
    {
      "page": 4,
      "ruleId": "R-CONTENT-004",
      "issueType": "疑似缺字",
      "category": "content",
      "severity": "high",
      "evidence": "第4页检验项名称被扫描裁切，视觉模型标记为疑似缺字。",
      "aiJudgement": "视觉模型判断页面存在内容裁切",
      "recommendation": "进入人工复核，核对 PDF 原图和 OCR 证据。",
      "confidence": 0.88
    }
  ]
}
```

也支持顶层字段 `issues`：

```json
{
  "issues": [
    {
      "page": 2,
      "evidence": "第2页右侧边缘疑似被裁切。"
    }
  ]
}
```

还支持直接传数组：

```json
[
  {
    "page": 2,
    "evidence": "第2页右侧边缘疑似被裁切。"
  }
]
```

字段说明：

| 字段 | 必填 | 默认值 / 说明 |
| --- | --- | --- |
| `page` | 否 | 默认 1。 |
| `ruleId` | 否 | 默认 `R-VISION-001`。 |
| `issueType` | 否 | 默认 `视觉模型疑点`。 |
| `category` | 否 | 支持 `privacy` / `content` / `format` / `history`，默认 `content`。 |
| `severity` | 否 | 支持 `high` / `medium` / `low`，默认 `medium`。 |
| `evidence` | 是 | 视觉模型发现的证据。为空时会被过滤。 |
| `aiJudgement` | 否 | 默认“视觉模型输出需人工复核的证据”。 |
| `recommendation` | 否 | 默认提示核对 PDF 原图、OCR 结果和视觉模型证据。 |
| `confidence` | 否 | 默认 0.75。 |

## 6. 接入真实 OCR 服务

当前默认 provider 只读取 sidecar 文件。后续接入真实 OCR 服务时，实现 `OcrProvider` 即可：

```ts
export type OcrProvider = {
  extractPdf(filePath: string): Promise<OcrPageEvidence[]>;
};
```

示例：

```ts
import type { OcrProvider } from "@/features/quality/lib/dataset-scanner";

export function createMyOcrProvider(): OcrProvider {
  return {
    async extractPdf(filePath) {
      // 1. 读取或上传 PDF。
      // 2. 调用本地 OCR / 私有化 OCR / 云 OCR。
      // 3. 转成 OcrPageEvidence[]。
      return [
        {
          page: 1,
          text: "姓名：李四 手机号：13900139000",
          confidence: 0.92,
          blocks: [
            {
              text: "手机号：13900139000",
              confidence: 0.9,
              bbox: [100, 240, 360, 272],
            },
          ],
        },
      ];
    },
  };
}
```

调用：

```ts
await scanQualityDataset(datasetPath, {
  ocrProvider: createMyOcrProvider(),
});
```

建议落地顺序：

1. 先用 sidecar 文件跑通数据格式和页面展示。
2. 再把真实 OCR 输出转换成相同的 `OcrPageEvidence[]`。
3. 最后把 provider 接到扫描任务或后端接口中。

## 7. 接入真实视觉模型

视觉模型接入实现 `VisionReviewProvider`：

```ts
export type VisionReviewProvider = {
  reviewPdf(
    filePath: string,
    context: { ocrPages: OcrPageEvidence[]; pageCount: number }
  ): Promise<VisionFindingEvidence[]>;
};
```

示例：

```ts
import type { VisionReviewProvider } from "@/features/quality/lib/dataset-scanner";

export function createMyVisionProvider(): VisionReviewProvider {
  return {
    async reviewPdf(filePath, context) {
      // context.ocrPages: OCR 证据。
      // context.pageCount: PDF 页数。
      // 1. 把 PDF 页转图片，或交给支持 PDF 的视觉模型。
      // 2. 结合 OCR 文本判断裁切、缺字、遮挡、方向错误、异常涂改等问题。
      // 3. 返回 VisionFindingEvidence[]。
      return [
        {
          page: "4",
          ruleId: "R-CONTENT-004",
          issueType: "疑似缺字",
          category: "content",
          severity: "high",
          evidence: "第4页检验项名称被扫描裁切，视觉模型标记为疑似缺字。",
          aiJudgement: "视觉模型判断页面存在内容裁切",
          recommendation: "进入人工复核，核对 PDF 原图和 OCR 证据。",
          confidence: 0.88,
        },
      ];
    },
  };
}
```

调用：

```ts
await scanQualityDataset(datasetPath, {
  ocrProvider: createMyOcrProvider(),
  visionProvider: createMyVisionProvider(),
});
```

视觉模型适合先覆盖这些问题：

- 页面裁切、缺边、缺字。
- 盖章或签名区域异常。
- 明显遮挡、涂改、重影。
- 扫描方向错误。
- 图片质量过低、模糊、曝光异常。
- OCR 无法可靠判断的版式类问题。

## 8. 安全与合规要求

体检报告包含高敏感医疗和个人信息。接入外部 OCR 或视觉模型前，需要先确认：

- PDF 是否会离开本地或私有网络。
- 服务商是否保存原始文件、图片、OCR 文本或日志。
- 是否支持关闭训练、关闭留存、关闭人工标注。
- 传输链路是否加密。
- 是否需要脱敏后再调用模型。
- 是否满足项目所在场景的隐私、医疗数据和客户数据合规要求。

推荐优先级：

1. 本地或私有化 OCR / 视觉模型。
2. 企业云服务，并签署数据处理和隐私条款。
3. 公共 API 只用于非真实样本或已脱敏样本。

## 9. 验证命令

只验证 OCR/视觉扫描器：

```bash
cd store-ai-clinic-web
npm test -- tests/unit/quality-dataset-scanner.test.ts
```

验证质量页面相关回归：

```bash
npm test -- tests/unit/quality-page.test.tsx tests/unit/agent-page.test.tsx tests/unit/conversation-page.test.tsx tests/unit/quality-shell-interactions.test.tsx tests/unit/quality-dataset-scanner.test.ts
```

完整前端检查：

```bash
npm run lint
npm run build
```

## 10. 当前测试覆盖

当前 `quality-dataset-scanner.test.ts` 已覆盖：

- 无 OCR / 无视觉证据时，PDF 生成 `R-OCR-001`。
- `.ocr.json` sidecar 能生成隐私命中问题。
- 注入自定义 `ocrProvider` 后，能读取 provider 返回的 OCR 证据。
- `.vision.json` sidecar 能生成视觉模型问题。
- 有真实 OCR 或视觉证据时，不重复生成 `R-OCR-001`。

最近一次代码验证命令：

```bash
npm test -- tests/unit/quality-page.test.tsx tests/unit/agent-page.test.tsx tests/unit/conversation-page.test.tsx tests/unit/quality-shell-interactions.test.tsx tests/unit/quality-dataset-scanner.test.ts
npm run lint
npm run build
```

结果：测试、lint、build 均通过。

## 11. 后续建议

短期建议继续保持 sidecar 作为标准交换格式。这样即使 OCR 服务、视觉模型或部署方式变化，扫描器和前端页面也不需要频繁改动。

当真实 OCR / 视觉模型稳定后，再把 provider 接到正式扫描任务里，并补充端到端样例数据：

```text
sample-dataset/
  02250201.pdf
  02250201.ocr.json
  02250201.vision.json
```

这样可以同时验证文件识别、证据转换、问题展示和人工复核链路。
