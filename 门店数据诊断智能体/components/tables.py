import streamlit as st

from services.mock_data import MockTaskRow

_TASK_COLUMNS = {
    "task_id": "任务 ID",
    "brand": "品牌",
    "store": "门店",
    "diagnosis_type": "诊断类型",
    "task_status": "任务状态",
    "graph_stage": "图谱阶段",
    "sla_risk": "SLA 风险",
}

_DETAIL_LABELS = {
    "task_id": "任务 ID",
    "brand": "品牌",
    "store": "门店",
    "diagnosis_type": "诊断类型",
    "task_status": "任务状态",
    "graph_stage": "图谱阶段",
    "sla_risk": "SLA 风险",
    "review_reason": "暂停原因",
}


def render_task_table(rows: list[MockTaskRow]) -> None:
    import pandas as pd

    table = pd.DataFrame(rows).rename(columns=_TASK_COLUMNS)
    st.dataframe(table, width="stretch", hide_index=True)


def render_task_detail(task: MockTaskRow) -> None:
    with st.container(border=True):
        st.subheader("任务详情")
        for key, label in _DETAIL_LABELS.items():
            if key in task:
                st.markdown(f"**{label}**：{task[key]}")


def render_review_queue(queue_name: str, items: list[MockTaskRow]) -> None:
    st.markdown(f"### {queue_name}")
    if not items:
        st.caption("当前队列暂无待确认任务。")
        return

    for item in items:
        with st.container(border=True):
            for key, label in _DETAIL_LABELS.items():
                if key in item:
                    st.markdown(f"**{label}**：{item[key]}")
            st.button("提交确认并恢复执行", key=f"resume-{item['task_id']}")
