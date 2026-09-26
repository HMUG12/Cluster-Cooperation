/** Deterministic keyless cluster adapter for one roundtable, from the Lead to the synthesis. */

import { ToolCallId, LlmAdapter } from '@deepseek-ai/dsh-llm'

let nextCall = 0

const QUESTION = 'Which cache should the service use?'
const PARTICIPANTS = ['coder', 'tester']
const SYNTHESIZER = 'reviewer'

function calls(messages) {
  return messages.flatMap(message => message.role === 'assistant'
    ? message.content.filter(block => block.type === 'tool-call').map(block => block.name)
    : [])
}

function latestAssistantCalls(messages) {
  const assistant = messages.findLast(message => message.role === 'assistant')
  return assistant?.content.filter(block => block.type === 'tool-call').map(block => block.name) ?? []
}

function hasTaskAction(messages, action) {
  return messages.some(message => message.role === 'assistant'
    && message.content.some((block) => {
      if (block.type !== 'tool-call' || block.name !== 'team_task_update') return false
      try {
        return JSON.parse(block.arguments).action === action
      } catch {
        return false
      }
    }))
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
    const id = ToolCallId(`cluster-roundtable-fixture-${++nextCall}`)
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

/** The revision the newest tool result reports, which an update must echo. */
function latestRevision(messages) {
  const match = /"revision":(\d+)/.exec(latestToolText(messages))
  return match === null ? undefined : Number(match[1])
}

/** The task id the newest inbox notice names. */
function inboxTask(messages) {
  const matches = userText(messages).match(/task-\d+/gu)
  return matches === null ? undefined : matches[matches.length - 1]
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
        description: `Own the ${name} role of the scripted roundtable.`,
        prompt: 'Reply with the single word ready, then act on the notices that arrive.',
        context: 'fresh',
      },
    }])
  }
  if (!names.includes('roundtable')) {
    return toolChunks([{
      name: 'roundtable',
      args: { question: QUESTION, participants: PARTICIPANTS, synthesize: SYNTHESIZER },
    }])
  }
  const result = latestToolText(messages)
  // A bounded read loop turns a stalled round into a readable failure instead
  // of a run that only ends when the harness kills it.
  const reads = names.filter(name => name === 'team_task_list').length
  if (reads >= 12) return textChunks(`CLUSTER_ROUNDTABLE_STUCK after ${reads} board reads`)
  if (last.includes('team_task_list')) {
    // Two answers and one synthesis: a completed synthesis means every row landed.
    const completed = result.match(/"status":"completed"/gu)?.length ?? 0
    if (completed >= 3) return textChunks('CLUSTER_ROUNDTABLE_OK')
    return toolChunks([{ name: 'team_task_list', args: {} }])
  }
  if (last.includes('wait_agent')) return toolChunks([{ name: 'team_task_list', args: {} }])
  return toolChunks([{ name: 'wait_agent', args: { timeout_ms: 10000 } }])
}

function teammate(messages) {
  const names = calls(messages)
  const inbox = userText(messages)
  const task = inboxTask(messages)
  const revision = latestRevision(messages)
  // The spawn prompt names no task, so the first turn is the acknowledgement.
  if (task === undefined) return textChunks('ready')
  const answering = inbox.includes('[ROUNDTABLE]')
  if (!names.includes('team_task_get')) return toolChunks([{ name: 'team_task_get', args: { task_id: task } }])
  if (answering && !hasTaskAction(messages, 'edit')) {
    return toolChunks([{
      name: 'team_task_update',
      args: {
        task_id: task,
        expected_revision: revision,
        action: 'edit',
        description: 'The small cache is enough for one node.\nanswer: use the small cache.',
      },
    }])
  }
  if (!hasTaskAction(messages, 'complete')) {
    return toolChunks([{
      name: 'team_task_update',
      args: { task_id: task, expected_revision: revision, action: 'complete' },
    }])
  }
  if (!names.includes('send_message')) {
    return toolChunks([{
      name: 'send_message',
      args: {
        target: 'lead',
        message: answering ? `Answer ${task} recorded.` : `Synthesis ${task} recorded.`,
      },
    }])
  }
  return textChunks(answering ? 'Answerer complete.' : 'Synthesizer complete.')
}

class ClusterRoundtableAdapter extends LlmAdapter {
  async * stream(options) {
    const tools = options.tools.map(tool => tool.name)
    const owner = identity(options.messages)
    // The tool surface differs per role: only the Lead may open a roundtable,
    // and only a teammate may act on the board rows it was handed.
    if (owner === undefined) {
      if (!tools.includes('roundtable') || !tools.includes('spawn_teammate')) {
        throw new Error('the cluster bundle exposes no roundtable or teammate tool to the Lead')
      }
    } else if (!tools.includes('team_task_get') || !tools.includes('team_task_update')) {
      throw new Error(`teammate ${owner} has no shared-task tools`)
    }
    const chunks = owner === undefined ? lead(options.messages) : teammate(options.messages)
    for (const chunk of chunks) {
      options.signal?.throwIfAborted()
      yield chunk
    }
  }
}

/** Cordis plugin name. */
export const name = 'cluster-roundtable-fixture-llm'
/** LLM registry dependency. */
export const inject = ['llm']

/** Register the keyless adapter on the shipped default provider route. */
export function apply(ctx) {
  ctx.llm.registerAdapter(['deepseek-official'], new ClusterRoundtableAdapter())
}
