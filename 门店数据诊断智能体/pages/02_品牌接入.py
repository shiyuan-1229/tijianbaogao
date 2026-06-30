import requests
import streamlit as st

from components.layout import apply_theme, render_page_intro
from components.status import render_status_badge
from services.frontend_api import FrontendApiError, preview_template


apply_theme()
render_page_intro("品牌接入", "登记品牌基础信息、命名模板配置与样例文件，为后续批量诊断做好准备。")

if "brand_code" not in st.session_state:
    st.session_state["brand_code"] = "acme"
if "diagnosis_type" not in st.session_state:
    st.session_state["diagnosis_type"] = "daily"
if "template_preview_result" not in st.session_state:
    st.session_state["template_preview_result"] = None
if "onboarding_notice" not in st.session_state:
    st.session_state["onboarding_notice"] = None

step = st.segmented_control(
    "接入步骤",
    ["品牌信息", "命名模板配置", "样例上传", "接入确认"],
    default="品牌信息",
)
st.caption(f"当前步骤：{step}")

brand_name = st.text_input("品牌名称", value="Acme Coffee")
st.text_input("品牌编码", key="brand_code")
st.selectbox("诊断类型", ["daily", "weekly"], key="diagnosis_type")
timezone = st.text_input("品牌时区", value="Asia/Shanghai")
pattern = st.text_input(
    "命名模板",
    value="{brand_code}_{store_code}_{biz_date}_{report_type}.xlsx",
)

sample_files = st.file_uploader(
    "上传日报和周报样例",
    accept_multiple_files=True,
    type=["xlsx", "csv"],
    key="sample-files",
)

preview = st.session_state["template_preview_result"]
brand_code = str(st.session_state.get("brand_code", "")).strip()
diagnosis_type = str(st.session_state.get("diagnosis_type", "")).strip()

checks = [
    ("品牌信息完整", bool(brand_name.strip()) and bool(brand_code) and bool(timezone.strip())),
    ("模板已验证", preview is not None),
    ("样例已上传", bool(sample_files)),
]
completed_checks = sum(is_ready for _, is_ready in checks)

metric_col1, metric_col2, metric_col3 = st.columns(3)
metric_col1.metric("接入完成度", f"{completed_checks}/{len(checks)}")
metric_col2.metric("样例文件数", len(sample_files))
metric_col3.metric("诊断模式", diagnosis_type or "未选择")

left_col, right_col = st.columns([1.35, 1], gap="large")

with left_col:
    st.markdown("#### 模板联调")
    st.caption("先校验模板变量，再确认品牌接入上下文。")

    if st.button("预览模板解析", key="preview-template"):
        try:
            st.session_state["template_preview_result"] = preview_template({"pattern": pattern})
            st.session_state["onboarding_notice"] = ("success", "命名模板校验通过，可以进入样例确认。")
        except (requests.RequestException, FrontendApiError) as exc:
            st.session_state["template_preview_result"] = None
            st.session_state["onboarding_notice"] = ("error", f"模板预览失败：{exc}")
        st.rerun()

    preview = st.session_state["template_preview_result"]
    if preview:
        with st.container(border=True):
            st.markdown("**模板解析结果**")
            st.code(str(preview["example"]), language=None)
            st.markdown(f"支持诊断类型：`{', '.join(preview['report_types'])}`")
            st.markdown(f"必需变量：`{', '.join(preview['required_tokens'])}`")

    action_col1, action_col2 = st.columns(2)
    if action_col1.button("保存为草稿", key="save-draft", use_container_width=True):
        st.session_state["onboarding_draft"] = {
            "brand_name": brand_name.strip(),
            "brand_code": brand_code,
            "diagnosis_type": diagnosis_type,
            "timezone": timezone.strip(),
            "pattern": pattern.strip(),
            "sample_files": [file.name for file in sample_files],
        }
        st.session_state["onboarding_notice"] = ("success", "接入草稿已保存，后续可继续补全样例和模板。")
        st.rerun()

    if action_col2.button(
        "确认接入上线",
        key="confirm-onboarding",
        type="primary",
        use_container_width=True,
    ):
        missing_fields: list[str] = []
        if not brand_name.strip():
            missing_fields.append("品牌名称")
        if not brand_code:
            missing_fields.append("品牌编码")
        if not timezone.strip():
            missing_fields.append("品牌时区")
        if not sample_files:
            missing_fields.append("至少一个样例文件")

        if missing_fields:
            st.session_state["onboarding_notice"] = (
                "warning",
                f"请先补全以下内容：{'、'.join(missing_fields)}。",
            )
        else:
            try:
                preview = preview_template({"pattern": pattern})
            except (requests.RequestException, FrontendApiError) as exc:
                st.session_state["onboarding_notice"] = ("error", f"接入确认失败：{exc}")
            else:
                st.session_state["template_preview_result"] = preview
                st.session_state["onboarding_profile"] = {
                    "brand_name": brand_name.strip(),
                    "brand_code": brand_code,
                    "diagnosis_type": diagnosis_type,
                    "timezone": timezone.strip(),
                    "pattern": pattern.strip(),
                    "sample_files": [file.name for file in sample_files],
                    "template_example": str(preview["example"]),
                }
                st.session_state["onboarding_notice"] = (
                    "success",
                    "品牌接入已确认，批量上传页将自动沿用当前品牌上下文。",
                )
        st.rerun()

with right_col:
    st.markdown("#### 上线摘要")
    with st.container(border=True):
        st.markdown(f"**品牌**：{brand_name or '未填写'}")
        st.markdown(f"**品牌编码**：{brand_code or '未填写'}")
        st.markdown(f"**诊断类型**：{diagnosis_type or '未填写'}")
        st.markdown(f"**品牌时区**：{timezone or '未填写'}")
        st.markdown(f"**样例数量**：{len(sample_files)}")
        if sample_files:
            st.caption("已选样例：" + "、".join(file.name for file in sample_files))

    st.markdown("#### 接入检查")
    for label, is_ready in checks:
        render_status_badge(label, tone="positive" if is_ready else "warning")

st.markdown(
    """
    <div class="operator-note">
        <strong>命名约束提示：</strong>
        样例文件建议保持 <code>{brand_code}_{store_code}_{biz_date}_{report_type}</code> 结构，
        这样批量上传页可以直接复用当前品牌的预校验逻辑。
    </div>
    """,
    unsafe_allow_html=True,
)

notice = st.session_state.get("onboarding_notice")
if notice:
    level, message = notice
    getattr(st, level)(message)
