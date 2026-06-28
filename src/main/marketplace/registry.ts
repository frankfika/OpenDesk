/**
 * Skills Marketplace — bundled registry of curated Skills.
 *
 * In production we'd fetch this from a GitHub-hosted JSON manifest
 * (opendesk-skills/official/registry.json). For v0.7.0-alpha we bundle
 * a starter list to avoid a hard network dependency at first launch.
 *
 * Each entry maps to a public GitHub repo path under `skills/<id>/`.
 * The existing `importSkillFromGitHub` IPC handles the actual install.
 */

export interface MarketplaceEntry {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  author: string
  githubPath: string // 'owner/repo' relative to github.com
  skillSubpath: string // path within the repo, e.g. 'skills/<id>'
  stars?: number
  installs?: number
  version?: string
  verified?: boolean
}

export const MARKETPLACE_REGISTRY_URL =
  'https://raw.githubusercontent.com/frankfika/opendesk-skills/main/registry.json'

export const MARKETPLACE_BUNDLED: MarketplaceEntry[] = [
  {
    id: 'awesome-readme',
    name: 'Awesome README Generator',
    description: '把任何代码库转成结构化 README，包含标题、特性、快速开始、API、贡献、License',
    category: '生产力',
    tags: ['docs', 'readme', 'github'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/awesome-readme',
    version: '1.0.0',
    verified: true
  },
  {
    id: 'translation-pro',
    name: 'Translation Pro (中英双向)',
    description: '专业级中英翻译：保留 Markdown 结构、技术术语、代码块、人名地名',
    category: '内容',
    tags: ['translation', 'i18n', 'language'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/translation-pro',
    version: '1.0.0',
    verified: true
  },
  {
    id: 'sql-migration',
    name: 'SQL Migration Planner',
    description: '把 schema 变更（add column / drop index / 重命名）转成可回滚的 migration SQL',
    category: 'AI / Dev',
    tags: ['sql', 'migration', 'database', 'schema'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/sql-migration',
    version: '1.0.0'
  },
  {
    id: 'web3-portfolio-pro',
    name: 'Crypto Portfolio Pro',
    description: '增强版 portfolio 分析：DeFi 仓位合并、Impermanent Loss 计算器、税务报告草稿',
    category: 'Web3',
    tags: ['crypto', 'defi', 'il', 'tax'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/web3-portfolio-pro',
    version: '1.0.0'
  },
  {
    id: 'regex-builder',
    name: 'Regex Builder + Explainer',
    description: '用自然语言描述生成正则 + 详细解释每段含义 + 反向拆解已有 regex',
    category: 'AI / Dev',
    tags: ['regex', 'utility', 'developer'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/regex-builder',
    version: '1.0.0',
    verified: true
  },
  {
    id: 'commit-message',
    name: 'Conventional Commit Writer',
    description: 'git diff → Conventional Commit message（type(scope): subject），含 body 和 footer',
    category: 'AI / Dev',
    tags: ['git', 'commit', 'conventional-commits'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/commit-message',
    version: '1.0.0'
  },
  {
    id: 'interview-transcript',
    name: 'User Interview Synthesizer',
    description: '多份用户访谈转写稿 → 主题聚类 + 痛点表 + 引用卡片 + 机会评分',
    category: '市场 / 销售',
    tags: ['ux-research', 'interview', 'synthesis'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/interview-transcript',
    version: '1.0.0'
  },
  {
    id: 'crypto-news-digest',
    name: 'Crypto News Daily Digest',
    description: '每天聚合 30+ 加密行业信源，按主题去重，给出 5 条最重要事件 + 影响分析',
    category: 'Web3',
    tags: ['crypto', 'news', 'daily', 'digest'],
    author: 'opendesk-community',
    githubPath: 'frankfika/opendesk-skills',
    skillSubpath: 'skills/crypto-news-digest',
    version: '1.0.0'
  }
]