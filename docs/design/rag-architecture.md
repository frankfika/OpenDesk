# OpenDesk RAG / Knowledge Base 架构设计

## 问题：当前记忆系统的局限性

v0.2.0 的 USER.md/IDENTITY.md/SOUL.md 文件化记忆虽然解决了"持久化"问题，但有三个硬伤：

1. **无语义检索**：规则提取只能捕获显式表达（"I prefer X"），无法召回隐式关联
2. **上下文爆炸**：所有记忆都塞进 system prompt，truncated 到 2000 字符，大了装不下
3. **无文档支持**：无法处理 PDF、代码库、文档站点等大型知识源

## 目标：Workspace-level RAG + Personal Knowledge Graph

```
┌──────────────────────────────────────────────────────────────────┐
│                        RAG Architecture                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Ingestion  │────▶│  VectorStore │────▶│    Query     │   │
│  │  Pipeline    │     │  (SQLite-vss)│     │   Engine     │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│   PDF/Code/Docs         Embeddings           Hybrid Search     │
│   → Chunking            → Cosine Sim         → BM25 + Vector   │
│   → Embed               → Metadata           → Re-ranking      │
│   → Index               → TTL/GC             → Context组装     │
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐                          │
│  │  Knowledge   │     │  Memory      │                          │
│  │  Graph       │     │  (v0.2)      │                          │
│  │  (Entity/    │     │  File-based  │                          │
│  │  Relation)   │     │  USER/IDENT  │                          │
│  └──────────────┘     └──────────────┘                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 数据模型

### 1. KnowledgeSource（知识源）

```typescript
interface KnowledgeSource {
  id: string
  workspaceId: string
  type: 'file' | 'folder' | 'url' | 'note' | 'memory' | 'pdf'
  name: string
  path: string         // 文件路径或 URL
  status: 'pending' | 'indexing' | 'ready' | 'error'
  chunks: number       // 分块数量
  totalTokens: number
  lastIndexedAt: number
  embeddingModel: string
  error?: string
}
```

### 2. DocumentChunk（文档分块）

```typescript
interface DocumentChunk {
  id: string
  sourceId: string
  workspaceId: string
  content: string        // 文本内容
  embedding: number[]    // 向量（384-dim，all-MiniLM-L6-v2）
  metadata: {
    filePath: string
    startLine: number
    endLine: number
    language?: string     // 代码文件
    heading?: string      // 文档章节
  }
  tokenCount: number
  createdAt: number
}
```

### 3. KnowledgeGraph（知识图谱，v0.3+）

```typescript
interface KnowledgeEntity {
  id: string
  name: string
  type: 'person' | 'project' | 'tech' | 'concept' | 'file'
  mentions: number
  firstSeen: number
  lastSeen: number
}

interface KnowledgeRelation {
  sourceId: string
  targetId: string
  type: 'uses' | 'depends_on' | 'mentions' | 'created_by'
  confidence: number
  context: string
}
```

## 技术选型（桌面端优先，支持外部向量数据库）

> 2025-06-20 更新：经实践验证，**本地向量数据库在桌面端有显著问题**（见下方"本地方案问题"）。
> 当前推荐策略：**SQLite FTS5 作为默认（本地全文）**，**外部向量数据库作为可选增强**。

### 方案对比总览

| 维度 | 方案 A | 方案 B | 方案 C | 方案 D |
|------|--------|--------|--------|--------|
| **名称** | SQLite FTS5 | Supabase + pgvector | Pinecone | Ollama + SQLite |
| **类型** | 本地全文 | 云端 Postgres | 纯托管向量 | 本地嵌入+本地存储 |
| **向量** | ❌ 无 | ✅ 有 | ✅ 有 | ❌ 无（FTS5） |
| **语义** | ❌ 弱 | ✅ 强 | ✅ 强 | ❌ 弱 |
| **离线** | ✅ 完全 | ❌ 需联网 | ❌ 需联网 | ✅ 完全 |
| **隐私** | ✅ 最高 | ⚠️ 数据外传 | ⚠️ 数据外传 | ✅ 最高 |
| **配置** | 零配置 | 需注册+URL+key | 需 API key | 需 Ollama |
| **成本** | 免费 | 免费 tier 500MB | 免费 tier 2GB | 免费 |
| **推荐度** | ⭐⭐⭐⭐⭐ 默认 | ⭐⭐⭐⭐ 可选 | ⭐⭐⭐ 可选 | ⭐⭐⭐⭐ 备选 |

### 本地方案问题（为什么 sqlite-vss 不推荐）

| 问题 | 详情 | 影响 |
|------|------|------|
| **构建复杂度** | `sqlite-vss` 需要编译 SQLite 扩展（C++），`onnxruntime` 需要 native binding | Electron 打包时跨平台构建困难 |
| **体积膨胀** | ONNX runtime + 模型文件 ≈ 100MB+ | 安装包从 150MB 涨到 300MB+ |
| **性能** | 10万+ chunk 时 SQLite 向量查询变慢 | 大型项目体验下降 |
| **维护** | 版本升级时 native 模块需要重新编译 | 升级成本高 |

> **结论**：桌面端不要自己搞向量数据库。要么用纯文本搜索（FTS5），要么链接外部服务。

### 推荐方案：分层策略

```
┌──────────────────────────────────────────────────────────────┐
│                    RAG 适配器模式                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Ingestion   │───▶│  VectorStore │───▶│   Query      │  │
│  │  Pipeline    │    │  Adapter     │    │   Engine     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │            │
│         │    ┌──────────────┼───────────────────┘            │
│         │    │              │                                 │
│         ▼    ▼              ▼                                 │
│   Chunk+Embed    ┌──────────────────┐                       │
│                  │ SQLiteFTS5Adapter │  ← 默认，零配置       │
│                  │ SupabaseAdapter  │  ← 可选，云端向量     │
│                  │ PineconeAdapter  │  ← 可选，托管向量     │
│                  └──────────────────┘                       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 适配器接口设计

```typescript
// 统一的 VectorStore 适配器接口
interface VectorStoreAdapter {
  name: string
  status: 'connected' | 'disconnected' | 'error'
  
  // 索引
  upsert(chunks: DocumentChunk[]): Promise<void>
  delete(sourceId: string): Promise<void>
  clear(): Promise<void>
  
  // 查询
  search(query: string, topK: number): Promise<SearchResult[]>
  
  // 健康检查
  health(): Promise<boolean>
}

interface SearchResult {
  id: string
  content: string
  score: number        // 相关度分数（0-1）
  metadata: {
    filePath: string
    sourceId: string
    startLine?: number
  }
}
```

### 各适配器详细对比

#### 1. SQLiteFTS5Adapter（默认）

```typescript
class SQLiteFTS5Adapter implements VectorStoreAdapter {
  name = 'SQLite FTS5 (Local)'
  
  // 技术：SQLite FTS5 全文搜索 + BM25 排序
  // 不需要向量，不需要 embedding，不需要外部服务
  // 适合：代码文件、文档、README 的精确匹配
  // 不足：无语义检索（"bug" 搜不到 "error"）
  
  async search(query: string, topK: number): Promise<SearchResult[]> {
    // 1. 分词 query
    // 2. FTS5 MATCH query
    // 3. BM25 排序取 topK
    // 4. 返回结果
  }
}
```

**优点**：零配置、零依赖、离线可用、隐私最高
**缺点**：无语义能力、长尾词召回差
**适用**：所有用户，作为保底方案

---

#### 2. SupabaseAdapter（推荐外部方案）

```typescript
class SupabaseAdapter implements VectorStoreAdapter {
  name = 'Supabase pgvector'
  
  // 技术：Postgres + pgvector 扩展
  // 需要：Supabase 项目 URL + anon key（免费注册）
  // 适合：需要语义检索 + 愿意托管数据的用户
  
  async search(query: string, topK: number): Promise<SearchResult[]> {
    // 1. 调用外部 embedding API（OpenAI / Ollama）将 query 向量化
    // 2. Supabase RPC: 向量相似度搜索（<=> 操作符）
    // 3. 返回结果
  }
}
```

**优点**：
- 免费 tier 500MB（足够个人使用）
- 支持向量 + 全文混合（pgvector + FTS）
- 有 JS 客户端（`@supabase/supabase-js`），纯 HTTP
- 可以按 workspace 分表（table per workspace）

**缺点**：
- 需要注册 Supabase 账号
- 代码/文档需要发送到 Supabase 服务器
- 需要网络连接

**配置**：
```json
{
  "vectorStore": {
    "type": "supabase",
    "url": "https://xxxxx.supabase.co",
    "key": "anon-key",
    "tableName": "opendesk_chunks"
  }
}
```

---

#### 3. PineconeAdapter（托管向量）

```typescript
class PineconeAdapter implements VectorStoreAdapter {
  name = 'Pinecone'
  
  // 技术：纯托管向量数据库
  // 需要：Pinecone API key（免费 tier 2GB）
  // 适合：只想要向量检索，不想管数据库
}
```

**优点**：
- 免费 tier 2GB（比 Supabase 大）
- 纯 REST API，最简单
- 支持 metadata filtering

**缺点**：
- 只支持向量，不支持全文（需要单独做 FTS）
- 数据必须发送到美国服务器
-  namespace 管理复杂

---

#### 4. OllamaEmbedAdapter（本地 Embedding + 任意存储）

```typescript
class OllamaEmbedAdapter implements VectorStoreAdapter {
  name = 'Ollama Embedding + Local Storage'
  
  // 技术：Ollama 提供 embedding API，存储用 SQLite 或 JSON
  // 需要：本地运行 Ollama + nomic-embed-text / mxbai-embed-large
  // 适合：想要语义能力但不想数据外传的开发者
}
```

**优点**：
- Embedding 本地计算，隐私最高
- 存储可以用 SQLite（不需要向量扩展，纯存储向量数组）
- 搜索时用 cosine similarity 手动计算（chunk 少时可行）

**缺点**：
- 需要 Ollama 运行
- 搜索时全表扫描计算 cosine sim（chunk 多时会慢）
- 没有索引优化

---

### Embedding 方案对比

| 方案 | 本地/云端 | 成本 | 质量 | 隐私 | 依赖 |
|------|----------|------|------|------|------|
| OpenAI `text-embedding-3-small` | 云端 | $0.02/1M tokens | ⭐⭐⭐⭐⭐ | ❌ | 需 API key |
| Ollama `nomic-embed-text` | 本地 | 免费 | ⭐⭐⭐⭐ | ✅ | 需 Ollama |
| Ollama `mxbai-embed-large` | 本地 | 免费 | ⭐⭐⭐⭐⭐ | ✅ | 需 Ollama |
| HuggingFace (transformers.js) | 本地 | 免费 | ⭐⭐⭐ | ✅ | 浏览器 WASM |
| 无 embedding（FTS5） | N/A | 免费 | ⭐⭐ | ✅ | 无 |

> **推荐**：默认不指定 embedding，用 FTS5。如果用户配置了外部 vector store，再根据 store 的推荐选择 embedding（Supabase/Pinecone 建议用 OpenAI，Ollama 建议用 nomic-embed-text）。

## 数据模型（更新）

```typescript
interface KnowledgeSource {
  id: string
  workspaceId: string
  type: 'file' | 'folder' | 'url' | 'note'
  name: string
  path: string
  status: 'pending' | 'indexing' | 'ready' | 'error'
  vectorStore: 'sqlite' | 'supabase' | 'pinecone' | 'ollama'  // 使用哪个适配器
  chunks: number
  totalTokens: number
  lastIndexedAt: number
  error?: string
}

interface DocumentChunk {
  id: string
  sourceId: string
  workspaceId: string
  content: string
  embedding?: number[]      // 可选：如果使用向量存储
  metadata: {
    filePath: string
    startLine: number
    endLine: number
    language?: string
    heading?: string
  }
  tokenCount: number
  createdAt: number
}
```

## 用户界面（Knowledge Panel）

```
┌──────────────────────────┐
│  Knowledge Base          │
│  ────────────────────────  │
│  Vector Store: [SQLite ▼]│
│  ────────────────────────  │
│  [+ Add File/Folder]     │
│  ────────────────────────  │
│  📄 README.md     ✅  │
│  📁 src/           ⏳  │
│  📝 design.md      ✅  │
│  ────────────────────────  │
│  [⚙️ Configure Store]      │
│  ────────────────────────  │
│  Total: 47 chunks, 12k   │
│  tokens in SQLite          │
└──────────────────────────┘
```

### Configure Store 弹窗

```
┌────────────────────────────────────┐
│  Vector Store Configuration        │
│  ────────────────────────────────── │
│  ○ SQLite FTS5 (Default, Local)    │
│  ○ Supabase + pgvector              │
│    URL: [https://...          ]    │
│    Key:  [sb-anon-...         ]    │
│  ○ Pinecone                         │
│    API Key: [pcsk-...        ]    │
│  ○ Ollama + Local SQLite           │
│    Ollama URL: [http://localhost…] │
│  ────────────────────────────────── │
│  [Test Connection] [Save] [Cancel] │
└────────────────────────────────────┘
```

## 实现计划（更新）

### v0.2.1（RAG MVP - 只用 FTS5）

目标：**零外部依赖，先跑通 RAG 流程**

- [ ] `SQLiteFTS5Adapter` 实现（本地全文索引）
- [ ] 文件 ingestion pipeline（chunking：按段落/函数分割）
- [ ] 聊天时自动检索 top-3 相关 chunk
- [ ] Knowledge Panel UI（添加文件/查看索引状态）
- [ ] 设置中预留 Vector Store 配置入口（先 disabled）

**技术细节**：
- 使用 SQLite FTS5（Electron 内置 SQLite 通常已编译 FTS5）
- Chunking 策略：
  - Markdown：按 `##` 标题分割
  - 代码：按函数/类定义分割（正则匹配）
  - 其他：按 500 token 滑动窗口分割
- 存储：`.opendesk/knowledge.db`（每个 workspace 独立）

### v0.2.2（外部 Vector Store 适配器）

- [ ] `SupabaseAdapter` 实现
- [ ] `PineconeAdapter` 实现
- [ ] 设置中启用 Vector Store 切换
- [ ] Embedding 服务抽象（支持 OpenAI / Ollama）

### v0.2.3（Ollama 本地 Embedding）

- [ ] `OllamaEmbedAdapter` 实现
- [ ] 本地向量存储（SQLite blob 存储 embedding，搜索时 cosine sim）
- [ ] 适合不想数据外传、又有 Ollama 的用户

### v0.3（知识图谱）

- [ ] 实体抽取（从 chunk 和对话中提取）
- [ ] 关系图可视化
- [ ] 与 Memory v0.2 的衔接（Memory 写入的知识自动进入 RAG 索引）

## 关键决策更新

1. **为什么不本地向量？** sqlite-vss + onnxruntime 构建复杂、体积大、维护成本高。桌面端用 FTS5 做保底，向量交给外部服务。

2. **为什么 Supabase 是推荐外部方案？** 免费 tier 够用、有 JS 客户端、支持向量+全文混合、Postgres 生态成熟。

3. **Pinecone vs Supabase？** Pinecone 更专注向量（2GB 免费），但无全文；Supabase 更全能（500MB 免费），但限制稍严。建议都支持，让用户选。

4. **Ollama 本地 embedding 的意义？** 对于不想数据外传的开发者，Ollama 提供本地 embedding，然后 embedding 存储在 SQLite 的 blob 字段里，搜索时手动计算 cosine similarity。chunk 少（<1000）时完全够用。

5. **FTS5 够不够用？** 对于代码检索、文档关键词匹配，FTS5 够用了。语义检索（"找类似概念的代码"）才需要向量。先用 FTS5 覆盖 80% 场景，再逐步升级。

## 下一步

是否要我现在开始实现 v0.2.1 的 **SQLite FTS5 RAG MVP**？

这个版本：
- 零外部依赖
- 零配置
- 纯本地
- 支持代码/文档的全文检索
- 聊天时自动注入相关 chunk

等这个 MVP 跑通后，再逐步接入 Supabase/Pinecone 适配器。

或者先继续其他功能（如 MCP 增强、多模态支持）？
