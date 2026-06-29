export function redactCommand(command) {
  return command
    // Authorization header Bearer / Basic tokens
    .replace(/(Authorization:\s*(?:Bearer|Basic)\s+)[^"'\s]+/gi, "$1[REDACTED]")
    // Cookie header
    .replace(/(Cookie:\s*)[^"']+/gi, "$1[REDACTED]")
    // curl -u user:password
    .replace(/(-u\s+|--user\s+)[^\s"']+:[^\s"']+/gi, "$1[REDACTED]")
    // URL query params: token, secret, api_key, key, password
    .replace(/([?&](?:token|secret|api_key|key|password|auth)=)[^&\s"'#]+/gi, "$1[REDACTED]")
    // Inline env assignments: TOKEN=xxx, API_KEY=xxx, PASSWORD=xxx, SECRET=xxx
    // Stop at whitespace, quotes, & and # to avoid eating adjacent URL query params
    .replace(/((?:token|api_key|password|secret|npm_token|github_token|gitlab_token|ci_token)=)[^\s"'&#]+/gi, "$1[REDACTED]")
    // Git remote URLs with embedded credentials: https://user:pass@host
    .replace(/(https?:\/\/)[^@\s"']+@/gi, "$1[REDACTED]@");
}
