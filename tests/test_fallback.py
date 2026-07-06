from unittest.mock import patch
from app.screener import screen_resume

@patch('google.generativeai.GenerativeModel')
def test_screen_resume_api_fallback(mock_model):
    """Verify that screen_resume falls back to heuristic if API fails."""
    mock_model.return_value.generate_content.side_effect = Exception("API Key Error")
    
    resume = "John Doe\njohn@doe.com\nPython Developer"
    jd = "Python Backend Developer"
    
    res = screen_resume(resume, jd, api_key="INVALID_KEY_THAT_FAILS")
    
    assert res["candidate_name"] == "John Doe"
    assert res["candidate_email"] == "john@doe.com"
    assert res["api_used"] is False
    assert "error" in res
