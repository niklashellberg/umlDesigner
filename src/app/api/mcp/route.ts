import type { NextRequest } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/lib/mcp/server'

// Tools use node:fs — edge runtime not supported
export const runtime = 'nodejs'

// Singleton: register tools/resources/prompts once, not per request
const mcpServer = createMcpServer()

async function handleMcp(request: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  await mcpServer.connect(transport)
  return transport.handleRequest(request)
}

export const POST = handleMcp
export const GET = handleMcp
export const DELETE = handleMcp
