import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const port = Number(process.env.PORT || 48731);
const eventFile = path.resolve(".command-learning/events.jsonl");

// Active SSE connections
const clients = new Set();

function watchEventFile() {
  let lastSize = safeFileSize(eventFile);

  fs.watchFile(eventFile, { interval: 200 }, (curr) => {
    if (curr.size <= lastSize) return;

    const fd = fs.openSync(eventFile, "r");
    const newBytes = curr.size - lastSize;
    const buf = Buffer.alloc(newBytes);
    fs.readSync(fd, buf, 0, newBytes, lastSize);
    fs.closeSync(fd);
    lastSize = curr.size;

    const lines = buf.toString("utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      broadcast(line);
    }
  });
}

function broadcast(jsonLine) {
  const payload = `data: ${jsonLine}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function safeFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function readRecentEvents(n = 50) {
  if (!fs.existsSync(eventFile)) return [];
  return fs.readFileSync(eventFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-n);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/sse") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write(": connected\n\n");

    // Replay recent history on connect
    for (const line of readRecentEvents()) {
      res.write(`data: ${line}\n\n`);
    }

    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  // Legacy JSON endpoint kept for compatibility
  if (url.pathname === "/events") {
    const events = readRecentEvents(100).map((line) => {
      try { return JSON.parse(line); } catch { return { type: "parse_error", raw: line }; }
    });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(events));
    return;
  }

  const filePath = url.pathname === "/"
    ? path.join(publicDir, "index.html")
    : path.normalize(path.join(publicDir, url.pathname));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Viewer running at http://127.0.0.1:${port}`);
  watchEventFile();
});

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css"))  return "text/css; charset=utf-8";
  if (filePath.endsWith(".js"))   return "text/javascript; charset=utf-8";
  return "text/plain; charset=utf-8";
}
