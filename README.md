# agentsvc-mcp

**agentsvc.io MCP Server** — gives AI agents access to 20 pay-per-call utility services via the [x402 micropayment protocol](https://x402.org). Agents pay automatically in USDC on Base mainnet — no accounts, no API keys, no subscriptions.

## What this is

A single MCP server that exposes 20 useful tools to any MCP-compatible AI agent. Each tool call costs $0.001–$0.008 USDC, paid automatically from your agent's wallet.

## Available Tools (20)

| Tool | Cost | What it does |
|------|------|--------------|
| `ip_lookup` | $0.001 | IP address → country, city, ISP, ASN, timezone |
| `dns_lookup` | $0.001 | Domain → DNS records (A, AAAA, MX, TXT, CNAME, NS) |
| `qr_code` | $0.001 | Text/URL → QR code (base64 PNG) |
| `exchange_rates` | $0.001 | Live forex rates from ECB (30+ currencies, hourly) |
| `email_validate` | $0.001 | Email → format + MX + disposable check |
| `ssl_check` | $0.001 | Domain SSL cert → issuer, expiry, days remaining |
| `phone_validate` | $0.001 | Phone number → E.164 format, country, line type |
| `weather` | $0.002 | City/GPS → current weather + 3-day forecast |
| `translate` | $0.002 | Text → translated text (100+ languages) |
| `whois` | $0.002 | Domain → registrar, created/expires, nameservers |
| `crypto_prices` | $0.002 | Crypto IDs → live price, market cap, 24h change |
| `stock_prices` | $0.002 | Ticker symbols → price, P/E ratio, 52w range |
| `geocode` | $0.002 | Address → lat/lon or lat/lon → address |
| `web_search` | $0.003 | Query → factual summary + links (DuckDuckGo + Wikipedia) |
| `news_search` | $0.003 | Query → recent news articles (HackerNews + BBC) |
| `pdf_extract` | $0.004 | PDF (base64) → full text + per-page breakdown |
| `screenshot` | $0.005 | URL → PNG screenshot (base64, full JS rendering) |
| `webpage_reader` | $0.006 | URL → clean readable text + title + links |
| `html_to_pdf` | $0.008 | URL or HTML → PDF (base64) |
| `ocr` | $0.008 | Image (base64) → extracted text (40+ languages) |

## Installation

### Requirements
- Node.js 18+
- `npm install viem x402` (for payment signing)
- A wallet private key with USDC on Base mainnet

### Claude Desktop

```bash
curl -O https://agentsvc.io/mcp-server.mjs
npm install viem x402
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentsvc": {
      "command": "node",
      "args": ["/path/to/mcp-server.mjs"],
      "env": {
        "X402_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

### Any MCP-compatible agent

The MCP server auto-discovers all 20 tools from the live catalog at startup. Tools are dynamically loaded — new services appear automatically without updating the server.

## How payments work

Each tool call uses the [x402 protocol](https://x402.org):

1. Agent calls a tool
2. Server probes the service (HTTP 402 response with payment requirements)
3. MCP server signs USDC payment on Base mainnet using your private key
4. Service executes and returns result

Payments are **atomic per call** — you only pay when a call succeeds. The wallet needs USDC on Base mainnet.

**Get USDC on Base:**
- Bridge from Ethereum: [bridge.base.org](https://bridge.base.org)
- Buy on Coinbase → withdraw to Base
- Swap on Uniswap/Aerodrome (Base)

## Cost examples

| Usage | Daily cost |
|-------|-----------|
| 100 calls/day (avg $0.003) | $0.30 |
| 1,000 calls/day | $3.00 |
| 10,000 calls/day | $30.00 |

## REST API

All tools are also available as a direct REST API without MCP:

```bash
# Step 1: probe (get payment requirements)
curl -X POST https://agentsvc.io/api/v1/proxy/ip-lookup \
  -H "Content-Type: application/json" \
  -d '{"ip": "8.8.8.8"}'
# → HTTP 402 with accepts[] payment requirements

# Step 2: sign + retry with X-Payment header
# See: https://agentsvc.io/docs
```

**Endpoints:**
- `GET /api/v1/services` — full catalog with schemas + prices
- `GET /api/openapi.json` — OpenAPI 3.1 spec
- `GET /.well-known/agent-services.json` — machine-readable manifest

## Links

- **Live:** [agentsvc.io](https://agentsvc.io)
- **MCP Server download:** [agentsvc.io/mcp-server.mjs](https://agentsvc.io/mcp-server.mjs)
- **Service catalog:** [agentsvc.io/api/v1/services](https://agentsvc.io/api/v1/services)
- **OpenAPI spec:** [agentsvc.io/api/openapi.json](https://agentsvc.io/api/openapi.json)
- **Agent manifest:** [agentsvc.io/.well-known/agent-services.json](https://agentsvc.io/.well-known/agent-services.json)
- **Docs:** [agentsvc.io/docs](https://agentsvc.io/docs)

## Payment details

- **Protocol:** x402 exact scheme
- **Network:** Base mainnet (chain ID: 8453)
- **Currency:** USDC
- **USDC contract:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Atomic units:** 1 USDC = 1,000,000 units

## License

MIT
