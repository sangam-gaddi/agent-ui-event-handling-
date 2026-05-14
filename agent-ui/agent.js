// ============================================================
// agent.js — AI Agent Task Configurator
// Demonstrates: keyboard, mouse, change, focus/blur, submit,
//               drag/drop, click, scroll, animationend events
// Course: Full Stack Development (22UIS601C) | BEC Bagalkote
// ============================================================

"use strict";

// ─── DOM REFERENCES ────────────────────────────────────────
const input          = document.getElementById("search-input");
const charPill       = document.getElementById("char-pill");
const msgCount       = document.getElementById("msg-count");
const queueCount     = document.getElementById("queue-count");
const searchItems    = document.getElementById("search-items");
const taskQueueList  = document.getElementById("task-queue-list");
const taskForm       = document.getElementById("task-form");
const eventText      = document.getElementById("event-text");
const agentNameDisp  = null; // removed from modal header
const calcPanel      = document.getElementById("calc-panel");
const calcToggleBtn  = document.getElementById("calc-toggle-btn");
const calcCloseBtn   = document.getElementById("calc-close");
const canvasOverlay  = document.getElementById("canvas-overlay");
const canvasToggleBtn= document.getElementById("canvas-toggle-btn");
const canvasCloseBtn = document.getElementById("canvas-close-btn");
const canvasClearBtn = document.getElementById("canvas-clear-btn");
const sketchCanvas   = document.getElementById("sketch-canvas");
const tags           = document.querySelectorAll(".tag");
const qActions       = document.querySelectorAll(".q-action:not(.q-header)");
// Output panel
const outputPanel    = document.getElementById("output-panel");
const outputAgentName= document.getElementById("output-agent-name");
const outputOrb      = document.getElementById("output-orb");
const genBadge       = document.getElementById("gen-badge");
const thinkingDots   = document.getElementById("thinking-dots");
const outputText     = document.getElementById("output-text");
const outputMeta     = document.getElementById("output-meta");
const copyBtn        = document.getElementById("copy-btn");
const regenBtn       = document.getElementById("regen-btn");
const closeOutputBtn = document.getElementById("close-output-btn");

// ─── STATE ─────────────────────────────────────────────────
let activeAgent  = { name: "Voice Assistant", color: "#8b5cf6", id: "voice" };
let queueCounter = 2;
let dragSrcEl    = null;
let isDrawing    = false;
let lastX = 0, lastY = 0;
let lastResponse = "";

// ─── UTILITY: LOG EVENT ────────────────────────────────────
function logEvent(msg) {
  eventText.textContent = `⚡ ${msg}`;
  eventText.style.color = activeAgent.color;
  clearTimeout(logEvent._timer);
  logEvent._timer = setTimeout(() => {
    eventText.style.color = "";
    eventText.textContent = "Waiting for interaction...";
  }, 2800);
}

// ─── UTILITY: SET AGENT THEME ──────────────────────────────
function setAgentTheme(color) {
  document.documentElement.style.setProperty("--agent-color", color);
  document.querySelector(".event-dot").style.background = color;
  document.querySelector(".event-dot").style.boxShadow  = `0 0 8px ${color}`;
  document.querySelector(".submit-btn").style.background =
    `linear-gradient(135deg, ${color}, ${color}bb)`;
  if (outputOrb) outputOrb.style.setProperty("background",
    `conic-gradient(${color}, #6d28d9, #ec4899, ${color})`);
}

// ─── UTILITY: TYPEWRITER ───────────────────────────────────
function typeWriter(el, text, speed = 28, cb) {
  let i = 0;
  el.textContent = "";
  const interval = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) { clearInterval(interval); if (cb) cb(); }
  }, speed);
}

// ─── UTILITY: UPDATE CALCULATORS ──────────────────────────
function updateCalcs(text) {
  const tokens   = Math.max(0, Math.ceil(text.length / 4));
  const timeVal  = text.length === 0 ? "0.0" : (tokens * 0.02 + 0.3).toFixed(2);
  const words    = text.trim() === "" ? [] : text.trim().split(/\s+/);
  const unique   = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, ""))).size;
  const sentences= (text.match(/[.!?]+/g) || []).length;
  const avgLen   = words.length ? (words.reduce((a, w) => a + w.length, 0) / words.length).toFixed(1) : "0";

  document.getElementById("token-count").textContent = tokens;
  document.getElementById("time-count").textContent  = timeVal;
  document.getElementById("word-count").textContent  = words.length;
  document.getElementById("unique-count").textContent= unique;
  document.getElementById("sent-count").textContent  = sentences;
  document.getElementById("avg-len").textContent     = avgLen;

  // Complexity scorer
  let score = 0;
  if (words.length > 5)  score += 20;
  if (words.length > 20) score += 20;
  const ratio = words.length ? unique / words.length : 0;
  score += Math.round(ratio * 30);
  if (parseFloat(avgLen) > 5) score += 15;
  if (parseFloat(avgLen) > 7) score += 15;
  score = Math.min(score, 100);

  const bar   = document.getElementById("complexity-bar");
  const label = document.getElementById("complexity-label");
  bar.style.width = score + "%";

  if (score < 25)       { label.textContent = "Simple";   bar.style.background = "#10b981"; }
  else if (score < 50)  { label.textContent = "Medium";   bar.style.background = "#f59e0b"; }
  else if (score < 75)  { label.textContent = "Complex";  bar.style.background = "#f97316"; }
  else                  { label.textContent = "Advanced"; bar.style.background = "#ef4444"; }
}

// ─── UTILITY: ADD TASK TO QUEUE ───────────────────────────
function addTask(text) {
  queueCounter++;
  const ext   = activeAgent.id === "code" ? ".js" : activeAgent.id === "image" ? ".img" : ".task";
  const short = text.length > 26 ? text.slice(0, 26) + "…" : text;
  const div   = document.createElement("div");
  div.className = "f-item";
  div.draggable = true;
  div.dataset.id = "q" + queueCounter;
  div.innerHTML = `
    <div class="icon"><i class="ph ph-queue"></i></div>
    <div class="file-item">
      <p>${short}<span>${ext}</span></p>
      <p><i class="ph ph-checks"></i></p>
    </div>
    <div class="btn task-run-btn"><i class="ph-bold ph-share-fat"></i><span>Run</span></div>`;
  taskQueueList.appendChild(div);
  queueCount.textContent = parseInt(queueCount.textContent) + 1;
  attachQueueDrag(div);
}

// ─── UTILITY: ADD CONVERSATION ITEM ───────────────────────
function addConversationItem(userMsg) {
  const responses = {
    voice: [
      "Transcription complete — detected 3 speakers, 99.1% confidence.",
      "Audio processed. Duration: 1m 42s, language: English.",
      "Voice command parsed: action queued successfully."
    ],
    image: [
      "Image analyzed — 8 objects, 1 face, scene: outdoor, mood: neutral.",
      "Detected: text overlay, 3 dominant colors, no NSFW content.",
      "Visual embedding created. Similarity search ready."
    ],
    code: [
      "Code analyzed — O(n²) complexity. Refactor suggestion ready.",
      "Generated 58 lines of TypeScript. 0 lint errors detected.",
      "Dependency graph built. 4 unused imports flagged."
    ]
  };
  const pool = responses[activeAgent.id];
  const resp = pool[Math.floor(Math.random() * pool.length)];

  const li   = document.createElement("li");
  li.draggable = true;
  li.classList.add("new-msg");
  const avatarIdx = activeAgent.id === "voice" ? 1 : activeAgent.id === "image" ? 2 : 3;
  li.innerHTML = `
    <div class="user" id="av-new" style="background:url('./assets/user-${avatarIdx}.jpg') no-repeat 50%/cover;${avatarIdx===3?'border-radius:4px':''}"></div>
    <a href="#">${activeAgent.name} <span id="resp-span-${queueCounter}">…</span></a>
    <div class="item-icons">
      <div class="icon"><i class="ph ph-chat-teardrop-text"></i></div>
      <div class="icon"><i class="ph ph-list-plus"></i></div>
    </div>`;
  searchItems.appendChild(li);
  msgCount.textContent = searchItems.querySelectorAll("li").length;

  setTimeout(() => {
    const span = document.getElementById("resp-span-" + queueCounter);
    if (span) typeWriter(span, resp, 22);
  }, 700);

  attachConvDrag(li);
}

// ─── (1) KEYBOARD EVENT: keyup — live char counter ─────────
input.addEventListener("keyup", (e) => {
  const len = input.value.length;
  charPill.textContent = len;
  charPill.classList.toggle("warn",   len >= 200 && len < 270);
  charPill.classList.toggle("danger", len >= 270);
  updateCalcs(input.value);
  logEvent(`keyup · key="${e.key}" · chars=${len}`);
});

// ─── (2) KEYBOARD EVENT: keydown — shortcuts ───────────────
document.addEventListener("keydown", (e) => {
  // Escape closes panels
  if (e.key === "Escape") {
    if (canvasOverlay.classList.contains("open")) {
      canvasOverlay.classList.remove("open");
      logEvent("keydown · Escape → Canvas closed");
      return;
    }
    if (calcPanel.classList.contains("open")) {
      calcPanel.classList.remove("open");
      logEvent("keydown · Escape → Calc panel closed");
      return;
    }
  }
  // Shortcut keys when NOT in input
  if (document.activeElement !== input) {
    if (e.key.toLowerCase() === "a") {
      input.value = "Analyze this image in detail";
      input.focus(); updateCalcs(input.value); charCount.textContent = input.value.length;
      logEvent("keydown · shortcut A → Analyze Image command loaded");
    }
    if (e.key.toLowerCase() === "r") {
      input.value = "Run and explain this code snippet";
      input.focus(); updateCalcs(input.value); charCount.textContent = input.value.length;
      logEvent("keydown · shortcut R → Run Code command loaded");
    }
    if (e.key.toLowerCase() === "s") {
      input.value = "Summarize this text in 3 bullet points";
      input.focus(); updateCalcs(input.value); charCount.textContent = input.value.length;
      logEvent("keydown · shortcut S → Summarize command loaded");
    }
  }
  // Enter submits
  if (e.key === "Enter" && document.activeElement === input) {
    e.preventDefault();
    taskForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    logEvent("keydown · Enter → form submitted");
  }
});

// ─── (3) FOCUS EVENT ───────────────────────────────────────
input.addEventListener("focus", () => {
  document.getElementById("agent-input-bar").classList.add("focused");
  logEvent("focus · Agent input focused");
});

// ─── (4) BLUR EVENT ────────────────────────────────────────
input.addEventListener("blur", () => {
  document.getElementById("agent-input-bar").classList.remove("focused");
  logEvent("blur · Agent input blurred");
});

// ─── (5) CHANGE EVENT: agent tag selection ─────────────────
tags.forEach(tag => {
  tag.addEventListener("click", () => {
    tags.forEach(t => t.classList.remove("active-tag"));
    tag.classList.add("active-tag");
    activeAgent = {
      name  : tag.querySelector("p").textContent,
      color : tag.dataset.color,
      id    : tag.dataset.agent
    };
    setAgentTheme(activeAgent.color);
    const placeholders = {
      voice: "Describe audio task for Voice Agent...",
      image: "Describe image analysis task...",
      code : "Describe code task for Copilot..."
    };
    input.placeholder = placeholders[activeAgent.id];
    tag.dispatchEvent(new Event("change", { bubbles: true }));
    logEvent(`change · Agent switched to "${activeAgent.name}"`);
  });
  tag.addEventListener("change", () => {
    if (outputAgentName) outputAgentName.textContent = activeAgent.name;
  });
});

// ─── (6) MOUSE EVENTS: hover glow on list items ────────────
function attachHoverEvents(container) {
  container.querySelectorAll("li").forEach(li => {
    li.addEventListener("mouseover", () => {
      logEvent(`mouseover · hovered conversation item`);
    });
    li.addEventListener("mouseout", () => {
      logEvent(`mouseout · left conversation item`);
    });
  });
}
attachHoverEvents(searchItems);

// Mouse events on quick-action commands
qActions.forEach(q => {
  q.addEventListener("mouseover", () => logEvent(`mouseover · command: "${q.querySelector("p")?.textContent}"`));
  q.addEventListener("mouseout",  () => logEvent(`mouseout  · left command`));
  q.addEventListener("click", () => {
    const cmd = q.dataset.cmd;
    if (cmd) {
      input.value = cmd;
      input.focus();
      charCount.textContent = cmd.length;
      updateCalcs(cmd);
      logEvent(`click · command shortcut applied: "${cmd}"`);
    }
  });
});

// ─── (7) FORM SUBMIT EVENT ─────────────────────────────────
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (!msg) {
    input.placeholder = "⚠ Please type something first...";
    setTimeout(() => { input.placeholder = "Message your AI agent..."; }, 2000);
    logEvent("submit · REJECTED — empty input");
    return;
  }
  logEvent(`submit · "${msg.slice(0,40)}" → queued for ${activeAgent.name}`);
  addConversationItem(msg);
  addTask(msg);
  showOutputPanel(msg);
  input.value = "";
  charPill.textContent = 0;
  charPill.classList.remove("warn", "danger");
  updateCalcs("");
  input.focus();
});

// ─── GEMINI OUTPUT PANEL ────────────────────────────────────
function showOutputPanel(prompt) {
  outputPanel.classList.add("open");
  outputAgentName.textContent = activeAgent.name;
  genBadge.textContent = "Generating...";
  genBadge.classList.remove("done");
  thinkingDots.classList.remove("hide");
  outputText.innerHTML = "";
  outputMeta.textContent = "";

  const responses = {
    voice: [
      `Voice transcription complete.\n\nDetected: 1 speaker, 99.1% confidence.\nDuration: ~${Math.ceil(prompt.length / 8)}s estimated.\nLanguage: English (en-US)\n\nKey phrases identified:\n• "${prompt.split(' ').slice(0,3).join(' ')}"\n• Sentiment: Neutral\n• Action items: 1 detected.\n\nTask appended to queue successfully.`,
      `Audio analysis done.\n\nTranscribed ${prompt.length} characters of input.\nConfidence: 97.8% · No background noise detected.\nOutput saved as voice-task-${queueCounter}.wav`
    ],
    image: [
      `Image analysis complete.\n\nPrompt: "${prompt.slice(0,60)}"\n\nDetected:\n• Objects: 8 identified\n• Faces: 2 (no PII stored)\n• Dominant colors: #1a1a2e, #8b5cf6, #fff\n• Scene classification: Indoor / Studio\n• Confidence: 94.3%\n\nEmbedding vector generated. Ready for similarity search.`,
      `Visual processing done.\n\nAnalyzed prompt context: ${prompt.length} chars.\nNo NSFW content detected.\nAlt-text generated: "${prompt.slice(0,40)}..."`
    ],
    code: [
      `Code generation complete.\n\nGenerated 58 lines of TypeScript.\nComplexity: O(n log n) — optimal for this pattern.\n\nDependencies used: 0 external\nLint errors: 0\nTest coverage: 82%\n\nCode snippet:\n\`\`\`ts\nconst agentTask = async (prompt: string) => {\n  const tokens = Math.ceil(prompt.length / 4);\n  return await agent.run({ tokens, model: 'gpt-4' });\n};\n\`\`\``,
      `Analysis done.\n\nPrompt parsed: ${prompt.split(' ').length} tokens.\nSuggested pattern: Observer + Strategy\nRefactor opportunity: 2 unused imports flagged.`
    ]
  };

  const pool = responses[activeAgent.id];
  const resp = pool[Math.floor(Math.random() * pool.length)];
  lastResponse = resp;

  const startTime = Date.now();

  setTimeout(() => {
    thinkingDots.classList.add("hide");
    genBadge.textContent = "Streaming";
    // Add blinking cursor
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    outputText.appendChild(cursor);

    let i = 0;
    const interval = setInterval(() => {
      if (i < resp.length) {
        cursor.insertAdjacentText("beforebegin", resp[i++]);
        outputText.scrollTop = outputText.scrollHeight;
      } else {
        clearInterval(interval);
        cursor.remove();
        genBadge.textContent = "Done";
        genBadge.classList.add("done");
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        outputMeta.textContent = `${elapsed}s · ${Math.ceil(resp.length / 4)} tokens · ${activeAgent.name}`;
        logEvent(`output · Response streamed in ${elapsed}s`);
      }
    }, 18);
  }, 1400);
}

// ─── (8) DRAG EVENTS: conversation list reorder ────────────
function attachConvDrag(li) {
  li.addEventListener("dragstart", (e) => {
    dragSrcEl = li;
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", li.dataset.id || "item");
    logEvent(`dragstart · dragging conversation item`);
  });
  li.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll("#search-items li").forEach(el => el.classList.remove("drag-over"));
    li.classList.add("drag-over");
    logEvent(`dragover · hovering drop target`);
  });
  li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    if (dragSrcEl && dragSrcEl !== li) {
      const items = [...searchItems.querySelectorAll("li")];
      const srcIdx = items.indexOf(dragSrcEl);
      const tgtIdx = items.indexOf(li);
      if (srcIdx < tgtIdx) searchItems.insertBefore(dragSrcEl, li.nextSibling);
      else                  searchItems.insertBefore(dragSrcEl, li);
    }
    li.classList.remove("drag-over");
    logEvent(`drop · conversation item reordered`);
  });
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    document.querySelectorAll("#search-items li").forEach(el => el.classList.remove("drag-over"));
    logEvent(`dragend · drag operation complete`);
  });
}
// Attach to existing items
searchItems.querySelectorAll("li").forEach(attachConvDrag);
attachHoverEvents(searchItems);

// ─── (9) DRAG EVENTS: task queue reorder ───────────────────
function attachQueueDrag(item) {
  item.addEventListener("dragstart", (e) => {
    dragSrcEl = item;
    e.dataTransfer.effectAllowed = "move";
    logEvent(`dragstart · dragging task queue item`);
  });
  item.addEventListener("dragover", (e) => {
    e.preventDefault();
    logEvent(`dragover · task queue drop zone`);
  });
  item.addEventListener("drop", (e) => {
    e.preventDefault();
    if (dragSrcEl && dragSrcEl !== item) {
      taskQueueList.insertBefore(dragSrcEl, item.nextSibling);
    }
    logEvent(`drop · task queue reordered`);
  });
}
taskQueueList.querySelectorAll(".f-item").forEach(attachQueueDrag);

// ─── (10) CLICK EVENTS: calc + canvas toggles ──────────────
calcToggleBtn.addEventListener("click", () => {
  calcPanel.classList.toggle("open");
  logEvent(`click · Calculators panel ${calcPanel.classList.contains("open") ? "opened" : "closed"}`);
});
calcCloseBtn.addEventListener("click", () => { calcPanel.classList.remove("open"); logEvent("click · Calc panel closed"); });
canvasToggleBtn.addEventListener("click", () => { canvasOverlay.classList.add("open"); initSketchCanvas(); logEvent("click · Canvas modal opened"); });
canvasCloseBtn.addEventListener("click", () => { canvasOverlay.classList.remove("open"); logEvent("click · Canvas modal closed"); });
canvasClearBtn.addEventListener("click", () => {
  const ctx2 = sketchCanvas.getContext("2d");
  ctx2.fillStyle = "#0d0d2b"; ctx2.fillRect(0,0,sketchCanvas.width,sketchCanvas.height);
  logEvent("click · Canvas cleared");
});
// Output panel controls
closeOutputBtn.addEventListener("click", () => { outputPanel.classList.remove("open"); logEvent("click · Output panel closed"); });
copyBtn.addEventListener("click", () => {
  if (lastResponse) {
    navigator.clipboard.writeText(lastResponse).catch(() => {});
    copyBtn.innerHTML = '<i class="ph ph-check"></i>';
    setTimeout(() => { copyBtn.innerHTML = '<i class="ph ph-copy"></i>'; }, 1500);
  }
  logEvent("click · Response copied to clipboard");
});
regenBtn.addEventListener("click", () => {
  if (outputPanel.classList.contains("open")) { showOutputPanel(input.value || "Regenerate last response"); logEvent("click · Regenerating response"); }
});

// ─── CANVAS DRAW: mousedown, mousemove, mouseup ────────────
let canvasReady = false;
function initSketchCanvas() {
  if (canvasReady) return;
  canvasReady = true;
  sketchCanvas.width  = canvasOverlay.clientWidth;
  sketchCanvas.height = canvasOverlay.clientHeight - 52;
  const ctx2 = sketchCanvas.getContext("2d");
  // Black background, red brush
  ctx2.fillStyle = "#000000";
  ctx2.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  ctx2.lineJoin = "round";
  ctx2.lineCap  = "round";
  ctx2.lineWidth = 8;
  ctx2.strokeStyle = "#ef4444";    /* red brush */
  ctx2.globalCompositeOperation = "source-over";

  sketchCanvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    logEvent("mousedown · Canvas drawing started");
  });
  sketchCanvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    ctx2.beginPath();
    ctx2.moveTo(lastX, lastY);
    ctx2.lineTo(e.offsetX, e.offsetY);
    ctx2.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
    logEvent("mousemove · Drawing on canvas");
  });
  sketchCanvas.addEventListener("mouseup",  () => { isDrawing = false; logEvent("mouseup · Canvas stroke complete"); });
  sketchCanvas.addEventListener("mouseout", () => { isDrawing = false; });
}

// ─── SCROLL EVENT: conversation area ───────────────────────
document.querySelector(".search-items-container")?.addEventListener("scroll", () => {
  logEvent("scroll · Conversation history scrolled");
});

// ─── INIT ──────────────────────────────────────────────────
setAgentTheme(activeAgent.color);
updateCalcs("");
logEvent("init · AI Agent Task Configurator ready — BEC 22UIS601C");
