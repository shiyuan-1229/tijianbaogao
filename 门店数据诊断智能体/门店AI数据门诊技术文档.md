# 门店AI数据门诊项目技术文档

| 项目项 | 内容 |
| --- | --- |
| 项目名称 | 门店AI数据门诊 |
| 文档定位 | 开发、测试、部署、运维一体化技术实施文档 |
| 架构核心 | LangGraph + DeepSeek-V4 + Python + DuckDB + Streamlit |
| 文档版本 | v1.0 |
| 版本基线日期 | 2026-06-09 |
| 适用对象 | 研发工程师、AI 工程师、产品经理、测试工程师、运维工程师 |

---

# 第1章 项目概述

## 1.1 项目背景与痛点

零售门店的数据分析长期存在三个结构性问题。第一，门店数据来源分散，既有 POS 收银系统、会员系统、进销存系统，也有手工 Excel 报表、微信导出的活动名单和运营补录文件，字段命名不统一、口径不一致、时间粒度不一致。第二，传统 BI 系统更擅长“展示结果”，不擅长“修复脏数据、解释异常、给出经营建议”，分析师仍需花费大量时间做清洗、对账和解释。第三，门店经营人员更关心“今天应该做什么”，而不是“某个指标同比下降 12.3%”这类孤立事实，数据与经营动作之间存在明显断层。

门店AI数据门诊的目标不是再做一个报表平台，而是构建一个能够自动接入数据、自动判断数据质量、自动计算指标、自动生成诊断结论、必要时支持人工介入复核的经营诊断系统。系统通过 LangGraph 将整个流程建模为可恢复、可回放、可审计的状态机，把大模型从“单轮问答工具”升级为“可控的多 Agent 经营分析引擎”。

## 1.2 核心价值主张

本项目的价值集中体现在四个方面：

1. 将数据分析前移，把“数据能不能用”作为系统内建能力，而非人工前置步骤。
2. 将指标计算标准化，把同环比、转化率、连带率、客单价、售罄率等关键指标固化为可复用指标库。
3. 将经营诊断结构化，把“发现问题、判断根因、生成建议”形成可追踪、可验证、可复盘的闭环。
4. 将 AI 输出工程化，通过状态机、检查点、质量验证节点和人工干预节点，提升模型输出的稳定性与业务可用性。

## 1.3 目标用户与适用场景

目标用户包括：

1. 区域营运经理：需要快速查看门店经营异动、识别问题门店并安排动作。
2. 店长：需要知道客流、转化、连带、库存、活动效果等问题的优先级与具体整改建议。
3. 数据分析师：需要减少清洗、对账、解释环节的重复劳动。
4. 总部商品与督导团队：需要基于结构化诊断结果进行跨店横向比较。

适用场景包括：

1. 日报、周报、月报自动诊断。
2. 活动复盘与门店对比分析。
3. 新店开业前 30 天经营跟踪。
4. 异常门店预警与复核。
5. 区域巡店前的门店数据体检。

## 1.4 系统核心能力

### 1.4.1 数据清洗

系统支持上传 Excel、CSV、TSV、JSON、Parquet 等格式文件，并自动完成编码识别、表头规范化、缺失值识别、日期与货币字段转换、重复记录消解以及异常值标注。

### 1.4.2 自动计算

系统内置零售指标库，自动计算营收、客流、转化、商品、库存、活动和会员类指标。计算引擎采用 Pandas 做预处理、DuckDB 做高性能聚合，保证中等规模数据集在秒级到分钟级内完成。

### 1.4.3 智能经营诊断

系统基于 DeepSeek-V4 与零售知识库进行结构化推理，输出“问题摘要、证据指标、可能根因、建议动作、优先级、风险提示、待核实事项”等标准化诊断结果，并经过质量验证节点过滤后再进入最终报告。

## 1.5 项目里程碑与交付计划

| 里程碑 | 周期 | 交付内容 | 验收标准 |
| --- | --- | --- | --- |
| M1 需求固化 | 第 1 周 | 指标口径表、样例数据、角色权限说明 | 核心口径与目标场景确认 |
| M2 数据底座 | 第 2-3 周 | 数据接入、字段映射、清洗与校验模块 | 样例数据可稳定入库 |
| M3 LangGraph 工作流 | 第 4-5 周 | 状态机、检查点、人工干预与重试机制 | 工作流可完整跑通 |
| M4 诊断与报告 | 第 6-7 周 | 指标计算、RAG 诊断、报告导出 | 生成标准诊断报告 |
| M5 测试与上线 | 第 8 周 | 单元测试、集成测试、部署脚本、运维文档 | 试运行 1 周稳定 |

---

# 第2章 整体技术架构

## 2.1 架构设计理念

系统采用“状态驱动 + 模块化 Agent + 循环验证”的设计理念。

状态驱动意味着系统并不是简单串行调用多个脚本，而是把每一步执行结果写回统一状态对象。任何节点都只能读取状态、更新状态，不直接操作全局共享变量。这样可以天然支持检查点、回放、重试和人工介入。

模块化 Agent 意味着每个 Agent 只承担单一职责，例如数据接入 Agent 只负责读入与字段识别，指标计算 Agent 只负责构建指标事实表，经营诊断 Agent 只负责推理与建议生成。职责边界清晰后，测试、替换和扩展都更容易。

循环验证意味着系统不会盲信上一步输出。数据清洗后有清洗验证，指标计算后有指标验证，诊断生成后有诊断验证。验证失败时，系统优先自动重试，其次触发更细粒度补救，最后才进入人工干预，最大化利用自动化能力同时控制风险。

## 2.2 系统分层架构图

```mermaid
flowchart TB
    U["用户/运营人员"] --> FE["Streamlit 前端层"]
    FE --> API["应用编排层<br/>FastAPI/Service Layer"]
    API --> LG["LangGraph 工作流层"]

    subgraph AG["Agent 执行层"]
        A1["数据接入 Agent"]
        A2["数据清洗 Agent"]
        A3["清洗验证 Agent"]
        A4["指标计算 Agent"]
        A5["指标验证 Agent"]
        A6["经营诊断 Agent"]
        A7["诊断验证 Agent"]
        A8["报告生成 Agent"]
    end

    LG --> A1
    LG --> A2
    LG --> A3
    LG --> A4
    LG --> A5
    LG --> A6
    LG --> A7
    LG --> A8

    subgraph TOOL["工具层"]
        T1["Pandas"]
        T2["DuckDB"]
        T3["Great Expectations"]
        T4["Docker Sandbox"]
        T5["Plotly/HTML/PDF Exporter"]
        T6["RAG Retriever"]
    end

    A1 --> T1
    A2 --> T1
    A2 --> T4
    A3 --> T3
    A4 --> T2
    A4 --> T5
    A6 --> T6
    A6 --> DS["DeepSeek-V4"]
    A7 --> DS
    A8 --> T5

    subgraph DATA["数据层"]
        D1["原始文件存储"]
        D2["SQLite 开发库"]
        D3["PostgreSQL 生产库"]
        D4["向量索引/知识库"]
        D5["LangGraph Checkpoints"]
        D6["审计日志"]
    end

    A1 --> D1
    A2 --> D2
    A2 --> D3
    A6 --> D4
    LG --> D5
    API --> D6
```

## 2.3 核心技术栈选型与理由

| 组件 | 版本基线 | 选型理由 | 替代方案 |
| --- | --- | --- | --- |
| Python | 3.14.5 | 生态完整，适合数据处理、Agent 编排、Web 服务与测试自动化 | Python 3.12 |
| LangGraph | 1.2.4 | 原生支持持久化、检查点、流式执行、人机中断与长任务恢复 | CrewAI、AutoGen |
| langgraph-checkpoint | 4.1.1 | 统一检查点协议，支撑断点续跑与状态审计 | 自研状态存储 |
| langgraph-checkpoint-postgres | 3.1.0 | 生产环境持久化能力强，适合多实例部署 | SQLite Checkpointer |
| langgraph-checkpoint-sqlite | 3.1.0 | 本地开发轻量、零依赖、上手快 | InMemorySaver |
| DeepSeek API | DeepSeek-V4-Pro / V4-Flash | 1M 上下文、工具调用、JSON 输出、双模式推理，适合复杂经营诊断 | Qwen、Claude、GPT 系列 |
| OpenAI Python SDK | 2.41.0 | 可直接以 OpenAI 兼容方式访问 DeepSeek API | requests 自封装 |
| Pandas | 3.0.3 | 表格清洗与规则处理成熟稳定 | Polars |
| DuckDB | 1.5.3 | 单机分析性能高，适合中小规模指标聚合 | SQLite、ClickHouse |
| Great Expectations | 1.18.0 | 数据质量规则表达清晰，便于验证与留痕 | Soda、自研校验器 |
| Streamlit | 1.58.0 | 快速搭建诊断型内部工具界面 | Gradio、React + FastAPI |
| PostgreSQL | 18.4 | 事务、索引、JSONB、扩展生态成熟，适合生产主库 | MySQL |
| SQLite | 3.53.2 | 单文件、易分发，适合本地开发与轻量单租户部署 | DuckDB 文件库 |
| Docker Engine | 29.3.1 | 统一运行环境与安全隔离 | Podman |

## 2.4 技术栈优势对比

### 2.4.1 LangGraph vs CrewAI / AutoGen

| 对比项 | LangGraph | CrewAI | AutoGen |
| --- | --- | --- | --- |
| 工作流表达 | 显式状态机与图结构 | 偏角色协作编排 | 偏对话式多代理 |
| 持久化能力 | 强，原生检查点 | 需额外封装 | 需较多自定义 |
| 人工干预 | 强，支持 interrupt 与 resume | 有，但流程可控性较弱 | 可做，但工程化成本更高 |
| 调试可观测性 | 强，适合生产 | 中 | 中 |
| 适合本项目 | 最优 | 可做原型 | 可做实验 |

本项目核心不是“让多个角色互相说话”，而是“让多阶段分析流程在失败、验证、重试、人工介入中保持一致状态”。因此 LangGraph 明显更契合。

### 2.4.2 DeepSeek-V4 vs 其他模型

| 对比项 | DeepSeek-V4-Pro | DeepSeek-V4-Flash | 其他通用模型 |
| --- | --- | --- | --- |
| 长上下文 | 1M | 1M | 视供应商而定 |
| 工具调用 | 支持 | 支持 | 通常支持 |
| JSON 输出 | 支持 | 支持 | 通常支持 |
| 成本 | 相对更高 | 更低 | 视供应商而定 |
| 适合环节 | 复杂诊断、复核、报告总结 | 数据映射、规则解释、轻量诊断 | 备选 |

推荐策略是“双模型分工”：字段映射、轻度解释、清洗规则草拟使用 `deepseek-v4-flash`，复杂诊断、结论归纳、经营建议生成使用 `deepseek-v4-pro`。

## 2.5 系统数据流图

```mermaid
flowchart LR
    F["上传文件"] --> P1["原始文件归档"]
    P1 --> P2["字段识别与映射"]
    P2 --> P3["标准表结构转换"]
    P3 --> P4["脏数据清洗"]
    P4 --> V1{"清洗验证通过?"}
    V1 -- 否 --> R1["自动重试/人工介入"]
    R1 --> P4
    V1 -- 是 --> P5["指标事实表生成"]
    P5 --> P6["DuckDB 聚合计算"]
    P6 --> V2{"指标验证通过?"}
    V2 -- 否 --> R2["重算/回退口径"]
    R2 --> P5
    V2 -- 是 --> P7["RAG 检索经营知识"]
    P7 --> P8["DeepSeek-V4 诊断推理"]
    P8 --> V3{"诊断验证通过?"}
    V3 -- 否 --> R3["补充上下文/人工复核"]
    R3 --> P8
    V3 -- 是 --> P9["生成 Markdown/HTML/PDF/JSON 报告"]
    P9 --> OUT["前端展示与下载"]
```

---

# 第3章 LangGraph核心工作流设计

## 3.1 状态机设计原理

LangGraph 在本项目中承担“任务调度器 + 状态容器 + 恢复机制”三重角色。系统中的每个 Agent 节点都不是独立脚本，而是图中的一个状态变换节点：

1. 输入是当前 `DataClinicState`。
2. 执行节点逻辑与工具调用。
3. 输出是对状态的增量更新字典。

这样做的核心收益有三点：

1. 任一步失败后可从最近检查点恢复，而不是整条链路重跑。
2. 任一验证节点都可以基于统一状态做判断，而不是跨脚本传参。
3. 人工干预可直接修改状态中的诊断上下文、字段映射、异常记录处理策略，然后继续执行。

## 3.2 全局状态定义

以下为推荐的完整 `DataClinicState` 定义。生产实现建议单独放在 `app/state.py` 中。

```python
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


WorkflowStage = Literal[
    "initialized",
    "ingest",
    "clean",
    "clean_validate",
    "metrics",
    "metrics_validate",
    "diagnose",
    "diagnosis_validate",
    "report",
    "completed",
    "failed",
    "waiting_human",
]


class QualityIssue(BaseModel):
    issue_type: str
    severity: Literal["low", "medium", "high", "critical"]
    field_name: Optional[str] = None
    row_ids: List[str] = Field(default_factory=list)
    description: str
    suggestion: Optional[str] = None


class RetryRecord(BaseModel):
    node_name: str
    attempt: int
    reason: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MetricResult(BaseModel):
    metric_id: str
    metric_name: str
    metric_value: float | int | str
    unit: str = ""
    dimension: Dict[str, Any] = Field(default_factory=dict)
    period: str
    benchmark_value: Optional[float] = None
    diff_rate: Optional[float] = None
    status: Literal["good", "normal", "warning", "bad"] = "normal"


class DiagnosisItem(BaseModel):
    problem_id: str
    title: str
    summary: str
    evidence_metrics: List[str] = Field(default_factory=list)
    root_causes: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    priority: Literal["P0", "P1", "P2", "P3"] = "P2"
    confidence: float = 0.0
    need_manual_check: bool = False


class ReportArtifact(BaseModel):
    artifact_type: Literal["markdown", "html", "pdf", "json"]
    path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DataClinicState(BaseModel):
    job_id: str
    tenant_id: str = "default"
    store_id: str
    operator_id: str = "system"
    stage: WorkflowStage = "initialized"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    input_files: List[str] = Field(default_factory=list)
    file_profiles: List[Dict[str, Any]] = Field(default_factory=list)
    raw_tables: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)

    detected_schema: Dict[str, str] = Field(default_factory=dict)
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    mapping_confidence: Dict[str, float] = Field(default_factory=dict)
    unmapped_fields: List[str] = Field(default_factory=list)

    cleaned_tables: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    clean_code: str = ""
    clean_log: List[str] = Field(default_factory=list)
    quality_issues: List[QualityIssue] = Field(default_factory=list)
    quality_score: float = 0.0

    metric_tables: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    metrics: List[MetricResult] = Field(default_factory=list)
    charts: List[Dict[str, Any]] = Field(default_factory=list)
    metric_validation_errors: List[str] = Field(default_factory=list)

    retrieved_knowledge: List[Dict[str, Any]] = Field(default_factory=list)
    diagnosis_items: List[DiagnosisItem] = Field(default_factory=list)
    executive_summary: str = ""
    diagnosis_validation_errors: List[str] = Field(default_factory=list)

    report_artifacts: List[ReportArtifact] = Field(default_factory=list)
    final_report_markdown: str = ""

    retries: List[RetryRecord] = Field(default_factory=list)
    current_retry_count: int = 0
    max_retry_count: int = 2
    requires_human_review: bool = False
    human_review_reason: str = ""
    audit_log: List[str] = Field(default_factory=list)
    last_error: str = ""
```

### 3.2.1 字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `job_id` | `str` | 诊断任务唯一标识 |
| `store_id` | `str` | 门店唯一标识 |
| `stage` | `WorkflowStage` | 当前执行阶段 |
| `input_files` | `List[str]` | 上传文件路径列表 |
| `file_profiles` | `List[Dict]` | 每个文件的编码、sheet、行数、列数等画像 |
| `raw_tables` | `Dict[str, List[Dict]]` | 原始表格记录 |
| `detected_schema` | `Dict[str, str]` | 系统识别出的原始字段类型 |
| `field_mapping` | `Dict[str, str]` | 原字段到标准字段的映射结果 |
| `mapping_confidence` | `Dict[str, float]` | 映射置信度 |
| `unmapped_fields` | `List[str]` | 未映射字段列表 |
| `cleaned_tables` | `Dict[str, List[Dict]]` | 清洗后的标准表 |
| `clean_code` | `str` | 生成并执行的清洗代码 |
| `clean_log` | `List[str]` | 清洗日志 |
| `quality_issues` | `List[QualityIssue]` | 数据质量问题明细 |
| `quality_score` | `float` | 清洗后质量评分 |
| `metric_tables` | `Dict[str, List[Dict]]` | 指标中间表 |
| `metrics` | `List[MetricResult]` | 指标结果列表 |
| `charts` | `List[Dict]` | 图表配置或数据 |
| `retrieved_knowledge` | `List[Dict]` | RAG 检索到的零售知识块 |
| `diagnosis_items` | `List[DiagnosisItem]` | 结构化诊断结果 |
| `executive_summary` | `str` | 报告摘要 |
| `report_artifacts` | `List[ReportArtifact]` | 导出产物 |
| `requires_human_review` | `bool` | 是否需要人工介入 |
| `human_review_reason` | `str` | 人工介入原因 |
| `audit_log` | `List[str]` | 审计日志 |
| `last_error` | `str` | 最近一次错误信息 |

## 3.3 完整工作流图

```mermaid
flowchart TD
    START["START"] --> INGEST["数据接入 Agent"]
    INGEST --> CLEAN["数据清洗 Agent"]
    CLEAN --> CLEAN_CHECK["清洗验证 Agent"]

    CLEAN_CHECK -->|"通过"| METRICS["指标计算 Agent"]
    CLEAN_CHECK -->|"重试"| CLEAN
    CLEAN_CHECK -->|"人工介入"| HUMAN["人工干预节点"]

    HUMAN -->|"修正映射/规则"| CLEAN
    HUMAN -->|"直接确认"| METRICS

    METRICS --> METRICS_CHECK["指标验证 Agent"]
    METRICS_CHECK -->|"通过"| DIAG["经营诊断 Agent"]
    METRICS_CHECK -->|"重算"| METRICS
    METRICS_CHECK -->|"人工介入"| HUMAN2["人工复核节点"]

    HUMAN2 -->|"确认口径"| DIAG
    HUMAN2 -->|"回退重算"| METRICS

    DIAG --> DIAG_CHECK["诊断验证 Agent"]
    DIAG_CHECK -->|"通过"| REPORT["报告生成 Agent"]
    DIAG_CHECK -->|"补充上下文后重试"| DIAG
    DIAG_CHECK -->|"人工复核"| HUMAN3["经营诊断复核节点"]

    HUMAN3 -->|"确认诊断"| REPORT
    HUMAN3 -->|"重做诊断"| DIAG

    REPORT --> END["END"]
```

## 3.4 节点说明

| 节点 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| 数据接入 Agent | 解析上传文件、识别字段与数据概况 | 文件路径、门店信息 | `raw_tables`、`detected_schema`、`file_profiles` |
| 数据清洗 Agent | 将原始数据转为标准结构并清理脏数据 | `raw_tables`、`field_mapping` | `cleaned_tables`、`clean_log`、`quality_issues` |
| 清洗验证 Agent | 计算质量分、判断是否可继续 | `cleaned_tables`、`quality_issues` | `quality_score`、是否重试/人工介入 |
| 指标计算 Agent | 构建事实表、聚合指标、生成图表 | `cleaned_tables` | `metrics`、`metric_tables`、`charts` |
| 指标验证 Agent | 校验公式、边界和口径一致性 | `metrics`、`metric_tables` | `metric_validation_errors` |
| 经营诊断 Agent | 检索知识、推理问题与建议 | `metrics`、`retrieved_knowledge` | `diagnosis_items`、`executive_summary` |
| 诊断验证 Agent | 校验证据充分性和可执行性 | `diagnosis_items`、`metrics` | `diagnosis_validation_errors` |
| 报告生成 Agent | 输出 Markdown/HTML/PDF/JSON 报告 | 全量状态 | `final_report_markdown`、`report_artifacts` |

## 3.5 条件分支逻辑

### 3.5.1 清洗验证节点

判断规则：

1. `quality_score >= 85` 时直接进入指标计算。
2. `70 <= quality_score < 85` 且重试次数未超限时，回到数据清洗节点做自动补救。
3. `quality_score < 70` 或出现关键字段缺失、营业日期无法解析、金额字段大面积异常时，触发人工干预。

### 3.5.2 指标验证节点

判断规则：

1. 营收、订单数、客流、会员数等核心字段均非负。
2. 转化率、毛利率、折扣率等比率型指标必须在允许边界内。
3. 核心分子分母缺失时禁止继续诊断。
4. 与上期相比变化超过设定阈值且无事件解释时，标记为需复核。

### 3.5.3 诊断验证节点

判断规则：

1. 每条问题结论必须至少绑定 2 个证据指标。
2. 每条建议必须是可执行动作，而非空泛描述。
3. 低置信度结论不得进入正式报告首页摘要。
4. 涉及活动效果、库存错配、人员排班等强业务判断时，如上下文证据不足则触发补充检索或人工复核。

## 3.6 人工干预节点设计

人工干预不是异常分支，而是业务可信度的一部分。系统需要明确支持三类人工操作：

1. 字段映射修正：运营或分析师确认 `销售额` 对应标准字段 `sales_amount`。
2. 数据修正确认：例如当天停电导致 POS 数据缺失，可手工标记为“不可比日”。
3. 诊断复核：例如系统判断“导购转化下降主要因为活动吸引低意向客群”，人工可补充线下陈列调整信息后重跑。

建议前端把人工干预结果保存为结构化操作日志，写回状态中的 `audit_log`，并持久化至审计表。

## 3.7 状态持久化与断点续跑机制

开发环境可用 SQLite Checkpointer，生产环境推荐 PostgreSQL Checkpointer。示例代码如下：

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import END, START, StateGraph

from app.state import DataClinicState
from app.nodes import (
    clean_node,
    clean_validate_node,
    diagnose_node,
    diagnosis_validate_node,
    ingest_node,
    metrics_node,
    metrics_validate_node,
    report_node,
)
from app.routing import route_after_clean, route_after_diagnosis, route_after_metrics


def build_graph(checkpointer: PostgresSaver):
    graph = StateGraph(DataClinicState)

    graph.add_node("ingest", ingest_node)
    graph.add_node("clean", clean_node)
    graph.add_node("clean_validate", clean_validate_node)
    graph.add_node("metrics", metrics_node)
    graph.add_node("metrics_validate", metrics_validate_node)
    graph.add_node("diagnose", diagnose_node)
    graph.add_node("diagnosis_validate", diagnosis_validate_node)
    graph.add_node("report", report_node)

    graph.add_edge(START, "ingest")
    graph.add_edge("ingest", "clean")
    graph.add_edge("clean", "clean_validate")
    graph.add_conditional_edges(
        "clean_validate",
        route_after_clean,
        {
            "clean": "clean",
            "metrics": "metrics",
            "human": END,
        },
    )
    graph.add_edge("metrics", "metrics_validate")
    graph.add_conditional_edges(
        "metrics_validate",
        route_after_metrics,
        {
            "metrics": "metrics",
            "diagnose": "diagnose",
            "human": END,
        },
    )
    graph.add_edge("diagnose", "diagnosis_validate")
    graph.add_conditional_edges(
        "diagnosis_validate",
        route_after_diagnosis,
        {
            "diagnose": "diagnose",
            "report": "report",
            "human": END,
        },
    )
    graph.add_edge("report", END)

    return graph.compile(checkpointer=checkpointer)
```

断点续跑要点：

1. 调用图时必须传入稳定的 `thread_id` 或 `job_id`。
2. 节点中的副作用操作必须幂等。
3. 任何文件写入、数据库写入、模型调用记录都应带任务上下文。
4. 重启进程后，只要检查点在，任务就可从最近成功超步恢复。

---

# 第4章 核心Agent模块详解

## 4.1 数据接入Agent

### 功能描述

数据接入 Agent 负责识别文件格式、抽取表结构、解析多 sheet、检测编码与日期格式，并把原始字段映射到统一零售标准字段体系。它的目标不是做深度清洗，而是把“不可读文件”转为“可理解表”。

### 核心算法逻辑

建议采用“四层识别”：

1. 文件层：识别文件格式、编码、sheet 名称、标题行位置。
2. 字段层：对列名做标准化，如去空格、去特殊符号、统一大小写。
3. 语义层：通过规则字典和大模型辅助映射标准字段。
4. 置信度层：为每个映射输出置信度，低于阈值时进入待确认列表。

### 字段自动映射实现

推荐字段映射策略：

1. 先规则后模型。
2. 先 exact match，再 synonym match，再 embedding / LLM match。
3. 高风险字段如日期、金额、门店编码、SKU 编码必须保守映射。

示例代码：

```python
from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Dict, List, Tuple


STANDARD_FIELDS = {
    "biz_date": ["日期", "营业日期", "交易日期", "date", "biz_date"],
    "store_id": ["门店编码", "店铺编码", "门店id", "store_id"],
    "sales_amount": ["销售额", "实收金额", "营业额", "gmv", "sales"],
    "order_count": ["订单数", "小票数", "交易单数", "orders"],
    "traffic": ["客流", "进店人数", "traffic"],
    "member_count": ["会员数", "会员成交人数", "members"],
    "sku_id": ["商品编码", "sku", "货号", "sku_id"],
    "qty": ["销量", "数量", "件数", "qty"],
}


@dataclass
class MappingResult:
    source_field: str
    target_field: str
    confidence: float


def normalize_text(text: str) -> str:
    return (
        text.strip()
        .lower()
        .replace(" ", "")
        .replace("_", "")
        .replace("-", "")
        .replace("（", "(")
        .replace("）", ")")
    )


def map_fields(source_fields: List[str]) -> Tuple[Dict[str, str], Dict[str, float], List[str]]:
    mapping: Dict[str, str] = {}
    confidence: Dict[str, float] = {}
    unmapped: List[str] = []

    for field in source_fields:
        norm_field = normalize_text(field)
        best_target = ""
        best_score = 0.0

        for target, aliases in STANDARD_FIELDS.items():
            for alias in aliases:
                score = SequenceMatcher(None, norm_field, normalize_text(alias)).ratio()
                if score > best_score:
                    best_target = target
                    best_score = score

        if best_score >= 0.82:
            mapping[field] = best_target
            confidence[field] = round(best_score, 4)
        else:
            unmapped.append(field)

    return mapping, confidence, unmapped
```

### 支持的数据格式

支持格式建议如下：

| 格式 | 用途 | 处理策略 |
| --- | --- | --- |
| `.xlsx` / `.xls` | 手工报表、门店台账 | 按 sheet 扫描并识别标题行 |
| `.csv` | 导出明细数据 | 自动识别编码与分隔符 |
| `.tsv` | 系统日志 | 按 tab 解析 |
| `.json` | 系统接口输出 | 递归展开记录 |
| `.parquet` | 历史归档数据 | 直接列式读取 |

### 关键注意事项

1. 映射阶段不要直接改值，只做识别和标准化。
2. 低置信字段必须保留原列名，便于人工复核。
3. 多 sheet 文件要保留 sheet 维度，不可提前合并。
4. 对日期、金额、门店编码字段应配置更高的人工确认门槛。

## 4.2 数据清洗Agent

### 功能描述

数据清洗 Agent 负责把原始记录转换为标准零售明细表，处理缺失、重复、异常格式、非法值、错位数据和口径冲突，并生成可审计的清洗代码与日志。

### 脏数据类型处理规则

典型脏数据规则如下：

| 脏数据类型 | 识别规则 | 处理策略 |
| --- | --- | --- |
| 空值 | 核心字段为空 | 尝试填补，不可填补则标记问题 |
| 日期异常 | 无法转为合法日期 | 进入问题清单 |
| 金额带符号 | 包含 `￥`、`,`、空格 | 去符号后转 decimal |
| 重复记录 | 主键组合重复 | 保留最新或聚合去重 |
| 负销量 | 退货场景外出现负值 | 标记异常并进入复核 |
| 字段错位 | 一列出现明显多类型混杂 | 触发重解析 |
| 编码异常 | 中文乱码 | 重新识别编码 |

### 清洗代码生成逻辑

建议采用“模板化生成 + 安全沙箱执行”的方式，不直接执行模型自由生成的任意代码。模型的角色是补充规则解释和生成候选修复策略，实际执行代码来自受控模板。

```python
from __future__ import annotations

import pandas as pd


def clean_sales_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    logs: list[str] = []
    data = df.copy()

    data.columns = [str(col).strip() for col in data.columns]
    logs.append(f"standardized_columns={data.columns.tolist()}")

    if "biz_date" in data.columns:
        data["biz_date"] = pd.to_datetime(data["biz_date"], errors="coerce").dt.date
        logs.append("converted_biz_date_to_date")

    for money_col in ["sales_amount", "discount_amount", "gross_profit"]:
        if money_col in data.columns:
            data[money_col] = (
                data[money_col]
                .astype(str)
                .str.replace(",", "", regex=False)
                .str.replace("￥", "", regex=False)
                .str.strip()
            )
            data[money_col] = pd.to_numeric(data[money_col], errors="coerce")
            logs.append(f"normalized_money_column={money_col}")

    for int_col in ["order_count", "traffic", "qty"]:
        if int_col in data.columns:
            data[int_col] = pd.to_numeric(data[int_col], errors="coerce")
            logs.append(f"normalized_numeric_column={int_col}")

    if {"store_id", "biz_date", "sku_id"}.issubset(data.columns):
        before = len(data)
        data = data.drop_duplicates(subset=["store_id", "biz_date", "sku_id"])
        logs.append(f"deduplicated_rows={before - len(data)}")

    logs.append(f"final_rows={len(data)}")
    return data, logs
```

### 清洗日志规范

清洗日志建议结构：

| 字段 | 含义 |
| --- | --- |
| `job_id` | 任务标识 |
| `node_name` | 节点名 |
| `action` | 清洗动作 |
| `target_field` | 涉及字段 |
| `affected_rows` | 影响行数 |
| `rule_id` | 规则编号 |
| `created_at` | 执行时间 |

### 关键注意事项

1. 清洗动作必须可追溯，不允许静默覆盖原始值。
2. 退货、冲销、跨天补录等业务特殊值应先建规则白名单。
3. 模型生成的解释可以用，模型自由生成的执行代码必须进沙箱且经过模板约束。
4. 清洗后要保留原始字段备查，不建议完全丢弃源字段。

## 4.3 清洗验证Agent

### 功能描述

清洗验证 Agent 负责判断数据是否已经达到可计算与可诊断标准，而不是简单统计报错数。它输出一个综合质量分，并决定是继续、自动重试还是转人工。

### 数据质量评分算法

推荐评分公式：

```text
质量评分 = 100
- 缺失惩罚分
- 类型异常惩罚分
- 重复数据惩罚分
- 关键字段缺失惩罚分
- 业务逻辑异常惩罚分
```

具体权重建议：

| 维度 | 权重 |
| --- | --- |
| 核心字段完整率 | 35 |
| 类型正确率 | 20 |
| 重复记录率 | 10 |
| 业务逻辑一致性 | 20 |
| 映射置信度 | 15 |

### 重试/人工干预触发条件

自动重试触发条件：

1. 列名可识别但日期/金额格式转换失败。
2. 编码错误、sheet 标题行识别错误。
3. 规则可修复型异常占比高，但关键字段未丢失。

人工干预触发条件：

1. 门店编码无法识别。
2. 日期字段大面积缺失。
3. 业务主表缺少核心指标分子或分母。
4. 规则重试 2 次后仍未通过。

### 关键注意事项

1. 验证 Agent 要关注是否“足以支持后续计算”，而不仅是是否“绝对完美”。
2. 评分阈值必须与业务风险匹配，高价值报表要更严格。
3. 重试逻辑要记录原因，避免循环空转。
4. 人工介入时应展示最关键的 5 个问题，而不是把所有脏数据一次性抛给用户。

## 4.4 指标计算Agent

### 功能描述

指标计算 Agent 负责把清洗后的明细表转换为可诊断的经营指标体系。推荐将计算分为三层：

1. 明细标准层：如交易明细、商品明细、客流明细。
2. 事实聚合层：按门店、日期、时段、品类聚合。
3. 指标表现层：输出最终指标值、同环比、排名、异常标记和图表数据。

### 核心指标库

#### 营收类指标

| 指标 | 公式 |
| --- | --- |
| 销售额 | `sum(sales_amount)` |
| 毛利额 | `sum(gross_profit)` |
| 毛利率 | `gross_profit / sales_amount` |
| 折扣额 | `sum(discount_amount)` |
| 折扣率 | `discount_amount / tag_amount` |
| 客单价 | `sales_amount / order_count` |

#### 客流类指标

| 指标 | 公式 |
| --- | --- |
| 客流 | `sum(traffic)` |
| 成交人数 | `sum(buyer_count)` |
| 转化率 | `buyer_count / traffic` |
| 连带率 | `sales_qty / order_count` |
| 坪效 | `sales_amount / area_m2` |

#### 商品类指标

| 指标 | 公式 |
| --- | --- |
| 销量 | `sum(qty)` |
| SKU 动销率 | `active_sku_count / total_sku_count` |
| 售罄率 | `sold_out_sku_count / active_sku_count` |
| Top SKU 贡献度 | `top_sku_sales / total_sales` |
| 新品贡献率 | `new_product_sales / total_sales` |

#### 会员与活动类指标

| 指标 | 公式 |
| --- | --- |
| 会员销售占比 | `member_sales / sales_amount` |
| 会员渗透率 | `member_buyer_count / buyer_count` |
| 活动拉新率 | `new_member_count / campaign_traffic` |
| 活动转化率 | `campaign_buyer_count / campaign_traffic` |

### DuckDB加速实现原理

DuckDB 适合本项目的原因在于：

1. 可直接查询 Pandas DataFrame。
2. 列式执行对聚合统计效率高。
3. 适合中等数据量下的本地分析和嵌入式部署。

示例代码：

```python
from __future__ import annotations

import duckdb
import pandas as pd


def calculate_daily_metrics(sales_df: pd.DataFrame) -> pd.DataFrame:
    con = duckdb.connect(database=":memory:")
    con.register("sales", sales_df)

    sql = """
    with base as (
        select
            store_id,
            biz_date,
            sum(coalesce(sales_amount, 0)) as sales_amount,
            sum(coalesce(gross_profit, 0)) as gross_profit,
            sum(coalesce(order_count, 0)) as order_count,
            sum(coalesce(traffic, 0)) as traffic,
            sum(coalesce(qty, 0)) as qty
        from sales
        group by 1, 2
    )
    select
        store_id,
        biz_date,
        sales_amount,
        gross_profit,
        case when sales_amount = 0 then 0 else gross_profit / sales_amount end as gross_margin_rate,
        order_count,
        traffic,
        case when order_count = 0 then 0 else sales_amount / order_count end as ticket_size,
        case when traffic = 0 then 0 else order_count / traffic end as conversion_rate,
        case when order_count = 0 then 0 else qty / order_count end as attachment_rate
    from base
    order by biz_date asc
    """
    return con.execute(sql).df()
```

### 可视化图表生成规范

建议统一图表规范：

1. 趋势类使用折线图。
2. 结构类使用横向条形图或堆叠柱图。
3. 异常比较使用带阈值参考线的折线图。
4. 颜色语义固定：良好绿色、预警橙色、异常红色。

### 关键注意事项

1. 指标口径必须版本化，不能在代码中隐式变更。
2. 分母为零时必须定义显式行为，不能返回 `NaN` 混入报告。
3. 同比与环比要明确对齐粒度，避免跨节假日误判。
4. 图表数据与表格数据必须同源，禁止双套逻辑。

## 4.5 指标验证Agent

### 功能描述

指标验证 Agent 负责确认计算结果“在数学上成立、在业务上合理、在口径上自洽”。它本质上是一个规则引擎，不应过度依赖大模型判断。

### 指标合理性校验规则

推荐规则示例：

| 规则编号 | 规则内容 |
| --- | --- |
| M001 | 销售额不得小于 0，退货场景必须有退货标记 |
| M002 | 转化率必须在 0 到 1 之间 |
| M003 | 毛利率通常在 -1 到 1 之间，超限需复核 |
| M004 | 连带率通常大于等于 0 |
| M005 | 会员销售额不能超过总销售额 |
| M006 | 门店日客流为 0 时不应存在高成交笔数，除非是补录单 |
| M007 | 活动转化率异常高时需检查活动客流分母口径 |

### 关键注意事项

1. 指标验证优先使用规则与阈值，不把公式正确性交给模型。
2. 阈值应支持按业态、门店类型、城市级别配置。
3. 对异常但可能合理的结果要打标签而不是直接删除。
4. 验证错误信息要便于业务理解，如“客流为 0 但订单数为 52”。

## 4.6 经营诊断Agent

### 功能描述

经营诊断 Agent 是系统核心，负责基于指标结果、历史对比、门店上下文和零售知识库，输出结构化的经营问题、根因分析和可执行建议。该 Agent 的关键不是“说得像分析师”，而是“结论有证据、逻辑可复核、建议可执行”。

### RAG知识库构建方案

知识库建议按四层构建：

1. 业务规则层：指标口径、门店分类、活动规则、库存周转规则。
2. 经营经验层：常见问题及根因模式，如“高客流低转化”“高销售低毛利”。
3. 行动建议层：不同问题对应动作库，如陈列、排班、导购话术、补货策略。
4. 案例复盘层：历史门店诊断案例、活动复盘结论、优秀门店做法。

知识库文档推荐统一采用 Markdown 或 JSONL，每个知识块包含如下字段：

| 字段 | 含义 |
| --- | --- |
| `doc_id` | 文档编号 |
| `title` | 标题 |
| `business_scene` | 场景，如日常经营、活动复盘、库存优化 |
| `metric_signals` | 对应指标信号 |
| `root_cause_patterns` | 常见根因模式 |
| `recommended_actions` | 建议动作 |
| `applicable_scope` | 适用业态或门店类型 |
| `source` | 来源，如运营手册、优秀案例 |
| `updated_at` | 更新时间 |

知识库切分建议：

1. 每个 chunk 控制在 300 到 800 中文字。
2. 一个 chunk 只表达一个问题模式。
3. 对阈值类信息使用结构化字段单独存储。

知识示例：

```json
{
  "doc_id": "retail_diag_001",
  "title": "高客流低转化问题诊断模板",
  "business_scene": "门店日常经营",
  "metric_signals": [
    "traffic_up",
    "conversion_rate_down",
    "ticket_size_flat_or_down"
  ],
  "root_cause_patterns": [
    "活动引流客群与商品匹配度不足",
    "高峰时段导购接待不足",
    "陈列动线不清晰导致进店未触达主推商品"
  ],
  "recommended_actions": [
    "核查 11:00-14:00、18:00-21:00 的排班与成交分布",
    "重新检查入口 5 米范围主推陈列与价格牌",
    "拆分活动客流与自然客流后重算转化率"
  ],
  "applicable_scope": "购物中心女装门店",
  "source": "区域营运手册 v2026Q2",
  "updated_at": "2026-05-20"
}
```

### 诊断推理逻辑

推荐采用三段式推理：

1. 问题识别：从指标中找出显著偏离、连续下滑和结构失衡。
2. 根因分析：结合知识库、门店背景与业务规则，对每个问题生成 2 到 4 个候选根因。
3. 建议生成：根据根因映射行动方案，并给出优先级、责任角色、观察指标和预期周期。

示例提示词框架：

```text
你是零售经营诊断专家。请严格基于输入指标、门店背景与检索知识输出 JSON。

要求：
1. 每条问题必须引用至少两个证据指标。
2. 结论不能脱离证据猜测。
3. 建议必须是门店经理 7 天内可执行的动作。
4. 输出字段包括 problems, summary, risks, pending_checks。
```

### 结构化输出格式

建议使用 JSON Output：

```json
{
  "summary": "本周门店销售下降主要由高客流低转化与高折扣低毛利共同导致。",
  "problems": [
    {
      "problem_id": "P001",
      "title": "高客流低转化",
      "evidence_metrics": ["traffic", "conversion_rate", "ticket_size"],
      "root_causes": [
        "活动客流质量偏低",
        "晚高峰导购接待不足"
      ],
      "actions": [
        "晚高峰增加 1 名导购并复盘高峰时段成交分布",
        "将入口活动货架改为高转化主推组合"
      ],
      "priority": "P1",
      "confidence": 0.86,
      "need_manual_check": false
    }
  ],
  "risks": ["若不调整，周末大客流仍难转化为有效销售"],
  "pending_checks": ["确认活动客流统计是否含路过人流"]
}
```

### 关键注意事项

1. 经营诊断不能只看单日，要至少结合趋势和对比基线。
2. 诊断提示词必须要求引用证据指标，避免模型泛化胡猜。
3. 知识库必须版本化，并对建议动作维护生效日期。
4. 对低置信或证据不足结论必须显式输出“待核实事项”。

## 4.7 诊断验证Agent

### 功能描述

诊断验证 Agent 用于给经营诊断做“质量门控”。它不重新生成结论，而是判断结论是否满足上线标准。

### 诊断结果质量评估标准

推荐评估维度：

| 维度 | 说明 | 通过标准 |
| --- | --- | --- |
| 证据充分性 | 问题是否有指标支撑 | 每条问题至少 2 个指标证据 |
| 根因合理性 | 根因是否与场景相符 | 不得与输入指标矛盾 |
| 建议可执行性 | 是否是可落地动作 | 7 天内可执行 |
| 业务语言清晰度 | 是否易懂 | 避免纯模型术语 |
| 风险提示完整性 | 是否说明假设前提 | 有待核实项时必须列出 |

### 关键注意事项

1. 验证节点可混合规则引擎与轻量模型复核，但规则为主。
2. “建议太空泛”是最常见失败原因，应重点拦截。
3. 诊断验证结果要分层，允许部分通过、部分退回。
4. 首页摘要只能展示通过验证的问题结论。

## 4.8 报告生成Agent

### 功能描述

报告生成 Agent 负责将结构化状态对象转为面向业务用户可阅读的诊断报告。建议报告分为执行摘要、问题明细、图表证据、行动建议、风险与待核实项五部分。

### 报告模板设计

推荐模板结构：

1. 报告头：门店、周期、生成时间、版本号。
2. 执行摘要：一句话结论与 TOP3 问题。
3. 指标总览：营收、客流、转化、客单、毛利等核心指标卡片。
4. 诊断正文：每个问题对应证据、根因、建议。
5. 风险与待核实事项：明确边界。
6. 附录：数据质量评分、数据来源、口径说明。

### 多格式导出实现

建议支持四类导出：

1. Markdown：作为标准中间格式。
2. HTML：前端直接展示。
3. PDF：管理层分享与归档。
4. JSON：供其他系统消费。

报告渲染示例：

```python
from __future__ import annotations

from pathlib import Path

from app.state import DataClinicState


def render_markdown_report(state: DataClinicState, output_dir: str) -> str:
    lines: list[str] = []
    lines.append(f"# {state.store_id} 门店AI数据门诊报告")
    lines.append("")
    lines.append(f"- 任务ID：{state.job_id}")
    lines.append(f"- 数据质量分：{state.quality_score}")
    lines.append("")
    lines.append("## 执行摘要")
    lines.append(state.executive_summary or "暂无摘要")
    lines.append("")
    lines.append("## 经营问题")

    for item in state.diagnosis_items:
        lines.append(f"### {item.title}")
        lines.append(item.summary)
        lines.append("")
        lines.append("证据指标：")
        for metric in item.evidence_metrics:
            lines.append(f"- {metric}")
        lines.append("")
        lines.append("根因分析：")
        for cause in item.root_causes:
            lines.append(f"- {cause}")
        lines.append("")
        lines.append("建议动作：")
        for action in item.actions:
            lines.append(f"- {action}")
        lines.append("")

    content = "\n".join(lines)
    output_path = Path(output_dir) / f"{state.job_id}.md"
    output_path.write_text(content, encoding="utf-8")
    return content
```

### 关键注意事项

1. 报告与状态对象必须一一对应，方便追溯。
2. 结论页只能展示通过验证的诊断结果。
3. PDF 导出建议复用 HTML 渲染，避免多套模板。
4. 报告必须显式写明数据质量分与待核实项，防止误用。

---

# 第5章 DeepSeek-V4模型集成与优化

## 5.1 DeepSeek-V4模型特性与优势

根据 2026 年 4 月 24 日 DeepSeek 官方更新，`deepseek-v4-pro` 与 `deepseek-v4-flash` 已成为推荐模型入口，支持 1M 上下文、Thinking/Non-Thinking 双模式、JSON Output、Tool Calls、Chat Prefix Completion 与 OpenAI 兼容调用方式。对于本项目，最关键的能力有：

1. 长上下文：可一次性输入较长的门店背景、指标明细、历史摘要和知识检索结果。
2. JSON 输出：适合生成结构化诊断结果。
3. 工具调用：适合受控调用指标查询、知识检索、规则检查等工具。
4. 上下文缓存：适合门店多轮复盘与同一批报告的批处理。

## 5.2 API调用配置

```python
from __future__ import annotations

import json
import os
from typing import Any, Dict

from openai import OpenAI


def build_deepseek_client() -> OpenAI:
    return OpenAI(
        api_key=os.environ["DEEPSEEK_API_KEY"],
        base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    )


def run_structured_diagnosis(payload: Dict[str, Any]) -> Dict[str, Any]:
    client = build_deepseek_client()
    messages = [
        {
            "role": "system",
            "content": (
                "You are a retail diagnosis expert. "
                "Return valid JSON only. "
                "Each problem must cite at least two evidence metrics."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(payload, ensure_ascii=False),
        },
    ]

    response = client.chat.completions.create(
        model=os.getenv("DEEPSEEK_DIAGNOSIS_MODEL", "deepseek-v4-pro"),
        messages=messages,
        response_format={"type": "json_object"},
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}},
        stream=False,
    )
    return json.loads(response.choices[0].message.content)
```

## 5.3 不同环节的温度参数设置策略

| 环节 | 建议模型 | 温度策略 |
| --- | --- | --- |
| 字段映射解释 | `deepseek-v4-flash` | `0.1`，强调稳定 |
| 清洗规则建议 | `deepseek-v4-flash` | `0.2`，允许少量灵活性 |
| 诊断推理 | `deepseek-v4-pro` | `0.2` 到 `0.4` |
| 报告总结 | `deepseek-v4-pro` | `0.3` |

本项目整体不建议高温度，因为目标是稳定、可复盘，不是创意生成。

## 5.4 工具调用最佳实践

推荐只开放有限工具：

1. `query_metrics`
2. `retrieve_knowledge`
3. `get_store_profile`
4. `lookup_holiday_calendar`
5. `mark_manual_review`

工具调用原则：

1. 工具名语义清晰。
2. 参数严格 JSON Schema 化。
3. 高风险工具必须走人工审批。

## 5.5 大上下文窗口利用技巧

1. 将稳定前缀放在系统消息与基础上下文中，便于触发缓存命中。
2. 对历史报告做摘要压缩，而不是直接堆满原文。
3. 把指标明细与知识检索结果分块组织，保留标题和元数据。
4. 对诊断阶段仅注入必要证据，不把所有原始明细直接塞给模型。

## 5.6 成本控制方案

DeepSeek 官方页面显示，`deepseek-v4-flash` 与 `deepseek-v4-pro` 均支持 1M 上下文和缓存计费，适合本项目做分层模型策略。建议：

1. 字段识别、摘要压缩、轻量解释使用 `deepseek-v4-flash`。
2. 仅在最终诊断与管理摘要环节使用 `deepseek-v4-pro`。
3. 固定前缀上下文模板化，提升缓存命中率。
4. 对检索结果先做规则裁剪，减少无效 token。

按官方单价估算，若一次门店完整诊断平均使用：

- `flash` 输入 20 万 tokens、输出 2 万 tokens
- `pro` 输入 4 万 tokens、输出 8 千 tokens

则单次成本可按下式估算：

```text
flash 成本 ≈ 输入 tokens × cache miss/hit 单价 + 输出 tokens 单价
pro 成本 ≈ 输入 tokens × 单价 + 输出 tokens 单价
总成本 = flash 成本 + pro 成本
```

生产上应将“单店单次诊断 token 用量”纳入监控，设置每日预算阈值。

---

# 第6章 工具层与数据层设计

## 6.1 代码执行安全隔离方案

数据清洗与规则修复往往涉及动态代码执行，因此必须做安全隔离。推荐方案如下：

1. 宿主应用只负责生成受控脚本。
2. 实际脚本在隔离 Docker 容器中执行。
3. 容器启用只读根文件系统、禁网、CPU/内存限制、执行超时。
4. 仅挂载任务临时目录和只读输入数据目录。

隔离容器关键约束：

| 控制项 | 建议 |
| --- | --- |
| 网络 | `network_mode: none` |
| 权限 | 非 root 用户 |
| 文件系统 | `read_only: true` |
| CPU | 限制为 `1` |
| 内存 | 限制为 `1g` |
| 超时 | 60 秒 |

## 6.2 零售行业知识库构建

知识库来源建议：

1. 门店运营手册。
2. 商品陈列 SOP。
3. 区域优秀案例复盘。
4. 活动执行标准。
5. 历史人工诊断报告。

构建流程建议：

1. 文档采集与脱敏。
2. 按问题模式切块。
3. 补充结构化标签。
4. 入库并建立向量索引。
5. 通过人工抽样校验知识块质量。

## 6.3 数据处理工具链

推荐职责划分：

| 工具 | 职责 |
| --- | --- |
| Pandas | 读写文件、列清洗、规则修复 |
| DuckDB | 聚合、窗口、透视与指标计算 |
| Great Expectations | 质量校验与验证报告 |

## 6.4 数据存储方案

开发环境使用 SQLite，生产环境使用 PostgreSQL。

| 存储 | 用途 |
| --- | --- |
| SQLite | 本地开发、单机演示、轻量历史记录 |
| PostgreSQL | 生产任务、检查点、诊断历史、审计表 |
| 文件存储 | 原始上传、导出报告、图表缓存 |

## 6.5 数据备份与恢复策略

1. PostgreSQL 每日全量备份，每小时 WAL 归档。
2. 报告与原始文件对象存储保留 180 天。
3. LangGraph 检查点至少保留最近 30 天任务。
4. 恢复演练每月进行一次，验证数据库、文件、检查点的联动恢复。

---

# 第7章 前端界面设计

## 7.1 前端角色定位

首期前端不承担复杂业务编排，而是承担“品牌接入、任务运营、人工协同、问题闭环”四类产品职责。界面设计目标不是做一个大而全的数据看板，而是让品牌管理员快速完成以下判断：

1. 当前有哪些任务正在运行，是否按 SLA 推进。
2. 哪些任务进入 `waiting_human`，阻塞原因是什么。
3. 哪些问题卡需要先被处理，当前由谁负责。
4. 某次诊断结果与历史版本相比发生了什么可感知变化。

因此，前端整体采用“门诊指挥台型”设计，而非传统 BI 大盘。整体原则如下：

1. 先展示状态与异常，再展示图表与历史趋势。
2. 先支持任务协同，再支持结果浏览。
3. 前端尽量固定导航结构，减少用户在高频页面中的认知切换。
4. 结论、证据、动作必须在同一操作链路中形成闭环。

## 7.2 信息架构与布局骨架

### 7.2.1 一级导航结构

建议设置六个一级入口：

1. 首页指挥台
2. 品牌接入
3. 批量上传
4. 任务总览
5. 人工确认台
6. 卡片闭环

结果详情页、批次详情页和人工确认详情页不作为一级导航，而作为从任务列表、卡片列表或首页摘要进入的二级下钻页面。

### 7.2.2 页面布局骨架

界面统一采用以下布局逻辑：

1. 左侧为固定主导航，承载页面切换与全局入口。
2. 顶部为品牌上下文、日期上下文、搜索和用户信息。
3. 页面主体优先采用“摘要条 + 列表主区 + 详情侧板”的结构。
4. 对高频运营页面优先使用列表与详情并置，而不是拆成多个独立页面。

推荐骨架如下：

```text
+--------------------------------------------------------------+
| 顶部上下文条: 品牌切换 | 时间范围 | 搜索 | 用户              |
+-----------+--------------------------------------------------+
| 左侧导航  | 首屏摘要 / 筛选区                                |
|           +--------------------------------------------------+
|           | 主列表 / 主卡片区            | 详情侧板 / 操作区  |
|           |                              |                    |
|           +--------------------------------------------------+
|           | 日志、版本差异、处理记录等次级信息区             |
+-----------+--------------------------------------------------+
```

## 7.3 视觉系统与交互规范

### 7.3.1 视觉语言

1. 采用浅色主题，背景使用中性灰白，保证长时间任务操作的可读性。
2. 主强调色使用蓝绿系，仅承担主按钮、当前选中和关键可操作状态。
3. 红色用于高风险和失败状态，橙色用于待确认和临近 SLA，绿色用于完成和通过，灰色用于排队与低优先级信息。
4. 卡片圆角、标签样式、表格状态色和按钮层级在所有页面保持一致。

### 7.3.2 信息层级

1. 首屏只放行动相关摘要，不放大面积装饰性趋势图。
2. KPI 只展示能直接驱动操作的指标，例如待确认数、超 SLA 数、运行中任务数。
3. 图表只出现在需要解释趋势或差异的页面中，不作为所有页面默认组件。

### 7.3.3 关键交互规则

1. 所有状态变更必须有明确视觉反馈，包括 toast、状态标签变化和操作记录写入。
2. 任一异常摘要都必须可点击下钻到对应列表，并自动带上筛选条件。
3. 人工介入入口固定出现在任务详情和问题卡详情的高可见区域，避免用户在多个 tab 中寻找。
4. 报告中的每条建议应支持一键带入卡片闭环或复制到任务清单。
5. 长列表统一采用筛选 + 列表 + 详情侧板结构，避免用户进入详情页后失去列表上下文。

## 7.4 关键页面设计

### 7.4.1 首页指挥台

首页面向品牌管理员，承担值班和分诊职责，不等同于传统经营报表首页。建议分四层内容：

1. 今日摘要层：运行中任务数、待人工确认数、超 SLA 数、已完成数。
2. 批次监控层：最近批次列表，展示完成率、等待人工数和最近更新时间。
3. 异常与待办层：高优先级异常任务和最新待确认任务双列展示。
4. 快捷动作层：发起批量上传、进入人工确认台、查看高优先级卡片、继续品牌接入。

### 7.4.2 品牌接入页

品牌接入页采用四步式向导：

1. 品牌基础信息。
2. 日报与周报命名模板配置。
3. 样例文件上传与文件画像展示。
4. 接入确认结果，包括字段映射、指标试算和预览问题卡。

该页重点是降低接入复杂度并保留修改痕迹，因此每一步都应支持保存草稿和回看。

### 7.4.3 批量上传页

批量上传页分为三段：

1. 批次配置区：品牌、诊断类型、优先级、备注。
2. 上传与校验区：拖拽上传、文件名规则预校验、归类结果。
3. 提交预览区：预计生成的门店任务数、异常文件数和风险提示。

页面强调低误提交，命名错误和重复文件尽量在当前页修正，不要求用户跳转到其他页面。

### 7.4.4 任务总览页

任务总览页采用 master-detail 结构：

1. 主区展示门店任务列表，默认按最近更新时间和优先级排序。
2. 侧板展示当前任务阶段、最近日志、规则版本、等待人工原因和结果入口。
3. 上方保留品牌、任务状态、诊断类型、图内阶段、是否超 SLA 等高频筛选项。

任务总览页是运营主战场，重点是快速发现异常、判断去向、进入下游页面。

### 7.4.5 人工确认台

人工确认台采用三栏结构：

1. 左栏为待确认分类队列。
2. 中栏为任务队列，展示等待原因、等待时长和优先级。
3. 右栏为确认详情区，按字段映射确认、数据质量确认、诊断复核确认三类场景切换不同操作模块。

页面底部统一提供“保存并继续等待”“提交确认并恢复执行”“标记失败并转线下处理”三个动作。

### 7.4.6 卡片闭环页

卡片闭环页采用“列表区 + 卡片详情区 + 处理记录区”三段结构：

1. 列表区负责排序、筛选和定位问题卡。
2. 详情区展示问题摘要、证据子卡、建议动作和风险说明。
3. 处理记录区展示状态时间线、反馈记录、图片附件和驳回原因。

该页面的核心是问题执行，而不是报告阅读，因此按钮和状态流转应比图表优先级更高。

### 7.4.7 结果详情页

结果详情页为二级下钻页，建议按以下四层组织：

1. 任务摘要：任务信息、诊断类型、执行耗时、规则版本、质量分。
2. 问题主卡：按优先级和主题展示结论。
3. 证据展开：查看指标值、基线值、波动率、解释说明和关键日志。
4. 版本差异：切换历史结果版本，查看新增卡片、消失卡片和变化卡片。

结果详情页必须遵循“先结论、后证据、再差异”的结构，避免用户在大量原始数据中迷失。

## 7.5 Streamlit 落地建议

### 7.5.1 官方能力选型

结合 Streamlit 官方能力，推荐以下实现方式：

1. 使用 `st.navigation` 与 `st.Page` 组织多页面导航，保持六个一级入口稳定。
2. 使用 `st.sidebar` 承载主导航、快捷筛选和品牌切换。
3. 使用 `st.columns`、`st.container`、`st.tabs` 和 `st.expander` 组织摘要、列表和证据分层。
4. 使用 `st.metric` 承载首页与任务页核心摘要指标。
5. 使用 `st.status`、`st.progress`、`st.spinner`、`st.toast` 承担任务状态反馈。
6. 对于状态标签、表格行高亮、卡片容器等原生能力不足的部分，使用主题变量加轻量 CSS 增强。

### 7.5.2 主题与样式建议

推荐在 `.streamlit/config.toml` 中统一主题，并通过 CSS 变量扩展局部组件样式：

```toml
[theme]
base = "light"
primaryColor = "#0f766e"
backgroundColor = "#f6f7f8"
secondaryBackgroundColor = "#ffffff"
textColor = "#17202a"
baseRadius = "0.75rem"
```

实现上应遵循两个原则：

1. 尽量使用 Streamlit 官方主题变量，保证后续维护成本可控。
2. 只对状态标签、主卡容器、详情侧板做定向样式增强，不大规模重写原生控件。

### 7.5.3 推荐页面骨架示例

```python
import streamlit as st

st.set_page_config(
    page_title="门店AI数据门诊",
    page_icon=":material/monitoring:",
    layout="wide",
)

home = st.Page("pages/home.py", title="首页指挥台", icon=":material/dashboard:", default=True)
onboarding = st.Page("pages/onboarding.py", title="品牌接入", icon=":material/storefront:")
upload = st.Page("pages/upload.py", title="批量上传", icon=":material/upload_file:")
tasks = st.Page("pages/tasks.py", title="任务总览", icon=":material/list_alt:")
review = st.Page("pages/review.py", title="人工确认台", icon=":material/fact_check:")
cards = st.Page("pages/cards.py", title="卡片闭环", icon=":material/task:")

pg = st.navigation(
    {
        "运营入口": [home, upload, tasks, review, cards],
        "配置入口": [onboarding],
    }
)
pg.run()
```

### 7.5.4 实施约束

1. 首期优先保证导航清晰、筛选有效、状态反馈及时，不追求复杂动画。
2. 列表、卡片、详情侧板的数据结构必须与后端任务模型和卡片模型一一对应，避免前端再做语义拼装。
3. 对人工确认台、卡片闭环页和结果详情页应优先做桌面端体验，移动端只保证可浏览，不作为首期核心操作端。

---

# 第8章 部署指南

## 8.1 开发环境搭建

推荐开发环境：

1. Windows 11 / macOS / Ubuntu 22.04+
2. Python 3.14.5
3. Docker Engine 29.3.1
4. PostgreSQL 18.4

完整步骤：

1. 安装 Python 3.14.5。
2. 创建虚拟环境：`python -m venv .venv`
3. 激活虚拟环境。
4. 安装依赖：`pip install -r requirements.txt`
5. 准备 `.env` 环境变量。
6. 启动 PostgreSQL 与应用。

## 8.2 依赖包列表

```txt
langgraph==1.2.4
langgraph-checkpoint==4.1.1
langgraph-checkpoint-postgres==3.1.0
langgraph-checkpoint-sqlite==3.1.0
openai==2.41.0
pandas==3.0.3
duckdb==1.5.3
great-expectations==1.18.0
streamlit==1.58.0
psycopg[binary]>=3.2,<4
pydantic>=2.11,<3
python-dotenv>=1.1,<2
openpyxl>=3.1,<4
pyarrow>=20,<22
plotly>=6,<7
jinja2>=3.1,<4
pytest>=8,<9
pytest-asyncio>=1,<2
```

## 8.3 Docker Compose部署方案

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: data-clinic-app
    ports:
      - "8501:8501"
    env_file:
      - .env
    depends_on:
      - postgres
    volumes:
      - ./data:/app/data
      - ./reports:/app/reports
      - ./logs:/app/logs
    restart: unless-stopped

  postgres:
    image: postgres:18
    container_name: data-clinic-postgres
    environment:
      POSTGRES_DB: data_clinic
      POSTGRES_USER: clinic_user
      POSTGRES_PASSWORD: clinic_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  sandbox:
    image: python:3.14-slim
    container_name: data-clinic-sandbox
    command: ["sleep", "infinity"]
    network_mode: "none"
    read_only: true
    tmpfs:
      - /tmp:size=256m
    mem_limit: 1g
    cpus: 1.0
    user: "1000:1000"
    restart: unless-stopped

volumes:
  postgres_data:
```

推荐 `Dockerfile`：

```dockerfile
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8501

CMD ["streamlit", "run", "streamlit_app.py", "--server.address=0.0.0.0", "--server.port=8501"]
```

## 8.4 环境变量配置说明

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_ENV` | `dev` | 运行环境 |
| `DEEPSEEK_API_KEY` | 无 | DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API 地址 |
| `DEEPSEEK_MAPPING_MODEL` | `deepseek-v4-flash` | 字段映射模型 |
| `DEEPSEEK_DIAGNOSIS_MODEL` | `deepseek-v4-pro` | 经营诊断模型 |
| `POSTGRES_DSN` | `postgresql://clinic_user:clinic_pass@postgres:5432/data_clinic` | PostgreSQL 连接串 |
| `REPORT_DIR` | `/app/reports` | 报告目录 |
| `UPLOAD_DIR` | `/app/data/uploads` | 上传目录 |
| `MAX_RETRY_COUNT` | `2` | 最大自动重试次数 |
| `QUALITY_PASS_SCORE` | `85` | 清洗验证通过阈值 |

`.env` 示例：

```env
APP_ENV=prod
DEEPSEEK_API_KEY=sk-xxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MAPPING_MODEL=deepseek-v4-flash
DEEPSEEK_DIAGNOSIS_MODEL=deepseek-v4-pro
POSTGRES_DSN=postgresql://clinic_user:clinic_pass@postgres:5432/data_clinic
REPORT_DIR=/app/reports
UPLOAD_DIR=/app/data/uploads
MAX_RETRY_COUNT=2
QUALITY_PASS_SCORE=85
```

## 8.5 生产环境部署注意事项

1. 应用容器与沙箱容器应部署在同一私有网络。
2. `DEEPSEEK_API_KEY` 必须通过密钥管理服务注入。
3. PostgreSQL 建议启用主从或定时备份。
4. 报告目录建议挂载对象存储或持久卷。
5. 生产环境 Streamlit 建议前置 Nginx 做反向代理与鉴权。

## 8.6 服务器配置要求与成本估算

推荐配置按规模分为三档：

| 规模 | 典型并发 | 建议配置 | 适用场景 |
| --- | --- | --- | --- |
| 轻量版 | 1-3 个任务 | 2 vCPU / 4GB / 80GB | 试点门店、单区域 PoC |
| 标准版 | 3-10 个任务 | 4 vCPU / 8GB / 160GB | 小规模生产 |
| 进阶版 | 10-30 个任务 | 8 vCPU / 16GB / 300GB | 多区域门店并发诊断 |

成本估算建议分为三部分：

1. 服务器成本：以云主机和数据库为主。
2. 存储成本：原始文件、报告、备份。
3. 模型调用成本：按门店诊断次数与 token 消耗计费。

公开价格参考：

1. AWS Lightsail 官方文档显示，`2 vCPU / 4GB` Linux 实例月费为 `24 USD`，`2 vCPU / 8GB` Linux 实例月费为 `44 USD`。
2. 腾讯云官网公开显示，轻量应用服务器促销价可低至 `99 元/年` 起；CVM 官方价格页强调 CPU/内存、磁盘、带宽分开计费，生产成本应以购买页实时计算器为准。

对于本项目，若采用“标准版应用机 + PostgreSQL 独立实例 + 日常单店批量诊断”的部署方式，建议预算拆分如下：

1. 试点环境：服务器与存储月成本约数百元人民币级别，适合 5 到 20 家门店。
2. 小规模生产：服务器与数据库月成本约千元人民币级别，适合 20 到 100 家门店。
3. 大规模生产：需结合任务队列、对象存储、数据库高可用，成本按实际并发上浮。

### 常见坑与解决方案

| 常见坑 | 表现 | 解决方案 |
| --- | --- | --- |
| DeepSeek Key 未注入 | 启动时报鉴权错误 | 在容器启动前做环境检查 |
| PostgreSQL 表未初始化 | 检查点写入失败 | 首次启动执行 `checkpointer.setup()` |
| 沙箱容器有网络权限 | 存在安全风险 | 使用 `network_mode: none` |
| Streamlit 被代理后静态资源异常 | 页面白屏 | 配置反向代理头与 websocket |
| Windows Docker 路径挂载失败 | 报告目录不可写 | 统一使用项目内相对目录挂载 |

---

# 第9章 测试方案

## 9.1 单元测试

单元测试覆盖点：

1. 字段映射函数。
2. 清洗规则函数。
3. 指标公式函数。
4. 诊断输出解析器。
5. 条件路由函数。

示例：

```python
from app.mapping import map_fields


def test_map_fields_should_map_common_sales_columns():
    mapping, confidence, unmapped = map_fields(["销售额", "门店编码", "营业日期"])
    assert mapping["销售额"] == "sales_amount"
    assert mapping["门店编码"] == "store_id"
    assert mapping["营业日期"] == "biz_date"
    assert not unmapped
```

## 9.2 集成测试

集成测试要验证整条 LangGraph 工作流：

1. 从上传样例数据到报告生成全链路通过。
2. 清洗失败后触发自动重试。
3. 指标验证失败后正确回退。
4. 人工介入后能够恢复执行。

## 9.3 性能测试

建议按数据规模压测：

| 数据量 | 目标耗时 |
| --- | --- |
| 1 万行 | 30 秒内 |
| 10 万行 | 2 分钟内 |
| 50 万行 | 5 分钟内 |

## 9.4 准确性测试

准确性测试应采用“人工标注基准集”：

1. 选取 50 到 100 份真实门店数据。
2. 由资深分析师输出标准诊断。
3. 比较系统输出的问题识别、根因方向和建议可执行性。

## 9.5 安全测试

1. 沙箱逃逸测试。
2. 恶意文件上传测试。
3. 路径穿越测试。
4. API Key 泄漏检查。
5. 审计日志完整性测试。

---

# 第10章 运维与监控

## 10.1 系统监控指标

建议监控以下指标：

1. 任务成功率。
2. 各节点平均耗时。
3. 自动重试率。
4. 人工介入率。
5. 模型调用 token 用量。
6. 报告生成失败率。

## 10.2 日志收集与分析

日志分层建议：

1. 应用日志：接口访问、异常堆栈。
2. 工作流日志：节点进入、退出、耗时、路由结果。
3. 审计日志：人工介入、状态修正。
4. 模型日志：请求 ID、token、耗时、缓存命中情况。

## 10.3 常见问题排查手册

| 问题 | 排查思路 |
| --- | --- |
| 任务卡住 | 查看当前检查点与节点超时 |
| 报告为空 | 检查诊断验证是否全部退回 |
| 指标异常 | 检查分母字段与清洗日志 |
| 人工介入后无法继续 | 检查 `thread_id` 与恢复命令 |

## 10.4 版本更新与回滚方案

1. 所有规则与提示词版本化。
2. 发布前先灰度到试点门店。
3. 保留上一个稳定镜像标签。
4. 回滚时同步回滚提示词模板和知识库版本。

---

# 第11章 风险评估与应对

## 11.1 技术风险与应对

技术风险：

1. 工作流状态复杂度增长过快。
2. 检查点与业务数据耦合不清。
3. 清洗规则过度依赖模型。

应对策略：

1. 保持节点职责单一。
2. 检查点只保存运行态，不保存大体积原始文件本体。
3. 模型参与建议，不直接掌控高风险执行。

## 11.2 数据安全风险与应对

风险点：

1. 原始门店数据包含敏感经营信息。
2. 报告可能被未授权下载。

应对策略：

1. 上传即脱敏可选。
2. 报告下载走权限校验。
3. 审计所有访问与导出操作。

## 11.3 模型效果风险与应对

风险点：

1. 模型结论幻觉。
2. 建议过于空泛。
3. 高峰期上下文过长导致成本上升。

应对策略：

1. 强制 JSON 输出与证据绑定。
2. 诊断验证节点做门控。
3. 检索前裁剪上下文并缓存前缀。

## 11.4 成本风险与应对

风险点：

1. 批量跑数导致 token 成本失控。
2. 多次失败重试放大成本。

应对策略：

1. 模型分层使用。
2. 限制最大重试次数。
3. 对低价值门店任务采用异步批处理与低成本模型。

---

# 第12章 未来扩展规划

## 12.1 功能扩展方向

1. 增加多门店横向对比与区域排名。
2. 接入排班、库存、会员 CRM、营销投放数据。
3. 自动生成督导巡店清单与整改跟进任务。

## 12.2 性能优化方向

1. 增加任务队列与异步并发调度。
2. 将历史指标预聚合到宽表。
3. 对知识库检索增加缓存与增量索引。

## 12.3 多门店支持方案

1. 统一租户模型。
2. 状态、文件、报告、知识库按租户隔离。
3. 支持批量上传、批量诊断、批量导出。

## 12.4 私有化部署方案

1. 模型 API、数据库、对象存储全部落内网。
2. 支持企业代理、堡垒机与日志审计对接。
3. 可替换 DeepSeek API 为企业内部推理网关。

---

# 参考实施建议

1. 本项目第一期建议先覆盖“单门店日/周诊断”，不要一开始同时做总部级横向分析、自动预警、整改闭环三件事。
2. 最重要的工程控制点不是模型提示词，而是指标口径、状态持久化、验证节点与审计链路。
3. 若团队资源有限，优先把“清洗验证 + 指标验证 + 诊断验证”三道质量门做好，再追求更复杂的 AI 表达能力。
