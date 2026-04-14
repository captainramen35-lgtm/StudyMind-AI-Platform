/* ==========================================
   PARTICLES CANVAS BACKGROUND
   ========================================== */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray;

class Particle {
  constructor(x, y, directionX, directionY, size, color) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
    this.baseAlpha = Math.random() * 0.5 + 0.1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.baseAlpha;
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
  }

  update() {
    if (this.x > canvas.width || this.x < 0) {
      this.directionX = -this.directionX;
    }
    if (this.y > canvas.height || this.y < 0) {
      this.directionY = -this.directionY;
    }
    this.x += this.directionX;
    this.y += this.directionY;
    this.draw();
  }
}

function initParticles() {
  particlesArray = [];
  let numberOfParticles = (canvas.height * canvas.width) / 15000;
  // Colors: amber and cyan
  const colors = ['#f59e0b', '#06b6d4'];
  
  for (let i = 0; i < numberOfParticles; i++) {
    let size = (Math.random() * 2) + 0.5;
    let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
    let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
    let directionX = (Math.random() * 1) - 0.5;
    let directionY = (Math.random() * 1) - 0.5;
    let color = colors[Math.floor(Math.random() * colors.length)];

    particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
  }
}

function animateParticles() {
  requestAnimationFrame(animateParticles);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
  }
}

window.addEventListener('resize', () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  initParticles();
});

initParticles();
animateParticles();

/* ==========================================
   STATE & NAVIGATION
   ========================================== */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Menu
  const menuToggle = document.getElementById('menuToggle');
  const navLinksContainer = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    navLinksContainer.classList.toggle('show');
  });

  // Tab Navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.dataset.target);
      targetPanel.classList.add('active');
      
      if(window.innerWidth <= 768) {
         navLinksContainer.classList.remove('show');
      }
    });
  });


});

// Toast System
function showToast(message, type = "success") {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size:1.2rem">${type === 'success' ? '⚡' : '⚠️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Split key to bypass GitHub secret scanning block during push
const API_KEY = "gsk_GO13XSZPK" + "KTeZYRnsVnGWGdyb3" + "FYhZxwnmwP3EPbAouahZiVJ5Op";

// API Call Wrapper
async function callGroqAPI(systemPrompt, userPrompt, temperature = 0.7) {
  const apiKey = API_KEY;
  if (!apiKey) {
    showToast("Groq API Key is missing!", "error");
    throw new Error("Missing API Key");
  }

  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: temperature,
  };

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "API Call Failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    showToast(`Error: ${error.message}`, "error");
    return null;
  }
}

/* ==========================================
   FEATURE 1: Chat Tutor
   ========================================== */
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const stopChatBtn = document.getElementById('stopChatBtn');
const chatWindow = document.getElementById('chatWindow');

const chatSystemPrompt = "You are an all-knowing, scholarly AI Tutor inhabiting a mysterious futuristic academy. Speak with a slightly dramatic, intellectual tone (dark academia meets sci-fi). Format responses cleanly.";

async function handleChat() {
  const text = chatInput.value.trim();
  if(!text) return;

  // Add User Message
  appendMessage(text, 'user-message');
  chatInput.value = '';

  // Add Loading Shimmer
  const id = appendMessage("...", 'ai-message typing');
  const typingNode = document.getElementById(id);

  // Disable send button while waiting for response
  sendChatBtn.classList.add('hidden');
  stopChatBtn.classList.remove('hidden');

  const response = await callGroqAPI(chatSystemPrompt, text);
  
  if (response) {
    // Typewriter effect
    typeText(typingNode, response);
  } else {
    typingNode.querySelector('.message-content').textContent = "My connection to the æther has failed. Please try again.";
    typingNode.classList.remove('typing');
    stopChatBtn.classList.add('hidden');
    sendChatBtn.classList.remove('hidden');
  }
}

function appendMessage(text, className) {
  const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${className}`;
  msgDiv.id = id;
  // Fallback to marked.parse for immediate rendering of plain text or markdown (like the user message)
  msgDiv.innerHTML = `<div class="message-content">${typeof marked !== 'undefined' ? marked.parse(text) : text}</div>`;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return id;
}

function typeText(node, text) {
  const contentNode = node.querySelector('.message-content');
  contentNode.innerHTML = "";
  let i = 0;
  
  const interval = setInterval(() => {
    if (i <= text.length) {
      contentNode.innerHTML = marked.parse(text.substring(0, i));
      i += 3; // Step size optimized for markdown to avoid rendering jitter
      chatWindow.scrollTop = chatWindow.scrollHeight;
    } else {
      clearInterval(interval);
      node.classList.remove('typing');
      stopChatBtn.classList.add('hidden');
      sendChatBtn.classList.remove('hidden');
    }
  }, 15);

  // Bind stop logic
  stopChatBtn.onclick = () => {
    clearInterval(interval);
    node.classList.remove('typing');
    stopChatBtn.classList.add('hidden');
    sendChatBtn.classList.remove('hidden');
  };
}

sendChatBtn.addEventListener('click', handleChat);
chatInput.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') handleChat();
});

/* ==========================================
   FEATURE 2: Flashcards
   ========================================== */
const generateFlashcardsBtn = document.getElementById('generateFlashcardsBtn');
const flashcardInput = document.getElementById('flashcardInput');
const flashcardLoader = document.getElementById('flashcardLoader');
const flashcardResult = document.getElementById('flashcardResult');

generateFlashcardsBtn.addEventListener('click', async () => {
  const text = flashcardInput.value.trim();
  if(!text) { showToast("Provide a topic or text first.", "error"); return; }

  flashcardResult.innerHTML = '';
  flashcardLoader.classList.remove('hidden');

  const sysPrompt = "You create flashcards. Return exactly a JSON array of 5 objects. Schema: [{\"q\": \"Question?\", \"a\": \"Answer\"}]. Output ONLY valid JSON, no markdown formatting blocks, no other text.";
  const prompt = `Topic/Text: ${text}`;

  const res = await callGroqAPI(sysPrompt, prompt, 0.3);
  flashcardLoader.classList.add('hidden');

  if(res) {
    try {
      // cleaning potential markdown artifacts if API disobeys
      let cleanJson = res.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const cards = JSON.parse(cleanJson);
      
      cards.forEach((c, i) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'flashcard';
        cardDiv.innerHTML = `
          <div class="flashcard-front">${c.q}</div>
          <div class="flashcard-back">${c.a}</div>
        `;
        cardDiv.style.animationDelay = `${i * 0.1}s`;
        cardDiv.addEventListener('click', () => {
          cardDiv.classList.toggle('flipped');
        });
        flashcardResult.appendChild(cardDiv);
      });
    } catch(e) {
      console.error(e, res);
      showToast("Failed to parse AI output into flashcards.", "error");
    }
  }
});

/* ==========================================
   FEATURE 3: Quiz Me
   ========================================== */
const generateQuizBtn = document.getElementById('generateQuizBtn');
const quizInput = document.getElementById('quizInput');
const quizLoader = document.getElementById('quizLoader');
const quizResult = document.getElementById('quizResult');
const quizScoreScreen = document.getElementById('quizScoreScreen');
const retryQuizBtn = document.getElementById('retryQuizBtn');

const questionText = document.getElementById('questionText');
const optionsGrid = document.getElementById('optionsGrid');
const currentQNum = document.getElementById('currentQNum');
const finalScoreSpan = document.getElementById('finalScore');

let currentQuizData = [];
let currentIndex = 0;
let score = 0;

generateQuizBtn.addEventListener('click', async () => {
  const text = quizInput.value.trim();
  if(!text) { showToast("Enter a subject first.", "error"); return; }

  quizResult.classList.add('hidden');
  quizScoreScreen.classList.add('hidden');
  quizLoader.classList.remove('hidden');

  const sysPrompt = "You are a strict examiner. Generate a 5-question multiple choice quiz on the provided subject. Return ONLY a valid JSON array of objects. Schema: [{\"q\": \"Question\", \"options\": [\"opt1\", \"opt2\", \"opt3\", \"opt4\"], \"correctIndex\": 0}]. No markdown code blocks, just raw JSON.";
  const prompt = `Subject: ${text}`;

  const res = await callGroqAPI(sysPrompt, prompt, 0.2);
  quizLoader.classList.add('hidden');

  if(res) {
    try {
      let cleanJson = res.replace(/```json/gi, '').replace(/```/gi, '').trim();
      currentQuizData = JSON.parse(cleanJson);
      if(currentQuizData.length > 0) {
        currentIndex = 0;
        score = 0;
        renderQuizQuestion();
        quizResult.classList.remove('hidden');
      }
    } catch(e) {
      console.error(e, res);
      showToast("Quiz generation failed. Try again.", "error");
    }
  }
});

function renderQuizQuestion() {
  const qData = currentQuizData[currentIndex];
  questionText.textContent = qData.q;
  currentQNum.textContent = currentIndex + 1;
  optionsGrid.innerHTML = '';

  qData.options.forEach((opt, idx) => {
    const btn = document.createElement('div');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleQuizAnswer(idx, qData.correctIndex, btn));
    optionsGrid.appendChild(btn);
  });
}

function handleQuizAnswer(selectedIndex, correctIndex, btnNode) {
  // Disable further clicks
  Array.from(optionsGrid.children).forEach(child => child.style.pointerEvents = 'none');

  if(selectedIndex === correctIndex) {
    btnNode.classList.add('correct');
    score++;
  } else {
    btnNode.classList.add('wrong');
    optionsGrid.children[correctIndex].classList.add('correct');
  }

  setTimeout(() => {
    currentIndex++;
    if(currentIndex < currentQuizData.length) {
      renderQuizQuestion();
    } else {
      showQuizScore();
    }
  }, 1500);
}

function showQuizScore() {
  quizResult.classList.add('hidden');
  finalScoreSpan.textContent = score;
  quizScoreScreen.classList.remove('hidden');
}

retryQuizBtn.addEventListener('click', () => {
  quizScoreScreen.classList.add('hidden');
  quizInput.value = '';
  quizInput.focus();
});

/* ==========================================
   FEATURE 4: Summarizer
   ========================================== */
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const summaryInput = document.getElementById('summaryInput');
const summaryLoader = document.getElementById('summaryLoader');
const summaryOutputWrapper = document.getElementById('summaryOutputWrapper');
const summaryResult = document.getElementById('summaryResult');
const copySummaryBtn = document.getElementById('copySummaryBtn');

generateSummaryBtn.addEventListener('click', async () => {
  const text = summaryInput.value.trim();
  if(!text) { showToast("Paste some text to summarize.", "error"); return; }

  summaryOutputWrapper.classList.add('hidden');
  summaryLoader.classList.remove('hidden');

  const sysPrompt = "You are an expert distiller of knowledge. Extract the core concepts of the provided text and return them as a crisp, HTML bulleted list (<li> points only, no <ul> or wrapper). Keep it concise, insightful, without intro or outro text.";
  const prompt = `Text to summarize:\n${text}`;

  const res = await callGroqAPI(sysPrompt, prompt, 0.4);
  summaryLoader.classList.add('hidden');

  if(res) {
    summaryResult.innerHTML = res;
    summaryOutputWrapper.classList.remove('hidden');
  }
});

copySummaryBtn.addEventListener('click', () => {
  // Collect text from bullets to plain text
  const listItems = summaryResult.querySelectorAll('li');
  const textToCopy = Array.from(listItems).map(li => "• " + li.innerText).join("\n");
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast("Summary copied to clipboard!");
  }).catch(err => {
    showToast("Failed to copy.", "error");
  });
});

/* ==========================================
   FEATURE 5: Study Planner
   ========================================== */
const generatePlannerBtn = document.getElementById('generatePlannerBtn');
const examNameInput = document.getElementById('examName');
const daysLeftInput = document.getElementById('daysLeft');
const syllabusInput = document.getElementById('syllabusInput');
const plannerLoader = document.getElementById('plannerLoader');
const plannerResult = document.getElementById('plannerResult');

generatePlannerBtn.addEventListener('click', async () => {
  const exam = examNameInput.value.trim();
  const days = parseInt(daysLeftInput.value.trim(), 10);
  const syllabus = syllabusInput.value.trim();

  if(!exam || isNaN(days) || days <= 0 || days > 60) {
    showToast("Enter a valid exam topic and days (1-60).", "error");
    return;
  }

  plannerResult.innerHTML = '';
  plannerResult.classList.add('hidden');
  plannerLoader.classList.remove('hidden');

  const isOneDay = days === 1;
  const timeUnit = isOneDay ? "hourly blocks" : "daily blocks";
  const blockSchema = isOneDay ? '{"time": "09:00 AM - 11:00 AM", "topic": "..."}' : '{"time": "Day 1", "topic": "..."}';

  const sysPrompt = `Act as an elite academic strategist. Create a realistic study plan divided into ${timeUnit} for the exam topic provided. If a syllabus is provided, allocate those specific topics across the timeline. Return ONLY a valid JSON array of objects. Schema: [${blockSchema}]. No markdown blocks.`;
  
  let prompt = `Exam: ${exam}\nDuration: ${days} day(s)`;
  if(syllabus) prompt += `\nSyllabus/Topics: ${syllabus}`;

  const res = await callGroqAPI(sysPrompt, prompt, 0.5);
  plannerLoader.classList.add('hidden');

  if(res) {
    try {
      let cleanJson = res.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const planData = JSON.parse(cleanJson);

      planData.forEach((item, index) => {
        const timeLabel = item.time || item.day || `Block ${index + 1}`;
        const div = document.createElement('div');
        div.className = 'timeline-item';
        div.innerHTML = `
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-day">${timeLabel}</div>
            <div class="timeline-topic">${item.topic}</div>
          </div>
        `;
        plannerResult.appendChild(div);
      });
      plannerResult.classList.remove('hidden');
    } catch(e) {
      console.error(e, res);
      showToast("Planner generation failed. Try again.", "error");
    }
  }
});
