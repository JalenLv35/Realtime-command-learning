export function redactCommand(command) {
  return command
    .replace(/(Authorization:\s*Bearer\s+)[^"'\s]+/gi, "$1[REDACTED]")
    .replace(/(Cookie:\s*)[^"']+/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|secret|api_key|key|password)=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/((?:token|secret|api_key|password)=)[^&\s"']+/gi, "$1[REDACTED]");
}
