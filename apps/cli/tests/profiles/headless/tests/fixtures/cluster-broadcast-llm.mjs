/** Deterministic keyless cluster adapter for one broadcast to the whole roster. */

import { ToolCallId, LlmAdapter } from '@deepseek-ai/dsh-llm'

let nextCall = 0

const PING = 'CLUSTER_BROADCAST_PING: report your role.'

function calls(messages) {
  return messages.flatMap(message => message.role === 'assistant'
    ? message.content.filter(block => block.type === 'tool-call').map(block => block.name)
    : [])
}

function latestAssistantCalls(messages) {
  const assistant = messages.findLast(message => message.role === 'assistant')
  return assistant?.content.filter(block => block.type === 'tool-call').map(block => block.name) ?? []
}

function latestToolText(messages) {
  const message = messages.findLast(candidate => candidate.content.some(block => block.type === 'tool-result'))
  if (message === undefined) return ''
  return message.content.flatMap(block => block.type === 'tool-result'
    ? block.content.filter(item => item.type === 'text').map(item => item.text)
    : []).join('\n')
}

function userText(messages) {
  return messages.flatMap(message => message.role === 'user'
    ? message.content.filter(block => block.type === 'text').map(block => block.text)
    : []).join('\n')
}

function toolChunks(specs) {
  const chunks = []
  for (const [index, spec] of specs.entries()) {
    const id = ToolCallId(`cluster-broadcast-fixture-${++nextCall}`)
    const args = JSON.stringify(spec.args)
    chunks.push(
      { type: 'block-start', index, blockType: 'tool-call' },
      { type: 'tool-call-delta', index, id, name: spec.name, argumentsDelta: args },
      { type: 'block-end', index, block: { type: 'tool-call', id, name: spec.name, arguments: args } },
    )
  }
  chunks.push(
    { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  )
  return chunks
}

function textChunks(text) {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'usage', usage: { inputTokens: 10, outputTokens: 3 } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

/**
 * Which teammate this conversation belongs to.
 *
 * The spawn prompt carries the roster reminder, so one script serves every
 * teammate instead of one model per member.
 * @param messages - the conversation so far.
 * @returns the teammate name, or undefined for the Lead.
 */
function identity(messages) {
  for (const message of messages) {
    if (message.role !== 'user') continue
    const match = /You are teammate "([a-z0-9-]+)"/.exec(userText([message]))
    if (match !== null) return match[1]
  }
  return undefined
}

function lead(messages) {
  const names = calls(messages)
  const last = latestAssistantCalls(messages)
  const spawned = names.filter(name => name === 'spawn_teammate').length
  if (spawned < 3) {
    const name = ['coder', 'tester', 'reviewer'][spawned]
    return toolChunks([{
      name: 'spawn_teammate',
      args: {
        name,
        description: `Own the ${name} role of the scripted broadcast.`,
        prompt: 'Reply with the single word ready, then answer anything the Lead sends.',
        context: 'fresh',
      },
    }])
  }
  if (!names.includes('broadcast_message')) {
    // No targets: the whole roster is the default recipient list.
    return toolChunks([{ name: 'broadcast_message', args: { message: PING } }])
  }
  const result = latestToolText(messages)
  // A bounded read loop turns a stalled fan-out into a readable failure instead
  // of a run that only ends when the harness kills it.
  const reads = names.filter(name => name === 'list_agents').length
  if (reads >= 12) return textChunks(`CLUSTER_BROADCAST_STUCK after ${reads} roster reads`)
  if (last.includes('list_agents')) {
    // Every teammate answered and went quiet, so the fan-out reached all of them.
    const quiet = result.match(/"status":"(?:inactive|idle)"/gu)?.length ?? 0
    if (quiet >= 3) return textChunks('CLUSTER_BROADCAST_OK')
    return toolChunks([{ name: 'list_agents', args: {} }])
  }
  if (last.includes('wait_agent')) return toolChunks([{ name: 'list_agents', args: {} }])
  return toolChunks([{ name: 'wait_agent', args: { timeout_ms: 10000 } }])
}

function teammate(name, messages) {
  // The spawn prompt carries no ping, so the first turn is the acknowledgement.
  if (!userText(messages).includes(PING)) return textChunks('ready')
  return textChunks(`CLUSTER_BROADCAST_ACK ${name}`)
}

class ClusterBroadcastAdapter extends LlmAdapter {
  async * stream(options) {
    const tools = options.tools.map(tool => tool.name)
    const owner = identity(options.messages)
    // The tool surface differs per role: only the Lead may broadcast.
    if (owner === undefined) {
      if (!tools.includes('broadcast_message') || !tools.includes('spawn_teammate')) {
        throw new Error('the cluster bundle exposes no broadcast or teammate tool to the Lead')
      }
    }
    const chunks = owner === undefined ? lead(options.messages) : teammate(owner, options.messages)
    for (const chunk of chunks) {
      options.signal?.throwIfAborted()
      yield chunk
    }
  }
}

/** Cordis plugin name. */
export const name = 'cluster-broadcast-fixture-llm'
/** LLM registry dependency. */
export const inject = ['llm']

/** Register the keyless adapter on the shipped default provider route. */
export function apply(ctx) {
  ctx.llm.registerAdapter(['deepseek-official'], new ClusterBroadcastAdapter())
}
