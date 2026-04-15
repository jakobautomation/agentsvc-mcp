#!/usr/bin/env node
// agentsvc.io MCP Server
// Gives AI agents (Claude, GPT, etc.) direct access to agentsvc.io services via x402 micropayments.
//
// Setup in Claude Desktop (claude_desktop_config.json):
// {
//   "mcpServers": {
//     "agentsvc": {
//       "command": "node",
//       "args": ["/path/to/mcp-server.mjs"],
//       "env": { "X402_PRIVATE_KEY": "0x..." }
//     }
//   }
// }
//
// Required env: X402_PRIVATE_KEY — EVM private key of a wallet funded with USDC on Base mainnet

import { createInterface } from 'readline';

const BASE_URL = 'https://agentsvc.io';
const SERVICES_URL = `${BASE_URL}/api/v1/services`;
const PRIVATE_KEY = process.env.X402_PRIVATE_KEY;

function sendMessage(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function makeTools(services) {
  return services.map(svc => ({
    name: svc.slug.replace(/-/g, '_'),
    description: [
      `${svc.name} — ${svc.description}`,
      `Cost: $${svc.price_usdc} USDC per call.`,
      `Latency p99: ${svc.latency_p99_ms}ms.`,
    ].join(' '),
    inputSchema: svc.input_schema,
  }));
}

// Full x402 payment flow: call → 402 → sign → retry
async function callWithPayment(slug, input) {
  const proxyUrl = `${BASE_URL}/api/v1/proxy/${slug}`;

  if (!PRIVATE_KEY) {
    throw new Error(
      'X402_PRIVATE_KEY environment variable is required. ' +
      'Set it to an EVM private key (0x...) of a wallet funded with USDC on Base mainnet.'
    );
  }

  const body = Object.keys(input).length > 0 ? JSON.stringify(input) : undefined;
  const headers = { 'Content-Type': 'application/json' };

  // Step 1: Initial request without payment — expect 402
  const initRes = await fetch(proxyUrl, { method: 'POST', headers, body });

  if (initRes.status !== 402) {
    const data = await initRes.json();
    if (!initRes.ok) throw new Error(data.error || `HTTP ${initRes.status}`);
    return data;
  }

  // Step 2: Parse x402 payment requirements
  const paymentReqs = await initRes.json();
  const requirement = paymentReqs?.accepts?.[0];
  if (!requirement) throw new Error('Invalid 402 response: missing accepts[0]');

  // Step 3: Sign payment using x402 exact/evm scheme
  let paymentHeader;
  try {
    const { createWalletClient, http } = await import('viem');
    const { base } = await import('viem/chains');
    const { privateKeyToAccount } = await import('viem/accounts');
    const { exact } = await import('x402/schemes');

    const account = privateKeyToAccount(PRIVATE_KEY);
    const client = createWalletClient({ account, chain: base, transport: http() });

    const signedPayment = await exact.evm.createPayment(client, requirement);
    // Encode: base64(JSON.stringify(signedPayment))
    paymentHeader = `x402 usdc base ${Buffer.from(JSON.stringify(signedPayment)).toString('base64')}`;
  } catch (err) {
    throw new Error(
      `Payment signing failed: ${err.message}. ` +
      'Ensure viem and x402 are installed (npm install viem x402) and X402_PRIVATE_KEY is set.'
    );
  }

  // Step 4: Retry with signed X-Payment header
  const finalRes = await fetch(proxyUrl, {
    method: 'POST',
    headers: { ...headers, 'X-Payment': paymentHeader },
    body,
  });

  const result = await finalRes.json();
  if (!finalRes.ok) throw new Error(result.error || `Service call failed: HTTP ${finalRes.status}`);
  return result;
}

let services = [];

async function init() {
  try {
    const res = await fetch(SERVICES_URL);
    const json = await res.json();
    services = json.data || [];
  } catch {
    services = [];
  }
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  const { id, method, params } = msg;

  if (method === 'initialize') {
    await init();
    sendMessage({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'agentsvc',
          version: '1.0.0',
          description: 'agentsvc.io — Agent-to-Agent Service Marketplace. Pay-per-call AI services via x402/USDC on Base.',
        },
      }
    });

  } else if (method === 'tools/list') {
    sendMessage({ jsonrpc: '2.0', id, result: { tools: makeTools(services) } });

  } else if (method === 'tools/call') {
    const { name, arguments: args } = params;
    const slug = name.replace(/_/g, '-');
    try {
      const result = await callWithPayment(slug, args || {});
      sendMessage({
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result.data ?? result, null, 2) }],
        }
      });
    } catch (err) {
      sendMessage({
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        }
      });
    }

  } else {
    sendMessage({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
});
