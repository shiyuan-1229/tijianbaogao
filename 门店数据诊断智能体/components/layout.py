from html import escape
from pathlib import Path

import streamlit as st


_THEME_PATH = Path(__file__).resolve().parents[1] / "styles" / "theme.css"


def apply_theme() -> None:
    if not _THEME_PATH.exists():
        return

    css = _THEME_PATH.read_text(encoding="utf-8")
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)


def render_page_intro(title: str, description: str) -> None:
    st.title(title)
    st.caption(description)


def render_placeholder_section(title: str, message: str) -> None:
    safe_title = escape(title)
    safe_message = escape(message)
    st.markdown(
        f"""
        <section class="shell-card">
            <h3>{safe_title}</h3>
            <p>{safe_message}</p>
        </section>
        """,
        unsafe_allow_html=True,
    )
