import streamlit as st

from components.layout import apply_theme, render_page_intro, render_placeholder_section


st.set_page_config(
    page_title="Store AI Data Clinic",
    page_icon=":stethoscope:",
    layout="wide",
)

apply_theme()
render_page_intro(
    "门店 AI 数据门诊",
    "从左侧六个工作台完成品牌接入、批量诊断、人工确认与卡片闭环。",
)

overview_col, action_col = st.columns((1.4, 1), gap="large")

with overview_col:
    render_placeholder_section(
        "MVP Smoke Scope",
        "本次联调覆盖 FastAPI 健康检查、六页 Streamlit 导航、任务总览、人工确认台和卡片闭环主流程。",
    )

with action_col:
    st.markdown("### Quick Start")
    st.markdown("- API: `uvicorn store_ai_clinic.api.main:app --reload`")
    st.markdown("- UI: `streamlit run streamlit_app.py`")
    st.markdown("- Tests: `python -m pytest -q`")

st.markdown("### Primary Pages")
st.markdown(
    "\n".join(
        [
            "- 01 首页指挥台",
            "- 02 品牌接入",
            "- 03 批量上传",
            "- 04 任务总览",
            "- 05 人工确认台",
            "- 06 卡片闭环",
        ]
    )
)
