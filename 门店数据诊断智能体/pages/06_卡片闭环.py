import streamlit as st

from components.layout import apply_theme, render_page_intro
from components.status import render_status_badge
from services.mock_data import closure_cards, closure_summary
from store_ai_clinic.services.cards import InvalidCardTransitionError, next_card_status
from store_ai_clinic.services.results import diff_card_sets


apply_theme()
render_page_intro(
    "卡片闭环",
    "承接诊断结果卡片、执行动作和闭环状态，形成可追踪的处理记录。",
)


def _status_tone(status: str) -> str:
    return {
        "pending_review": "warning",
        "processing": "info",
        "completed": "positive",
        "escalated": "danger",
        "ignored": "neutral",
        "new": "neutral",
    }.get(status, "neutral")


if "closure_status_overrides" not in st.session_state:
    st.session_state["closure_status_overrides"] = {}
if "closure_selected_card_id" not in st.session_state:
    st.session_state["closure_selected_card_id"] = "card-1001"
if "closure_notice" not in st.session_state:
    st.session_state["closure_notice"] = None

cards = closure_cards()
overrides = st.session_state["closure_status_overrides"]
for card in cards:
    override_status = overrides.get(card["card_id"])
    if override_status:
        card["card_status"] = override_status

summary = {
    **closure_summary(),
    **{
        "pending_review": sum(card["card_status"] == "pending_review" for card in cards),
        "processing": sum(card["card_status"] == "processing" for card in cards),
        "escalated": sum(card["card_status"] == "escalated" for card in cards),
        "completed": sum(card["card_status"] == "completed" for card in cards),
    },
}

metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
metric_col1.metric("待确认", summary["pending_review"])
metric_col2.metric("处理中", summary["processing"])
metric_col3.metric("已升级", summary["escalated"])
metric_col4.metric("已闭环", summary["completed"])

filter_col1, filter_col2 = st.columns(2)
brand_filter = filter_col1.selectbox(
    "品牌筛选",
    ["全部品牌"] + sorted({card["brand"] for card in cards}),
    key="closure-brand-filter",
)
status_filter = filter_col2.selectbox(
    "状态筛选",
    ["全部状态", "pending_review", "processing", "escalated", "completed"],
    key="closure-status-filter",
)

filtered_cards = [
    card
    for card in cards
    if (brand_filter == "全部品牌" or card["brand"] == brand_filter)
    and (status_filter == "全部状态" or card["card_status"] == status_filter)
]

if filtered_cards and st.session_state["closure_selected_card_id"] not in {
    card["card_id"] for card in filtered_cards
}:
    st.session_state["closure_selected_card_id"] = filtered_cards[0]["card_id"]

selected_card = next(
    (
        card
        for card in filtered_cards
        if card["card_id"] == st.session_state["closure_selected_card_id"]
    ),
    filtered_cards[0] if filtered_cards else None,
)

left_col, middle_col, right_col = st.columns([1.1, 1.45, 1.1], gap="large")

with left_col:
    st.markdown("#### 卡片队列")
    if not filtered_cards:
        st.info("当前筛选条件下没有待展示的卡片。")
    else:
        for card in filtered_cards:
            with st.container(border=True):
                st.markdown(f"**{card['store']} · {card['title']}**")
                render_status_badge(card["card_status"], tone=_status_tone(card["card_status"]))
                st.caption(f"{card['brand']} / {card['owner_role']} / {card['due_label']}")
                if st.button("查看详情", key=f"select-{card['card_id']}", use_container_width=True):
                    st.session_state["closure_selected_card_id"] = card["card_id"]
                    st.rerun()

with middle_col:
    st.markdown("#### 问题主卡")
    if selected_card is None:
        st.info("请选择一张卡片查看详情。")
    else:
        with st.container(border=True):
            st.markdown(f"**卡片 ID**：{selected_card['card_id']}")
            render_status_badge(
                selected_card["card_status"],
                tone=_status_tone(selected_card["card_status"]),
            )
            st.markdown(f"**摘要**：{selected_card['summary']}")
            st.markdown(f"**建议动作**：{selected_card['next_action']}")
            st.markdown(f"**责任角色**：{selected_card['owner_role']}")
            st.markdown(f"**版本上下文**：{selected_card['version_label']}")

        st.markdown("#### 证据子卡")
        for evidence in selected_card["evidence"]:
            with st.container(border=True):
                st.markdown(f"**{evidence['title']}**")
                st.caption(evidence["evidence_id"])
                st.markdown(evidence["summary"])
                st.markdown(f"**{evidence['metric_label']}**：{evidence['metric_value']}")

        st.markdown("#### 闭环动作")
        action_rows = {
            "new": [("确认新卡片", "confirm")],
            "pending_review": [("转入处理中", "confirm"), ("忽略卡片", "ignore")],
            "processing": [("标记已完成", "complete"), ("升级协同", "escalate")],
        }
        available_actions = action_rows.get(selected_card["card_status"], [])

        if not available_actions:
            st.caption("当前状态无需继续推进，保留右侧处理记录供追踪。")
        else:
            action_columns = st.columns(len(available_actions))
            for column, (label, action) in zip(action_columns, available_actions):
                if column.button(
                    label,
                    key=f"card-action-{action}",
                    use_container_width=True,
                    type="primary" if action in {"confirm", "complete"} else "secondary",
                ):
                    try:
                        next_status = next_card_status(selected_card["card_status"], action)
                    except InvalidCardTransitionError as exc:
                        st.session_state["closure_notice"] = ("error", str(exc))
                    else:
                        overrides[selected_card["card_id"]] = next_status
                        st.session_state["closure_notice"] = (
                            "success",
                            f"{selected_card['card_id']} 状态已更新为 {next_status}。",
                        )
                    st.rerun()

with right_col:
    st.markdown("#### 处理记录")
    if selected_card is not None:
        with st.container(border=True):
            for activity in selected_card["activity"]:
                st.markdown(
                    f"**{activity['timestamp']} · {activity['actor']}**"
                )
                st.caption(f"{activity['action']}：{activity['note']}")

        st.markdown("#### 版本差异")
        diff = diff_card_sets(
            [
                {"card_id": "card-1001", "status": "pending_review"},
                {"card_id": "card-1002", "status": "processing"},
                {"card_id": "card-2001", "status": "completed"},
            ],
            [
                {"card_id": card["card_id"], "status": card["card_status"]}
                for card in cards
            ],
        )

        with st.container(border=True):
            st.markdown(f"**新增卡片**：{len(diff['added'])}")
            st.markdown(f"**消失卡片**：{len(diff['removed'])}")
            st.markdown(f"**变化卡片**：{len(diff['changed'])}")
            st.caption("用于快速判断这次规则或任务重跑带来的卡片变化。")

notice = st.session_state.get("closure_notice")
if notice:
    level, message = notice
    getattr(st, level)(message)
