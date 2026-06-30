from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import BadZipFile, ZipFile


@dataclass(frozen=True)
class QualityRule:
    rule_id: str
    rule_name: str
    source: str
    dimension: str
    check_target: str
    pass_condition: str
    fail_condition: str
    severity: str
    detect_method: str
    need_human_review: bool


@dataclass(frozen=True)
class QualityRuleSet:
    dataset_path: str
    source_document: str | None
    rules: list[QualityRule]


_RULE_TEMPLATES: tuple[dict[str, object], ...] = (
    {
        "rule_id": "R-REQ-001",
        "rule_name": "PDF + 结构化数据配套",
        "dimension": "格式与质量",
        "check_target": "数据资产",
        "pass_condition": "每个样本同时存在可追溯 PDF 报告和结构化 Excel 数据。",
        "fail_condition": "缺少 PDF、缺少结构化数据，或两者无法通过档案号/文件结构建立对应关系。",
        "severity": "high",
        "detect_method": "目录扫描 + 文件类型识别 + 档案号匹配",
        "need_human_review": True,
        "keywords": ("PDF", "结构化数据"),
    },
    {
        "rule_id": "R-REQ-002",
        "rule_name": "检查日期在 5 年内",
        "dimension": "历史数据对比",
        "check_target": "Excel 检查日期",
        "pass_condition": "结构化数据中的检查日期均落在客户要求的 5 年窗口内。",
        "fail_condition": "检查日期缺失、无法解析，或存在超出 5 年窗口的记录。",
        "severity": "medium",
        "detect_method": "Excel CheckDate 解析 + 日期窗口校验",
        "need_human_review": True,
        "keywords": ("5 年内", "5年内"),
    },
    {
        "rule_id": "R-REQ-003",
        "rule_name": "同一人连续 3 次就诊记录",
        "dimension": "历史数据对比",
        "check_target": "档案号/就诊记录",
        "pass_condition": "同一档案号能关联到连续 3 次体检或就诊记录。",
        "fail_condition": "同一人记录不足 3 次，或档案号无法证明连续性。",
        "severity": "high",
        "detect_method": "ArchivesNum 分组 + CheckDate 排序统计",
        "need_human_review": True,
        "keywords": ("连续 3 次", "连续3次", "3 次就诊", "3次就诊"),
    },
    {
        "rule_id": "R-REQ-004",
        "rule_name": "页数分布满足要求",
        "dimension": "格式与质量",
        "check_target": "PDF 报告",
        "pass_condition": "PDF 页数符合 5-10 页或 10+ 页等客户认可的分布边界。",
        "fail_condition": "PDF 页数过少、疑似缺页，或页面拆分/合并导致边界异常。",
        "severity": "medium",
        "detect_method": "PDF 页数统计 + 页面预览复核",
        "need_human_review": True,
        "keywords": ("页数分布", "页数"),
    },
    {
        "rule_id": "R-REQ-005",
        "rule_name": "异常项数量可评估",
        "dimension": "内容与语义",
        "check_target": "Excel 异常项",
        "pass_condition": "结构化数据能统计每份报告的异常项数量，并能关联 PDF 证据。",
        "fail_condition": "异常标记缺失、异常项数量不足/异常，或无法与 PDF 证据对应。",
        "severity": "medium",
        "detect_method": "Symbol / ItemResultChar 异常词统计",
        "need_human_review": True,
        "keywords": ("异常项数量", "异常项"),
    },
    {
        "rule_id": "R-REQ-006",
        "rule_name": "检查项目丰富度",
        "dimension": "内容与语义",
        "check_target": "Excel 项目与 PDF 模块",
        "pass_condition": "报告包含足够丰富的检查项目和关键模块。",
        "fail_condition": "检查项目种类不足，或缺少内科、外科、检验、影像等关键模块。",
        "severity": "medium",
        "detect_method": "ItemGroupName / ItemFlag 统计 + PDF 视觉证据",
        "need_human_review": True,
        "keywords": ("检查项目丰富度", "项目丰富度", "检查项目"),
    },
    {
        "rule_id": "R-REQ-007",
        "rule_name": "历史数据对比",
        "dimension": "历史数据对比",
        "check_target": "PDF 报告与历史记录",
        "pass_condition": "报告展示可用历史指标或趋势对比，且能回到同档案号历史数据。",
        "fail_condition": "报告声称有历史对比但缺少对比表/历史指标，或结构化历史记录不足。",
        "severity": "medium",
        "detect_method": "PDF 视觉识别 + 同档案号多次记录比对",
        "need_human_review": True,
        "keywords": ("历史数据对比", "历史对比"),
    },
    {
        "rule_id": "R-REQ-008",
        "rule_name": "体检总结完整性",
        "dimension": "总结完整性",
        "check_target": "PDF 报告",
        "pass_condition": "报告包含可读的体检总结、建议或结论区。",
        "fail_condition": "缺少总结，或总结区裁切、缺字、不可读。",
        "severity": "high",
        "detect_method": "PDF 页面视觉识别 + OCR/人工复核",
        "need_human_review": True,
        "keywords": ("是否包含总结", "体检总结", "总结"),
    },
    {
        "rule_id": "R-REQ-009",
        "rule_name": "疑似未脱敏风险",
        "dimension": "脱敏风险",
        "check_target": "PDF 页面与 OCR 文本",
        "pass_condition": "报告中未出现可识别身份的姓名、身份证号、手机号、单位、医生等敏感信息。",
        "fail_condition": "出现完整或可组合识别的敏感身份信息。",
        "severity": "high",
        "detect_method": "视觉模型/OCR 敏感信息识别 + 人工确认",
        "need_human_review": True,
        "keywords": ("脱敏", "姓名", "身份证", "手机号", "单位"),
    },
)


def extract_quality_rule_set(dataset_path: str | Path) -> QualityRuleSet:
    root = Path(dataset_path)
    document = find_requirement_document(root)
    text = _read_docx_text(document) if document is not None else ""
    return QualityRuleSet(
        dataset_path=str(root),
        source_document=str(document) if document is not None else None,
        rules=_rules_from_text(text, str(document) if document is not None else "内置第一阶段规则"),
    )


def extract_quality_rules(dataset_path: str | Path) -> list[QualityRule]:
    return extract_quality_rule_set(dataset_path).rules


def find_requirement_document(dataset_path: str | Path) -> Path | None:
    root = Path(dataset_path)
    candidates: list[Path] = []
    search_roots = [root]
    if root.parent != root:
        search_roots.append(root.parent)

    for search_root in search_roots:
        if not search_root.exists():
            continue
        candidates.extend(path for path in search_root.glob("*.docx") if _is_valid_docx_candidate(path))
        candidates.extend(path for path in search_root.rglob("*.docx") if _is_valid_docx_candidate(path))

    unique_candidates = sorted(set(candidates), key=lambda path: ("体检报告需求" not in path.name, len(path.parts), path.name))
    return unique_candidates[0] if unique_candidates else None


def _is_valid_docx_candidate(path: Path) -> bool:
    return path.is_file() and not path.name.startswith("._") and not path.name.startswith("~$")


def _read_docx_text(path: Path) -> str:
    try:
        with ZipFile(path) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    except (BadZipFile, KeyError, OSError):
        return ""

    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return _strip_xml(xml)

    parts: list[str] = []
    for element in root.iter():
        if element.tag.endswith("}t") or element.tag == "t":
            if element.text:
                parts.append(element.text)
    return "\n".join(parts)


def _rules_from_text(text: str, source: str) -> list[QualityRule]:
    normalized = _normalize_text(text)
    rules: list[QualityRule] = []
    for template in _RULE_TEMPLATES:
        keywords = template["keywords"]
        if not normalized or any(_normalize_text(str(keyword)) in normalized for keyword in keywords):
            rules.append(
                QualityRule(
                    rule_id=str(template["rule_id"]),
                    rule_name=str(template["rule_name"]),
                    source=source,
                    dimension=str(template["dimension"]),
                    check_target=str(template["check_target"]),
                    pass_condition=str(template["pass_condition"]),
                    fail_condition=str(template["fail_condition"]),
                    severity=str(template["severity"]),
                    detect_method=str(template["detect_method"]),
                    need_human_review=bool(template["need_human_review"]),
                )
            )
    return rules


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", text).lower()


def _strip_xml(xml: str) -> str:
    return re.sub(r"<[^>]+>", "", xml)
