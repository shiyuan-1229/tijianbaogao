from html import escape

import streamlit as st


_STATUS_TONES = {
    "positive": "#167C74",
    "info": "#2A67A0",
    "warning": "#B66A1E",
    "danger": "#B54242",
    "neutral": "#4A5C5B",
}


def render_status_badge(label: str, tone: str = "neutral") -> None:
    color = _STATUS_TONES.get(tone, _STATUS_TONES["neutral"])
    safe_label = escape(label)
    st.markdown(
        (
            '<span class="status-badge" '
            f'style="border-color:{color};color:{color};">{safe_label}</span>'
        ),
        unsafe_allow_html=True,
    )
