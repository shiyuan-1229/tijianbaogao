import requests

import streamlit as st

from components.layout import apply_theme, render_page_intro
from components.status import render_status_badge
from components.tables import render_task_detail, render_task_table
from services.frontend_api import FrontendApiError, run_diagnosis
from services.mock_data import dashboard_summary, task_rows


apply_theme()
render_page_intro("任务总览", "集中查看批次、门店任务和当前图谱阶段，快速定位阻塞环节。")

if "latest_diagnosis_result" not in st.session_state:
    st.session_state["latest_diagnosis_result"] = None
if "latest_diagnosis_error" not in st.session_state:
    st.session_state["latest_diagnosis_error"] = None

rows = task_rows()
summary = dashboard_summary()

st.caption("Smoke check: mock tasks stay visible alongside the task detail panel.")

metric_total_col, metric_waiting_col, metric_risk_col = st.columns(3)
metric_total_col.metric("Mock Tasks", len(rows))
metric_waiting_col.metric("Waiting Human", summary["waiting_human"])
metric_risk_col.metric("SLA Risk", summary["sla_risk"])

if rows:
    render_task_table(rows)
    selected_task = rows[0]
    detail_col, diagnosis_col = st.columns([1.05, 1], gap="large")

    with detail_col:
        render_task_detail(selected_task)

    with diagnosis_col:
        st.subheader("实时诊断草案")
        diagnosis_context_default = (
            f"品牌：{selected_task['brand']}\n"
            f"门店：{selected_task['store']}\n"
            f"诊断类型：{selected_task['diagnosis_type']}\n"
            f"当前任务状态：{selected_task['task_status']}\n"
            f"当前图谱阶段：{selected_task['graph_stage']}\n"
            f"人工确认原因：{selected_task.get('review_reason', '无')}"
        )
        diagnosis_context = st.text_area(
            "诊断上下文",
            value=diagnosis_context_default,
            height=180,
            key="diagnosis-context",
        )

        if st.button("运行真实诊断", key="run-live-diagnosis", type="primary"):
            try:
                st.session_state["latest_diagnosis_result"] = run_diagnosis(
                    {
                        "task_id": selected_task["task_id"],
                        "store_id": selected_task["store"],
                        "diagnosis_type": selected_task["diagnosis_type"],
                        "context": diagnosis_context,
                    }
                )
                st.session_state["latest_diagnosis_error"] = None
            except (requests.RequestException, FrontendApiError) as exc:
                st.session_state["latest_diagnosis_result"] = None
                st.session_state["latest_diagnosis_error"] = str(exc)
            st.rerun()

        result = st.session_state.get("latest_diagnosis_result")
        error_message = st.session_state.get("latest_diagnosis_error")
        if error_message:
            st.error(error_message)
        elif result:
            render_status_badge(
                f"来源：{result.get('diagnosis_source') or 'unknown'}",
                tone="positive" if result.get("diagnosis_source") == "llm" else "warning",
            )
            with st.container(border=True):
                draft = result["diagnosis_draft"]
                st.markdown(f"**诊断标题**：{draft['title']}")
                st.markdown(f"**摘要**：{draft['summary']}")
                st.markdown(f"**建议动作**：{draft['next_action']}")
                if result.get("diagnosis_error"):
                    st.caption(f"模型回退原因：{result['diagnosis_error']}")
else:
    st.info("当前没有可展示的任务，等待新的诊断批次进入。")
