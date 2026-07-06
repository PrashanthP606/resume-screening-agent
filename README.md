# TalentAI: Intelligent Resume Screening Agent

TalentAI is a fully functioning, end-to-end Resume Screening Agent built using a **Python (FastAPI) backend** and a **premium, glassmorphic HTML/CSS/JS frontend dashboard**. It parses resume files, extracts qualifications, computes semantic similarity against a job description, and provides structured grading and candidate rankings.

> **"My agent takes multiple candidate resumes (PDF/DOCX/TXT) and a Job Description (JD), and produces a ranked, scored candidate shortlist with qualitative rationales, strengths, gaps, and interactive radar chart analytics."**

---

## 🚀 Expected Capabilities & Deliverables
This agent implements all requirements under the **Resume Screening Agent (Intermediate)** category:
1. **Resume Parser**: Extracts text from PDF, DOCX, and TXT files cleanly.
2. **Relevance Scoring**: Evaluates candidate fit using a hybrid scoring method:
   - **Semantic Cosine Similarity (30%)** using Gemini's `text-embedding-004` model.
   - **Structured LLM Evaluation (70%)** using `gemini-1.5-flash` to extract structured parameters (skills match, experience match, education match).
3. **Candidate Rankings**: Outputs an ordered list of candidates sorted by hybrid match score, complete with detailed recruiter verdicts.
4. **Interactive Dashboard**: Responsive modern dark-theme UI featuring drag-and-drop file uploading, a live agent terminal log, interactive comparison radar charts, and candidate review cards.
5. **CSV/JSON Export**: Downloads the complete shortlist at the click of a button.
6. **Heuristic Offline Fallback**: If no Gemini API Key is provided, the agent falls back to a local parsing heuristic and a local TF-IDF-based cosine similarity model, ensuring the app remains **fully runnable offline**!

---

## 🛠️ Quick Start & Setup

### Prerequisites
- Python 3.9 or higher

### Installation
1. Navigate to the project directory:
   ```bash
   cd resume-screener-agent
   ```
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Configure API Keys
You can supply your Gemini API key in two ways:
1. **Environment Variable**: Create a `.env` file in the project root folder based on `.env.example`:
   ```env
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
   ```
2. **Web UI Settings**: Launch the web app, click the Gear icon in the top right, enter your key, and click **"Save Key"**. The key will be saved securely in your browser's local storage.

*Note: If no API key is set, the app will gracefully run using the offline heuristic mode.*

### Running the Agent
Start the FastAPI local development server:
```bash
python -m uvicorn app.main:app --reload
```
Once the server starts, open your web browser and go to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 📊 Scoring Method Explained
The final **Hybrid Match Score (0 - 100)** is calculated as follows:

$$\text{Hybrid Score} = \left(0.7 \times \text{LLM Score}\right) + \left(0.3 \times \text{Semantic Cosine Similarity} \times 100\right)$$

1. **LLM Score (70%)**: The `gemini-1.5-flash` model evaluates the candidate on three dimensions:
   - **Skills Score (50% weight)**: Matching of technology keywords, frameworks, and tools.
   - **Experience Score (30% weight)**: Matching of candidate seniority, years of experience, and past responsibilities to the JD.
   - **Education Score (20% weight)**: Alignment of educational degree, certifications, and academic background.
2. **Semantic Similarity (30%)**: Calculates the cosine similarity of text embeddings (`models/text-embedding-004`) between the whole resume text and the job description. This captures context and synonyms that a simple keyword search would miss.

---

## 📂 Project Structure
```text
resume-screener-agent/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI endpoints (upload, key check, templates)
│   ├── parser.py          # PDF/DOCX/TXT text parsers
│   ├── screener.py        # Agent evaluation logic (Gemini API & local heuristics)
│   └── templates.py       # Default Job Description templates
├── static/
│   ├── index.html         # Web dashboard layout
│   ├── style.css          # Premium glassmorphic styling (vanilla CSS)
│   └── script.js          # Client-side state, ChartJS rendering, and export utils
├── tests/
│   └── test_screener.py   # Unit testing suite
├── .env.example           # Example configuration file
├── requirements.txt       # Python package dependencies
└── README.md              # Documentation
```

---

## 🧪 Testing
We have included a comprehensive unit test suite to verify parsers, local vector similarities, heuristics, and API error handling. Run the tests using:
```bash
pytest tests/
```

---

## 📝 Design Tradeoffs & Reasoning
- **FastAPI + Static Frontend vs Next.js/React**: Using FastAPI to serve static vanilla HTML/CSS/JS means zero node module compilation steps, single command start, and complete isolation, ensuring the setup is **100% foolproof** for reviewers while delivering a premium aesthetic.
- **Hybrid Scoring vs LLM-only**: Cosine text similarity embeddings capture general topic overlap, but struggle with specific structural parameters (e.g. requiring a PhD or exactly 5 years of experience). By combining **semantic similarity** (30%) and **structured LLM evaluation** (70%), the agent scores candidates accurately, realistically, and explainably.
- **Offline Heuristic Fallback**: Reviewers may not have a Gemini API key on hand. Adding a rule-based offline parsing heuristic guarantees that the agent works instantly out-of-the-box, falling back to local TF-IDF calculations and simple text parsers instead of throwing connection errors.
