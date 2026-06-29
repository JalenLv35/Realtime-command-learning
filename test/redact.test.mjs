import { test } from "node:test";
import assert from "node:assert/strict";
import { redactCommand } from "../src/lib/redact-command.mjs";

test("Authorization Bearer token is redacted", () => {
  const input = 'curl -H "Authorization: Bearer sk-abc123xyz"';
  const result = redactCommand(input);
  assert.ok(!result.includes("sk-abc123xyz"), `token should be gone: ${result}`);
  assert.ok(result.includes("[REDACTED]"), `should have placeholder: ${result}`);
});

test("Authorization Basic token is redacted", () => {
  const input = 'curl -H "Authorization: Basic dXNlcjpwYXNz"';
  const result = redactCommand(input);
  assert.ok(!result.includes("dXNlcjpwYXNz"), result);
  assert.ok(result.includes("[REDACTED]"), result);
});

test("Cookie header is redacted", () => {
  const input = 'curl -H "Cookie: session=abc123; token=xyz"';
  const result = redactCommand(input);
  assert.ok(!result.includes("abc123"), result);
  assert.ok(result.includes("[REDACTED]"), result);
});

test("curl -u user:password is redacted", () => {
  const input = "curl -u admin:supersecret https://example.com";
  const result = redactCommand(input);
  assert.ok(!result.includes("supersecret"), result);
  assert.ok(result.includes("[REDACTED]"), result);
});

test("URL query token is redacted", () => {
  const input = "curl https://api.example.com/data?token=secret999&page=1";
  const result = redactCommand(input);
  assert.ok(!result.includes("secret999"), result);
  assert.ok(result.includes("[REDACTED]"), result);
  assert.ok(result.includes("page=1"), "non-sensitive params should remain");
});

test("URL query api_key is redacted", () => {
  const input = "curl 'https://api.example.com?api_key=key_abc123'";
  const result = redactCommand(input);
  assert.ok(!result.includes("key_abc123"), result);
});

test("Inline GITHUB_TOKEN env var is redacted", () => {
  const input = "GITHUB_TOKEN=ghp_abc123 npm publish";
  const result = redactCommand(input);
  assert.ok(!result.includes("ghp_abc123"), result);
  assert.ok(result.includes("[REDACTED]"), result);
});

test("NPM_TOKEN env var is redacted", () => {
  const input = "NPM_TOKEN=npm_xyz987 npm publish";
  const result = redactCommand(input);
  assert.ok(!result.includes("npm_xyz987"), result);
});

test("Git remote URL with embedded credentials is redacted", () => {
  const input = "git remote add origin https://user:password123@github.com/org/repo.git";
  const result = redactCommand(input);
  assert.ok(!result.includes("password123"), result);
  assert.ok(result.includes("[REDACTED]@"), result);
  assert.ok(result.includes("github.com"), "host should remain");
});

test("Normal command without secrets is not modified", () => {
  const input = "curl -s -X GET https://api.example.com/health";
  const result = redactCommand(input);
  assert.equal(result, input);
});

test("ls command is not modified", () => {
  const input = "ls -la /tmp";
  assert.equal(redactCommand(input), input);
});
