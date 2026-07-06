from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_templates():
    """Verify templates endpoint returns valid dictionary data."""
    response = client.get("/api/templates")
    assert response.status_code == 200
    data = response.json()
    assert "software-engineer" in data
    assert "frontend-developer" in data
    assert data["software-engineer"]["title"] == "Senior Python Backend Engineer"
