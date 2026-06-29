const eventsEl = document.querySelector("#events");
const statusEl = document.querySelector("#status");

async function refresh() {
  try {
    const response = await fetch("/events");
    const events = await response.json();
    statusEl.textContent = `${events.length} events`;
    eventsEl.innerHTML = events.map(renderEvent).join("");
    eventsEl.scrollTop = eventsEl.scrollHeight;
  } catch {
    statusEl.textContent = "offline";
  }
}

function renderEvent(event) {
  return `
    <article class="event">
      <div class="meta">${escapeHtml(event.createdAt ?? "")} · ${escapeHtml(event.type ?? "event")}</div>
      <pre>${escapeHtml(event.command ?? event.raw ?? JSON.stringify(event, null, 2))}</pre>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

refresh();
setInterval(refresh, 1000);
