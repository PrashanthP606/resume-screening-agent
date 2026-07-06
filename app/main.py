import os
import shutil
import uuid
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# Load local .env if it exists
load_dotenv()

from app.parser import parse_resume
from app.screener import screen_resume
from app.templates import TEMPLATES

app = FastAPI(
    title="AI Resume Screening Agent",
    description="Ranks candidates against job descriptions using hybrid semantic embeddings and LLM reasoning.",
    version="1.0.0"
)

# Temp uploads directory
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

# Helper to clean up temporary files
def cleanup_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Error cleaning up file {filepath}: {str(e)}")

@app.get("/")
def read_root():
    """Serve the index.html front-end dashboard."""
    index_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")
    return FileResponse(index_path)

@app.get("/api/templates")
def get_templates():
    """Retrieve predefined Job Description templates."""
    return TEMPLATES

class KeyCheckRequest(BaseModel):
    api_key: str

@app.post("/api/check-key")
def check_key(payload: KeyCheckRequest):
    """Validate a user-provided Gemini API Key."""
    key = payload.api_key.strip()
    if not key:
        return {"status": "error", "message": "API key cannot be empty"}
    try:
        genai.configure(api_key=key)
        # Try a tiny generation task to test key validity
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("test", generation_config={"max_output_tokens": 1})
        if response:
            return {"status": "success", "message": "API Key is valid!"}
    except Exception as e:
        return {"status": "error", "message": f"Invalid API Key: {str(e)}"}
    return {"status": "error", "message": "Could not validate API Key"}

@app.post("/api/screen-batch")
async def screen_batch(
    background_tasks: BackgroundTasks,
    jd_text: str = Form(...),
    api_key: Optional[str] = Form(None),
    resumes: List[UploadFile] = File(...)
):
    """Processes a batch of resumes against a job description, returning ranked analysis."""
    if not resumes:
        raise HTTPException(status_code=400, detail="No resume files uploaded.")
        
    results = []
    
    for upload_file in resumes:
        # 1. Create a safe local file path with unique name
        file_ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        temp_filepath = os.path.join(TEMP_DIR, unique_filename)
        
        # 2. Save the uploaded file locally
        try:
            with open(temp_filepath, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {upload_file.filename}. Error: {str(e)}")
            
        # Queue cleanup in the background
        background_tasks.add_task(cleanup_file, temp_filepath)
        
        # 3. Parse resume text
        try:
            parsed_text = parse_resume(temp_filepath)
            if not parsed_text or len(parsed_text.strip()) < 20:
                results.append({
                    "filename": upload_file.filename,
                    "error": "Resume file seems empty or could not be read.",
                    "status": "failed"
                })
                continue
        except Exception as e:
            results.append({
                "filename": upload_file.filename,
                "error": f"Parsing failed: {str(e)}",
                "status": "failed"
            })
            continue
            
        # 4. Screen candidate resume
        try:
            analysis = screen_resume(parsed_text, jd_text, api_key)
            analysis["filename"] = upload_file.filename
            analysis["status"] = "success"
            results.append(analysis)
        except Exception as e:
            results.append({
                "filename": upload_file.filename,
                "error": f"Screening failed: {str(e)}",
                "status": "failed"
            })
            
    # 5. Sort success results by hybrid_score descending, failed candidates go to the end
    success_results = [r for r in results if r.get("status") == "success"]
    failed_results = [r for r in results if r.get("status") != "success"]
    
    success_results.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)
    
    final_ordered_list = success_results + failed_results
    
    return JSONResponse(content={"results": final_ordered_list})

# Mount the static directory for CSS, JS and other frontend assets
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
