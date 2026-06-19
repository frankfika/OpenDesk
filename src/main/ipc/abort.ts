export const abortControllers = new Map<string, AbortController>()

export function abortAllControllers(): void {
  for (const [, ac] of abortControllers.entries()) {
    ac.abort()
  }
  abortControllers.clear()
}
