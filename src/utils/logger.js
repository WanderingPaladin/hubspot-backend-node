const SENSITIVE_KEY = /authorization|access[_-]?token|api[_-]?key|hapikey|password|secret|bearer/i;

function redact(value) {
  if (value == null) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
      .replace(/pat-[A-Za-z0-9-]+/g, '[REDACTED_TOKEN]');
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(nested),
      ]),
    );
  }
  return value;
}

function logInfo(message, meta) {
  if (meta === undefined) {
    console.log(`[info] ${message}`);
    return;
  }
  console.log(`[info] ${message}`, redact(meta));
}

function logError(message, meta) {
  if (meta === undefined) {
    console.error(`[error] ${message}`);
    return;
  }
  console.error(`[error] ${message}`, redact(meta));
}

function logWarn(message, meta) {
  if (meta === undefined) {
    console.warn(`[warn] ${message}`);
    return;
  }
  console.warn(`[warn] ${message}`, redact(meta));
}

module.exports = { redact, logInfo, logError, logWarn };
