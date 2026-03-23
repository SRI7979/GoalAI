import vm from 'node:vm'

function captureConsole(lines) {
  return {
    log: (...args) => lines.push(args.map((value) => String(value)).join(' ')),
    error: (...args) => lines.push(args.map((value) => String(value)).join(' ')),
  }
}

function runJavaScript(code, timeoutMs) {
  const stdoutLines = []
  const sandbox = {
    console: captureConsole(stdoutLines),
    Math,
    JSON,
    Date,
    Array,
    Number,
    String,
    Boolean,
    Object,
    Set,
    Map,
  }

  const startedAt = Date.now()

  try {
    vm.createContext(sandbox)
    const script = new vm.Script(code, { filename: 'main.js' })
    script.runInContext(sandbox, { timeout: timeoutMs })
    return {
      passed: true,
      stdout: stdoutLines.join('\n'),
      stderr: '',
      exitCode: 0,
      runtimeMs: Date.now() - startedAt,
      crashed: false,
    }
  } catch (error) {
    const message = error?.stack || error?.message || 'Execution failed.'
    return {
      passed: false,
      stdout: stdoutLines.join('\n'),
      stderr: message,
      exitCode: 1,
      runtimeMs: Date.now() - startedAt,
      crashed: true,
      timedOut: /Script execution timed out/i.test(message),
    }
  }
}

export async function executeProjectCode({ code, language, timeoutMs = 8000 }) {
  const normalizedLanguage = String(language || 'javascript').trim().toLowerCase()

  if (normalizedLanguage === 'javascript' || normalizedLanguage === 'js' || normalizedLanguage === 'node') {
    return runJavaScript(code, timeoutMs)
  }

  return {
    passed: false,
    stdout: '',
    stderr: 'Strict execution currently supports JavaScript projects in this deployment runtime.',
    exitCode: null,
    runtimeMs: 0,
    crashed: true,
    unsupportedLanguage: true,
  }
}
