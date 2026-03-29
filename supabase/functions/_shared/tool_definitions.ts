// ============================================================
// supabase/functions/_shared/tool_definitions.ts
// Tool schemas in both OpenAI and Anthropic formats.
// tool_executor.ts implements the actual execution logic.
// EF3 passes these to the LLM so it knows what tools exist.
// ============================================================

import type { ToolName } from './types.ts'

// Each tool has both provider schemas — llm_client.ts picks the right one
export interface ToolDefinition {
  name:      ToolName
  openai:    OpenAIToolDefinition
  anthropic: AnthropicToolDefinition
}

interface OpenAIToolDefinition {
  type:     'function'
  function: {
    name:        string
    description: string
    parameters:  Record<string, unknown>
  }
}

interface AnthropicToolDefinition {
  name:         string
  description:  string
  input_schema: Record<string, unknown>
}

// ── web_search ───────────────────────────────────────────────

const WEB_SEARCH: ToolDefinition = {
  name: 'web_search',
  openai: {
    type: 'function',
    function: {
      name:        'web_search',
      description: 'Search the web for current information. Returns top 5 results as text.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type:        'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
  },
  anthropic: {
    name:        'web_search',
    description: 'Search the web for current information. Returns top 5 results as text.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type:        'string',
          description: 'The search query',
        },
      },
      required: ['query'],
    },
  },
}

// ── scrape_url ───────────────────────────────────────────────

const SCRAPE_URL: ToolDefinition = {
  name: 'scrape_url',
  openai: {
    type: 'function',
    function: {
      name:        'scrape_url',
      description: 'Fetch a URL and extract readable text content. Returns first 2000 characters.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type:        'string',
            description: 'The URL to fetch and extract text from',
          },
        },
        required: ['url'],
      },
    },
  },
  anthropic: {
    name:        'scrape_url',
    description: 'Fetch a URL and extract readable text content. Returns first 2000 characters.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type:        'string',
          description: 'The URL to fetch and extract text from',
        },
      },
      required: ['url'],
    },
  },
}

// ── summarize ────────────────────────────────────────────────

const SUMMARIZE: ToolDefinition = {
  name: 'summarize',
  openai: {
    type: 'function',
    function: {
      name:        'summarize',
      description: 'Summarize a long piece of text into key points.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type:        'string',
            description: 'The text to summarize',
          },
          max_sentences: {
            type:        'number',
            description: 'Maximum number of sentences in the summary (default 5)',
          },
        },
        required: ['text'],
      },
    },
  },
  anthropic: {
    name:        'summarize',
    description: 'Summarize a long piece of text into key points.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type:        'string',
          description: 'The text to summarize',
        },
        max_sentences: {
          type:        'number',
          description: 'Maximum number of sentences in the summary (default 5)',
        },
      },
      required: ['text'],
    },
  },
}

// ── extract_data ─────────────────────────────────────────────

const EXTRACT_DATA: ToolDefinition = {
  name: 'extract_data',
  openai: {
    type: 'function',
    function: {
      name:        'extract_data',
      description: 'Extract structured data from unstructured text according to a schema.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type:        'string',
            description: 'The source text to extract data from',
          },
          schema: {
            type:        'object',
            description: 'JSON schema describing the fields to extract',
          },
        },
        required: ['text', 'schema'],
      },
    },
  },
  anthropic: {
    name:        'extract_data',
    description: 'Extract structured data from unstructured text according to a schema.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type:        'string',
          description: 'The source text to extract data from',
        },
        schema: {
          type:        'object',
          description: 'JSON schema describing the fields to extract',
        },
      },
      required: ['text', 'schema'],
    },
  },
}

// ── send_email ───────────────────────────────────────────────
// NOTE: Does NOT actually send email — returns a draft object.
// The user is responsible for sending it via their own system.

const SEND_EMAIL: ToolDefinition = {
  name: 'send_email',
  openai: {
    type: 'function',
    function: {
      name:        'send_email',
      description: 'Format an email draft. Does NOT send — returns a structured draft object for the user to send.',
      parameters: {
        type: 'object',
        properties: {
          to:      { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body:    { type: 'string', description: 'Email body in plain text' },
          cc:      { type: 'string', description: 'CC email address (optional)' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  anthropic: {
    name:        'send_email',
    description: 'Format an email draft. Does NOT send — returns a structured draft object for the user to send.',
    input_schema: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body:    { type: 'string', description: 'Email body in plain text' },
        cc:      { type: 'string', description: 'CC email address (optional)' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
}

// ── Tool registry ────────────────────────────────────────────

export const ALL_TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  web_search:   WEB_SEARCH,
  scrape_url:   SCRAPE_URL,
  summarize:    SUMMARIZE,
  extract_data: EXTRACT_DATA,
  send_email:   SEND_EMAIL,
}

// Get tool definitions for a specific set of tool names
// Used by EF3 to build the tools array for the LLM call
export function getToolDefinitions(toolNames: ToolName[]): ToolDefinition[] {
  return toolNames
    .filter((name) => ALL_TOOL_DEFINITIONS[name])
    .map((name) => ALL_TOOL_DEFINITIONS[name])
}