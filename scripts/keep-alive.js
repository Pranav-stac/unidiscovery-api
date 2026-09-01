const url =
  process.env.KEEP_ALIVE_URL ??
  'https://unidiscovery-api-pn.onrender.com/api/v1/health';

async function main() {
  const response = await fetch(url, { method: 'GET' });
  const body = await response.text();
  console.log(`[keep-alive] ${response.status} ${url}`);
  if (!response.ok) {
    console.error(body);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[keep-alive] failed', error);
  process.exit(1);
});
