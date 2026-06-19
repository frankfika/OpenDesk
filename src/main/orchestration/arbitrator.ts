import type { Message, AgentRun, ArbitrationResult } from '../../shared/types'
import type { Provider } from '../providers/base'

export interface ArbitratorCallbacks {
  onToken?: (token: string) => void
  onDone?: (result: ArbitrationResult) => void
  onError?: (error: string) => void
}

function buildJudgeMessages(userQuestion: string, agentRuns: AgentRun[], systemPrompt?: string): Message[] {
  const agentAnswers = agentRuns
    .filter((r) => r.status === 'done' && r.content.trim().length > 0)
    .map((r, idx) => {
      const label = r.model || r.providerId
      return `--- Answer ${idx + 1} (from ${label}) ---\n${r.content.trim()}`
    })
    .join('\n\n')

  const judgeSystem =
    systemPrompt ||
    'You are an expert judge. Multiple AI assistants have produced answers to the same user question. Your job is to evaluate them, identify errors or inconsistencies, and produce the single best final answer. Be concise but thorough.'

  const userPrompt = `User question:\n${userQuestion}\n\n${agentAnswers}\n\nEvaluate the answers above. Provide:\n1. A brief analysis of the key differences and any errors.\n2. A confidence score from 0.0 to 1.0 for your final answer.\n3. The final, polished answer that best addresses the user's question.\n\nUse exactly this format:\nANALYSIS: <your analysis>\nCONFIDENCE: <0.0-1.0>\nFINAL_ANSWER:\n<your final answer>`

  return [
    {
      id: 'judge-system',
      role: 'system',
      content: judgeSystem,
      timestamp: Date.now()
    },
    {
      id: 'judge-user',
      role: 'user',
      content: userPrompt,
      timestamp: Date.now()
    }
  ]
}

function parseJudgeOutput(output: string): { analysis: string; confidence: number; finalAnswer: string } {
  const analysisMatch = output.match(/ANALYSIS:\s*([\s\S]*?)(?=\nCONFIDENCE:|$)/i)
  const confidenceMatch = output.match(/CONFIDENCE:\s*([0-9]*\.?[0-9]+)/i)
  const finalMatch = output.match(/FINAL_ANSWER:\s*([\s\S]*)$/i)

  const analysis = analysisMatch?.[1]?.trim() || 'No analysis provided.'
  const confidence = confidenceMatch ? Math.min(1, Math.max(0, parseFloat(confidenceMatch[1]))) : 0.5
  const finalAnswer = finalMatch?.[1]?.trim() || output.trim()

  return { analysis, confidence, finalAnswer }
}

export async function arbitrate(
  agentRuns: AgentRun[],
  userQuestion: string,
  arbitratorProvider: Provider,
  signal: AbortSignal,
  callbacks?: ArbitratorCallbacks
): Promise<ArbitrationResult> {
  const startedAt = Date.now()
  const validRuns = agentRuns.filter((r) => r.status === 'done' && r.content.trim().length > 0)

  if (validRuns.length === 0) {
    const errorResult: ArbitrationResult = {
      finalContent: 'All agents failed to produce an answer.',
      reason: 'No valid answers were returned by any agent.',
      confidence: 0,
      sourceRuns: agentRuns,
      startedAt,
      finishedAt: Date.now()
    }
    callbacks?.onDone?.(errorResult)
    return errorResult
  }

  if (validRuns.length === 1) {
    const singleResult: ArbitrationResult = {
      finalContent: validRuns[0].content,
      reason: 'Only one agent produced a valid answer; no arbitration was needed.',
      confidence: 0.6,
      sourceRuns: agentRuns,
      startedAt,
      finishedAt: Date.now()
    }
    callbacks?.onDone?.(singleResult)
    return singleResult
  }

  try {
    const messages = buildJudgeMessages(userQuestion, validRuns)
    const stream = arbitratorProvider.stream(messages, signal, undefined)
    let rawOutput = ''

    for await (const chunk of stream) {
      if (signal.aborted) break
      if (typeof chunk === 'string') {
        rawOutput += chunk
        callbacks?.onToken?.(chunk)
      }
    }

    const { analysis, confidence, finalAnswer } = parseJudgeOutput(rawOutput)

    const result: ArbitrationResult = {
      finalContent: finalAnswer,
      reason: analysis,
      confidence,
      sourceRuns: agentRuns,
      startedAt,
      finishedAt: Date.now()
    }

    callbacks?.onDone?.(result)
    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    callbacks?.onError?.(error)

    // Fallback: return the longest answer if arbitration fails
    const fallback = validRuns.sort((a, b) => b.content.length - a.content.length)[0]
    const fallbackResult: ArbitrationResult = {
      finalContent: fallback.content,
      reason: `Arbitration failed (${error}). Falling back to the answer from ${fallback.model || fallback.providerId}.`,
      confidence: 0.4,
      sourceRuns: agentRuns,
      startedAt,
      finishedAt: Date.now()
    }
    callbacks?.onDone?.(fallbackResult)
    return fallbackResult
  }
}
