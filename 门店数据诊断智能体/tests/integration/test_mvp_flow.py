from store_ai_clinic.services.batches import split_batch_files
from store_ai_clinic.services.results import diff_card_sets


def test_mvp_flow_groups_single_store_batch_and_detects_added_card():
    grouped = split_batch_files("acme", ["acme_SH001_20260609_daily.xlsx"])

    assert list(grouped) == ["SH001"]

    diff = diff_card_sets([], [{"card_id": "c1", "title": "客流异常", "summary": "new"}])

    assert [card["card_id"] for card in diff["added"]] == ["c1"]
