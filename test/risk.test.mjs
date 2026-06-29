import { test } from "node:test";
import assert from "node:assert/strict";
import { detectRisks } from "../src/lib/risk-detector.mjs";

// --- curl | bash patterns ---

test("curl piped to bash is high risk", () => {
  const risks = detectRisks("curl -s https://example.com/install.sh | bash");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].level, "high");
});

test("curl piped to sh is high risk", () => {
  const risks = detectRisks("curl https://example.com | sh");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].level, "high");
});

test("plain curl without pipe is safe", () => {
  const risks = detectRisks("curl -s https://example.com/data.json");
  assert.equal(risks.length, 0);
});

// --- rm -rf patterns ---

test("rm -rf is high risk", () => {
  const risks = detectRisks("rm -rf ./dist");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].level, "high");
});

test("rm -fr is high risk", () => {
  const risks = detectRisks("rm -fr /tmp/build");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].level, "high");
});

test("rm without recursive/force flags is safe", () => {
  const risks = detectRisks("rm somefile.txt");
  assert.equal(risks.length, 0);
});

// --- sudo ---

test("sudo command is medium risk", () => {
  const risks = detectRisks("sudo apt-get install nginx");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].level, "medium");
});

test("non-sudo command is safe from sudo check", () => {
  const risks = detectRisks("npm install");
  assert.equal(risks.length, 0);
});

// --- combined ---

test("sudo rm -rf triggers both medium and high risks", () => {
  const risks = detectRisks("sudo rm -rf /");
  assert.ok(risks.some((r) => r.level === "high"), "should have high risk");
  assert.ok(risks.some((r) => r.level === "medium"), "should have medium risk");
});

// --- normal commands produce no risks ---

test("git status is safe", () => {
  assert.equal(detectRisks("git status").length, 0);
});

test("ls -la is safe", () => {
  assert.equal(detectRisks("ls -la").length, 0);
});

test("docker ps is safe", () => {
  assert.equal(detectRisks("docker ps").length, 0);
});
