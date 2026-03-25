import type { NextRequest } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/lib/mcp/server'

// Tools use node:fs — edge runtime not supported
export const runtime = 'nodejs'

async function handleMcp(request: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  await createMcpServer().connect(transport)
  return transport.handleRequest(request)
}

export const POST = handleMcp
export const GET = handleMcp
export const DELETE = handleMcp
