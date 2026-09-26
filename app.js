// app.js
// Main Application Logic using real Gemini API

document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardView = document.getElementById('dashboard');
    const toolWorkspace = document.getElementById('toolWorkspace');
    const settingsView = document.getElementById('settingsView');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-target');
            if (!target && !item.hasAttribute('onclick')) {
                e.preventDefault();
                return; // Do nothing for empty links like Help
            }
            if (target) {
                e.preventDefault();
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Switch views
                if (target === 'dashboard' || target === 'all-tools') {
                    dashboardView.classList.remove('hidden');
                    toolWorkspace.classList.add('hidden');
                    settingsView.classList.add('hidden');
                } else if (target === 'settings') {
                    dashboardView.classList.add('hidden');
                    toolWorkspace.classList.add('hidden');
                    settingsView.classList.remove('hidden');
                    document.getElementById('apiKeyInput').value = sessionStorage.getItem('geminiApiKey') || '';
                    const savedProvider = sessionStorage.getItem('aiProvider') || 'gemini';
                    const savedModel = sessionStorage.getItem('aiModel') || 'gemini-3.5-flash';
                    document.getElementById('providerSelect').value = savedProvider;
                    updateModelDropdown(savedProvider, savedModel);
                }
            }
        });
    });

    // Save settings
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const apiKey = document.getElementById('apiKeyInput').value.trim();
            const provider = document.getElementById('providerSelect').value;
            const model = document.getElementById('modelInput').value.trim();
            if (!apiKey || !model) { showToast('Provider, model, and API key are required.', true); return; }
            sessionStorage.setItem('geminiApiKey', apiKey);
            sessionStorage.setItem('aiProvider', provider);
            sessionStorage.setItem('aiModel', model);
            showToast('AI connection saved for this session.');
        });
    }

    const toggleKeyBtn = document.getElementById('toggleKeyBtn');
    if (toggleKeyBtn) {
        toggleKeyBtn.addEventListener('click', () => {
            const input = document.getElementById('apiKeyInput');
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            toggleKeyBtn.innerHTML = `<i class="ti ti-eye${isHidden ? '-off' : ''}"></i>`;
            toggleKeyBtn.title = isHidden ? 'Hide API key' : 'Show API key';
        });
    }

    const providerSelect = document.getElementById('providerSelect');
    if (providerSelect) {
        providerSelect.addEventListener('change', (e) => {
            updateModelDropdown(e.target.value);
        });
    }

    // Auto-detect provider from API key prefix
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', () => {
            const key = apiKeyInput.value.trim();
            const providerSelect = document.getElementById('providerSelect');
            const modelInput = document.getElementById('modelInput');
            if (!providerSelect) return;
            if (key.startsWith('AIza') || (key.startsWith('AI') && key.length > 30)) {
                // Looks like a Google Gemini key
                providerSelect.value = 'gemini';
                updateModelDropdown('gemini', 'gemini-3.5-flash');
            } else if (key.startsWith('sk-ant-')) {
                // Looks like an Anthropic key
                providerSelect.value = 'anthropic';
                updateModelDropdown('anthropic', 'claude-3-7-sonnet-20250219');
            } else if (key.startsWith('sk-')) {
                // Looks like an OpenAI-compatible key
                providerSelect.value = 'openai';
                updateModelDropdown('openai', 'gpt-4o-mini');
            }
        });
    }

    const input = document.getElementById('toolInput');
    input?.addEventListener('input', updateInputCounter);
    const todayLabel = document.getElementById('todayLabel');
    if (todayLabel) todayLabel.textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
});

// --- UI Helpers ---
const modelsByProvider = {
    gemini: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'],
    anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o3-mini']
};

function updateModelDropdown(provider, selectedModel = null) {
    const modelInput = document.getElementById('modelInput');
    if (!modelInput) return;
    const models = modelsByProvider[provider] || [];
    modelInput.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    if (selectedModel && models.includes(selectedModel)) {
        modelInput.value = selectedModel;
    }
}

// --- Tool Workspace Logic ---
let currentTool = null;
const toolState = { tutorMessages: [], flashcards: [], flashcardIndex: 0, quizAnswers: {}, lastResumeInput: '' };

const toolConfigs = {
    'resume': { title: 'Resume Builder', icon: 'file-text', eyebrow: 'Career studio', description: 'Build a clear, confident first draft from the experience you already have.', label: 'Tell us about you', hint: 'Role, wins, experience, and what you want next.', placeholder: 'Example: I am a second-year CS student applying for a product design internship...', button: 'Build my resume', controls: ['Experience', 'Skills', 'Target role'] },
    'notes': { title: 'Notes Generator', icon: 'notes', eyebrow: 'Study studio', description: 'Turn a long lecture, article, or transcript into notes you can actually revisit.', label: 'Drop in your source', hint: 'Paste a lecture, chapter, or rough notes.', placeholder: 'Paste your lecture transcript or unstructured notes here...', button: 'Structure my notes', controls: ['Key ideas', 'Exam prep', 'Short summary'] },
    'presentation': { title: 'Presentation Maker', icon: 'presentation', eyebrow: 'Story studio', description: 'Find the narrative, rhythm, and talking points behind a memorable deck.', label: 'Set your direction', hint: 'Include your audience, topic, and desired slide count.', placeholder: 'Example: Create a 7-slide presentation for classmates about sustainable cities...', button: 'Shape my deck', controls: ['5 slides', '7 slides', '10 slides'] },
    'mindmap': { title: 'Mind Map', icon: 'sitemap', eyebrow: 'Connection studio', description: 'See how ideas connect, branch, and build on each other.', label: 'Choose a central idea', hint: 'Start with a syllabus, topic, or question.', placeholder: 'Enter a core topic or paste a syllabus to visualize related concepts...', button: 'Map the ideas', controls: ['Syllabus', 'Topic', 'Question'] },
    'dashboard_data': { title: 'Data Dashboard', icon: 'table', eyebrow: 'Signal studio', description: 'Turn spreadsheet rows into patterns, priorities, and a clear next step.', label: 'Describe your dataset', hint: 'Paste rows or explain what you want to understand.', placeholder: 'Describe the data you want to analyze and the decision it should support...', button: 'Find the signal', controls: ['Summarize', 'Compare', 'Prioritize'] },
    'quiz': { title: 'Quiz Generator', icon: 'checklist', eyebrow: 'Practice studio', description: 'Create a focused retrieval practice session from any topic or set of notes.', label: 'Pick your challenge', hint: 'Share a topic or notes. You will get multiple choice questions.', placeholder: 'Example: Test me on the causes and consequences of the French Revolution...', button: 'Create my quiz', controls: ['Warm-up', 'Standard', 'Challenge'] },
    'doubt': { title: 'Tutor Chat', icon: 'message-chatbot', eyebrow: 'Clarity studio', description: 'Ask the question you have been circling. Get an explanation that meets you there.', label: 'What feels unclear?', hint: 'Share your attempt too. It helps the tutor meet you at the right level.', placeholder: 'What subject or specific question do you need help with?', button: 'Explain this', controls: ['Simple first', 'Step by step', 'Use an analogy'] },
    'flashcards': { title: 'Flashcards', icon: 'cards', eyebrow: 'Recall studio', description: 'Convert important ideas into small prompts that make memory do the work.', label: 'Feed the deck', hint: 'Paste notes or a topic and we will find the concepts worth remembering.', placeholder: 'Paste your notes or text here to generate Q&A flashcards...', button: 'Deal the cards', controls: ['Definitions', 'Concepts', 'Mixed deck'] },
    'planner': { title: 'Study Planner', icon: 'calendar-event', eyebrow: 'Momentum studio', description: 'Build a realistic rhythm for the week, with enough space to keep going.', label: 'Set your constraints', hint: 'List subjects, available hours, and important dates.', placeholder: 'Example: Biology, calculus, and history; 2 hours each weekday; exam in 3 weeks...', button: 'Plan my week', controls: ['Balanced', 'Focus sprint', 'Gentle pace'] },
    'photo': { title: 'Photo Summarizer', icon: 'camera', eyebrow: 'Capture studio', description: 'Move from photographed pages to a clean summary you can study anywhere.', label: 'Describe the page', hint: 'Paste extracted text or describe the image contents.', placeholder: 'Describe the image or paste extracted text to get a summary...', button: 'Summarize the page', controls: ['Key points', 'Glossary', 'Study guide'] }
};

// Expose openTool globally
window.openTool = function(toolId) {
    currentTool = toolId;
    const config = toolConfigs[toolId];
    if(!config) return;
    
    // UI Updates
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('settingsView').classList.add('hidden');
    document.getElementById('toolWorkspace').classList.remove('hidden');
    
    document.getElementById('workspaceTitle').innerText = config.title;
    document.getElementById('workspaceIcon').innerHTML = `<i class="ti ti-${config.icon}"></i>`;
    document.getElementById('workspaceEyebrow').innerText = config.eyebrow;
    document.getElementById('workspaceDescription').innerText = config.description;
    document.getElementById('toolInputLabel').innerText = config.label;
    document.getElementById('inputHint').innerText = config.hint;
    document.getElementById('runButtonText').innerText = config.button;
    document.getElementById('toolInput').placeholder = config.placeholder;
    document.getElementById('toolInput').value = '';
    setupToolControls(toolId, config);
    updateInputCounter();
    
    // Reset output
    renderEmptyState(toolId);
    
    // Remove previous listeners and add new one
    const runBtn = document.getElementById('runToolBtn');
    const newBtn = runBtn.cloneNode(true);
    runBtn.parentNode.replaceChild(newBtn, runBtn);
    
    newBtn.addEventListener('click', () => executeTool(toolId, config.title));

    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="openTool('${toolId}')"]`)?.classList.add('active');
}

window.goBack = function() {
    document.getElementById('toolWorkspace').classList.add('hidden');
    document.getElementById('settingsView').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Reset nav
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('.nav-item[data-target="dashboard"]').classList.add('active');
}

// Real AI Logic processing
async function executeTool(toolId, toolTitle) {
    const input = collectToolInput(toolId);
    if (!input || (toolId === 'resume' && !hasResumeDetails())) {
        showToast('Please enter some input first!', true);
        return;
    }

    const settings = getAISettings();
    if (!settings.apiKey || !settings.model) {
        showToast('Configure your provider, model, and API key in Settings.', true);
        // Switch to settings tab automatically
        document.querySelector('.nav-item[data-target="settings"]')?.click();
        return;
    }

    const loader = document.getElementById('toolLoader');
    const outputPanel = document.getElementById('toolOutput');
    const runBtn = document.getElementById('runToolBtn');

    // UI Loading state
    runBtn.classList.add('hidden');
    loader.classList.remove('hidden');
    outputPanel.innerHTML = '<p style="color: var(--text-secondary); text-align:center;">AI is thinking...</p>';

    try {
            const result = await callAIAPI(toolId, input, settings);
            if (toolId === 'doubt') {
                toolState.tutorMessages.push({ role: 'student', text: document.getElementById('toolInput').value.trim() });
                toolState.tutorMessages.push({ role: 'tutor', text: result });
            }
        renderResult(result, toolId);
        showToast('Generation complete!');
        
        // (Optional) We can still save to Session Storage if we want to keep history
        if(typeof SessionAPI !== 'undefined') {
            const historyItem = { id: Date.now(), toolId, toolTitle, input: input.substring(0, 50), result, timestamp: new Date().toLocaleString() };
            SessionAPI.append('ai_history', historyItem).catch(e => console.error(e));
        }
    } catch (error) {
        outputPanel.innerHTML = `<div class="error-state"><div class="empty-icon"><i class="ti ti-alert-triangle"></i></div><strong>We could not generate this yet.</strong><p>${escapeHtml(error.message || 'The provider returned an error.')}</p><button class="secondary-action" id="retryToolBtn"><i class="ti ti-refresh"></i> Retry</button></div>`;
        document.getElementById('retryToolBtn')?.addEventListener('click', () => executeTool(toolId, toolTitle));
        showToast('Generation failed. Check the details and retry.', true);
    } finally {
        loader.classList.add('hidden');
        runBtn.classList.remove('hidden');
    }
}

function getAISettings() {
    return {
        provider: sessionStorage.getItem('aiProvider') || 'gemini',
        model: sessionStorage.getItem('aiModel') || 'gemini-3.5-flash',
        apiKey: sessionStorage.getItem('geminiApiKey') || ''
    };
}

async function callAIAPI(toolId, input, settings) {
    // Determine the system prompt based on the tool
    let systemPrompt = "You are an AI learning assistant. Answer the user's prompt helpfully and educationally. Do not wrap in markdown code blocks unless necessary.";
    
    if (toolId === 'flashcards') {
        systemPrompt = "You are a flashcard generator. Extract key concepts and definitions from the user's text. Return ONLY a valid JSON array of objects with 'q' for question and 'a' for answer. Example: [{\"q\":\"What is X?\",\"a\":\"X is Y\"}]";
    } else if (toolId === 'resume') {
        systemPrompt = "You are an expert ATS resume writer. Return ONLY valid JSON matching this exact shape: {\"name\":\"\",\"headline\":\"\",\"contact\":{\"email\":\"\",\"location\":\"\"},\"summary\":\"\",\"skills\":[\"\"],\"experience\":[{\"role\":\"\",\"company\":\"\",\"dates\":\"\",\"bullets\":[\"\"]}],\"education\":[{\"degree\":\"\",\"school\":\"\",\"dates\":\"\"}],\"projects\":[{\"name\":\"\",\"description\":\"\",\"url\":\"\"}],\"certifications\":[\"\"]}. Create a complete one-page ATS-friendly resume. Use action verbs, measurable outcomes only when supported by the input, and never invent employers, dates, degrees, tools, metrics, or credentials. Use empty arrays for unavailable sections.";
    } else if (toolId === 'quiz') {
        systemPrompt = "You are a quiz master. Generate 3-5 multiple choice questions on the provided topic. Provide the questions, options (A, B, C, D), and clearly indicate the correct answer at the end of each question.";
    } else if (toolId === 'notes') {
        systemPrompt = "You are an expert note-taker. Organize the provided text into clean, structured notes with bullet points and bold headers. Extract the main ideas clearly.";
    } else if (toolId === 'presentation') {
        systemPrompt = "You are a presentation strategist. Return ONLY valid JSON with a title and slides array. Each slide must have title, bullets array, and speakerNotes. Make the narrative clear and classroom-ready.";
    } else if (toolId === 'mindmap') {
        systemPrompt = "You are a curriculum designer. Return ONLY valid JSON with a central string and branches array. Each branch has a label and children array of strings. Keep it useful for a student.";
    } else if (toolId === 'quiz') {
        systemPrompt = "You are an assessment designer. Return ONLY valid JSON with a questions array. Each item has question, options array of four strings, and answer as the zero-based correct option index. Do not include explanations.";
    } else if (toolId === 'planner') {
        systemPrompt = "You are a realistic study coach. Return ONLY valid JSON with a weekTitle and days array. Each day has day, focus, sessions array, and note. Make sessions fit the user's available time.";
    } else if (toolId === 'doubt') {
        systemPrompt = "You are a patient Socratic tutor. Explain the answer at the learner's level, show reasoning, identify misconceptions, and end with one short check-for-understanding question.";
    }

    const provider = settings.provider;
    const jsonTools = ['resume', 'flashcards', 'presentation', 'mindmap', 'quiz', 'planner'];
    const wantsJson = jsonTools.includes(toolId);
    let url, payload, headers;

    if (provider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
        payload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: input }] }],
            generationConfig: { responseMimeType: wantsJson ? 'application/json' : 'text/plain' }
        };
        headers = { 'Content-Type': 'application/json' };
    } else if (provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        payload = {
            model: settings.model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: input }]
        };
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': settings.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        };
    } else {
        // OpenAI-compatible
        url = 'https://api.openai.com/v1/chat/completions';
        payload = {
            model: settings.model,
            response_format: wantsJson ? { type: 'json_object' } : undefined,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }]
        };
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'API request failed. Check your provider, model, and API key.');
    }

    const data = await response.json();
    let textResult;
    if (provider === 'gemini') {
        textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'anthropic') {
        textResult = data.content?.[0]?.text || '';
    } else {
        textResult = data.choices?.[0]?.message?.content || '';
    }

    // Parse JSON if flashcards
    if (['flashcards', 'presentation', 'mindmap', 'quiz', 'planner'].includes(toolId)) {
        try {
            const cleanText = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            throw new Error('The AI returned invalid structured data. Retry with more specific details.');
        }
    }

    return textResult;
}

function renderResult(result, toolId) {
    const outputPanel = document.getElementById('toolOutput');
    if (toolId === 'resume' && result?.name) {
        renderResumeResult(result);
    } else if (toolId === 'doubt') {
        outputPanel.innerHTML = `<div class="chat-result">${toolState.tutorMessages.map(message => `<div class="chat-bubble ${message.role}"><span>${message.role === 'student' ? 'You' : 'Tutor'}</span><p>${escapeHtml(message.text)}</p></div>`).join('')}</div>`;
    } else if (toolId === 'presentation' && result?.slides) {
        outputPanel.innerHTML = `<div class="deck-result"><div class="deck-title"><span class="panel-kicker">Presentation outline</span><h3>${escapeHtml(result.title || 'Your presentation')}</h3></div><div class="slide-strip">${result.slides.map((slide, index) => `<article class="slide-card" data-slide="${index}"><span>0${index + 1}</span><h4>${escapeHtml(slide.title || `Slide ${index + 1}`)}</h4><ul>${(slide.bullets || []).map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul><details><summary>Speaker notes</summary><p>${escapeHtml(slide.speakerNotes || '')}</p></details></article>`).join('')}</div><button class="secondary-action" id="downloadDeckBtn"><i class="ti ti-download"></i> Download outline</button></div>`;
        document.getElementById('downloadDeckBtn').addEventListener('click', () => downloadText(`${result.title || 'presentation'}.txt`, result.slides.map((slide, index) => `SLIDE ${index + 1}: ${slide.title}\n${(slide.bullets || []).join('\n- ')}\n\nSpeaker notes: ${slide.speakerNotes || ''}`).join('\n\n')));
    } else if (toolId === 'mindmap' && result?.branches) {
        outputPanel.innerHTML = `<div class="mindmap-result"><div class="mindmap-center">${escapeHtml(result.central || 'Core idea')}</div><div class="mindmap-branches">${result.branches.map(branch => `<article class="mind-branch"><h4><i class="ti ti-sparkles"></i>${escapeHtml(branch.label || '')}</h4><ul>${(branch.children || []).map(child => `<li>${escapeHtml(child)}</li>`).join('')}</ul></article>`).join('')}</div></div>`;
    } else if (toolId === 'quiz' && result?.questions) {
        toolState.quizAnswers = {};
        outputPanel.innerHTML = `<div class="quiz-result"><div class="quiz-score" id="quizScore">Ready when you are</div>${result.questions.map((item, index) => `<article class="quiz-question"><span>0${index + 1}</span><h4>${escapeHtml(item.question || '')}</h4><div class="quiz-options">${(item.options || []).map((option, optionIndex) => `<button type="button" data-question="${index}" data-answer="${optionIndex}">${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</button>`).join('')}</div></article>`).join('')}<button class="secondary-action" id="checkQuizBtn"><i class="ti ti-check"></i> Check answers</button></div>`;
        outputPanel.querySelectorAll('.quiz-options button').forEach(button => button.addEventListener('click', () => { outputPanel.querySelectorAll(`[data-question="${button.dataset.question}"]`).forEach(item => item.classList.remove('selected')); button.classList.add('selected'); toolState.quizAnswers[button.dataset.question] = Number(button.dataset.answer); }));
        document.getElementById('checkQuizBtn').addEventListener('click', () => { const score = result.questions.reduce((total, item, index) => total + (toolState.quizAnswers[index] === item.answer ? 1 : 0), 0); document.getElementById('quizScore').innerText = `${score} / ${result.questions.length} correct`; });
    } else if (toolId === 'planner' && result?.days) {
        outputPanel.innerHTML = `<div class="planner-result"><span class="panel-kicker">Your week</span><h3>${escapeHtml(result.weekTitle || 'Study plan')}</h3><div class="planner-days">${result.days.map(day => `<article><span>${escapeHtml(day.day || '')}</span><strong>${escapeHtml(day.focus || '')}</strong><ul>${(day.sessions || []).map(session => `<li>${escapeHtml(session)}</li>`).join('')}</ul><small>${escapeHtml(day.note || '')}</small></article>`).join('')}</div></div>`;
    } else if (Array.isArray(result) && toolId === 'flashcards') {
        // Render as cards (Flashcards)
        toolState.flashcards = result; toolState.flashcardIndex = 0; renderFlashcard();
    } else {
        // Render as formatted text
        // Replace newlines with <br> or use white-space: pre-wrap
        outputPanel.innerHTML = `
            <div class="result-item" style="border-left: 4px solid var(--primary-color);">
                <div style="white-space: pre-wrap; line-height: 1.6; color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(String(result).replace(/##/g, '').replace(/\*\*/g, ''))}</div>
            </div>
        `;
    }
}

function setupToolControls(toolId, config) {
    const controls = document.getElementById('toolControls');
    if (toolId === 'resume') {
        controls.innerHTML = '<div class="form-grid"><input class="custom-input" data-resume="name" placeholder="Your name"><input class="custom-input" data-resume="role" placeholder="Target role"><input class="custom-input" data-resume="email" placeholder="Email"><input class="custom-input" data-resume="location" placeholder="Location"></div>';
    } else if (toolId === 'presentation') {
        controls.innerHTML = '<label class="select-control">Deck length <select class="custom-select" data-setting="slides"><option>5 slides</option><option selected>7 slides</option><option>10 slides</option></select></label>';
    } else if (toolId === 'photo') {
        controls.innerHTML = '<label class="upload-control"><i class="ti ti-upload"></i><span>Upload a photo of your notes</span><input type="file" id="photoUpload" accept="image/*"></label><small id="ocrStatus">OCR runs locally in your browser.</small>';
        document.getElementById('photoUpload').addEventListener('change', runPhotoOCR);
    } else if (toolId === 'dashboard_data') {
        controls.innerHTML = '<div class="sheets-connect"><input class="custom-input" data-setting="sheetsUrl" placeholder="Google Sheets Web App URL"><button type="button" class="secondary-action" id="loadSheetsBtn"><i class="ti ti-refresh"></i> Load rows</button></div><div class="chip-row">' + config.controls.map((control, index) => `<button type="button" class="control-chip${index === 0 ? ' active' : ''}">${control}</button>`).join('') + '</div>';
        document.getElementById('loadSheetsBtn').addEventListener('click', loadSheetsData);
    } else {
        controls.innerHTML = config.controls.map((control, index) => `<button type="button" class="control-chip${index === 0 ? ' active' : ''}">${control}</button>`).join('');
    }
    controls.querySelectorAll('.control-chip').forEach(control => control.addEventListener('click', () => { controls.querySelectorAll('.control-chip').forEach(item => item.classList.remove('active')); control.classList.add('active'); }));
}

function collectToolInput(toolId) {
    const rawInput = document.getElementById('toolInput').value.trim();
    const selected = document.querySelector('#toolControls .control-chip.active')?.innerText || '';
    if (toolId === 'resume') {
        const details = Object.fromEntries([...document.querySelectorAll('[data-resume]')].map(field => [field.dataset.resume, field.value.trim()]));
        const input = `Resume details: ${JSON.stringify(details)}\nAdditional details: ${rawInput}`;
        toolState.lastResumeInput = input;
        return input;
    }
    if (toolId === 'presentation') return `${rawInput}\nPlease create ${document.querySelector('[data-setting="slides"]')?.value || '7 slides'}.`;
    if (toolId === 'dashboard_data') return `${rawInput}\nAnalysis mode: ${selected}\nSheets URL if provided: ${document.querySelector('[data-setting="sheetsUrl"]')?.value || 'none'}`;
    if (toolId === 'doubt') return `${toolState.tutorMessages.map(message => `${message.role}: ${message.text}`).join('\n')}\nstudent: ${rawInput}`;
    return `${rawInput}\nPreferred mode: ${selected}`;
}

function hasResumeDetails() {
    return [...document.querySelectorAll('[data-resume]')].some(field => field.value.trim()) || document.getElementById('toolInput').value.trim().length > 20;
}

function renderResumeResult(resume) {
    const contact = [resume.contact?.email, resume.contact?.location].filter(Boolean).join('  |  ');
    const experience = (resume.experience || []).map(item => `<article class="resume-entry"><div><h4 contenteditable="true">${escapeHtml(item.role || '')}</h4><strong contenteditable="true">${escapeHtml(item.company || '')}</strong><span contenteditable="true">${escapeHtml(item.dates || '')}</span></div><ul>${(item.bullets || []).map(bullet => `<li contenteditable="true">${escapeHtml(bullet)}</li>`).join('')}</ul></article>`).join('');
    const education = (resume.education || []).map(item => `<li><strong contenteditable="true">${escapeHtml(item.degree || '')}</strong><span contenteditable="true">${escapeHtml(item.school || '')} ${escapeHtml(item.dates || '')}</span></li>`).join('');
    const projects = (resume.projects || []).map(item => `<article class="resume-project"><strong contenteditable="true">${escapeHtml(item.name || '')}</strong><p contenteditable="true">${escapeHtml(item.description || '')}</p>${item.url ? `<small contenteditable="true">${escapeHtml(item.url)}</small>` : ''}</article>`).join('');
    const section = (title, body) => body ? `<section class="resume-section"><h3>${title}</h3>${body}</section>` : '';
    document.getElementById('toolOutput').innerHTML = `<div class="resume-result"><div class="resume-toolbar"><span class="resume-status"><i class="ti ti-circle-check"></i> ATS-ready draft</span><div><button class="icon-action" id="editResumeBtn" title="Edit resume"><i class="ti ti-edit"></i></button><button class="icon-action" id="copyResumeBtn" title="Copy resume"><i class="ti ti-copy"></i></button><button class="icon-action" id="printResumeBtn" title="Save as PDF"><i class="ti ti-file-type-pdf"></i></button><button class="icon-action" id="docxResumeBtn" title="Download DOCX"><i class="ti ti-file-type-docx"></i></button><button class="secondary-action compact-action" id="regenerateResumeBtn"><i class="ti ti-refresh"></i> Regenerate</button></div></div><article class="resume-paper-result" id="resumePaper"><header><h2 contenteditable="true">${escapeHtml(resume.name || '')}</h2><h4 contenteditable="true">${escapeHtml(resume.headline || '')}</h4><p contenteditable="true">${escapeHtml(contact)}</p></header>${section('Professional Summary', `<p contenteditable="true">${escapeHtml(resume.summary || '')}</p>`)}${section('Skills', `<div class="resume-skills">${(resume.skills || []).map(skill => `<span contenteditable="true">${escapeHtml(skill)}</span>`).join('')}</div>`)}${section('Experience', experience)}${section('Education', `<ul class="resume-education">${education}</ul>`)}${section('Projects', projects)}${section('Certifications', `<p contenteditable="true">${escapeHtml((resume.certifications || []).join('  |  '))}</p>`)}</article></div>`;
    document.getElementById('editResumeBtn').addEventListener('click', () => { const paper = document.getElementById('resumePaper'); paper.classList.toggle('resume-editing'); showToast(paper.classList.contains('resume-editing') ? 'Resume editing enabled.' : 'Resume edits are ready to export.'); });
    document.getElementById('copyResumeBtn').addEventListener('click', () => copyResumeText());
    document.getElementById('printResumeBtn').addEventListener('click', printResume);
    document.getElementById('docxResumeBtn').addEventListener('click', downloadResumeDocx);
    document.getElementById('regenerateResumeBtn').addEventListener('click', () => executeTool('resume', 'Resume Builder'));
}

function resumeText() {
    return document.getElementById('resumePaper')?.innerText.trim() || '';
}

async function copyResumeText() {
    try { await navigator.clipboard.writeText(resumeText()); showToast('Resume copied to clipboard.'); } catch (error) { showToast('Clipboard access was blocked by the browser.', true); }
}

function printResume() {
    const paper = document.getElementById('resumePaper');
    if (!paper) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) { showToast('Allow pop-ups to create the PDF.', true); return; }
    printWindow.document.write(`<html><head><title>Resume</title><style>body{font-family:Inter,Arial,sans-serif;color:#172936;padding:42px;line-height:1.45}h2{font-size:28px;margin:0}h3{font-size:12px;text-transform:uppercase;border-bottom:1px solid #dce3e5;padding-bottom:5px;margin-top:22px}h4{margin:4px 0}p{font-size:11px}li{font-size:11px;margin:4px 0}.resume-skills span{margin-right:10px;font-size:11px}</style></head><body>${paper.outerHTML}</body></html>`);
    printWindow.document.close(); printWindow.focus(); printWindow.print();
}

async function downloadResumeDocx() {
    if (!window.docx) { showToast('DOCX export is still loading. Try again in a moment.', true); return; }
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
    const lines = resumeText().split('\n').filter(Boolean);
    const children = lines.map((line, index) => new Paragraph({ children: [new TextRun({ text: line, bold: index === 0 || /^[A-Z][A-Z ]+$/.test(line), size: index === 0 ? 32 : 22 })], heading: index === 0 ? HeadingLevel.TITLE : undefined, spacing: { after: 100 } }));
    const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'ats-resume.docx'; link.click(); URL.revokeObjectURL(link.href); showToast('DOCX downloaded.');
}

function renderEmptyState(toolId) {
    const message = toolId === 'doubt' ? 'Your conversation will appear here.' : 'Give the tool a little context and your result will appear in this space.';
    document.getElementById('toolOutput').innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="ti ti-sparkles"></i></div><strong>${toolId === 'doubt' ? 'A better explanation starts here.' : 'Your next draft starts here.'}</strong><p>${message}</p></div>`;
}

function renderFlashcard() {
    const card = toolState.flashcards[toolState.flashcardIndex];
    if (!card) return;
    document.getElementById('toolOutput').innerHTML = `<div class="flashcard-result"><div class="flashcard" id="activeFlashcard"><div class="flashcard-face flashcard-front"><span>Question ${toolState.flashcardIndex + 1} / ${toolState.flashcards.length}</span><strong>${escapeHtml(card.q || '')}</strong><small>Click to reveal answer</small></div><div class="flashcard-face flashcard-back"><span>Answer</span><strong>${escapeHtml(card.a || '')}</strong><small>Click to return</small></div></div><div class="flashcard-actions"><button class="secondary-action" id="previousCard"><i class="ti ti-arrow-left"></i></button><button class="secondary-action" id="nextCard">Next card <i class="ti ti-arrow-right"></i></button></div></div>`;
    document.getElementById('activeFlashcard').addEventListener('click', event => { if (!event.target.closest('button')) event.currentTarget.classList.toggle('flipped'); });
    document.getElementById('previousCard').addEventListener('click', () => { toolState.flashcardIndex = (toolState.flashcardIndex - 1 + toolState.flashcards.length) % toolState.flashcards.length; renderFlashcard(); });
    document.getElementById('nextCard').addEventListener('click', () => { toolState.flashcardIndex = (toolState.flashcardIndex + 1) % toolState.flashcards.length; renderFlashcard(); });
}

async function runPhotoOCR(event) {
    const file = event.target.files?.[0];
    if (!file || typeof Tesseract === 'undefined') return;
    const status = document.getElementById('ocrStatus'); status.innerText = 'Reading the page locally...';
    try { const result = await Tesseract.recognize(file, 'eng'); document.getElementById('toolInput').value = result.data.text.trim(); updateInputCounter(); status.innerText = 'Text extracted. Review it, then summarize.'; } catch (error) { status.innerText = 'OCR could not read this image. Paste the text instead.'; }
}

async function loadSheetsData() {
    const url = document.querySelector('[data-setting="sheetsUrl"]')?.value.trim();
    if (!url) { showToast('Add your deployed Sheets Web App URL first.', true); return; }
    const button = document.getElementById('loadSheetsBtn');
    button.disabled = true;
    button.innerHTML = '<i class="ti ti-loader"></i> Loading';
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('The Sheets Web App did not respond.');
        const data = await response.json();
        document.getElementById('toolInput').value = JSON.stringify(data, null, 2);
        updateInputCounter();
        showToast('Rows loaded. Choose an analysis mode and run it.');
    } catch (error) {
        showToast(error.message || 'Could not load the Sheets data.', true);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="ti ti-refresh"></i> Load rows';
    }
}

function downloadText(filename, content) { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' })); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }

function updateInputCounter() {
    const input = document.getElementById('toolInput');
    const counter = document.getElementById('inputCounter');
    if (input && counter) counter.innerText = `${input.value.length} / 4000`;
}

function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

// --- Utilities ---
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.background = isError ? 'var(--icon-red)' : 'var(--icon-green)';
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
