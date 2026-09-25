/** Spend arithmetic: what one member's declared token budget is measured against. */

import { describe, expect, it } from 'vitest'
import {
  addUsage,
  billableTokens,
  budgetNotice,
  emptySpend,
  overBudget,
} from '../src/spend.ts'

describe('addUsage', () => {
  it('sums every disjoint field and counts the call', () => {
    const spend = addUsage(emptySpend('session-1'), {
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 900,
      cacheWriteTokens: 10,
    })
    expect(spend).toMatchObject({
      sessionId: 'session-1',
      calls: 1,
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 900,
      cacheWriteTokens: 10,
    })
  })

  it('accumulates across calls without mutating the record it was given', () => {
    const first = addUsage(emptySpend('session-1'), { inputTokens: 10, outputTokens: 1 })
    const second = addUsage(first, { inputTokens: 5, outputTokens: 2 })
    expect(first).toMatchObject({ calls: 1, inputTokens: 10, outputTokens: 1 })
    expect(second).toMatchObject({ calls: 2, inputTokens: 15, outputTokens: 3 })
  })

  it('counts a provider that reports no cache as zero rather than undefined', () => {
    const spend = addUsage(emptySpend('session-1'), { inputTokens: 10, outputTokens: 1 })
    expect(spend.cacheReadTokens).toBe(0)
    expect(spend.cacheWriteTokens).toBe(0)
  })

  it('attributes the newest route and keeps the last known one when the event omits it', () => {
    const routed = addUsage(emptySpend('session-1'), { inputTokens: 1, outputTokens: 1 }, {
      provider: 'openai-gateway',
      model: 'gpt-5',
    })
    expect(routed).toMatchObject({ provider: 'openai-gateway', model: 'gpt-5' })

    const switched = addUsage(routed, { inputTokens: 1, outputTokens: 1 }, { model: 'gpt-5-mini' })
    expect(switched).toMatchObject({ provider: 'openai-gateway', model: 'gpt-5-mini' })

    const unattributed = addUsage(switched, { inputTokens: 1, outputTokens: 1 })
    expect(unattributed).toMatchObject({ provider: 'openai-gateway', model: 'gpt-5-mini' })
  })

  it('stays free of a route entirely when no call ever named one', () => {
    const spend = addUsage(emptySpend('session-1'), { inputTokens: 1, outputTokens: 1 })
    expect('provider' in spend).toBe(false)
    expect('model' in spend).toBe(false)
  })
})

describe('billableTokens', () => {
  it('counts cached input, because cached input is billed input', () => {
    const spend = addUsage(emptySpend('session-1'), {
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 900,
      cacheWriteTokens: 10,
    })
    expect(billableTokens(spend)).toBe(1050)
  })

  it('reaches the same total whether or not the adapter adds an aggregate', () => {
    const withTotal = addUsage(emptySpend('session-1'), {
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 900,
      cacheWriteTokens: 10,
      totalTokens: 2000,
    })
    expect(billableTokens(withTotal)).toBe(1050)
  })
})

describe('overBudget', () => {
  it('accepts a member that lands exactly on its budget', () => {
    const spend = addUsage(emptySpend('session-1'), { inputTokens: 100, outputTokens: 20 })
    expect(overBudget(spend, 120)).toBe(false)
    expect(overBudget(spend, 119)).toBe(true)
  })
})

describe('budgetNotice', () => {
  it('tells the member to wind down and to carry the report itself', () => {
    const spend = addUsage(emptySpend('session-1'), { inputTokens: 100, outputTokens: 40 }, {
      model: 'claude-opus-4',
    })
    const notice = budgetNotice('coder-backend', spend, 120)
    expect(notice).toContain('[BUDGET]')
    expect(notice).toContain('140 of the 120 tokens')
    expect(notice).toContain('"coder-backend"')
    expect(notice).toContain('1 model calls')
    expect(notice).toContain('model claude-opus-4')
    // Only a teammate may address the Lead, so the member carries the report.
    expect(notice).toContain('send_message target "lead"')
  })

  it('does not claim a route it never observed', () => {
    const spend = addUsage(emptySpend('session-1'), { inputTokens: 5, outputTokens: 5 })
    expect(budgetNotice('tester', spend, 1)).toContain('an unrecorded route')
  })
})
