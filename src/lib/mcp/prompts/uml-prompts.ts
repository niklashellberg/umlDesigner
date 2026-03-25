import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerUmlPrompts(server: McpServer): void {
  server.registerPrompt(
    'design_uml',
    {
      description:
        'Generate a new UML diagram from a description. Outputs valid Mermaid code then calls update_diagram_code.',
      argsSchema: {
        diagramType: z
          .enum(['class', 'sequence', 'flowchart', 'activity'])
          .describe('Type of UML diagram to create'),
        description: z.string().min(1).describe('Natural language description of what to model'),
      },
    },
    ({ diagramType, description }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Design a ${diagramType} diagram for the following:

${description}

Instructions:
1. First call \`create_diagram\` with an appropriate title and type "${diagramType}".
2. Write complete, valid Mermaid code for the ${diagramType} diagram.
3. Call \`update_diagram_code\` with the diagram id and your Mermaid code.
4. Confirm the diagram is live in the browser.

Mermaid syntax reminders:
- class: starts with \`classDiagram\`
- sequence: starts with \`sequenceDiagram\`
- flowchart: starts with \`flowchart TD\` (or LR/BT/RL)
- activity: starts with \`flowchart TD\` with subgraph swimlanes`,
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    'review_diagram',
    {
      description:
        'Fetch an existing diagram and review it for correctness, completeness, and clarity.',
      argsSchema: {
        diagramId: z.string().uuid().describe('UUID of the diagram to review'),
        focus: z
          .string()
          .optional()
          .describe('Optional focus area, e.g. "missing relationships" or "naming conventions"'),
      },
    },
    ({ diagramId, focus }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review the diagram with id "${diagramId}".

Instructions:
1. Call \`get_diagram\` with id "${diagramId}" to fetch the current Mermaid code.
2. Analyse the diagram for:
   - Correctness of Mermaid syntax
   - Completeness of modelled relationships
   - Clarity of naming
   ${focus ? `- Specific focus: ${focus}` : ''}
3. List your findings clearly.
4. If improvements are needed, propose updated Mermaid code and offer to call \`update_diagram_code\`.`,
          },
        },
      ],
    }),
  )
}
