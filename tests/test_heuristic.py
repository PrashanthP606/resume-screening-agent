from app.screener import run_heuristic_screener

def test_run_heuristic_screener():
    """Verify heuristic offline screening parses candidates correctly."""
    resume = """
    Jane Doe
    jane.doe@email.com
    (123) 456-7890
    github.com/janedoe

    Summary:
    Senior Software Engineer with 6 years of experience in Python, FastAPI, and PostgreSQL.
    Education:
    Master's Degree in Computer Science from Stanford University.
    """
    
    jd = """
    Python Backend Engineer
    Looking for a Python developer with FastAPI and SQL experience.
    Requires at least 3 years of experience.
    """
    
    res = run_heuristic_screener(resume, jd)
    
    assert res["candidate_name"] == "Jane Doe"
    assert res["candidate_email"] == "jane.doe@email.com"
    assert res["years_of_experience"] == 6.0
    assert res["highest_education"] == "Master's"
    assert "fastapi" in res["key_skills"]
    assert res["hybrid_score"] > 50
    assert len(res["strengths"]) > 0
    assert len(res["gaps"]) > 0
