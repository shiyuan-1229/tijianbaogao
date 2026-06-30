from components.layout import apply_theme, render_page_intro
from components.tables import render_review_queue
from services.mock_data import review_rows


apply_theme()
render_page_intro("人工确认台", "承接字段映射、数据质量和诊断结论等需要人工判定的暂停任务。")

for queue_name, items in review_rows().items():
    render_review_queue(queue_name, items)
