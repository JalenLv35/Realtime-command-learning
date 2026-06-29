const eventsEl = document.querySelector("#events");
const statusEl = document.querySelector("#status");
const modeBtns = document.querySelectorAll(".mode-btn");

let autoScroll = true;
let currentMode = localStorage.getItem("cl-mode") || "beginner";

// --- Mode logic ---

const MIN_LEVEL = { beginner: 1, intermediate: 2, expert: 3 };

function applyMode(mode) {
  currentMode = mode;
  localStorage.setItem("cl-mode", mode);

  modeBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  const minLevel = MIN_LEVEL[mode] ?? 1;
  document.querySelectorAll(".event[data-level]").forEach((el) => {
    const level = Number(el.dataset.level);
    el.classList.toggle("hidden", level < minLevel);
  });
}

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => applyMode(btn.dataset.mode));
});

// Apply saved mode on load
applyMode(currentMode);

// --- SSE connection ---

function connect() {
  const source = new EventSource("/sse");

  source.onopen = () => {
    statusEl.textContent = "live";
    statusEl.className = "live";
  };

  source.onmessage = (e) => {
    let event;
    try {
      event = JSON.parse(e.data);
    } catch {
      return;
    }
    appendEvent(event);
  };

  source.onerror = () => {
    statusEl.textContent = "reconnecting…";
    statusEl.className = "offline";
    source.close();
    setTimeout(connect, 3000);
  };
}

// --- Rendering ---

function appendEvent(event) {
  const el = renderEvent(event);
  if (!el) return;

  // Apply current mode filter
  if (el.dataset.level) {
    const minLevel = MIN_LEVEL[currentMode] ?? 1;
    if (Number(el.dataset.level) < minLevel) {
      el.classList.add("hidden");
    }
  }

  eventsEl.appendChild(el);

  if (autoScroll) {
    eventsEl.scrollTop = eventsEl.scrollHeight;
  }
}

function renderEvent(event) {
  if (event.type === "command_explained") {
    return renderExplained(event);
  }
  if (event.type === "command_finished") {
    return renderFinished(event);
  }
  return null;
}

function renderExplained(event) {
  const hasRisk = event.risks?.length > 0;
  const level = event.level ?? 2;

  const article = el("article", {
    class: `event${hasRisk ? " has-risk" : ""}`,
    "data-level": level
  });

  const time = event.createdAt
    ? new Date(event.createdAt).toLocaleTimeString("zh-CN", { hour12: false })
    : "";

  const firstToken = (event.command ?? "").match(/\S+/)?.[0] ?? "";
  const levelLabel = ["", "基础", "进阶", "高级"][level] ?? "";

  article.appendChild(
    el("div", { class: "event-meta" }, [
      text(`${time} `),
      el("span", { class: "cmd-name" }, [text(firstToken)]),
      text(` · ${levelLabel}`)
    ])
  );

  const pre = el("pre");
  pre.textContent = event.command ?? "";
  article.appendChild(pre);

  if (event.explanation?.length) {
    const ul = el("ul", { class: "explanation-list" });
    for (const item of event.explanation) {
      const li = el("li", { class: "explanation-item" }, [
        el("span", { class: "label" }, [text(`\`${item.label}\``)]),
        text(`: ${item.text}`)
      ]);
      ul.appendChild(li);
    }
    article.appendChild(ul);
  }

  if (hasRisk) {
    const risks = el("div", { class: "risks" });
    for (const risk of event.risks) {
      const cls = risk.level === "high" ? "risk-badge risk-high" : "risk-badge risk-medium";
      risks.appendChild(el("span", { class: cls }, [text(risk.text)]));
    }
    article.appendChild(risks);
  }

  return article;
}

function renderFinished(event) {
  const ok = event.exitCode === 0 || event.exitCode === null;
  const div = el("div", { class: "event-finished" });
  div.appendChild(
    el("span", { class: ok ? "exit-ok" : "exit-fail" }, [
      text(ok ? "✓" : "✗")
    ])
  );
  div.appendChild(text(` ${(event.command ?? "").slice(0, 60)}`));
  if (event.exitCode !== null) {
    div.appendChild(text(` · exit ${event.exitCode}`));
  }
  return div;
}

// --- DOM helpers ---

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  for (const child of children) {
    node.appendChild(child);
  }
  return node;
}

function text(str) {
  return document.createTextNode(str);
}

// --- Auto-scroll toggle ---

eventsEl.addEventListener("scroll", () => {
  const atBottom = eventsEl.scrollHeight - eventsEl.scrollTop - eventsEl.clientHeight < 40;
  autoScroll = atBottom;
});

connect();
