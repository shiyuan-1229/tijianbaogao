import requests
import streamlit as st

from components.layout import apply_theme, render_page_intro
from components.status import render_status_badge
from services.frontend_api import FrontendApiError, preview_batch


apply_theme()
render_page_intro("批量上传", "上传日报和周报文件，预校验命名格式并预览门店任务拆分。")

if "batch_preview_result" not in st.session_state:
    st.session_state["batch_preview_result"] = None
if "batch_notice" not in st.session_state:
    st.session_state["batch_notice"] = None

brand_code = str(st.session_state.get("brand_code", "")).strip()
diagnosis_type = str(st.session_state.get("diagnosis_type", "")).strip()
onboarding_profile = st.session_state.get("onboarding_profile")

st.caption(
    "当前接入上下文："
    f"品牌编码 {brand_code or '未配置'} / 诊断类型 {diagnosis_type or '未配置'}"
)

files = st.file_uploader(
    "上传日报或周报文件",
    accept_multiple_files=True,
    type=["xlsx", "csv"],
    key="batch-files",
)

metric_col1, metric_col2, metric_col3 = st.columns(3)
metric_col1.metric("品牌上下文", brand_code or "未配置")
metric_col2.metric("诊断类型", diagnosis_type or "未配置")
metric_col3.metric("待校验文件", len(files))

if onboarding_profile:
    st.success(
        f"已加载品牌接入配置：{onboarding_profile['brand_name']} / "
        f"{onboarding_profile['template_example']}"
    )
else:
    st.info("建议先在品牌接入页完成接入确认，再进入批量上传。")

left_col, right_col = st.columns([1.35, 1], gap="large")

with left_col:
    st.markdown("#### 文件预校验")
    st.caption("先校验命名和诊断类型，再生成门店级任务拆分。")

    if st.button("预校验", key="preview-batch"):
        if not files:
            st.session_state["batch_notice"] = ("warning", "请先选择至少一个待校验文件。")
        elif not brand_code or not diagnosis_type:
            st.session_state["batch_notice"] = (
                "warning",
                "请先在品牌接入页填写品牌编码并选择诊断类型。",
            )
        else:
            payload = {
                "brand_code": brand_code,
                "diagnosis_type": diagnosis_type,
                "files": [file.name for file in files],
            }

            try:
                st.session_state["batch_preview_result"] = preview_batch(payload)
                st.session_state["batch_notice"] = (
                    "success",
                    "批量文件预校验通过，可以继续进入任务总览查看拆分结果。",
                )
            except (requests.RequestException, FrontendApiError) as exc:
                st.session_state["batch_preview_result"] = None
                st.session_state["batch_notice"] = ("error", f"预校验失败：{exc}")
        st.rerun()

    preview = st.session_state.get("batch_preview_result")
    if preview:
        grouped_files = preview.get("grouped_files", {})
        store_count = len(grouped_files) if isinstance(grouped_files, dict) else 0

        summary_col1, summary_col2 = st.columns(2)
        summary_col1.metric("门店任务数", int(preview.get("store_task_count", 0)))
        summary_col2.metric("命中门店数", store_count)

        with st.container(border=True):
            st.markdown("**门店拆分预览**")
            if isinstance(grouped_files, dict):
                for store_code, store_files in grouped_files.items():
                    st.markdown(f"**{store_code}**")
                    for file_name in store_files:
                        st.caption(file_name)

with right_col:
    st.markdown("#### 上传前检查")
    render_status_badge("品牌上下文", tone="positive" if brand_code else "warning")
    render_status_badge("诊断类型", tone="positive" if diagnosis_type else "warning")
    render_status_badge("已选文件", tone="positive" if files else "warning")

    with st.container(border=True):
        st.markdown("**当前文件清单**")
        if not files:
            st.caption("尚未选择文件。")
        else:
            for file in files:
                st.markdown(f"- `{file.name}`")

        if onboarding_profile:
            st.markdown(f"**接入模板**：`{onboarding_profile['pattern']}`")
            st.caption("上传页会沿用已确认的品牌规则和诊断模式。")

notice = st.session_state.get("batch_notice")
if notice:
    level, message = notice
    getattr(st, level)(message)
