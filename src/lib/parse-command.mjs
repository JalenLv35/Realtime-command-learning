export function parseCommand(command) {
  const rawTokens = command.match(/"[^"]*"|'[^']*'|\|\||&&|>>|2>&1|[|;<>]|[^\s]+/g) ?? [];
  const tokens = rawTokens.map((raw) => {
    const value = stripQuotes(raw);
    return {
      raw,
      value,
      kind: classify(value),
      isOperator: isOperator(value),
      isAssignment: /^[A-Za-z_][A-Za-z0-9_]*=/.test(value)
    };
  });

  return { tokens };
}

function classify(value) {
  if (/^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?(\/.*)?$/i.test(value)) {
    return "localhost";
  }

  if (/^https?:\/\//i.test(value)) {
    return "url";
  }

  if (isOperator(value)) {
    return "operator";
  }

  if (value.startsWith("-")) {
    return "flag";
  }

  return "word";
}

function isOperator(value) {
  return ["|", "&&", "||", ";", ">", ">>", "<", "2>&1"].includes(value);
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
