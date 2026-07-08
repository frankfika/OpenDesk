import { runChat } from './chatPipeline'
import { useSettingsStore } from '../store/settings'
import { useWorkspaceStore } from '../store/workspace'

/**
 * AutomationDriver — Background listener for scheduled tasks.
 *
 * When the main process triggers a task, this driver resolves the necessary
 * context (active provider, workspace, thread) and executes the task via
 * the chat pipeline.
 */

let initialized = false

export function initAutomationDriver(): void {
  if (initialized) return
  const hasScheduler = !!window.api?.app?.scheduler?.onTaskRunning
  const hasClaw = !!window.api?.app?.claw?.onMessage

  if (!hasScheduler && !hasClaw) return

  initialized = true
  console.log('[Automation] Driver initialized')

  if (hasScheduler) {
    window.api.app.scheduler.onTaskRunning(async ({ id, action }) => {
      console.log(`[Automation] Task triggered: ${id}`, action)

      try {
        const settings = useSettingsStore.getState()
        const workspaceStore = useWorkspaceStore.getState()

        const provider = settings.activeProvider()
        const workspace = workspaceStore.activeWorkspace()

        if (!provider) throw new Error('No active AI provider')
        if (!workspace) throw new Error('No active workspace')

        // 1. Resolve or create a thread for this task
        // We use a dedicated thread title for scheduled tasks to keep the history clean
        const threadTitle = `🤖 Auto: ${action.kind === 'skill' ? action.skillId : 'Prompt'}`
        const thread = await workspaceStore.createThread(
          workspace.id,
          threadTitle,
          action.kind === 'skill' ? action.skillId : undefined
        )

        // 2. Execute the task
        const prompt = action.prompt || (action.kind === 'skill' ? `Run skill ${action.skillId}` : '')
        if (!prompt) throw new Error('Empty task prompt')

        const result = await runChat({
          providerId: provider.id,
          threadId: thread.id,
          prompt: prompt
        })

        // 3. Report back to scheduler
        if (result.ok) {
          await window.api.app.scheduler.reportFinished(id, 'success')
        } else {
          await window.api.app.scheduler.reportFinished(id, 'error', result.error)
        }
      } catch (err) {
        console.error(`[Automation] Task ${id} failed:`, err)
        const errorMsg = err instanceof Error ? err.message : String(err)
        await window.api.app.scheduler.reportFinished(id, 'error', errorMsg)
      }
    })
  }

  if (hasClaw) {
    window.api.app.claw.onMessage(async (m) => {
      console.log(`[Claw] Message from Telegram (${m.chatId}): ${m.text}`)

      try {
        const settings = useSettingsStore.getState()
        const workspaceStore = useWorkspaceStore.getState()

        const provider = settings.activeProvider()
        const workspace = workspaceStore.activeWorkspace()

        if (!provider) throw new Error('No active AI provider')
        if (!workspace) throw new Error('No active workspace')

        // 1. Find binding or create a new thread
        const config = await window.api.app.claw.getConfig()
        const binding = config.bindings?.find((b) => b.chatId === m.chatId)

        let threadId = binding?.threadId
        if (!threadId) {
          // Create a new thread for this chat if no binding exists
          const thread = await workspaceStore.createThread(
            workspace.id,
            `📱 Telegram: ${m.from}`,
            undefined
          )
          threadId = thread.id
          // Optional: automatically create a binding for next time
          await window.api.app.claw.updateConfig({
            bindings: [...(config.bindings || []), { chatId: m.chatId, threadId, label: m.from }]
          })
        }

        // 2. Run chat
        const result = await runChat({
          providerId: provider.id,
          threadId,
          prompt: m.text
        })

        // 3. Send response back to Telegram
        const replyText = result.ok
          ? result.text || 'Done (no output)'
          : `❌ Error: ${result.error || 'Unknown error'}`

        await window.api.app.claw.sendMessage(m.chatId, replyText)
      } catch (err) {
        console.error(`[Claw] Failed to process message from ${m.chatId}:`, err)
        const errorMsg = err instanceof Error ? err.message : String(err)
        await window.api.app.claw.sendMessage(m.chatId, `❌ Bot Error: ${errorMsg}`)
      }
    })
  }
}
