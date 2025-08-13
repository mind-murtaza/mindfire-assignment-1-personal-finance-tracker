type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const levelOrder: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function getCurrentLevel(): LogLevel {
  const envLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined) || 'info'
  const debugFlag = import.meta.env.VITE_DEBUG === 'true'
  if (debugFlag) return 'debug'
  return envLevel
}

function shouldLog(messageLevel: LogLevel, currentLevel: LogLevel): boolean {
  if (currentLevel === 'silent') return false
  if (messageLevel === 'silent') return false
  return levelOrder[messageLevel as Exclude<LogLevel, 'silent'>] >= levelOrder[currentLevel as Exclude<LogLevel, 'silent'>]
}

export function createLogger(namespace: string) {
  const level = getCurrentLevel()
  const prefix = `[${namespace}]`

  const log = (lvl: LogLevel, ...args: unknown[]) => {
    if (!shouldLog(lvl, level)) return
    const ts = new Date().toISOString()
    if (lvl === 'debug') console.log(prefix, ts, ...args)
    else if (lvl === 'info') console.info(prefix, ts, ...args)
    else if (lvl === 'warn') console.warn(prefix, ts, ...args)
    else if (lvl === 'error') console.error(prefix, ts, ...args)
  }

  return {
    debug: (...args: unknown[]) => log('debug', ...args),
    info: (...args: unknown[]) => log('info', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args),
  }
}

export type Logger = ReturnType<typeof createLogger>


