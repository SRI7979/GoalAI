import vm from 'node:vm'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getLanguageMeta, normalizeCodeLanguage } from '@/lib/codeLanguages'

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

function runProcess(command, args, { cwd, timeoutMs = 8000 }) {
  const startedAt = Date.now()
  return new Promise((resolve) => {
    let settled = false
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })
    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      resolve({
        passed: false,
        stdout,
        stderr: stderr || `Timed out after ${timeoutMs}ms.`,
        exitCode: null,
        runtimeMs: Date.now() - startedAt,
        crashed: true,
        timedOut: true,
      })
    }, timeoutMs)

    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        passed: false,
        stdout,
        stderr: error.message,
        exitCode: null,
        runtimeMs: Date.now() - startedAt,
        crashed: true,
        missingRuntime: error?.code === 'ENOENT',
      })
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        passed: code === 0,
        stdout,
        stderr,
        exitCode: code,
        runtimeMs: Date.now() - startedAt,
        crashed: code !== 0,
      })
    })
  })
}

async function runPython(code, timeoutMs) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pathai-python-'))
  try {
    const file = path.join(dir, 'main.py')
    await writeFile(file, code, 'utf8')
    return await runProcess('python3', [file], { cwd: dir, timeoutMs })
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function sqlRunnerScript(sql) {
  return `
import sqlite3
import sys

sql = ${JSON.stringify(sql)}
conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
cur = conn.cursor()

statements = [part.strip() for part in sql.split(";") if part.strip()]
printed = False

try:
    for statement in statements:
        cur.execute(statement)
        lowered = statement.lstrip().lower()
        if lowered.startswith(("select", "with", "pragma")):
            rows = cur.fetchall()
            names = [desc[0] for desc in (cur.description or [])]
            if names:
                print(" | ".join(names))
                print("-" * max(3, len(" | ".join(names))))
            for row in rows:
                print(" | ".join(str(row[name]) for name in names))
            printed = True
    conn.commit()
    if not printed:
        print("SQL ran successfully. Add a SELECT query to print rows.")
except Exception as exc:
    print(str(exc), file=sys.stderr)
    sys.exit(1)
`
}

async function runSql(code, timeoutMs) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pathai-sql-'))
  try {
    const file = path.join(dir, 'main.py')
    await writeFile(file, sqlRunnerScript(code), 'utf8')
    return await runProcess('python3', [file], { cwd: dir, timeoutMs })
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function runHtml(code) {
  return {
    passed: true,
    stdout: 'HTML preview rendered below.',
    stderr: '',
    exitCode: 0,
    runtimeMs: 0,
    crashed: false,
    previewHtml: code,
  }
}

const DIRECT_RUNNERS = {
  bash: { command: 'bash', args: ['main.sh'], ext: 'sh' },
  ruby: { command: 'ruby', args: ['main.rb'], ext: 'rb' },
  php: { command: 'php', args: ['main.php'], ext: 'php' },
  swift: { command: 'swift', args: ['main.swift'], ext: 'swift' },
  kotlin: { command: 'kotlinc', args: ['-script', 'main.kts'], ext: 'kts' },
  scala: { command: 'scala', args: ['main.scala'], ext: 'scala' },
  dart: { command: 'dart', args: ['main.dart'], ext: 'dart' },
  r: { command: 'Rscript', args: ['main.r'], ext: 'r' },
  julia: { command: 'julia', args: ['main.jl'], ext: 'jl' },
  lua: { command: 'lua', args: ['main.lua'], ext: 'lua' },
  perl: { command: 'perl', args: ['main.pl'], ext: 'pl' },
  haskell: { command: 'runhaskell', args: ['main.hs'], ext: 'hs' },
  elixir: { command: 'elixir', args: ['main.exs'], ext: 'exs' },
  clojure: { command: 'clojure', args: ['main.clj'], ext: 'clj' },
  ocaml: { command: 'ocaml', args: ['main.ml'], ext: 'ml' },
  fsharp: { command: 'dotnet', args: ['fsi', 'main.fsx'], ext: 'fsx' },
  groovy: { command: 'groovy', args: ['main.groovy'], ext: 'groovy' },
  nim: { command: 'nim', args: ['r', 'main.nim'], ext: 'nim' },
  crystal: { command: 'crystal', args: ['run', 'main.cr'], ext: 'cr' },
  powershell: { command: 'pwsh', args: ['-File', 'main.ps1'], ext: 'ps1' },
  matlab: { command: 'octave', args: ['--quiet', 'main.m'], ext: 'm' },
  typescript: { command: 'tsx', args: ['main.ts'], ext: 'ts' },
}

const COMPILED_RUNNERS = {
  c: {
    ext: 'c',
    compile: { command: 'gcc', args: ['main.c', '-o', 'main'] },
    run: { command: './main', args: [] },
  },
  cpp: {
    ext: 'cpp',
    compile: { command: 'g++', args: ['main.cpp', '-std=c++17', '-o', 'main'] },
    run: { command: './main', args: [] },
  },
  go: {
    ext: 'go',
    compile: null,
    run: { command: 'go', args: ['run', 'main.go'] },
  },
  rust: {
    ext: 'rs',
    compile: { command: 'rustc', args: ['main.rs', '-o', 'main'] },
    run: { command: './main', args: [] },
  },
  java: {
    ext: 'java',
    compile: { command: 'javac', args: ['Main.java'] },
    run: { command: 'java', args: ['Main'] },
    filename: 'Main.java',
  },
  csharp: {
    ext: 'cs',
    compile: null,
    run: { command: 'dotnet-script', args: ['main.cs'] },
  },
  erlang: {
    ext: 'erl',
    compile: { command: 'erlc', args: ['main.erl'] },
    run: { command: 'erl', args: ['-noshell', '-s', 'main', 'main', '-s', 'init', 'stop'] },
  },
  zig: {
    ext: 'zig',
    compile: null,
    run: { command: 'zig', args: ['run', 'main.zig'] },
  },
}

async function runDirectLanguage(code, language, timeoutMs) {
  const runner = DIRECT_RUNNERS[language]
  if (!runner) return null
  const dir = await mkdtemp(path.join(os.tmpdir(), `pathai-${language}-`))
  try {
    const file = path.join(dir, `main.${runner.ext}`)
    await writeFile(file, code, 'utf8')
    return await runProcess(runner.command, runner.args, { cwd: dir, timeoutMs })
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function runCompiledLanguage(code, language, timeoutMs) {
  const runner = COMPILED_RUNNERS[language]
  if (!runner) return null
  const dir = await mkdtemp(path.join(os.tmpdir(), `pathai-${language}-`))
  try {
    const filename = runner.filename || `main.${runner.ext}`
    await writeFile(path.join(dir, filename), code, 'utf8')
    if (runner.compile) {
      const compile = await runProcess(runner.compile.command, runner.compile.args, { cwd: dir, timeoutMs })
      if (!compile.passed) return { ...compile, phase: 'compile' }
    }
    return await runProcess(runner.run.command, runner.run.args, { cwd: dir, timeoutMs })
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function runtimeMissing(language) {
  const meta = getLanguageMeta(language)
  return {
    passed: false,
    stdout: '',
    stderr: `${meta.label} is available in the editor, but its runtime/compiler is not installed on this machine yet. Install the runtime, or switch to Python, SQL, JavaScript, or HTML for immediate execution.`,
    exitCode: null,
    runtimeMs: 0,
    crashed: true,
    missingRuntime: true,
  }
}

export async function executeProjectCode({ code, language, timeoutMs = 8000 }) {
  const normalizedLanguage = normalizeCodeLanguage(language)

  if (normalizedLanguage === 'javascript') {
    return runJavaScript(code, timeoutMs)
  }
  if (normalizedLanguage === 'python') {
    return runPython(code, timeoutMs)
  }
  if (normalizedLanguage === 'sql') {
    return runSql(code, timeoutMs)
  }
  if (normalizedLanguage === 'html') {
    return runHtml(code)
  }

  const direct = await runDirectLanguage(code, normalizedLanguage, timeoutMs)
  if (direct) return direct
  const compiled = await runCompiledLanguage(code, normalizedLanguage, timeoutMs)
  if (compiled) return compiled

  return runtimeMissing(normalizedLanguage)
}
