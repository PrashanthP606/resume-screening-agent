// --- State Management ---
let selectedFiles = [];
let screenedCandidates = [];
let activeCandidateIndex = null;
let candidateChartInstance = null;
let templates = {};

// --- DOM Elements ---
const dom = {
    btnToggleSettings: document.getElementById('btn-toggle-settings'),
    settingsPanel: document.getElementById('settings-panel'),
    inputApiKey: document.getElementById('input-api-key'),
    btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
    btnValidateKey: document.getElementById('btn-validate-key'),
    btnSaveKey: document.getElementById('btn-save-key'),
    keyStatusMsg: document.getElementById('key-status-msg'),

    selectTemplate: document.getElementById('select-template'),
    inputJdTitle: document.getElementById('input-jd-title'),
    textareaJdDesc: document.getElementById('textarea-jd-desc'),

    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    selectedFilesContainer: document.getElementById('selected-files-container'),
    selectedFilesList: document.getElementById('selected-files-list'),
    selectedCount: document.getElementById('selected-count'),
    btnStartScreening: document.getElementById('btn-start-screening'),

    consoleOutput: document.getElementById('console-output'),
    btnClearConsole: document.getElementById('btn-clear-console'),

    resultsPlaceholder: document.getElementById('results-placeholder'),
    screeningLoader: document.getElementById('screening-loader'),
    screeningProgress: document.getElementById('screening-progress'),
    screeningProgressText: document.getElementById('screening-progress-text'),
    resultsPanel: document.getElementById('results-panel'),

    metricTotal: document.getElementById('metric-total'),
    metricTopName: document.getElementById('metric-top-name'),
    metricAvgScore: document.getElementById('metric-avg-score'),

    rankingsTableBody: document.getElementById('rankings-table-body'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnExportJson: document.getElementById('btn-export-json'),

    candidateDetailsCard: document.getElementById('candidate-details-card'),
    detailsHeaderName: document.getElementById('details-header-name'),
    detailsEmail: document.getElementById('details-email'),
    detailsPhone: document.getElementById('details-phone'),
    detailsLinks: document.getElementById('details-links'),

    detailsSkillsScore: document.getElementById('details-skills-score'),
    detailsSkillsBar: document.getElementById('details-skills-bar'),
    detailsSkillsFeedback: document.getElementById('details-skills-feedback'),

    detailsExpScore: document.getElementById('details-exp-score'),
    detailsExpBar: document.getElementById('details-exp-bar'),
    detailsExpFeedback: document.getElementById('details-exp-feedback'),

    detailsEduScore: document.getElementById('details-edu-score'),
    detailsEduBar: document.getElementById('details-edu-bar'),
    detailsEduFeedback: document.getElementById('details-edu-feedback'),

    detailsStrengthsList: document.getElementById('details-strengths-list'),
    detailsGapsList: document.getElementById('details-gaps-list'),
    detailsVerdict: document.getElementById('details-verdict')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSavedKey();
    loadTemplates();
    setupEventListeners();
    logConsole("TalentAI Frontend Ready. Awaiting Job Description and Resume uploads.", "system");
});

// --- API Key Management ---
function loadSavedKey() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        dom.inputApiKey.value = savedKey;
        logConsole("Saved Gemini API Key loaded from local storage.", "system");
    }
}

async function validateApiKey(key) {
    if (!key) return false;
    try {
        const response = await fetch('/api/check-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key })
        });
        const data = await response.json();
        return data.status === 'success';
    } catch (e) {
        console.error(e);
        return false;
    }
}

// --- Load Templates ---
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        templates = await response.json();
    } catch (e) {
        console.error("Failed to load Job Description templates:", e);
        showToast("Error loading JD templates from server.", "error");
    }
}

// --- Logging Helper ---
function logConsole(message, type = "system") {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    
    let icon = "chevron-right";
    if (type === "working") icon = "circle-notch fa-spin";
    if (type === "success") icon = "check-double";
    if (type === "error") icon = "triangle-exclamation";
    
    line.innerHTML = `<i class="fa-solid fa-${icon}"></i>[${time}] ${message}`;
    dom.consoleOutput.appendChild(line);
    dom.consoleOutput.scrollTop = dom.consoleOutput.scrollHeight;
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // API key panel toggling
    dom.btnToggleSettings.addEventListener('click', () => {
        dom.settingsPanel.classList.toggle('hidden');
    });

    // Toggle API Key field visibility
    dom.btnToggleKeyVisibility.addEventListener('click', () => {
        const type = dom.inputApiKey.type === 'password' ? 'text' : 'password';
        dom.inputApiKey.type = type;
        dom.btnToggleKeyVisibility.querySelector('i').className = 
            type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    // Validate key
    dom.btnValidateKey.addEventListener('click', async () => {
        const key = dom.inputApiKey.value.strip();
        if (!key) {
            showKeyStatus("Please enter an API key to validate", "error");
            return;
        }
        dom.btnValidateKey.disabled = true;
        dom.keyStatusMsg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validating key...';
        dom.keyStatusMsg.className = "status-msg info";
        
        const isValid = await validateApiKey(key);
        dom.btnValidateKey.disabled = false;
        
        if (isValid) {
            showKeyStatus("Key is valid!", "success");
            logConsole("Gemini API Key validated successfully.", "success");
        } else {
            showKeyStatus("Invalid API Key. Please check the key value.", "error");
            logConsole("API Key validation failed.", "error");
        }
    });

    // Save key
    dom.btnSaveKey.addEventListener('click', () => {
        const key = dom.inputApiKey.value.strip();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            showKeyStatus("API Key saved to browser local storage", "success");
            showToast("API Key saved!", "success");
            logConsole("Saved Gemini API Key to local storage.", "system");
        } else {
            localStorage.removeItem('gemini_api_key');
            showKeyStatus("API Key removed", "info");
            logConsole("API Key removed from local storage.", "system");
        }
    });

    // Select JD template
    dom.selectTemplate.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val && templates[val]) {
            dom.inputJdTitle.value = templates[val].title;
            dom.textareaJdDesc.value = templates[val].description;
            logConsole(`Loaded Job Description template: ${templates[val].title}`, "system");
            showToast("Template loaded!", "info");
        }
    });

    // Drag and Drop Zone
    dom.dropzone.addEventListener('click', () => dom.fileInput.click());
    
    dom.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.dropzone.classList.add('dragover');
    });
    
    dom.dropzone.addEventListener('dragleave', () => {
        dom.dropzone.classList.remove('dragover');
    });
    
    dom.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files) {
            handleFilesSelection(e.dataTransfer.files);
        }
    });

    dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
            handleFilesSelection(e.target.files);
        }
    });

    // Clear console
    dom.btnClearConsole.addEventListener('click', () => {
        dom.consoleOutput.innerHTML = '';
        logConsole("Logs cleared.", "system");
    });

    // Start screening trigger
    dom.btnStartScreening.addEventListener('click', runScreeningBatch);

    // Export buttons
    dom.btnExportCsv.addEventListener('click', exportToCSV);
    dom.btnExportJson.addEventListener('click', exportToJSON);
}

// Helper to string strip
String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
};

// --- Handle Selected Files ---
function handleFilesSelection(files) {
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const maxFiles = 15;
    
    if (selectedFiles.length + files.length > maxFiles) {
        showToast(`You can upload a maximum of ${maxFiles} resumes at a time.`, "error");
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!allowedExtensions.includes(ext)) {
            showToast(`Unsupported file type: ${file.name}. Only PDF, DOCX, and TXT are allowed.`, "error");
            continue;
        }

        // Avoid duplicates by name + size
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            continue;
        }

        selectedFiles.push(file);
        logConsole(`Added resume: ${file.name} (${formatBytes(file.size)})`, "system");
    }

    updateFilesUI();
}

function removeFile(index) {
    const removed = selectedFiles.splice(index, 1)[0];
    logConsole(`Removed resume: ${removed.name}`, "system");
    updateFilesUI();
}

function updateFilesUI() {
    dom.selectedFilesList.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        dom.selectedFilesContainer.classList.add('hidden');
        dom.btnStartScreening.disabled = true;
        return;
    }

    dom.selectedFilesContainer.classList.remove('hidden');
    dom.selectedCount.textContent = selectedFiles.length;
    dom.btnStartScreening.disabled = false;

    selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        
        let icon = "fa-file-pdf";
        if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) icon = "fa-file-word";
        if (file.name.endsWith('.txt')) icon = "fa-file-lines";
        
        li.innerHTML = `
            <div class="file-info">
                <i class="fa-solid ${icon}"></i>
                <span>${file.name}</span>
                <span class="file-size">(${formatBytes(file.size)})</span>
            </div>
            <button class="btn-remove-file" onclick="removeFile(${index})" type="button">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        dom.selectedFilesList.appendChild(li);
    });
}

// --- Run Batch Screening ---
async function runScreeningBatch() {
    const jdTitle = dom.inputJdTitle.value.strip();
    const jdDesc = dom.textareaJdDesc.value.strip();
    const apiKey = dom.inputApiKey.value.strip();

    if (!jdDesc) {
        showToast("Please enter a Job Description description", "error");
        return;
    }

    if (selectedFiles.length === 0) {
        showToast("Please upload at least one resume", "error");
        return;
    }

    // Prepare UI state
    dom.resultsPlaceholder.classList.add('hidden');
    dom.resultsPanel.classList.add('hidden');
    dom.screeningLoader.classList.remove('hidden');
    dom.btnStartScreening.disabled = true;
    dom.dropzone.style.pointerEvents = 'none';

    logConsole(`Starting batch screening for ${selectedFiles.length} candidates...`, "system");
    logConsole(`Job Target: ${jdTitle || "Unspecified Role"}`, "system");
    
    if (!apiKey) {
        logConsole("No Gemini API key provided. Running screener in offline heuristic mode (Local parser + local text similarity matching).", "info");
        showToast("Using offline fallback screener", "info");
    } else {
        logConsole("API key detected. Running advanced screening with Gemini LLM + semantic embeddings.", "working");
    }

    // Build form data
    const formData = new FormData();
    formData.append("jd_text", `${jdTitle}\n\n${jdDesc}`);
    if (apiKey) {
        formData.append("api_key", apiKey);
    }
    
    // Append files
    selectedFiles.forEach(file => {
        formData.append("resumes", file);
    });

    // Mock progress bar increment (simulate API responses)
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 90) {
            progress += Math.floor(Math.random() * 10) + 1;
            updateProgress(progress);
        }
    }, 800);

    try {
        logConsole("Sending request to FastAPI backend...", "working");
        
        const response = await fetch('/api/screen-batch', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);
        
        if (!response.ok) {
            throw new Error(`Server returned error code: ${response.status}`);
        }

        const data = await response.json();
        screenedCandidates = data.results;
        
        updateProgress(100);
        setTimeout(() => {
            displayResults();
        }, 500);

    } catch (e) {
        clearInterval(progressInterval);
        logConsole(`Screening failed: ${e.message}`, "error");
        showToast("Screening error occurred.", "error");
        
        dom.screeningLoader.classList.add('hidden');
        dom.resultsPlaceholder.classList.remove('hidden');
        dom.btnStartScreening.disabled = false;
        dom.dropzone.style.pointerEvents = 'all';
    }
}

function updateProgress(value) {
    dom.screeningProgress.style.width = `${value}%`;
    dom.screeningProgressText.textContent = `${value}% Completed`;
    
    if (value > 0 && value < 100) {
        const estFileIdx = Math.min(Math.floor((value / 100) * selectedFiles.length), selectedFiles.length - 1);
        logConsole(`Analyzing resume [${estFileIdx + 1}/${selectedFiles.length}]: ${selectedFiles[estFileIdx].name}...`, "working");
    }
}

// --- Display Results & Populate Dashboard ---
function displayResults() {
    dom.screeningLoader.classList.add('hidden');
    dom.resultsPanel.classList.remove('hidden');
    dom.btnStartScreening.disabled = false;
    dom.dropzone.style.pointerEvents = 'all';
    
    const count = screenedCandidates.length;
    dom.metricTotal.textContent = count;
    
    // Find top candidate
    const topCand = screenedCandidates[0];
    if (topCand && topCand.status === "success") {
        dom.metricTopName.textContent = topCand.candidate_name;
        
        // Calculate average score
        const successCands = screenedCandidates.filter(c => c.status === "success");
        const avg = Math.round(successCands.reduce((acc, curr) => acc + curr.hybrid_score, 0) / successCands.length);
        dom.metricAvgScore.textContent = `${avg}%`;
        
        logConsole(`Screening complete! Ranked ${successCands.length} candidates. Top candidate: ${topCand.candidate_name} (${topCand.hybrid_score}% match).`, "success");
        showToast("Screening complete!", "success");
    } else {
        dom.metricTopName.textContent = "N/A";
        dom.metricAvgScore.textContent = "0%";
        logConsole("Screening complete, but no candidates were parsed successfully.", "error");
    }

    // Populate table
    dom.rankingsTableBody.innerHTML = '';
    
    screenedCandidates.forEach((cand, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.index = idx;
        
        if (cand.status !== "success") {
            tr.innerHTML = `
                <td><span class="rank-badge">${idx + 1}</span></td>
                <td>
                    <div class="cand-info">
                        <span class="cand-name text-pink">${cand.filename}</span>
                        <span class="cand-email">${cand.error || "Processing failed"}</span>
                    </div>
                </td>
                <td><span class="score-badge score-low">Error</span></td>
                <td>-</td>
                <td>-</td>
                <td><button class="btn btn-secondary btn-xs" disabled>Failed</button></td>
            `;
        } else {
            const scoreClass = cand.hybrid_score >= 80 ? 'score-high' : (cand.hybrid_score >= 60 ? 'score-mid' : 'score-low');
            
            // Map top 3 skills
            const topSkills = (cand.key_skills || []).slice(0, 3).map(s => `<span class="tag">${s}</span>`).join(' ');
            
            tr.innerHTML = `
                <td><span class="rank-badge">${idx + 1}</span></td>
                <td>
                    <div class="cand-info">
                        <span class="cand-name">${cand.candidate_name}</span>
                        <span class="cand-email">${cand.candidate_email}</span>
                    </div>
                </td>
                <td><span class="score-badge ${scoreClass}">${cand.hybrid_score}%</span></td>
                <td>${cand.years_of_experience} yrs</td>
                <td><div class="tag-list">${topSkills}</div></td>
                <td><button class="btn btn-primary btn-xs btn-view-analysis">View Details</button></td>
            `;
        }
        
        tr.addEventListener('click', () => selectCandidate(idx));
        dom.rankingsTableBody.appendChild(tr);
    });

    // Auto-select top candidate
    if (screenedCandidates.length > 0) {
        selectCandidate(0);
    }
}

// --- Select Candidate Details ---
function selectCandidate(index) {
    activeCandidateIndex = index;
    
    // Update table active class
    const rows = dom.rankingsTableBody.querySelectorAll('tr');
    rows.forEach(r => r.classList.remove('selected'));
    
    const activeRow = dom.rankingsTableBody.querySelector(`tr[data-index="${index}"]`);
    if (activeRow) activeRow.classList.add('selected');

    const cand = screenedCandidates[index];
    if (!cand || cand.status !== "success") {
        dom.candidateDetailsCard.classList.add('hidden');
        return;
    }

    dom.candidateDetailsCard.classList.remove('hidden');

    // Populating details text fields
    dom.detailsHeaderName.textContent = cand.candidate_name;
    dom.detailsEmail.textContent = cand.candidate_email || "N/A";
    dom.detailsPhone.textContent = cand.candidate_phone || "N/A";
    
    // Links list
    dom.detailsLinks.innerHTML = '';
    if (cand.links && cand.links.length > 0) {
        cand.links.forEach(l => {
            let label = "Link";
            if (l.includes("github.com")) label = '<i class="fa-brands fa-github"></i> GitHub';
            else if (l.includes("linkedin.com")) label = '<i class="fa-brands fa-linkedin"></i> LinkedIn';
            else if (l.includes("portfolio")) label = '<i class="fa-solid fa-globe"></i> Portfolio';
            
            const a = document.createElement('a');
            a.href = l.startsWith('http') ? l : `https://${l}`;
            a.target = "_blank";
            a.innerHTML = label;
            dom.detailsLinks.appendChild(a);
        });
    } else {
        dom.detailsLinks.innerHTML = '<span class="text-muted">No external links found</span>';
    }

    // Animate Progress Bars
    dom.detailsSkillsScore.textContent = `${cand.skills_score || 0}%`;
    dom.detailsSkillsBar.style.width = `${cand.skills_score || 0}%`;
    dom.detailsSkillsFeedback.textContent = cand.skills_feedback || "";

    dom.detailsExpScore.textContent = `${cand.experience_score || 0}%`;
    dom.detailsExpBar.style.width = `${cand.experience_score || 0}%`;
    dom.detailsExpFeedback.textContent = cand.experience_feedback || "";

    dom.detailsEduScore.textContent = `${cand.education_score || 0}%`;
    dom.detailsEduBar.style.width = `${cand.education_score || 0}%`;
    dom.detailsEduFeedback.textContent = cand.education_feedback || "";

    // Key Strengths & Gaps
    dom.detailsStrengthsList.innerHTML = '';
    (cand.strengths || ["Key requirements met."]).forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        dom.detailsStrengthsList.appendChild(li);
    });

    dom.detailsGapsList.innerHTML = '';
    (cand.gaps || ["No major gaps identified."]).forEach(g => {
        const li = document.createElement('li');
        li.textContent = g;
        dom.detailsGapsList.appendChild(li);
    });

    // Verdict text
    dom.detailsVerdict.textContent = cand.verdict || "No verdict provided.";

    // Render Chart
    renderCandidateChart(cand);
    
    // Smooth scroll down to details card on small screens
    if (window.innerWidth <= 1024) {
        dom.candidateDetailsCard.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- Render Chart.js Radar Plot ---
function renderCandidateChart(cand) {
    if (candidateChartInstance) {
        candidateChartInstance.destroy();
    }

    const ctx = document.getElementById('candidateChart').getContext('2d');
    
    const datasets = [
        {
            label: cand.candidate_name,
            data: [
                cand.skills_score || 0,
                cand.experience_score || 0,
                cand.education_score || 0,
                cand.hybrid_score || 0
            ],
            backgroundColor: 'rgba(123, 44, 191, 0.2)',
            borderColor: '#7b2cbf',
            pointBackgroundColor: '#00f5d4',
            pointBorderColor: '#fff',
            borderWidth: 2
        }
    ];

    candidateChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Skills Fit', 'Experience Fit', 'Education Fit', 'Overall Fit'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    pointLabels: {
                        color: '#9f9bb4',
                        font: {
                            family: 'Outfit',
                            size: 11
                        }
                    },
                    ticks: {
                        color: '#9f9bb4',
                        backdropColor: 'transparent',
                        font: {
                            size: 9
                        },
                        stepSize: 20
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// --- Data Exporting Functions ---
function exportToCSV() {
    if (screenedCandidates.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Candidate Name,Email,Phone,Hybrid Score,Years Experience,Education,Top Skills,Verdict\n";

    screenedCandidates.forEach((cand, idx) => {
        if (cand.status === "success") {
            const name = `"${cand.candidate_name.replace(/"/g, '""')}"`;
            const email = cand.candidate_email;
            const phone = cand.candidate_phone || "";
            const score = cand.hybrid_score;
            const exp = cand.years_of_experience;
            const edu = `"${cand.highest_education.replace(/"/g, '""')}"`;
            const skills = `"${(cand.key_skills || []).join(', ').replace(/"/g, '""')}"`;
            const verdict = `"${cand.verdict.replace(/"/g, '""')}"`;
            
            csvContent += `${idx + 1},${name},${email},${phone},${score},${exp},${edu},${skills},${verdict}\n`;
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "talent_ai_resume_shortlist.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logConsole("Candidate shortlist exported to CSV file.", "system");
}

function exportToJSON() {
    if (screenedCandidates.length === 0) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(screenedCandidates, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "talent_ai_resume_shortlist.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logConsole("Candidate shortlist exported to JSON file.", "system");
}

// --- UI Utility Helpers ---
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function showKeyStatus(msg, type) {
    dom.keyStatusMsg.textContent = msg;
    dom.keyStatusMsg.className = `status-msg ${type}`;
}

function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = "info";
    if (type === "success") icon = "circle-check";
    if (type === "error") icon = "circle-exclamation";
    
    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
