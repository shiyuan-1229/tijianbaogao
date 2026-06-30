import streamlit as st

from components.layout import apply_theme, render_page_intro, render_placeholder_section
from components.status import render_status_badge
from services.mock_data import dashboard_summary, review_rows, task_rows


apply_theme()
render_page_intro("首页指挥台", "查看当前诊断运行态势、人工介入压力和闭环完成情况。")

tasks = task_rows()
queues = review_rows()
summary = dashboard_summary()
running_col, waiting_col, risk_col, completed_col = st.columns(4)
running_col.metric("运行中任务", summary["running"])
waiting_col.metric("待人工确认", summary["waiting_human"])
risk_col.metric("SLA 风险", summary["sla_risk"])
completed_col.metric("已完成闭环", summary["completed"])

st.markdown("### 当前关注")
render_status_badge("人工确认堆积", tone="warning")

st.markdown("### 今日待办")
priority_task = next((task for task in tasks if task["task_status"] == "waiting_human"), None)
queue_spotlight = next(
    ((queue_name, items) for queue_name, items in queues.items() if items),
    None,
)

if priority_task is None and queue_spotlight is None:
    st.info("暂无待处理人工确认任务，当前链路运行平稳。")
else:
    if priority_task is not None:
        with st.container(border=True):
            st.markdown(
                f"**优先处理任务**：{priority_task['task_id']} / {priority_task['store']} / {priority_task['graph_stage']}"
            )
            st.markdown("建议先完成清洗校验后的人工确认，再恢复主链路执行。")

    if queue_spotlight is not None:
        queue_name, queue_items = queue_spotlight
        with st.container(border=True):
            st.markdown(f"**最新人工确认队列**：{queue_name}")
            st.markdown(
                f"当前待处理 {len(queue_items)} 条，首条任务为 {queue_items[0]['task_id']}。"
            )

render_placeholder_section(
    "后续补充",
    "下一轮会补上任务趋势、异常品牌和重点门店清单。",
)
