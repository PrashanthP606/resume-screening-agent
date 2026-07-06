from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_screen_batch_no_files():
    """Verify screen-batch endpoint errors when no files are uploaded."""
    response = client.post(
        "/api/screen-batch", 
        data={"jd_text": "Need python developer"},
        files=[]
    )
    assert response.status_code in [400, 422]
