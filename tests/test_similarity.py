from app.screener import compute_local_similarity

def test_compute_local_similarity():
    """Verify that cosine similarity yields expected decimal overlaps."""
    text1 = "Python developer with machine learning experience"
    text2 = "Looking for a Python developer focused on machine learning"
    sim = compute_local_similarity(text1, text2)
    assert sim > 0.0
    assert sim <= 1.0
    
    sim_zero = compute_local_similarity("abc", "xyz")
    assert sim_zero == 0.0
