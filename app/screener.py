import os
import re
import json
import math
from collections import Counter
from typing import Dict, Any, Tuple
import google.generativeai as genai

# Fallback heuristic parser in case LLM is completely offline/no api key provided
def run_heuristic_screener(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """Runs a local, rule-based screening heuristic if no API key is available."""
    # Convert to lower case for keyword searches
    resume_lower = resume_text.lower()
    jd_lower = jd_text.lower()

    # Extract email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
    email = email_match.group(0) if email_match else ""

    # Extract phone
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    phone = phone_match.group(0) if phone_match else ""

    # Name extraction heuristic (often the first non-empty line of the first few lines)
    lines = [l.strip() for l in resume_text.split('\n') if l.strip()]
    name = "Candidate"
    for line in lines[:4]:
        # If the line is short, doesn't contain @, doesn't contain a phone-like number sequence,
        # and has at least two characters, it could be a name.
        if "@" not in line and not re.search(r'\d{3,}', line) and 2 < len(line) < 40:
            # Check if it looks like a typical name (mostly letters and spaces/dashes)
            if re.match(r'^[a-zA-Z\s\.\-\’\u00C0-\u017F]+$', line):
                name = line
                break


    # Extract social links
    links = []
    github_matches = re.findall(r'github\.com/[\w\.-]+', resume_lower)
    linkedin_matches = re.findall(r'linkedin\.com/in/[\w\.-]+', resume_lower)
    for link in github_matches + linkedin_matches:
        if link not in links:
            links.append("https://" + link)

    # Word/Keyword overlap score (simple skills matching)
    # Find words in JD that look like tech skills
    common_skills = [
        "python", "javascript", "typescript", "react", "vue", "angular", "node", "express", 
        "fastapi", "flask", "django", "sql", "postgresql", "mysql", "mongodb", "redis", 
        "aws", "docker", "kubernetes", "git", "ci/cd", "html", "css", "machine learning",
        "deep learning", "nlp", "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy",
        "figma", "sketch", "agile", "scrum", "product management", "jira"
    ]
    
    found_skills = []
    jd_skills = []
    for skill in common_skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', jd_lower):
            jd_skills.append(skill)
            if re.search(r'\b' + re.escape(skill) + r'\b', resume_lower):
                found_skills.append(skill)
                
    skills_score = int((len(found_skills) / len(jd_skills) * 100)) if jd_skills else 50
    skills_score = min(max(skills_score, 10), 95) # cap it

    # Heuristic experience scoring
    experience_years = 0
    exp_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience', resume_lower)
    if exp_matches:
        experience_years = max([int(m) for m in exp_matches])
    else:
        # Fallback count of common duration words
        if "senior" in resume_lower or "lead" in resume_lower:
            experience_years = 6
        elif "mid" in resume_lower or "intermediate" in resume_lower:
            experience_years = 3
        else:
            experience_years = 1

    # Experience match score
    jd_exp_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience', jd_lower)
    required_exp = max([int(m) for m in jd_exp_matches]) if jd_exp_matches else 3
    if experience_years >= required_exp:
        exp_score = min(80 + (experience_years - required_exp) * 5, 100)
    else:
        exp_score = max(40 + (experience_years / required_exp) * 40, 10)
    exp_score = int(exp_score)

    # Heuristic education score
    edu_score = 50
    highest_degree = "High School"
    if "phd" in resume_lower or "ph.d" in resume_lower or "doctorate" in resume_lower:
        highest_degree = "Ph.D."
        edu_score = 95
    elif "master" in resume_lower or "m.s." in resume_lower or "m.tech" in resume_lower or "mba" in resume_lower:
        highest_degree = "Master's"
        edu_score = 85
    elif "bachelor" in resume_lower or "b.s." in resume_lower or "b.tech" in resume_lower or "degree" in resume_lower:
        highest_degree = "Bachelor's"
        edu_score = 75

    # Overall heuristic score
    overall = int((skills_score * 0.5) + (exp_score * 0.3) + (edu_score * 0.2))
    
    local_sim = compute_local_similarity(resume_text, jd_text)
    hybrid_score = int(overall * 0.7 + (local_sim * 100) * 0.3)

    return {
        "candidate_name": name,
        "candidate_email": email,
        "candidate_phone": phone,
        "links": links,
        "years_of_experience": float(experience_years),
        "highest_education": highest_degree,
        "key_skills": found_skills if found_skills else ["Extracted text parsing"],
        "skills_score": skills_score,
        "skills_feedback": f"Matched skills: {', '.join(found_skills)}. Heuristically matched from JD criteria.",
        "experience_score": exp_score,
        "experience_feedback": f"Found references indicating approx {experience_years} years of work experience.",
        "education_score": edu_score,
        "education_feedback": f"Highest detected qualification matches: {highest_degree}.",
        "overall_score": overall,
        "hybrid_score": min(max(hybrid_score, 0), 100),
        "strengths": [f"Demonstrated skills in {', '.join(found_skills[:3])}" if found_skills else "Contains tech industry keywords", "Matches layout structure"],
        "gaps": ["Heuristic analysis could not verify all backend projects", "Needs manual verification"],
        "verdict": f"Candidate heuristic match is {hybrid_score}%. (Fast offline check run due to missing API key).",
        "local_similarity": local_sim,
        "api_used": False
    }

def compute_local_similarity(text1: str, text2: str) -> float:
    """Compute local cosine similarity between two texts using word counters (TF-IDF approximation)."""
    words1 = re.findall(r'\w+', text1.lower())
    words2 = re.findall(r'\w+', text2.lower())
    
    if not words1 or not words2:
        return 0.0
        
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    
    if not denominator:
        return 0.0
    return float(numerator) / denominator

def get_embedding_similarity(text1: str, text2: str, api_key: str) -> float:
    """Get embedding cosine similarity using Gemini API text-embedding-004 model."""
    try:
        genai.configure(api_key=api_key)
        # Gemini embeddings
        emb1 = genai.embed_content(model="models/text-embedding-004", content=text1)
        emb2 = genai.embed_content(model="models/text-embedding-004", content=text2)
        
        v1 = emb1['embedding']
        v2 = emb2['embedding']
        
        # Calculate cosine similarity
        dot_product = sum(a * b for a, b in zip(v1, v2))
        norm_v1 = math.sqrt(sum(a * a for a in v1))
        norm_v2 = math.sqrt(sum(b * b for b in v2))
        
        if not norm_v1 or not norm_v2:
            return 0.0
            
        return dot_product / (norm_v1 * norm_v2)
    except Exception as e:
        # If API fails for any reason, print and fall back to local token similarity
        print(f"Warning: Embedding API failed ({str(e)}). Falling back to local similarity.")
        return compute_local_similarity(text1, text2)

def screen_resume_with_llm(resume_text: str, jd_text: str, api_key: str) -> Dict[str, Any]:
    """Uses gemini-1.5-flash with structured JSON output schema to parse and grade the resume."""
    genai.configure(api_key=api_key)
    
    # Define JSON output schema to enforce the format
    prompt = f"""
You are an expert HR Recruiter and Applicant Tracking System (ATS) agent. Your job is to screen a candidate's resume against a given Job Description (JD).
Extract information and score the candidate carefully, strictly avoiding hallucinations.

Job Description:
{jd_text}

Candidate's Resume Content:
{resume_text}

Instructions:
1. Extract candidate's name, email, phone, and links (Github, Linkedin, Portfolio, etc.).
2. Count years of experience from their history. If it is a range or unclear, give your best estimate.
3. Identify their highest education (e.g., Ph.D., Master's, Bachelor's, Self-Taught).
4. Extract key skills mentioned that are relevant to the job.
5. Score the candidate from 0 to 100 on three aspects:
   - `skills_score`: How well do their technical/soft skills match the JD?
   - `experience_score`: Does their career history, seniority, and industry match?
   - `education_score`: Does their educational background meet JD requirements?
6. Calculate an overall average score (0 to 100) based on these.
7. Outline specific strengths and gaps (missing requirements).
8. Write a clear, 1-2 sentence overall verdict.

Output a valid JSON object matching the following structure:
{{
  "candidate_name": "Full name of candidate",
  "candidate_email": "Email address",
  "candidate_phone": "Phone number or empty string",
  "links": ["https://github.com/...", "https://linkedin.com/in/..."],
  "years_of_experience": 5.5,
  "highest_education": "Master's in Computer Science",
  "key_skills": ["Python", "FastAPI", "AWS"],
  "skills_score": 85,
  "skills_feedback": "Detailed reasoning for skills score.",
  "experience_score": 80,
  "experience_feedback": "Detailed reasoning for experience score.",
  "education_score": 90,
  "education_feedback": "Detailed reasoning for education score.",
  "overall_score": 85,
  "strengths": ["Strong Python background", "Built microservices in AWS"],
  "gaps": ["No Kubernetes experience listed"],
  "verdict": "Candidate matches requirements well..."
}}
"""
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        result_json = json.loads(response.text.strip())
        return result_json
    except Exception as e:
        raise ValueError(f"LLM API Call failed: {str(e)}")

def screen_resume(resume_text: str, jd_text: str, api_key: str = None) -> Dict[str, Any]:
    """Entrypoint to screen a resume. Combines semantic matching (embeddings) and LLM screening."""
    # Strip API key if empty
    api_key = api_key.strip() if api_key else None
    
    # Read key from env if not provided
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
        
    if not api_key:
        # Fall back to offline heuristic logic
        return run_heuristic_screener(resume_text, jd_text)
        
    try:
        # 1. Run LLM parsing & grading
        evaluation = screen_resume_with_llm(resume_text, jd_text, api_key)
        
        # 2. Compute embedding similarity
        semantic_sim = get_embedding_similarity(resume_text, jd_text, api_key)
        
        # 3. Calculate hybrid score
        # 70% LLM rating, 30% semantic embedding overlap
        llm_score = evaluation.get("overall_score", 50)
        hybrid_score = int((llm_score * 0.7) + (semantic_sim * 100 * 0.3))
        
        # Ensure scores are between 0 and 100
        hybrid_score = min(max(hybrid_score, 0), 100)
        
        # Append scores & metadata
        evaluation["hybrid_score"] = hybrid_score
        evaluation["semantic_similarity"] = float(semantic_sim)
        evaluation["api_used"] = True
        
        return evaluation
    except Exception as e:
        print(f"Error during API screening: {str(e)}. Falling back to heuristic.")
        # Fallback to heuristic screener
        result = run_heuristic_screener(resume_text, jd_text)
        result["error"] = str(e)
        return result
