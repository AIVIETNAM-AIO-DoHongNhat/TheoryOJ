from app.retrieval.hybrid import rrf
from app.retrieval.store import Filters, lexical_query


def test_lexical_query_uses_adjacent_syllable_pairs():
    assert lexical_query("Tỷ suất giá trị thặng dư") == \
        "tỷ <-> suất | suất <-> giá | giá <-> trị | trị <-> thặng | thặng <-> dư"
    assert lexical_query("m'") == "m"
    assert lexical_query("?!") is None


def test_lexical_query_strips_tsquery_operators():
    # Ký tự như & | ! ( ) ' không được lọt vào to_tsquery.
    q = lexical_query("a & b | !(c) 'd'")
    assert set(q.replace("<->", "").replace("|", "").split()) == {"a", "b", "c", "d"}


def test_rrf_prefers_items_ranked_in_both_lists():
    dense = [{"id": 1, "vector_score": 0.9}, {"id": 2, "vector_score": 0.8}, {"id": 3, "vector_score": 0.7}]
    sparse = [{"id": 3, "lexical_score": 0.5}, {"id": 4, "lexical_score": 0.4}]
    merged = rrf([dense, sparse])
    assert [m["id"] for m in merged][:2] == [3, 1]
    assert merged[0]["vector_score"] == 0.7 and merged[0]["lexical_score"] == 0.5


def test_filters_default_to_main_index():
    where, params = Filters("ktct").sql()
    assert "index_name = 'main'" in where and params == ["ktct"]
    where, params = Filters("ktct", chapters=[3], kinds=["so_lieu"]).sql()
    assert "index_name" not in where and params == ["ktct", ["so_lieu"], [3]]
