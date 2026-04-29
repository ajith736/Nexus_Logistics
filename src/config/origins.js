function parseOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function getAllowedOrigins() {
  const explicit = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);
  if (explicit.length > 0) return explicit;
  const fallback = parseOrigins(process.env.CLIENT_URL);
  return fallback.length > 0 ? fallback : ['http://localhost:3000'];
}

module.exports = { getAllowedOrigins };
