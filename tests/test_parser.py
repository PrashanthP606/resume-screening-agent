from app.parser import clean_text

def test_clean_text():
    """Verify that clean_text removes extra newlines and collapses spaces."""
    raw = "  Hello   World! \n\n\n\n Test  "
    cleaned = clean_text(raw)
    assert cleaned == "Hello World!\n\nTest"
    assert clean_text("") == ""
    assert clean_text(None) == ""
