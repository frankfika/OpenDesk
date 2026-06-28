declare module 'node-cron' {
  export interface ScheduledTask {
    start(): void
    stop(): boolean
    destroy(): boolean
    getStatus(): string
  }

  interface CronSchedule {
    (expression: string, callback: () => void): ScheduledTask
  }

  const cron: {
    schedule: CronSchedule
    validate(expression: string): boolean
  }

  export default cron
}