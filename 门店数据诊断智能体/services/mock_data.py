from typing import NotRequired, TypedDict


class MockTaskRow(TypedDict):
    task_id: str
    brand: str
    store: str
    diagnosis_type: str
    task_status: str
    graph_stage: str
    sla_risk: bool
    review_queue: NotRequired[str]
    review_reason: NotRequired[str]


class MockCardEvidence(TypedDict):
    evidence_id: str
    title: str
    summary: str
    metric_label: str
    metric_value: str


class MockCardActivity(TypedDict):
    timestamp: str
    actor: str
    action: str
    note: str


class MockClosureCard(TypedDict):
    card_id: str
    brand: str
    store: str
    diagnosis_type: str
    card_status: str
    priority: str
    owner_role: str
    title: str
    summary: str
    next_action: str
    due_label: str
    version_label: str
    evidence: list[MockCardEvidence]
    activity: list[MockCardActivity]


REVIEW_QUEUE_ORDER = ("字段映射确认", "数据质量确认", "诊断复核确认")

_TASK_ROWS: tuple[MockTaskRow, ...] = (
    {
        "task_id": "task-1001",
        "brand": "Acme Coffee",
        "store": "SH001",
        "diagnosis_type": "daily",
        "task_status": "waiting_human",
        "graph_stage": "clean_validate",
        "sla_risk": True,
        "review_queue": "字段映射确认",
        "review_reason": "字段别名冲突",
    },
    {
        "task_id": "task-1002",
        "brand": "Acme Coffee",
        "store": "SH002",
        "diagnosis_type": "daily",
        "task_status": "running",
        "graph_stage": "metrics",
        "sla_risk": False,
    },
    {
        "task_id": "task-1003",
        "brand": "Northwind Tea",
        "store": "HZ008",
        "diagnosis_type": "weekly",
        "task_status": "waiting_human",
        "graph_stage": "clean_validate",
        "sla_risk": False,
        "review_queue": "数据质量确认",
        "review_reason": "关键指标缺失",
    },
    {
        "task_id": "task-1004",
        "brand": "Northwind Tea",
        "store": "HZ009",
        "diagnosis_type": "weekly",
        "task_status": "waiting_human",
        "graph_stage": "diagnosis_validate",
        "sla_risk": False,
        "review_queue": "诊断复核确认",
        "review_reason": "结论置信度偏低",
    },
    {
        "task_id": "task-1005",
        "brand": "Acme Coffee",
        "store": "SH010",
        "diagnosis_type": "daily",
        "task_status": "completed",
        "graph_stage": "report",
        "sla_risk": False,
    },
)

_CLOSURE_CARDS: tuple[MockClosureCard, ...] = (
    {
        "card_id": "card-1001",
        "brand": "Acme Coffee",
        "store": "SH001",
        "diagnosis_type": "daily",
        "card_status": "pending_review",
        "priority": "高优先级",
        "owner_role": "品牌管理员",
        "title": "库存周转率连续低于品牌阈值",
        "summary": "近 7 日库存周转率连续下滑，已影响两档核心 SKU 的可售天数。",
        "next_action": "确认问题成立后，转店长执行补货与陈列复核。",
        "due_label": "24 小时内确认",
        "version_label": "结果版本 v2026.06.09",
        "evidence": [
            {
                "evidence_id": "evidence-201",
                "title": "门店库存周转率",
                "summary": "最近 7 日均值为 2.1，低于品牌阈值 3.0。",
                "metric_label": "周转率",
                "metric_value": "2.1 / 阈值 3.0",
            },
            {
                "evidence_id": "evidence-202",
                "title": "动销 SKU 覆盖",
                "summary": "热销 SKU 缺货导致晚高峰时段动销下探。",
                "metric_label": "缺货 SKU",
                "metric_value": "4 个",
            },
        ],
        "activity": [
            {
                "timestamp": "09:20",
                "actor": "系统",
                "action": "生成主卡",
                "note": "由日报诊断结果自动触发。",
            },
            {
                "timestamp": "09:24",
                "actor": "品牌管理员",
                "action": "待确认",
                "note": "等待确认是否转入执行闭环。",
            },
        ],
    },
    {
        "card_id": "card-1002",
        "brand": "Northwind Tea",
        "store": "HZ008",
        "diagnosis_type": "weekly",
        "card_status": "processing",
        "priority": "处理中",
        "owner_role": "店长",
        "title": "新品连带率偏低",
        "summary": "新品套餐未形成稳定推荐话术，近两周连带率持续低于区域中位数。",
        "next_action": "跟进店长执行陈列优化，并回填话术培训完成时间。",
        "due_label": "本周五前闭环",
        "version_label": "结果版本 v2026.06.08",
        "evidence": [
            {
                "evidence_id": "evidence-301",
                "title": "新品连带率",
                "summary": "新品连带率 11%，区域中位数为 18%。",
                "metric_label": "连带率",
                "metric_value": "11% / 区域 18%",
            }
        ],
        "activity": [
            {
                "timestamp": "昨天",
                "actor": "品牌管理员",
                "action": "确认卡片",
                "note": "已转给店长执行现场整改。",
            },
            {
                "timestamp": "今天",
                "actor": "店长",
                "action": "处理中",
                "note": "等待晚高峰前完成陈列调整。",
            },
        ],
    },
    {
        "card_id": "card-1003",
        "brand": "Acme Coffee",
        "store": "SH010",
        "diagnosis_type": "daily",
        "card_status": "escalated",
        "priority": "需升级",
        "owner_role": "区域督导",
        "title": "损耗率异常升高",
        "summary": "鲜奶与烘焙品损耗同时抬升，已超出门店可自行处理范围。",
        "next_action": "升级区域督导，确认是否存在订货策略异常。",
        "due_label": "等待区域介入",
        "version_label": "结果版本 v2026.06.09",
        "evidence": [
            {
                "evidence_id": "evidence-401",
                "title": "损耗趋势",
                "summary": "3 天内损耗率从 2.8% 升至 6.4%。",
                "metric_label": "损耗率",
                "metric_value": "6.4%",
            }
        ],
        "activity": [
            {
                "timestamp": "08:50",
                "actor": "店长",
                "action": "申请升级",
                "note": "门店侧判断需区域订货支持。",
            }
        ],
    },
    {
        "card_id": "card-1004",
        "brand": "Northwind Tea",
        "store": "HZ009",
        "diagnosis_type": "weekly",
        "card_status": "completed",
        "priority": "已闭环",
        "owner_role": "品牌管理员",
        "title": "会员复购波动已恢复",
        "summary": "短信召回和套餐调整执行后，复购波动已回到品牌安全区间。",
        "next_action": "归档闭环记录，保留本周版本对比。",
        "due_label": "已完成",
        "version_label": "结果版本 v2026.06.02",
        "evidence": [
            {
                "evidence_id": "evidence-501",
                "title": "会员复购率",
                "summary": "复购率从 13% 恢复至 17%。",
                "metric_label": "复购率",
                "metric_value": "17%",
            }
        ],
        "activity": [
            {
                "timestamp": "上周",
                "actor": "系统",
                "action": "生成卡片",
                "note": "自动触发会员召回建议。",
            },
            {
                "timestamp": "今天",
                "actor": "品牌管理员",
                "action": "完成闭环",
                "note": "已核对复购率恢复，进入归档。",
            },
        ],
    },
)


def validate_task_rows(rows: list[MockTaskRow]) -> list[MockTaskRow]:
    valid_review_queues = set(REVIEW_QUEUE_ORDER)

    for task in rows:
        if task["task_status"] != "waiting_human":
            continue

        missing_fields = [
            field_name
            for field_name in ("review_queue", "review_reason")
            if not task.get(field_name)
        ]
        if missing_fields:
            missing_fields_text = ", ".join(missing_fields)
            raise ValueError(
                f"waiting_human task {task['task_id']} must define {missing_fields_text}"
            )

        if task["review_queue"] not in valid_review_queues:
            raise ValueError(
                f"waiting_human task {task['task_id']} has invalid review_queue "
                f"{task['review_queue']}"
            )

    return rows


def task_rows() -> list[MockTaskRow]:
    return validate_task_rows([task.copy() for task in _TASK_ROWS])


def review_rows() -> dict[str, list[MockTaskRow]]:
    queues = {queue_name: [] for queue_name in REVIEW_QUEUE_ORDER}

    for task in task_rows():
        queue_name = task.get("review_queue")
        if task["task_status"] != "waiting_human" or queue_name not in queues:
            continue
        queues[queue_name].append(task)

    return queues


def dashboard_summary() -> dict[str, int]:
    tasks = task_rows()

    return {
        "running": sum(task["task_status"] == "running" for task in tasks),
        "waiting_human": sum(task["task_status"] == "waiting_human" for task in tasks),
        "sla_risk": sum(task["sla_risk"] for task in tasks),
        "completed": sum(task["task_status"] == "completed" for task in tasks),
    }


def closure_cards() -> list[MockClosureCard]:
    return [
        {
            **card,
            "evidence": [evidence.copy() for evidence in card["evidence"]],
            "activity": [activity.copy() for activity in card["activity"]],
        }
        for card in _CLOSURE_CARDS
    ]


def closure_summary() -> dict[str, int]:
    cards = closure_cards()

    return {
        "pending_review": sum(card["card_status"] == "pending_review" for card in cards),
        "processing": sum(card["card_status"] == "processing" for card in cards),
        "escalated": sum(card["card_status"] == "escalated" for card in cards),
        "completed": sum(card["card_status"] == "completed" for card in cards),
    }
