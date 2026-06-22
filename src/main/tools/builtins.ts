import { exec } from 'child_process'
import type { ToolDefinition } from './registry'
import { readFile, writeFile, listDirectory, applyPatch } from './file-tools'
import {
  captureScreenshot,
  desktopClick,
  desktopType,
  desktopKey,
  desktopWindows,
  desktopActivate
} from './desktop-tools'
import { registerWeb3Tools } from './web3-tools'

/* ---------- Shell security ---------- */

const SHELL_WHITELIST = new Set([
  'ls',
  'cat',
  'grep',
  'find',
  'git',
  'npm',
  'mkdir',
  'rm',
  'cp',
  'mv',
  'echo',
  'pwd',
  'touch',
  'head',
  'tail',
  'wc',
  'sort',
  'uniq',
  'diff',
  'which',
  'whoami',
  'date',
  'uname',
  'ps',
  'top',
  'df',
  'du',
  'chmod',
  'chown',
  'tar',
  'zip',
  'unzip',
  'gzip',
  'gunzip',
  'rsync',
  'sed',
  'awk',
  'xargs',
  'basename',
  'dirname',
  'realpath',
  'readlink',
  'ln',
  'tee',
  'tr',
  'cut',
  'paste',
  'join',
  'split',
  'csplit',
  'fmt',
  'pr',
  'fold',
  'column',
  'seq',
  'yes',
  'printf',
  'env',
  'export',
  'exit',
  'return',
  'shift',
  'getopts',
  'trap',
  'wait',
  'jobs',
  'fg',
  'bg',
  'kill',
  'disown',
  'times',
  'umask',
  'ulimit',
  'hash',
  'help',
  'history',
  'logout',
  'stat',
  'file',
  'tree',
  'brew',
  'npx',
  'yarn',
  'pnpm',
  'tsc',
  'vite',
  'eslint',
  'prettier',
  'jest',
  'vitest',
  'playwright',
  'docker',
  'kubectl',
  'helm',
  'terraform',
  'aws',
  'gcloud',
  'az',
  'gh',
  'git-lfs',
  'sqlite3',
  'psql',
  'mysql',
  'mongosh',
  'redis-cli',
  'ffmpeg',
  'convert',
  'pdftotext',
  'jq',
  'yq',
  'htop',
  'btop',
  'glances',
  'neofetch',
  'fastfetch',
  'ripgrep',
  'rg',
  'fd',
  'fzf',
  'bat',
  'exa',
  'eza',
  'zoxide',
  'tldr',
  'cheat',
  'httpie',
  'xh',
  'wget',
  'aria2c',
  'yt-dlp',
  'ncdu',
  'dust',
  'duf',
  'procs',
  'sd',
  'choose',
  'hyperfine',
  'tokei',
  'gping',
  'dog',
  'delta',
  'lazygit',
  'gitui',
  'tig',
  'hub',
  'glab',
  'svn',
  'hg',
  'cvs',
  'bzr',
  'darcs',
  'fossil',
  'pijul',
  'cargo',
  'rustc',
  'go',
  'gofmt',
  'javac',
  'java',
  'mvn',
  'gradle',
  'ruby',
  'gem',
  'bundle',
  'rails',
  'php',
  'composer',
  'dotnet',
  'nuget',
  'swift',
  'xcodebuild',
  'make',
  'cmake',
  'ninja',
  'meson',
  'bazel',
  'buck',
  'ant',
  'maven',
  'sbt',
  'lein',
  'clojure',
  'scala',
  'kotlin',
  'kotlinc',
  'dart',
  'flutter',
  'elixir',
  'mix',
  'erlang',
  'erl',
  'haskell',
  'ghc',
  'cabal',
  'stack',
  'rustup',
  'cargo',
  'deno',
  'bun',
  'ts-node',
  'tsx',
  'nodemon',
  'pm2',
  'forever',
  'serve',
  'http-server',
  'live-server',
  'ngrok',
  'cloudflared',
  'minikube',
  'kind',
  'k3s',
  'helm',
  'istioctl',
  'argocd',
  'flux',
  'tekton',
  'jenkins',
  'circleci',
  'travis',
  'github-actions',
  'act',
  'gitea',
  'drone',
  'buildkite',
  'teamcity',
  'bamboo',
  'concourse',
  'fly',
  'spinnaker',
  'argo',
  'cadence',
  'temporal',
  ' airflow',
  'prefect',
  'dagster',
  'luigi',
  'pinball',
  'oozie',
  'azkaban',
  'nifi',
  'streamsets',
  'pentaho',
  'talend',
  'informatica',
  'datastage',
  'ssis',
  'dtsx',
  'dts',
  'mssql',
  'sqlcmd',
  'bcp',
  'sqsh',
  'fisql',
  'tsql',
  'osql',
  'isql',
  'pg_dump',
  'pg_restore',
  'pg_basebackup',
  'pg_ctl',
  'initdb',
  'createdb',
  'createuser',
  'dropdb',
  'dropuser',
  'psql',
  'pgbench',
  'pg_isready',
  'mysqladmin',
  'mysqldump',
  'mysqlimport',
  'mysqlshow',
  'mysqlslap',
  'mongodump',
  'mongorestore',
  'mongoexport',
  'mongoimport',
  'mongostat',
  'mongotop',
  'bsondump',
  'mongofiles',
  'mongooplog',
  'mongoreplay',
  'redis-server',
  'redis-cli',
  'redis-benchmark',
  'redis-check-aof',
  'redis-check-rdb',
  'redis-sentinel',
  'memcached',
  'memcdump',
  'cassandra',
  'cqlsh',
  'nodetool',
  'sstableloader',
  'sstablescrub',
  'sstableupgrade',
  'sstableutil',
  'sstablemetadata',
  'sstablerepairedset',
  'elasticsearch',
  'elasticsearch-certgen',
  'elasticsearch-certutil',
  'elasticsearch-croneval',
  'elasticsearch-env',
  'elasticsearch-keystore',
  'elasticsearch-migrate',
  'elasticsearch-node',
  'elasticsearch-plugin',
  'elasticsearch-reconfigure-node',
  'elasticsearch-reset-password',
  'elasticsearch-saml-metadata',
  'elasticsearch-setup-passwords',
  'elasticsearch-shard',
  'elasticsearch-syskeygen',
  'elasticsearch-users',
  'kibana',
  'logstash',
  'filebeat',
  'metricbeat',
  'packetbeat',
  'heartbeat',
  'auditbeat',
  'journalbeat',
  'functionbeat',
  'apm-server',
  'enterprise-search',
  'app-search',
  'workplace-search',
  'curator',
  'esrally',
  'esbench',
  'influx',
  'influxd',
  'influx_inspect',
  'influx_stress',
  'influx_tsm',
  'telegraf',
  'kapacitor',
  'chronograf',
  'prometheus',
  'alertmanager',
  'pushgateway',
  'node_exporter',
  'blackbox_exporter',
  'snmp_exporter',
  'mysqld_exporter',
  'redis_exporter',
  'postgres_exporter',
  'haproxy_exporter',
  'memcached_exporter',
  'collectd',
  'statsd',
  'graphite',
  'carbon',
  'grafana',
  'grafana-cli',
  'grafana-server',
  'loki',
  'promtail',
  'tempo',
  'cortex',
  'thanos',
  'jaeger',
  'zipkin',
  'skywalking',
  'pinpoint',
  'cat',
  'arthas',
  'jprofiler',
  'yourkit',
  'dynatrace',
  'newrelic',
  'datadog',
  'splunk',
  'sumologic',
  'elk',
  'efk',
  'fluentd',
  'fluent-bit',
  'vector',
  'logdna',
  'papertrail',
  'loggly',
  'logentries',
  'logzio',
  'logmatic',
  'logstash',
  'filebeat',
  'winlogbeat',
  'packetbeat',
  'auditbeat',
  'heartbeat',
  'metricbeat',
  'functionbeat',
  'journalbeat',
  'cloudwatch',
  'cloudtrail',
  'config',
  'guardduty',
  'inspector',
  'macie',
  'securityhub',
  'shield',
  'waf',
  'firewall',
  'vpc',
  'ec2',
  's3',
  'rds',
  'dynamodb',
  'lambda',
  'sns',
  'sqs',
  'kinesis',
  'glue',
  'athena',
  'redshift',
  'emr',
  'sagemaker',
  'rekognition',
  'polly',
  'translate',
  'comprehend',
  'textract',
  'personalize',
  'forecast',
  'kendra',
  'lex',
  'connect',
  'pinpoint',
  'ses',
  'workmail',
  'chime',
  'quicksight',
  'grafana',
  'prometheus',
  'thanos',
  'cortex',
  'loki',
  'tempo',
  'jaeger',
  'zipkin',
  'skywalking',
  'pinpoint',
  'arthas',
  'jprofiler',
  'yourkit',
  'dynatrace',
  'newrelic',
  'datadog',
  'splunk',
  'sumologic',
  'elk',
  'efk',
  'fluentd',
  'fluent-bit',
  'vector',
  'logdna',
  'papertrail',
  'loggly',
  'logentries',
  'logzio',
  'logmatic',
  'logstash',
  'filebeat',
  'winlogbeat',
  'packetbeat',
  'auditbeat',
  'heartbeat',
  'metricbeat',
  'functionbeat',
  'journalbeat'
])

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+\/\S*/,
  /mkfs\./,
  /dd\s+if=\/dev\/zero/,
  /dd\s+if=\/dev\/random/,
  /dd\s+if=\/dev\/urandom/,
  />\s*\/dev\/sda/,
  /:\(\)\{\s*:\|:&\s*\};/, // fork bomb
  /chmod\s+-R\s+777\s+\//,
  /chmod\s+-R\s+000\s+\//,
  /chown\s+-R\s+\S+\s+\//,
  /rm\s+-rf\s+~\//,
  /del\s+\/f\s+\/s\s+\/q\s+c:\\/i,
  /format\s+c:/i,
  /rd\s+\/s\s+\/q\s+c:\\/i,
  /shutdown\s+-h\s+now/,
  /reboot/,
  /halt/,
  /poweroff/,
  /init\s+0/,
  /init\s+6/,
  /systemctl\s+poweroff/,
  /systemctl\s+reboot/,
  /osascript.*-e.*quit.*application.*"System Events"/i,
  /osascript.*-e.*shut down/i,
  /osascript.*-e.*restart/i
]

function validateShellCommand(command: string): { valid: boolean; error?: string } {
  // Block dangerous metacharacters that enable command chaining
  const blockedChars = /[;&`$]/
  if (blockedChars.test(command)) {
    return { valid: false, error: 'Command contains blocked characters (; & ` $)' }
  }

  // Block heredocs (<<) because incomplete ones hang the shell waiting for stdin.
  // Use echo or printf to write multi-line content instead.
  if (/<<[-]?/.test(command)) {
    return {
      valid: false,
      error: 'Heredocs (<<) are not allowed because they can hang the shell waiting for input. Use echo or printf to write content instead.'
    }
  }

  // Block dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { valid: false, error: 'Command matches a dangerous pattern and is blocked' }
    }
  }

  // Parse pipeline and check whitelist for each command
  const pipeline = command.split('|').map((c) => c.trim())
  for (const cmd of pipeline) {
    const firstWord = cmd.split(/\s+/)[0]
    if (!SHELL_WHITELIST.has(firstWord)) {
      return {
        valid: false,
        error: `Command '${firstWord}' is not in the allowed whitelist. Allowed: ${Array.from(SHELL_WHITELIST).slice(0, 20).join(', ')}...`
      }
    }
  }

  return { valid: true }
}

/* ---------- File system tools ---------- */

export const fileReadTool: ToolDefinition = {
  name: 'file_read',
  description: 'Read the contents of a file at the given path',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file' }
    },
    required: ['path']
  },
  handler: async (args) => {
    const result = readFile(args.path as string)
    if (!result.success) throw new Error(result.error || 'Failed to read file')
    return result.content || ''
  }
}

export const fileWriteTool: ToolDefinition = {
  name: 'file_write',
  description: 'Write content to a file at the given path',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file' },
      content: { type: 'string', description: 'Content to write' }
    },
    required: ['path', 'content']
  },
  handler: async (args) => {
    const result = writeFile(args.path as string, args.content as string)
    if (!result.success) throw new Error(result.error || 'Failed to write file')
    return `File written successfully to ${args.path}`
  }
}

export const fileListTool: ToolDefinition = {
  name: 'file_list',
  description: 'List files and directories at the given path',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the directory' }
    },
    required: ['path']
  },
  handler: async (args) => {
    const result = listDirectory(args.path as string)
    if (!result.success) throw new Error(result.error || 'Failed to list directory')
    return JSON.stringify(result.entries, null, 2)
  }
}

export const applyPatchTool: ToolDefinition = {
  name: 'apply_patch',
  description: 'Apply a unified diff patch to a file',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to patch' },
      patch: { type: 'string', description: 'Unified diff patch content' }
    },
    required: ['path', 'patch']
  },
  handler: async (args) => {
    const result = applyPatch(args.path as string, args.patch as string)
    if (!result.success) throw new Error(result.error || 'Failed to apply patch')
    return `Patch applied successfully to ${args.path}`
  }
}

/* ---------- Desktop control tools ---------- */

export const desktopCaptureTool: ToolDefinition = {
  name: 'desktop_capture',
  description: 'Capture a screenshot of the desktop',
  parameters: {
    type: 'object',
    properties: {
      region: {
        type: 'string',
        description: "Region to capture: 'full', 'window', or 'area'",
        enum: ['full', 'window', 'area']
      }
    }
  },
  handler: async (args) => {
    const base64 = await captureScreenshot(args.region as string)
    return `data:image/png;base64,${base64}`
  }
}

export const desktopClickTool: ToolDefinition = {
  name: 'desktop_click',
  description: 'Simulate a mouse click at screen coordinates',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'X coordinate' },
      y: { type: 'number', description: 'Y coordinate' },
      button: {
        type: 'string',
        description: "Mouse button: 'left' or 'right'",
        enum: ['left', 'right']
      },
      double: { type: 'boolean', description: 'Double click' }
    },
    required: ['x', 'y']
  },
  handler: async (args) => {
    return await desktopClick(args.x as number, args.y as number, args.button as string, args.double as boolean)
  }
}

export const desktopTypeTool: ToolDefinition = {
  name: 'desktop_type',
  description: 'Simulate typing text',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to type' }
    },
    required: ['text']
  },
  handler: async (args) => {
    return await desktopType(args.text as string)
  }
}

export const desktopKeyTool: ToolDefinition = {
  name: 'desktop_key',
  description: 'Simulate pressing a key with optional modifiers',
  parameters: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Key to press' },
      modifiers: {
        type: 'array',
        description: "Modifier keys: e.g. ['command', 'shift', 'option', 'control']",
        items: { type: 'string' }
      }
    },
    required: ['key']
  },
  handler: async (args) => {
    return await desktopKey(args.key as string, args.modifiers as string[])
  }
}

export const desktopWindowsTool: ToolDefinition = {
  name: 'desktop_windows',
  description: 'List all visible windows',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    return await desktopWindows()
  }
}

export const desktopActivateTool: ToolDefinition = {
  name: 'desktop_activate',
  description: 'Activate a window by its title/process name',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Window title or process name' }
    },
    required: ['title']
  },
  handler: async (args) => {
    return await desktopActivate(args.title as string)
  }
}

/* ---------- Shell tool ---------- */

export const shellTool: ToolDefinition = {
  name: 'shell',
  description: 'Execute a shell command with a 30-second timeout',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
      cwd: { type: 'string', description: 'Working directory for the command' }
    },
    required: ['command']
  },
  handler: async (args) => {
    const command = args.command as string
    const cwd = args.cwd as string | undefined

    const validation = validateShellCommand(command)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    return new Promise((resolve, reject) => {
      exec(command, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Exit code ${error.code}: ${stderr || error.message}`))
        } else {
          resolve(stdout || stderr || '(no output)')
        }
      })
    })
  }
}

/* ---------- Web search tool ---------- */

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web using DuckDuckGo (with Bing fallback)',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  },
  handler: async (args) => {
    const query = args.query as string
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': userAgent },
          signal: controller.signal
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.text()
      } finally {
        clearTimeout(timer)
      }
    }

    function parseDuckDuckGo(html: string) {
      const results: Array<{ title: string; url: string; snippet: string }> = []
      const regex =
        /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
      let match
      while ((match = regex.exec(html)) !== null && results.length < 10) {
        results.push({
          title: decodeHtmlEntities(match[2]),
          url: match[1],
          snippet: decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '').trim())
        })
      }
      if (results.length === 0) {
        const altRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g
        while ((match = altRegex.exec(html)) !== null && results.length < 10) {
          results.push({ title: decodeHtmlEntities(match[2]), url: match[1], snippet: '' })
        }
      }
      return results
    }

    function parseBing(html: string) {
      const results: Array<{ title: string; url: string; snippet: string }> = []
      // Bing wraps each result in <li class="b_algo">
      const blockRegex = /<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/g
      let blockMatch
      while ((blockMatch = blockRegex.exec(html)) !== null && results.length < 10) {
        const block = blockMatch[1]
        const titleMatch = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block)
        const snippetMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block)
        if (titleMatch) {
          results.push({
            title: decodeHtmlEntities(titleMatch[2].replace(/<[^>]+>/g, '').trim()),
            url: decodeHtmlEntities(titleMatch[1]),
            snippet: snippetMatch
              ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '').trim())
              : ''
          })
        }
      }
      return results
    }

    async function trySearch(
      url: string,
      parser: (html: string) => Array<{ title: string; url: string; snippet: string }>,
      retries = 2
    ) {
      let lastErr = ''
      for (let i = 0; i <= retries; i++) {
        try {
          const html = await fetchHtml(url)
          const results = parser(html)
          if (results.length > 0) return results
          lastErr = 'No results parsed from response'
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e)
        }
        if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
      }
      throw new Error(lastErr || 'Search failed')
    }

    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`

    let errors: string[] = []
    try {
      const results = await trySearch(ddgUrl, parseDuckDuckGo)
      return JSON.stringify(results, null, 2)
    } catch (e) {
      errors.push(`DuckDuckGo: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      const results = await trySearch(bingUrl, parseBing)
      return JSON.stringify(results, null, 2)
    } catch (e) {
      errors.push(`Bing: ${e instanceof Error ? e.message : String(e)}`)
    }

    throw new Error(`Web search failed. ${errors.join(' | ')}`)
  }
}

/* ---------- Registry helper ---------- */

export function registerBuiltins(registry: import('./registry').ToolRegistry): void {
  registry.register(fileReadTool)
  registry.register(fileWriteTool)
  registry.register(fileListTool)
  registry.register(applyPatchTool)
  registry.register(desktopCaptureTool)
  registry.register(desktopClickTool)
  registry.register(desktopTypeTool)
  registry.register(desktopKeyTool)
  registry.register(desktopWindowsTool)
  registry.register(desktopActivateTool)
  registry.register(shellTool)
  registry.register(webSearchTool)
  // Web3 read-only tools (signing happens in renderer via Reown AppKit)
  registerWeb3Tools(registry)
}
