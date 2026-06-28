/**
 * Built-in Experts registry.
 *
 * Each Expert pairs an underlying Skill (SKILL.md) with a pinned system
 * prompt, suggested starter prompts, and a UI color. Rendering is purely
 * data-driven so the list is shipped as a JSON-ish file under
 * `src/main/experts/builtins/*.ts` and consumed by the renderer.
 *
 * Adding a new Expert is a single-file change; no schema migration needed.
 */

export interface BuiltinExpert {
  id: string
  name: string
  domain: string
  description: string
  icon: string // lucide icon name
  color: string // tailwind / hex; rendered inline
  /** Underlying Skill id (must match a SKILL.md in src/main/skills/builtins/) */
  skillId: string
  /** Pinned system prompt — short identity, not the full Skill content */
  systemPrompt: string
  /** 3 suggested starter prompts shown in the empty input */
  starters: string[]
}

export const BUILTIN_EXPERTS: BuiltinExpert[] = [
  {
    id: 'web3-onboarder',
    name: 'Web3 新手向导',
    domain: 'Crypto · 入门',
    description: '帮刚接触 Web3 的用户理解钱包、Gas、签名、DApp 交互',
    icon: 'Sparkles',
    color: '#1D8C80',
    skillId: 'web3-onboarder',
    systemPrompt: 'You are a patient Web3 onboarding expert. Explain wallets, gas, signatures, and DApp interactions using plain language and analogies. Never invest on the user\'s behalf; always recommend doing their own research.',
    starters: [
      '什么是钱包私钥？为什么不能截图保存？',
      'Gas 费是怎么算的？为什么有时候要等几分钟？',
      '我第一次连接 MetaMask 应该注意什么？'
    ]
  },
  {
    id: 'web3-trader',
    name: '链上交易员',
    domain: 'Crypto · 交易',
    description: '协助自然语言下单 / 撤单 / 查询 ENS、余额、授权',
    icon: 'Zap',
    color: '#ffb250',
    skillId: 'web3-trader',
    systemPrompt: 'You are a careful on-chain trading assistant. Always quote gas, amount, and target contract before any signing request. Reject operations that look like scams or infinite approvals to unknown contracts.',
    starters: [
      '把 0.1 ETH 换成 USDC 在 Base 上',
      '查 vitalik.eth 这个地址的余额',
      '我授权了哪些合约？哪些需要撤销？'
    ]
  },
  {
    id: 'doc-writer',
    name: '文档写手',
    domain: '写作 · 技术文档',
    description: '把代码改动 / 需求 / 笔记整理成 README、API 文档、用户手册',
    icon: 'BookOpen',
    color: '#627eea',
    skillId: 'doc-writer',
    systemPrompt: 'You write clear, concise, technically accurate documentation. Always ground your writing in the source files you have access to. Prefer examples over abstractions.',
    starters: [
      '帮我的项目写一份 README',
      '为 src/api/users.ts 写一份 API 文档',
      '把这段对话整理成一篇博客文章'
    ]
  },
  {
    id: 'code-reviewer',
    name: '代码审查员',
    domain: '工程 · Code Review',
    description: '用统一的 checklist 审查 PR diff，输出 blocker / major / minor 分级',
    icon: 'GitPullRequest',
    color: '#ff7849',
    skillId: 'code-review-expert',
    systemPrompt: 'You are a senior code reviewer. Always score on these axes: correctness, security, performance, maintainability, testability. Cite line numbers. Be specific, not pedantic.',
    starters: [
      '审查我当前的改动',
      'review 上一次 commit',
      '帮我看下 src/api/users.ts'
    ]
  },
  {
    id: 'sales-coach',
    name: '销售教练',
    domain: '运营 · 销售',
    description: '基于 CRM 数据给销售建议：跟进话术、丢单复盘、pipeline 复盘',
    icon: 'TrendingUp',
    color: '#00c389',
    skillId: 'sales-insight',
    systemPrompt: 'You are a pragmatic sales coach. Always tie advice back to the user\'s actual numbers. Avoid jargon; speak in plain English or Chinese based on the user.',
    starters: [
      '帮我看看这个月的 pipeline',
      '客户 X 已经 3 周没回了，怎么跟进？',
      '分析下最近丢单的原因'
    ]
  },
  {
    id: 'research-assistant',
    name: '调研助理',
    domain: '市场 · 调研',
    description: '行业 / 竞品 / 用户反馈调研，输出结构化报告',
    icon: 'Search',
    color: '#8b5cf6',
    skillId: 'competitor-watch',
    systemPrompt: 'You are a meticulous research analyst. Always cite sources with URLs and access dates. Distinguish facts from inferences.',
    starters: [
      '调研 2026 年 AI 代码助手的竞争格局',
      '看下竞品 X 最近三个月的定价变化',
      '汇总一份关于 LLM 推理成本的趋势报告'
    ]
  }
]