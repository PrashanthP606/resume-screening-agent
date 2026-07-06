from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_check_key_empty():
    """Verify check-key endpoint validation fails with empty input."""
    response = client.post("/api/check-key", json={"api_key": ""})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "empty" in data["message"].lower()

def test_check_key_invalid():
    """Verify check-key endpoint fails gracefully for invalid key formats."""
    response = client.post("/api/check-key", json={"api_key": "invalid_format_key"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "invalid" in data["message"].lower()
