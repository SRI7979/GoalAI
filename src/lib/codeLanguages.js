export const CODE_LANGUAGES = [
  { id: 'python', label: 'Python', ext: 'py', aliases: ['py', 'python3'], comment: '#' },
  { id: 'javascript', label: 'JavaScript', ext: 'js', aliases: ['js', 'node', 'nodejs', 'react', 'jsx'], comment: '//' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', aliases: ['ts'], comment: '//' },
  { id: 'sql', label: 'SQL / SQLite', ext: 'sql', aliases: ['sqlite', 'postgres', 'postgresql', 'mysql'], comment: '--' },
  { id: 'html', label: 'HTML/CSS', ext: 'html', aliases: ['css', 'web', 'webpage'], comment: '<!--' },
  { id: 'bash', label: 'Bash', ext: 'sh', aliases: ['shell', 'sh', 'zsh'], comment: '#' },
  { id: 'ruby', label: 'Ruby', ext: 'rb', aliases: ['rb'], comment: '#' },
  { id: 'php', label: 'PHP', ext: 'php', aliases: [], comment: '//' },
  { id: 'java', label: 'Java', ext: 'java', aliases: [], comment: '//' },
  { id: 'cpp', label: 'C++', ext: 'cpp', aliases: ['c++', 'cplusplus'], comment: '//' },
  { id: 'c', label: 'C', ext: 'c', aliases: [], comment: '//' },
  { id: 'csharp', label: 'C#', ext: 'cs', aliases: ['c#', 'cs', 'dotnet'], comment: '//' },
  { id: 'go', label: 'Go', ext: 'go', aliases: ['golang'], comment: '//' },
  { id: 'rust', label: 'Rust', ext: 'rs', aliases: ['rs'], comment: '//' },
  { id: 'swift', label: 'Swift', ext: 'swift', aliases: [], comment: '//' },
  { id: 'kotlin', label: 'Kotlin', ext: 'kt', aliases: ['kt'], comment: '//' },
  { id: 'scala', label: 'Scala', ext: 'scala', aliases: [], comment: '//' },
  { id: 'dart', label: 'Dart', ext: 'dart', aliases: [], comment: '//' },
  { id: 'r', label: 'R', ext: 'r', aliases: ['rscript'], comment: '#' },
  { id: 'julia', label: 'Julia', ext: 'jl', aliases: ['jl'], comment: '#' },
  { id: 'lua', label: 'Lua', ext: 'lua', aliases: [], comment: '--' },
  { id: 'perl', label: 'Perl', ext: 'pl', aliases: ['pl'], comment: '#' },
  { id: 'haskell', label: 'Haskell', ext: 'hs', aliases: ['hs'], comment: '--' },
  { id: 'elixir', label: 'Elixir', ext: 'exs', aliases: ['ex'], comment: '#' },
  { id: 'erlang', label: 'Erlang', ext: 'erl', aliases: [], comment: '%' },
  { id: 'clojure', label: 'Clojure', ext: 'clj', aliases: ['clj'], comment: ';;' },
  { id: 'ocaml', label: 'OCaml', ext: 'ml', aliases: ['ml'], comment: '(*' },
  { id: 'fsharp', label: 'F#', ext: 'fsx', aliases: ['f#', 'fs', 'fsi'], comment: '//' },
  { id: 'groovy', label: 'Groovy', ext: 'groovy', aliases: [], comment: '//' },
  { id: 'zig', label: 'Zig', ext: 'zig', aliases: [], comment: '//' },
  { id: 'nim', label: 'Nim', ext: 'nim', aliases: [], comment: '#' },
  { id: 'crystal', label: 'Crystal', ext: 'cr', aliases: [], comment: '#' },
  { id: 'powershell', label: 'PowerShell', ext: 'ps1', aliases: ['pwsh', 'ps'], comment: '#' },
  { id: 'matlab', label: 'MATLAB/Octave', ext: 'm', aliases: ['octave'], comment: '%' },
]

export const CODE_LANGUAGE_MAP = Object.fromEntries(CODE_LANGUAGES.map((language) => [language.id, language]))

const ALIAS_MAP = CODE_LANGUAGES.reduce((acc, language) => {
  acc[language.id] = language.id
  acc[language.label.toLowerCase()] = language.id
  language.aliases.forEach((alias) => { acc[alias.toLowerCase()] = language.id })
  return acc
}, {})

export function normalizeCodeLanguage(language, fallback = 'javascript') {
  const normalized = String(language || '').trim().toLowerCase()
  return ALIAS_MAP[normalized] || fallback
}

export function detectCodeLanguageFromText(text, fallback = 'javascript') {
  const value = String(text || '').toLowerCase()
  if (/python|django|flask|pandas|numpy|py\b/.test(value)) return 'python'
  if (/\bsql\b|sqlite|postgres|mysql|database|query|join\b/.test(value)) return 'sql'
  if (/html|css|web page|website|frontend|front-end/.test(value)) return 'html'
  if (/typescript|\bts\b/.test(value)) return 'typescript'
  if (/javascript|react|node|next\.?js|\bjs\b/.test(value)) return 'javascript'
  if (/\bc\+\+\b|cpp/.test(value)) return 'cpp'
  if (/\bc#\b|csharp|dotnet/.test(value)) return 'csharp'
  if (/\bjava\b/.test(value)) return 'java'
  if (/\bgo\b|golang/.test(value)) return 'go'
  if (/rust/.test(value)) return 'rust'
  if (/swift|ios/.test(value)) return 'swift'
  if (/kotlin/.test(value)) return 'kotlin'
  if (/scala/.test(value)) return 'scala'
  if (/dart|flutter/.test(value)) return 'dart'
  if (/ruby/.test(value)) return 'ruby'
  if (/php/.test(value)) return 'php'
  if (/bash|shell|zsh/.test(value)) return 'bash'
  if (/\br language\b|\br programming\b|rscript/.test(value)) return 'r'
  if (/julia/.test(value)) return 'julia'
  if (/lua/.test(value)) return 'lua'
  if (/perl/.test(value)) return 'perl'
  if (/haskell/.test(value)) return 'haskell'
  if (/elixir/.test(value)) return 'elixir'
  if (/erlang/.test(value)) return 'erlang'
  if (/clojure/.test(value)) return 'clojure'
  if (/ocaml/.test(value)) return 'ocaml'
  if (/f#|fsharp/.test(value)) return 'fsharp'
  if (/groovy/.test(value)) return 'groovy'
  if (/zig/.test(value)) return 'zig'
  if (/nim/.test(value)) return 'nim'
  if (/crystal/.test(value)) return 'crystal'
  if (/powershell|pwsh/.test(value)) return 'powershell'
  if (/matlab|octave/.test(value)) return 'matlab'
  return fallback
}

export function getLanguageMeta(language) {
  return CODE_LANGUAGE_MAP[normalizeCodeLanguage(language)] || CODE_LANGUAGE_MAP.javascript
}

export function buildStarterForLanguage(language, title = 'Practice exercise', objective = 'Complete the exercise.') {
  const id = normalizeCodeLanguage(language)
  const safeTitle = String(title || 'Practice exercise').replace(/\*\//g, '')
  const safeObjective = String(objective || 'Complete the exercise.').replace(/\*\//g, '')

  if (id === 'python') {
    return [
      `# ${safeTitle}`,
      `# Goal: ${safeObjective}`,
      '',
      'def solve():',
      '    # TODO: write your solution here',
      '    return "ready"',
      '',
      'print(solve())',
      '',
    ].join('\n')
  }

  if (id === 'sql') {
    return [
      `-- ${safeTitle}`,
      `-- Goal: ${safeObjective}`,
      '',
      'CREATE TABLE items (',
      '  id INTEGER PRIMARY KEY,',
      '  name TEXT,',
      '  score INTEGER',
      ');',
      '',
      "INSERT INTO items (name, score) VALUES ('Alpha', 12), ('Beta', 19), ('Gamma', 7);",
      '',
      '-- TODO: write your query below.',
      'SELECT name, score',
      'FROM items',
      'ORDER BY score DESC;',
      '',
    ].join('\n')
  }

  if (id === 'html') {
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      `  <title>${safeTitle}</title>`,
      '  <style>',
      '    body { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #f7fafc; color: #111827; }',
      '    main { max-width: 720px; margin: 0 auto; }',
      '    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 18px; background: white; }',
      '  </style>',
      '</head>',
      '<body>',
      '  <main class="card">',
      `    <h1>${safeTitle}</h1>`,
      '    <p>TODO: build the page content here.</p>',
      '  </main>',
      '</body>',
      '</html>',
      '',
    ].join('\n')
  }

  if (id === 'java') {
    return [
      'public class Main {',
      '  public static void main(String[] args) {',
      `    System.out.println("${safeTitle}");`,
      '    // TODO: write your solution here',
      '  }',
      '}',
      '',
    ].join('\n')
  }

  if (id === 'cpp') {
    return [
      '#include <iostream>',
      '#include <vector>',
      'using namespace std;',
      '',
      'int main() {',
      `  cout << "${safeTitle}" << endl;`,
      '  // TODO: write your solution here',
      '  return 0;',
      '}',
      '',
    ].join('\n')
  }

  if (id === 'c') {
    return [
      '#include <stdio.h>',
      '',
      'int main(void) {',
      `  printf("${safeTitle}\\n");`,
      '  /* TODO: write your solution here */',
      '  return 0;',
      '}',
      '',
    ].join('\n')
  }

  if (id === 'go') {
    return [
      'package main',
      '',
      'import "fmt"',
      '',
      'func main() {',
      `  fmt.Println("${safeTitle}")`,
      '  // TODO: write your solution here',
      '}',
      '',
    ].join('\n')
  }

  if (id === 'rust') {
    return [
      'fn main() {',
      `    println!("${safeTitle}");`,
      '    // TODO: write your solution here',
      '}',
      '',
    ].join('\n')
  }

  if (id === 'bash') {
    return [
      '#!/usr/bin/env bash',
      `echo "${safeTitle}"`,
      '# TODO: write your solution here',
      '',
    ].join('\n')
  }

  if (id === 'ruby') return [`puts "${safeTitle}"`, '# TODO: write your solution here', ''].join('\n')
  if (id === 'php') return ['<?php', `echo "${safeTitle}\\n";`, '// TODO: write your solution here', ''].join('\n')
  if (id === 'swift') return [`print("${safeTitle}")`, '// TODO: write your solution here', ''].join('\n')
  if (id === 'kotlin') return ['fun main() {', `  println("${safeTitle}")`, '  // TODO: write your solution here', '}', ''].join('\n')
  if (id === 'r') return [`print("${safeTitle}")`, '# TODO: write your solution here', ''].join('\n')
  if (id === 'lua') return [`print("${safeTitle}")`, '-- TODO: write your solution here', ''].join('\n')
  if (id === 'perl') return [`print "${safeTitle}\\n";`, '# TODO: write your solution here', ''].join('\n')

  const meta = getLanguageMeta(id)
  const comment = meta.comment || '//'
  return [
    `${comment} ${safeTitle}`,
    `${comment} Goal: ${safeObjective}`,
    `${comment} TODO: write your solution here`,
    '',
  ].join('\n')
}
