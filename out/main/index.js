"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const child_process = require("child_process");
const os = require("os");
const util = require("util");
class AnthropicProvider {
  client;
  model;
  constructor(apiKey, model = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  formatMessages(messages) {
    return messages.filter((m) => m.role !== "system").map((m) => {
      if (m.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: m.toolCallId || m.metadata?.toolCallId || "",
              content: m.content
            }
          ]
        };
      }
      if (m.role === "assistant" && m.metadata?.toolCalls) {
        const toolCalls = m.metadata.toolCalls;
        const content = [];
        if (m.content) {
          content.push({ type: "text", text: m.content });
        }
        for (const tc of toolCalls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.arguments
          });
        }
        return { role: "assistant", content };
      }
      return {
        role: m.role,
        content: m.content
      };
    });
  }
  async *stream(messages, signal, tools) {
    const formatted = this.formatMessages(messages);
    const systemMsg = messages.find((m) => m.role === "system");
    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 8096,
      system: systemMsg?.content,
      messages: formatted,
      tools: tools && tools.length > 0 ? tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      })) : void 0
    });
    let currentToolCall = null;
    let currentToolArgs = "";
    for await (const event of stream) {
      if (signal.aborted) break;
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        currentToolCall = {
          id: event.content_block.id,
          name: event.content_block.name,
          arguments: {}
        };
        currentToolArgs = "";
        if (event.content_block.input && typeof event.content_block.input === "object") {
          currentToolArgs = JSON.stringify(event.content_block.input);
        }
      }
      if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        currentToolArgs += event.delta.partial_json;
      }
      if (event.type === "content_block_stop" && currentToolCall) {
        try {
          const args = currentToolArgs ? JSON.parse(currentToolArgs) : {};
          currentToolCall.arguments = args;
        } catch {
          currentToolCall.arguments = {};
        }
        yield currentToolCall;
        currentToolCall = null;
        currentToolArgs = "";
      }
    }
  }
  async test() {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }]
      });
      return true;
    } catch {
      return false;
    }
  }
}
class OpenAIProvider {
  client;
  model;
  constructor(apiKey, model = "gpt-4o", baseUrl) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.model = model;
  }
  formatMessages(messages) {
    return messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool",
          tool_call_id: m.toolCallId || m.metadata?.toolCallId || "",
          content: m.content
        };
      }
      if (m.role === "assistant" && m.metadata?.toolCalls) {
        const toolCalls = m.metadata.toolCalls;
        return {
          role: "assistant",
          content: m.content,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        };
      }
      return {
        role: m.role,
        content: m.content
      };
    });
  }
  async *stream(messages, signal, tools) {
    const formatted = this.formatMessages(messages);
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: formatted,
      tools: tools && tools.length > 0 ? tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      })) : void 0,
      stream: true
    });
    const toolCallBuffers = {};
    for await (const chunk of stream) {
      if (signal.aborted) break;
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield delta.content;
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallBuffers[idx]) {
            toolCallBuffers[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", args: "" };
          }
          if (tc.id) toolCallBuffers[idx].id = tc.id;
          if (tc.function?.name) toolCallBuffers[idx].name = tc.function.name;
          if (tc.function?.arguments) {
            toolCallBuffers[idx].args += tc.function.arguments;
          }
        }
      }
      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason === "tool_calls") {
        for (const buf of Object.values(toolCallBuffers)) {
          try {
            const args = buf.args ? JSON.parse(buf.args) : {};
            yield { id: buf.id, name: buf.name, arguments: args };
          } catch {
            yield { id: buf.id, name: buf.name, arguments: {} };
          }
        }
        for (const key of Object.keys(toolCallBuffers)) {
          delete toolCallBuffers[Number(key)];
        }
      }
    }
    for (const buf of Object.values(toolCallBuffers)) {
      if (buf.id && buf.name) {
        try {
          const args = buf.args ? JSON.parse(buf.args) : {};
          yield { id: buf.id, name: buf.name, arguments: args };
        } catch {
          yield { id: buf.id, name: buf.name, arguments: {} };
        }
      }
    }
  }
  async test() {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1
      });
      return true;
    } catch {
      return false;
    }
  }
}
const TARGET_FILES = ["AGENTS.md", ".cursorrules", ".traerules"];
function scanAgentsMd(cwd) {
  const paths = [];
  const contents = [];
  let current = cwd;
  while (true) {
    for (const file of TARGET_FILES) {
      const p = path.join(current, file);
      if (fs.existsSync(p)) {
        paths.push(p);
        try {
          contents.push(fs.readFileSync(p, "utf-8"));
        } catch {
        }
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const content = contents.join("\n\n---\n\n");
  const tokenCount = Math.ceil(content.length / 4);
  return {
    loaded: paths.length > 0,
    paths,
    content,
    tokenCount
  };
}
const WORKSPACES_FILE = "workspaces.json";
function getDataDir() {
  const dir = path.join(electron.app.getPath("userData"), "opendesk");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getWorkspacesPath() {
  return path.join(getDataDir(), WORKSPACES_FILE);
}
function loadWorkspaces() {
  const p = getWorkspacesPath();
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}
function saveWorkspaces(workspaces) {
  fs.writeFileSync(getWorkspacesPath(), JSON.stringify(workspaces, null, 2), "utf-8");
}
function createWorkspace(payload) {
  const now = Date.now();
  const workspace = {
    id: crypto.randomUUID(),
    folderPath: payload.folderPath,
    name: payload.name || payload.folderPath.split(/[/\\]/).pop() || "Untitled",
    createdAt: now,
    updatedAt: now,
    tags: [],
    status: "active"
  };
  const workspaces = loadWorkspaces();
  workspaces.push(workspace);
  saveWorkspaces(workspaces);
  return workspace;
}
function listWorkspaces() {
  const workspaces = loadWorkspaces();
  if (workspaces.length === 0) {
    const defaultWorkspace = createDefaultWorkspace();
    workspaces.push(defaultWorkspace);
    saveWorkspaces(workspaces);
  }
  return workspaces;
}
function createDefaultWorkspace() {
  const now = Date.now();
  const defaultPath = path.join(electron.app.getPath("userData"), "opendesk", "default-workspace");
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
  }
  return {
    id: "default-workspace",
    folderPath: defaultPath,
    name: "General",
    createdAt: now,
    updatedAt: now,
    tags: [],
    status: "active",
    description: "Default workspace for general conversations"
  };
}
function updateWorkspace(id, patch) {
  const workspaces = loadWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  workspaces[idx] = { ...workspaces[idx], ...patch, updatedAt: Date.now() };
  saveWorkspaces(workspaces);
  return workspaces[idx];
}
function removeWorkspace(id) {
  const workspaces = loadWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  workspaces.splice(idx, 1);
  saveWorkspaces(workspaces);
  return true;
}
function relinkWorkspace(id, newPath) {
  const workspaces = loadWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  workspaces[idx] = {
    ...workspaces[idx],
    folderPath: newPath,
    status: fs.existsSync(newPath) ? "active" : "missing",
    updatedAt: Date.now()
  };
  saveWorkspaces(workspaces);
  return workspaces[idx];
}
function scanWorkspaceAgentsMd(folderPath) {
  return scanAgentsMd(folderPath);
}
function pickFolder() {
  return electron.dialog.showOpenDialog({
    properties: ["openDirectory"],
    buttonLabel: "Select Folder"
  }).then((result) => {
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);
  if (major >= 20) {
    return { name: "Node.js Version", status: "pass", message: `Node.js ${version}` };
  }
  return { name: "Node.js Version", status: "warn", message: `Node.js ${version} (recommended >= 20)` };
}
function checkElectronVersion() {
  const version = process.versions.electron || "unknown";
  return { name: "Electron Version", status: "pass", message: `Electron ${version}` };
}
function checkProviders() {
  const settingsPath = path.join(electron.app.getPath("userData"), "opendesk", "settings.json");
  if (!fs.existsSync(settingsPath)) {
    return { name: "Provider Config", status: "warn", message: "No settings file found" };
  }
  try {
    const { readFileSync } = require("fs");
    const settings2 = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const providers = settings2.providers || [];
    const enabled = providers.filter((p) => p.enabled);
    if (enabled.length === 0) {
      return { name: "Provider Config", status: "warn", message: "No enabled providers configured" };
    }
    return { name: "Provider Config", status: "pass", message: `${enabled.length} provider(s) enabled` };
  } catch {
    return { name: "Provider Config", status: "fail", message: "Failed to read settings" };
  }
}
function checkWorkspaces() {
  try {
    const workspaces = listWorkspaces();
    if (workspaces.length === 0) {
      return { name: "Workspaces", status: "warn", message: "No workspaces configured" };
    }
    const active = workspaces.filter((w) => w.status === "active").length;
    return { name: "Workspaces", status: "pass", message: `${active}/${workspaces.length} active workspaces` };
  } catch {
    return { name: "Workspaces", status: "fail", message: "Failed to read workspaces" };
  }
}
function checkDiskSpace() {
  try {
    const free = os.freemem();
    const total = os.totalmem();
    const freeGB = (free / 1024 / 1024 / 1024).toFixed(2);
    const totalGB = (total / 1024 / 1024 / 1024).toFixed(2);
    if (free < 512 * 1024 * 1024) {
      return { name: "Disk/Memory Space", status: "warn", message: `Low memory: ${freeGB}GB free / ${totalGB}GB total` };
    }
    return { name: "Disk/Memory Space", status: "pass", message: `${freeGB}GB free / ${totalGB}GB total` };
  } catch {
    return { name: "Disk/Memory Space", status: "warn", message: "Unable to check memory" };
  }
}
function checkNetwork() {
  try {
    if (process.platform === "win32") {
      child_process.execSync("ping -n 1 -w 3000 api.openai.com", { stdio: "ignore" });
    } else {
      child_process.execSync('curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://api.openai.com', { stdio: "ignore" });
    }
    return { name: "Network Connection", status: "pass", message: "Can reach api.openai.com" };
  } catch {
    return { name: "Network Connection", status: "warn", message: "Cannot reach api.openai.com (may be blocked or offline)" };
  }
}
function runDoctor() {
  const checks = [
    checkNodeVersion(),
    checkElectronVersion(),
    checkProviders(),
    checkWorkspaces(),
    checkDiskSpace(),
    checkNetwork()
  ];
  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const overall = hasFail ? "fail" : hasWarn ? "warn" : "pass";
  return {
    timestamp: Date.now(),
    checks,
    overall
  };
}
function readFile(path2) {
  try {
    if (!fs.existsSync(path2)) return { success: false, error: "File not found" };
    const content = fs.readFileSync(path2, "utf-8");
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
function writeFile(path$1, content) {
  try {
    const dir = path.dirname(path$1);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path$1, content, "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
function listDirectory(path2) {
  try {
    if (!fs.existsSync(path2)) return { success: false, error: "Directory not found" };
    const stats = fs.statSync(path2);
    if (!stats.isDirectory()) return { success: false, error: "Path is not a directory" };
    const items = fs.readdirSync(path2);
    const entries = items.map((name) => {
      const itemPath = `${path2}/${name}`;
      try {
        const s = fs.statSync(itemPath);
        return {
          name,
          path: itemPath,
          isDirectory: s.isDirectory(),
          size: s.size,
          mtime: s.mtime.getTime()
        };
      } catch {
        return { name, path: itemPath, isDirectory: false, size: 0, mtime: 0 };
      }
    });
    return { success: true, entries };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
function applyPatch(path2, patch) {
  try {
    if (!fs.existsSync(path2)) return { success: false, error: "File not found" };
    const original = fs.readFileSync(path2, "utf-8");
    const lines = original.split("\n");
    const patchLines = patch.split("\n");
    let result = [...lines];
    let i = 0;
    while (i < patchLines.length) {
      const line = patchLines[i];
      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (!match) {
          i++;
          continue;
        }
        const oldStart = parseInt(match[1], 10);
        const oldCount = parseInt(match[2] || "1", 10);
        i++;
        const hunkOld = [];
        const hunkNew = [];
        while (i < patchLines.length && !patchLines[i].startsWith("@@") && !patchLines[i].startsWith("---")) {
          const pl = patchLines[i];
          if (pl.startsWith("+")) {
            hunkNew.push(pl.slice(1));
          } else if (pl.startsWith("-")) {
            hunkOld.push(pl.slice(1));
          } else if (pl.startsWith(" ")) {
            hunkOld.push(pl.slice(1));
            hunkNew.push(pl.slice(1));
          } else if (pl === "\\ No newline at end of file") {
          }
          i++;
        }
        const startIdx = oldStart - 1;
        result.splice(startIdx, oldCount, ...hunkNew);
      } else {
        i++;
      }
    }
    fs.writeFileSync(path2, result.join("\n"), "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
class MCPClient {
  constructor(config) {
    this.config = config;
  }
  process = null;
  requestId = 0;
  pendingRequests = /* @__PURE__ */ new Map();
  tools = [];
  initialized = false;
  status = "disconnected";
  reconnectAttempts = 0;
  maxReconnectAttempts = 3;
  buffer = "";
  onStatusChange;
  setStatusCallback(cb) {
    this.onStatusChange = cb;
  }
  setStatus(status, error) {
    this.status = status;
    this.onStatusChange?.(status, error);
  }
  getStatus() {
    return this.status;
  }
  getConfig() {
    return { ...this.config };
  }
  async connect() {
    if (this.process) {
      throw new Error("Already connected");
    }
    this.setStatus("connecting");
    this.requestId = 0;
    this.pendingRequests.clear();
    this.tools = [];
    this.initialized = false;
    this.buffer = "";
    return new Promise((resolve, reject) => {
      try {
        this.process = child_process.spawn(this.config.command, this.config.args, {
          env: { ...process.env, ...this.config.env },
          stdio: ["pipe", "pipe", "pipe"]
        });
        let initTimeout = null;
        const cleanup = (err) => {
          if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
          }
          if (err) {
            this.setStatus("error", err.message);
            reject(err);
          }
        };
        initTimeout = setTimeout(() => {
          cleanup(new Error("MCP server initialization timeout"));
          this.disconnect().catch(() => {
          });
        }, 3e4);
        this.process.stdout?.on("data", (data) => {
          this.handleStdout(data);
        });
        this.process.stderr?.on("data", (data) => {
          const msg = data.toString("utf-8").trim();
          if (msg) {
            console.error(`[MCP ${this.config.name}] ${msg}`);
          }
        });
        this.process.on("error", (err) => {
          console.error(`[MCP ${this.config.name}] process error:`, err);
          this.setStatus("error", err.message);
          cleanup(err);
        });
        this.process.on("close", (code) => {
          console.log(`[MCP ${this.config.name}] process exited with code ${code}`);
          this.setStatus("disconnected");
          this.process = null;
          this.initialized = false;
          this.pendingRequests.forEach((req) => {
            req.reject(new Error("MCP server process exited"));
          });
          this.pendingRequests.clear();
          if (this.reconnectAttempts < this.maxReconnectAttempts && code !== 0) {
            this.reconnectAttempts++;
            console.log(`[MCP ${this.config.name}] reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
              this.connect().catch(() => {
              });
            }, 2e3);
          }
        });
        this.sendRequest("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "opendesk", version: "0.1.0" }
        }).then(async () => {
          this.sendNotification("notifications/initialized", {});
          this.initialized = true;
          const toolsResult = await this.sendRequest("tools/list", {});
          this.tools = (toolsResult.tools || []).map((t) => ({
            name: `${this.config.name}_${t.name}`,
            description: t.description,
            inputSchema: t.inputSchema,
            serverName: this.config.name
          }));
          this.setStatus("connected");
          this.reconnectAttempts = 0;
          cleanup();
          resolve();
        }).catch((err) => {
          cleanup(err instanceof Error ? err : new Error(String(err)));
          this.disconnect().catch(() => {
          });
        });
      } catch (err) {
        this.setStatus("error", err instanceof Error ? err.message : String(err));
        reject(err);
      }
    });
  }
  async disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.setStatus("disconnected");
    this.pendingRequests.forEach((req) => {
      req.reject(new Error("MCP client disconnected"));
    });
    this.pendingRequests.clear();
    if (this.process) {
      this.process.kill("SIGTERM");
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 5e3);
      this.process = null;
    }
    this.initialized = false;
    this.tools = [];
  }
  async listTools() {
    if (!this.initialized) {
      throw new Error("MCP client not initialized");
    }
    return [...this.tools];
  }
  async callTool(name, args) {
    if (!this.initialized) {
      throw new Error("MCP client not initialized");
    }
    const originalName = name.startsWith(`${this.config.name}_`) ? name.slice(this.config.name.length + 1) : name;
    const result = await this.sendRequest("tools/call", {
      name: originalName,
      arguments: args
    });
    if (result.isError) {
      throw new Error("Tool execution returned an error");
    }
    const textContent = result.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    return textContent || JSON.stringify(result);
  }
  isConnected() {
    return this.status === "connected" && this.initialized;
  }
  getTools() {
    return [...this.tools];
  }
  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin?.writable) {
        reject(new Error("MCP server stdin not writable"));
        return;
      }
      const id = ++this.requestId;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params
      };
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, 3e4);
      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeout);
          reject(reason);
        }
      });
      this.process.stdin.write(JSON.stringify(request) + "\n", (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }
  sendNotification(method, params) {
    if (!this.process?.stdin?.writable) {
      console.error("MCP server stdin not writable");
      return;
    }
    const notification = {
      jsonrpc: "2.0",
      method,
      params
    };
    this.process.stdin.write(JSON.stringify(notification) + "\n", (err) => {
      if (err) {
        console.error(`Failed to send notification ${method}:`, err);
      }
    });
  }
  handleStdout(data) {
    this.buffer += data.toString("utf-8");
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if ("id" in msg && msg.id !== void 0) {
          const pending = this.pendingRequests.get(Number(msg.id));
          if (pending) {
            this.pendingRequests.delete(Number(msg.id));
            if (msg.error) {
              pending.reject(new Error(msg.error.message));
            } else {
              pending.resolve(msg.result);
            }
          }
        }
      } catch (err) {
        console.error(`[MCP ${this.config.name}] Failed to parse JSON-RPC message:`, line, err);
      }
    }
  }
}
class MCPBridge {
  clients = /* @__PURE__ */ new Map();
  serverStatus = /* @__PURE__ */ new Map();
  serverErrors = /* @__PURE__ */ new Map();
  async connectServer(config) {
    if (this.clients.has(config.name)) {
      await this.disconnectServer(config.name);
    }
    const client = new MCPClient(config);
    client.setStatusCallback((status, error) => {
      this.serverStatus.set(config.name, status);
      if (error) {
        this.serverErrors.set(config.name, error);
      } else {
        this.serverErrors.delete(config.name);
      }
    });
    this.clients.set(config.name, client);
    this.serverStatus.set(config.name, "connecting");
    await client.connect();
  }
  async disconnectServer(name) {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }
    this.serverStatus.set(name, "disconnected");
    this.serverErrors.delete(name);
  }
  async disconnectAll() {
    await Promise.all(Array.from(this.clients.keys()).map((name) => this.disconnectServer(name)));
  }
  getServerStatus(name) {
    return this.serverStatus.get(name) || "disconnected";
  }
  getServerError(name) {
    return this.serverErrors.get(name);
  }
  getAllTools() {
    const tools = [];
    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        tools.push(...client.getTools());
      }
    }
    return tools;
  }
  toOpenAITools() {
    return this.getAllTools().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }
  async callTool(name, args) {
    const tool = this.getAllTools().find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    const client = this.clients.get(tool.serverName);
    if (!client || !client.isConnected()) {
      throw new Error(`MCP server ${tool.serverName} not connected`);
    }
    return client.callTool(name, args);
  }
  getConnectedClients() {
    return Array.from(this.clients.values()).filter((c) => c.isConnected());
  }
}
const mcpBridge = new MCPBridge();
class ToolRegistry {
  tools = /* @__PURE__ */ new Map();
  register(tool) {
    this.tools.set(tool.name, tool);
  }
  get(name) {
    return this.tools.get(name);
  }
  list() {
    return Array.from(this.tools.values());
  }
  toOpenAIFormat() {
    return this.list().map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
  }
  toAnthropicFormat() {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));
  }
  toProviderTools() {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}
const execAsync = util.promisify(child_process.exec);
async function captureScreenshot$1(region) {
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const sources = await electron.desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: primaryDisplay.size
  });
  const primarySource = sources.find((s) => s.display_id === String(primaryDisplay.id)) || sources[0];
  if (!primarySource) throw new Error("No screen source found");
  return primarySource.thumbnail.toPNG().toString("base64");
}
async function desktopClick(x, y, button, double) {
  const action = double ? "double click" : "click";
  const script = `
    tell application "System Events"
      ${action} at {${x}, ${y}}
    end tell
  `;
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  return `${double ? "Double-clicked" : "Clicked"} at (${x}, ${y}) with ${button || "left"} button`;
}
async function desktopType(text) {
  const script = `
    tell application "System Events"
      keystroke "${text.replace(/"/g, '\\"')}"
    end tell
  `;
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  return `Typed: ${text}`;
}
async function desktopKey(key, modifiers) {
  const modStr = modifiers && modifiers.length > 0 ? ` using {${modifiers.map((m) => `${m} down`).join(", ")}}` : "";
  const script = `
    tell application "System Events"
      keystroke "${key.replace(/"/g, '\\"')}"${modStr}
    end tell
  `;
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  return `Pressed key: ${key}${modifiers ? ` with ${modifiers.join("+")}` : ""}`;
}
async function desktopWindows() {
  const sources = await electron.desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: { width: 0, height: 0 }
  });
  const windows = sources.map((s) => ({
    id: s.id,
    name: s.name
  }));
  return JSON.stringify(windows, null, 2);
}
async function desktopActivate(title) {
  const script = `
    tell application "System Events"
      tell process "${title.replace(/"/g, '\\"')}"
        set frontmost to true
      end tell
    end tell
  `;
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  return `Activated window: ${title}`;
}
const SHELL_WHITELIST = /* @__PURE__ */ new Set([
  "ls",
  "cat",
  "grep",
  "find",
  "git",
  "npm",
  "node",
  "python",
  "python3",
  "curl",
  "mkdir",
  "rm",
  "cp",
  "mv",
  "echo",
  "pwd",
  "cd",
  "code",
  "vim",
  "nano",
  "touch",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "diff",
  "which",
  "whoami",
  "date",
  "uname",
  "ps",
  "top",
  "df",
  "du",
  "chmod",
  "chown",
  "tar",
  "zip",
  "unzip",
  "gzip",
  "gunzip",
  "ssh",
  "scp",
  "rsync",
  "sed",
  "awk",
  "xargs",
  "basename",
  "dirname",
  "realpath",
  "readlink",
  "ln",
  "tee",
  "tr",
  "cut",
  "paste",
  "join",
  "split",
  "csplit",
  "fmt",
  "pr",
  "fold",
  "column",
  "seq",
  "yes",
  "printf",
  "env",
  "export",
  "source",
  "alias",
  "type",
  "command",
  "builtin",
  "eval",
  "exec",
  "exit",
  "return",
  "shift",
  "getopts",
  "trap",
  "wait",
  "jobs",
  "fg",
  "bg",
  "kill",
  "disown",
  "times",
  "umask",
  "ulimit",
  "hash",
  "help",
  "history",
  "shopt",
  "complete",
  "compgen",
  "bind",
  "enable",
  "logout",
  "mapfile",
  "readarray",
  "caller",
  "coproc",
  "let",
  "local",
  "declare",
  "typeset",
  "readonly",
  "integer",
  "nameref",
  "unset",
  "set",
  "suspend",
  "test",
  "true",
  "false",
  "[",
  "[[",
  "]]",
  "stat",
  "file",
  "tree",
  "brew",
  "npx",
  "yarn",
  "pnpm",
  "tsc",
  "vite",
  "eslint",
  "prettier",
  "jest",
  "vitest",
  "playwright",
  "docker",
  "kubectl",
  "helm",
  "terraform",
  "aws",
  "gcloud",
  "az",
  "gh",
  "git-lfs",
  "sqlite3",
  "psql",
  "mysql",
  "mongosh",
  "redis-cli",
  "ffmpeg",
  "convert",
  "pdftotext",
  "jq",
  "yq",
  "htop",
  "btop",
  "glances",
  "neofetch",
  "fastfetch",
  "ripgrep",
  "rg",
  "fd",
  "fzf",
  "bat",
  "exa",
  "eza",
  "zoxide",
  "tldr",
  "cheat",
  "httpie",
  "xh",
  "wget",
  "aria2c",
  "yt-dlp",
  "ncdu",
  "dust",
  "duf",
  "procs",
  "sd",
  "choose",
  "hyperfine",
  "tokei",
  "gping",
  "dog",
  "delta",
  "lazygit",
  "gitui",
  "tig",
  "hub",
  "glab",
  "svn",
  "hg",
  "cvs",
  "bzr",
  "darcs",
  "fossil",
  "pijul",
  "cargo",
  "rustc",
  "go",
  "gofmt",
  "javac",
  "java",
  "mvn",
  "gradle",
  "ruby",
  "gem",
  "bundle",
  "rails",
  "php",
  "composer",
  "dotnet",
  "nuget",
  "swift",
  "xcodebuild",
  "make",
  "cmake",
  "ninja",
  "meson",
  "bazel",
  "buck",
  "ant",
  "maven",
  "sbt",
  "lein",
  "clojure",
  "scala",
  "kotlin",
  "kotlinc",
  "dart",
  "flutter",
  "elixir",
  "mix",
  "erlang",
  "erl",
  "haskell",
  "ghc",
  "cabal",
  "stack",
  "rustup",
  "cargo",
  "deno",
  "bun",
  "ts-node",
  "tsx",
  "nodemon",
  "pm2",
  "forever",
  "serve",
  "http-server",
  "live-server",
  "ngrok",
  "cloudflared",
  "minikube",
  "kind",
  "k3s",
  "helm",
  "istioctl",
  "argocd",
  "flux",
  "tekton",
  "jenkins",
  "circleci",
  "travis",
  "github-actions",
  "act",
  "gitea",
  "drone",
  "buildkite",
  "teamcity",
  "bamboo",
  "concourse",
  "fly",
  "spinnaker",
  "argo",
  "cadence",
  "temporal",
  " airflow",
  "prefect",
  "dagster",
  "luigi",
  "pinball",
  "oozie",
  "azkaban",
  "nifi",
  "streamsets",
  "pentaho",
  "talend",
  "informatica",
  "datastage",
  "ssis",
  "dtsx",
  "dts",
  "mssql",
  "sqlcmd",
  "bcp",
  "sqsh",
  "fisql",
  "tsql",
  "osql",
  "isql",
  "pg_dump",
  "pg_restore",
  "pg_basebackup",
  "pg_ctl",
  "initdb",
  "createdb",
  "createuser",
  "dropdb",
  "dropuser",
  "psql",
  "pgbench",
  "pg_isready",
  "mysqladmin",
  "mysqldump",
  "mysqlimport",
  "mysqlshow",
  "mysqlslap",
  "mongodump",
  "mongorestore",
  "mongoexport",
  "mongoimport",
  "mongostat",
  "mongotop",
  "bsondump",
  "mongofiles",
  "mongooplog",
  "mongoreplay",
  "redis-server",
  "redis-cli",
  "redis-benchmark",
  "redis-check-aof",
  "redis-check-rdb",
  "redis-sentinel",
  "memcached",
  "memcdump",
  "cassandra",
  "cqlsh",
  "nodetool",
  "sstableloader",
  "sstablescrub",
  "sstableupgrade",
  "sstableutil",
  "sstablemetadata",
  "sstablerepairedset",
  "elasticsearch",
  "elasticsearch-certgen",
  "elasticsearch-certutil",
  "elasticsearch-croneval",
  "elasticsearch-env",
  "elasticsearch-keystore",
  "elasticsearch-migrate",
  "elasticsearch-node",
  "elasticsearch-plugin",
  "elasticsearch-reconfigure-node",
  "elasticsearch-reset-password",
  "elasticsearch-saml-metadata",
  "elasticsearch-setup-passwords",
  "elasticsearch-shard",
  "elasticsearch-syskeygen",
  "elasticsearch-users",
  "kibana",
  "logstash",
  "filebeat",
  "metricbeat",
  "packetbeat",
  "heartbeat",
  "auditbeat",
  "journalbeat",
  "functionbeat",
  "apm-server",
  "enterprise-search",
  "app-search",
  "workplace-search",
  "curator",
  "esrally",
  "esbench",
  "influx",
  "influxd",
  "influx_inspect",
  "influx_stress",
  "influx_tsm",
  "telegraf",
  "kapacitor",
  "chronograf",
  "prometheus",
  "alertmanager",
  "pushgateway",
  "node_exporter",
  "blackbox_exporter",
  "snmp_exporter",
  "mysqld_exporter",
  "redis_exporter",
  "postgres_exporter",
  "haproxy_exporter",
  "memcached_exporter",
  "collectd",
  "statsd",
  "graphite",
  "carbon",
  "grafana",
  "grafana-cli",
  "grafana-server",
  "loki",
  "promtail",
  "tempo",
  "cortex",
  "thanos",
  "jaeger",
  "zipkin",
  "skywalking",
  "pinpoint",
  "cat",
  "arthas",
  "jprofiler",
  "yourkit",
  "dynatrace",
  "newrelic",
  "datadog",
  "splunk",
  "sumologic",
  "elk",
  "efk",
  "fluentd",
  "fluent-bit",
  "vector",
  "logdna",
  "papertrail",
  "loggly",
  "logentries",
  "logzio",
  "logmatic",
  "logstash",
  "filebeat",
  "winlogbeat",
  "packetbeat",
  "auditbeat",
  "heartbeat",
  "metricbeat",
  "functionbeat",
  "journalbeat",
  "cloudwatch",
  "cloudtrail",
  "config",
  "guardduty",
  "inspector",
  "macie",
  "securityhub",
  "shield",
  "waf",
  "firewall",
  "vpc",
  "ec2",
  "s3",
  "rds",
  "dynamodb",
  "lambda",
  "sns",
  "sqs",
  "kinesis",
  "glue",
  "athena",
  "redshift",
  "emr",
  "sagemaker",
  "rekognition",
  "polly",
  "translate",
  "comprehend",
  "textract",
  "personalize",
  "forecast",
  "kendra",
  "lex",
  "connect",
  "pinpoint",
  "ses",
  "workmail",
  "chime",
  "quicksight",
  "grafana",
  "prometheus",
  "thanos",
  "cortex",
  "loki",
  "tempo",
  "jaeger",
  "zipkin",
  "skywalking",
  "pinpoint",
  "arthas",
  "jprofiler",
  "yourkit",
  "dynatrace",
  "newrelic",
  "datadog",
  "splunk",
  "sumologic",
  "elk",
  "efk",
  "fluentd",
  "fluent-bit",
  "vector",
  "logdna",
  "papertrail",
  "loggly",
  "logentries",
  "logzio",
  "logmatic",
  "logstash",
  "filebeat",
  "winlogbeat",
  "packetbeat",
  "auditbeat",
  "heartbeat",
  "metricbeat",
  "functionbeat",
  "journalbeat"
]);
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+\/\S*/,
  /mkfs\./,
  /dd\s+if=\/dev\/zero/,
  /dd\s+if=\/dev\/random/,
  /dd\s+if=\/dev\/urandom/,
  />\s*\/dev\/sda/,
  /:\(\)\{\s*:\|:&\s*\};/,
  // fork bomb
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
];
function validateShellCommand(command) {
  const blockedChars = /[;&`$]/;
  if (blockedChars.test(command)) {
    return { valid: false, error: "Command contains blocked characters (; & ` $)" };
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { valid: false, error: "Command matches a dangerous pattern and is blocked" };
    }
  }
  const pipeline = command.split("|").map((c) => c.trim());
  for (const cmd of pipeline) {
    const firstWord = cmd.split(/\s+/)[0];
    if (!SHELL_WHITELIST.has(firstWord)) {
      return {
        valid: false,
        error: `Command '${firstWord}' is not in the allowed whitelist. Allowed: ${Array.from(SHELL_WHITELIST).slice(0, 20).join(", ")}...`
      };
    }
  }
  return { valid: true };
}
const fileReadTool = {
  name: "file_read",
  description: "Read the contents of a file at the given path",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the file" }
    },
    required: ["path"]
  },
  handler: async (args) => {
    const result = readFile(args.path);
    if (!result.success) throw new Error(result.error || "Failed to read file");
    return result.content || "";
  }
};
const fileWriteTool = {
  name: "file_write",
  description: "Write content to a file at the given path",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the file" },
      content: { type: "string", description: "Content to write" }
    },
    required: ["path", "content"]
  },
  handler: async (args) => {
    const result = writeFile(args.path, args.content);
    if (!result.success) throw new Error(result.error || "Failed to write file");
    return `File written successfully to ${args.path}`;
  }
};
const fileListTool = {
  name: "file_list",
  description: "List files and directories at the given path",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Absolute or relative path to the directory" }
    },
    required: ["path"]
  },
  handler: async (args) => {
    const result = listDirectory(args.path);
    if (!result.success) throw new Error(result.error || "Failed to list directory");
    return JSON.stringify(result.entries, null, 2);
  }
};
const applyPatchTool = {
  name: "apply_patch",
  description: "Apply a unified diff patch to a file",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to patch" },
      patch: { type: "string", description: "Unified diff patch content" }
    },
    required: ["path", "patch"]
  },
  handler: async (args) => {
    const result = applyPatch(args.path, args.patch);
    if (!result.success) throw new Error(result.error || "Failed to apply patch");
    return `Patch applied successfully to ${args.path}`;
  }
};
const desktopCaptureTool = {
  name: "desktop_capture",
  description: "Capture a screenshot of the desktop",
  parameters: {
    type: "object",
    properties: {
      region: {
        type: "string",
        description: "Region to capture: 'full', 'window', or 'area'",
        enum: ["full", "window", "area"]
      }
    }
  },
  handler: async (args) => {
    const base64 = await captureScreenshot$1(args.region);
    return `data:image/png;base64,${base64}`;
  }
};
const desktopClickTool = {
  name: "desktop_click",
  description: "Simulate a mouse click at screen coordinates",
  parameters: {
    type: "object",
    properties: {
      x: { type: "number", description: "X coordinate" },
      y: { type: "number", description: "Y coordinate" },
      button: {
        type: "string",
        description: "Mouse button: 'left' or 'right'",
        enum: ["left", "right"]
      },
      double: { type: "boolean", description: "Double click" }
    },
    required: ["x", "y"]
  },
  handler: async (args) => {
    return await desktopClick(
      args.x,
      args.y,
      args.button,
      args.double
    );
  }
};
const desktopTypeTool = {
  name: "desktop_type",
  description: "Simulate typing text",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to type" }
    },
    required: ["text"]
  },
  handler: async (args) => {
    return await desktopType(args.text);
  }
};
const desktopKeyTool = {
  name: "desktop_key",
  description: "Simulate pressing a key with optional modifiers",
  parameters: {
    type: "object",
    properties: {
      key: { type: "string", description: "Key to press" },
      modifiers: {
        type: "array",
        description: "Modifier keys: e.g. ['command', 'shift', 'option', 'control']",
        items: { type: "string" }
      }
    },
    required: ["key"]
  },
  handler: async (args) => {
    return await desktopKey(args.key, args.modifiers);
  }
};
const desktopWindowsTool = {
  name: "desktop_windows",
  description: "List all visible windows",
  parameters: {
    type: "object",
    properties: {}
  },
  handler: async () => {
    return await desktopWindows();
  }
};
const desktopActivateTool = {
  name: "desktop_activate",
  description: "Activate a window by its title/process name",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Window title or process name" }
    },
    required: ["title"]
  },
  handler: async (args) => {
    return await desktopActivate(args.title);
  }
};
const shellTool = {
  name: "shell",
  description: "Execute a shell command with a 30-second timeout",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Shell command to execute" },
      cwd: { type: "string", description: "Working directory for the command" }
    },
    required: ["command"]
  },
  handler: async (args) => {
    const command = args.command;
    const cwd = args.cwd;
    const validation = validateShellCommand(command);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    return new Promise((resolve, reject) => {
      child_process.exec(command, { cwd, timeout: 3e4 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Exit code ${error.code}: ${stderr || error.message}`));
        } else {
          resolve(stdout || stderr || "(no output)");
        }
      });
    });
  }
};
function decodeHtmlEntities(str) {
  return str.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
const webSearchTool = {
  name: "web_search",
  description: "Search the web using DuckDuckGo",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  },
  handler: async (args) => {
    const query = args.query;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const html = await res.text();
    const results = [];
    const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
      results.push({
        title: decodeHtmlEntities(match[2]),
        url: match[1],
        snippet: decodeHtmlEntities(match[3].replace(/<[^>]+>/g, "").trim())
      });
    }
    if (results.length === 0) {
      const altRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      while ((match = altRegex.exec(html)) !== null && results.length < 10) {
        results.push({
          title: decodeHtmlEntities(match[2]),
          url: match[1],
          snippet: ""
        });
      }
    }
    return JSON.stringify(results, null, 2);
  }
};
function registerBuiltins(registry) {
  registry.register(fileReadTool);
  registry.register(fileWriteTool);
  registry.register(fileListTool);
  registry.register(applyPatchTool);
  registry.register(desktopCaptureTool);
  registry.register(desktopClickTool);
  registry.register(desktopTypeTool);
  registry.register(desktopKeyTool);
  registry.register(desktopWindowsTool);
  registry.register(desktopActivateTool);
  registry.register(shellTool);
  registry.register(webSearchTool);
}
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const yamlText = match[1];
  const body = match[2];
  const frontmatter = {};
  const lines = yamlText.split("\n");
  let currentKey = null;
  let currentList = [];
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (inList && currentKey) {
        currentList.push(parseYamlValue(line.slice(2)));
      }
      continue;
    }
    if (inList && currentKey) {
      frontmatter[currentKey] = currentList;
      currentList = [];
      inList = false;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (value === "") {
        currentKey = key;
        currentList = [];
        inList = true;
      } else {
        frontmatter[key] = parseYamlValue(value);
      }
    }
  }
  if (inList && currentKey) {
    frontmatter[currentKey] = currentList;
  }
  return { frontmatter, body };
}
function parseYamlValue(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((s) => parseYamlValue(s.trim()));
  }
  return value;
}
function parseToolsFromFrontmatter(fm) {
  const toolsRaw = fm.tools;
  if (!toolsRaw || !Array.isArray(toolsRaw)) return void 0;
  const tools = [];
  for (const t of toolsRaw) {
    if (typeof t !== "object" || t === null) continue;
    const tool = t;
    if (typeof tool.name !== "string" || typeof tool.description !== "string") continue;
    const def = {
      name: tool.name,
      description: tool.description
    };
    if (tool.parameters && typeof tool.parameters === "object") {
      def.parameters = tool.parameters;
    }
    tools.push(def);
  }
  return tools.length > 0 ? tools : void 0;
}
function scanSkillDirectory(dirPath, source) {
  const skillMdPath = path.join(dirPath, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) return null;
  try {
    const content = fs.readFileSync(skillMdPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const dirName = dirPath.split("/").pop() || dirPath.split("\\").pop() || "unknown";
    const id = `${source}:${dirName}`;
    const referencePath = path.join(dirPath, "reference.md");
    const hasReference = fs.existsSync(referencePath);
    const scriptsDir = path.join(dirPath, "scripts");
    const hasScripts = fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory();
    const assetsDir = path.join(dirPath, "assets");
    const hasAssets = fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory();
    const scripts = {};
    if (hasScripts) {
      try {
        const scriptFiles = fs.readdirSync(scriptsDir);
        for (const f of scriptFiles) {
          const ext = f.split(".").pop()?.toLowerCase();
          if (["js", "py", "sh", "ts"].includes(ext || "")) {
            scripts[f.replace(/\.[^.]+$/, "")] = path.join(scriptsDir, f);
          }
        }
      } catch {
      }
    }
    const references = [];
    if (hasReference) {
      references.push(referencePath);
    }
    const referencesDir = path.join(dirPath, "references");
    if (fs.existsSync(referencesDir) && fs.statSync(referencesDir).isDirectory()) {
      try {
        const refFiles = fs.readdirSync(referencesDir);
        for (const f of refFiles) {
          if (f.endsWith(".md")) {
            references.push(path.join(referencesDir, f));
          }
        }
      } catch {
      }
    }
    const now = Date.now();
    return {
      id,
      name: frontmatter.name || dirName,
      description: frontmatter.description || "No description available",
      content,
      path: dirPath,
      source,
      version: frontmatter.version || void 0,
      author: frontmatter.author || void 0,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : void 0,
      hasReference,
      hasScripts,
      hasAssets,
      scripts: Object.keys(scripts).length > 0 ? scripts : void 0,
      references: references.length > 0 ? references : void 0,
      tools: parseToolsFromFrontmatter(frontmatter),
      installedAt: now,
      updatedAt: now,
      usageCount: 0,
      isBuiltIn: source === "builtin"
    };
  } catch {
    return null;
  }
}
function scanSourceDirectory(basePath, source) {
  const skills = [];
  if (!fs.existsSync(basePath)) return skills;
  try {
    const entries = fs.readdirSync(basePath);
    for (const entry of entries) {
      const fullPath = path.join(basePath, entry);
      try {
        if (!fs.statSync(fullPath).isDirectory()) continue;
        const skill = scanSkillDirectory(fullPath, source);
        if (skill) skills.push(skill);
      } catch {
      }
    }
  } catch {
  }
  return skills;
}
function getBuiltinSkillsPath() {
  const isDev = process.env["ELECTRON_RENDERER_URL"] !== void 0;
  if (isDev) {
    return path.resolve(__dirname, "../../src/main/skills/builtins");
  }
  return path.resolve(__dirname, "../skills/builtins");
}
function getGlobalSkillsPath$1() {
  return path.join(os.homedir(), ".opendesk", "skills");
}
function scanAllSkills(workspacePath) {
  const sources = [
    { path: getGlobalSkillsPath$1(), source: "global", priority: 100 },
    { path: getBuiltinSkillsPath(), source: "builtin", priority: 90 }
  ];
  if (workspacePath) {
    sources.push({ path: path.join(workspacePath, ".opendesk", "skills"), source: "workspace", priority: 95 });
  }
  sources.push(
    { path: path.join(os.homedir(), ".codex", "skills"), source: "codex", priority: 50 },
    { path: path.join(os.homedir(), ".claude", "skills"), source: "claude", priority: 40 }
  );
  sources.sort((a, b) => b.priority - a.priority);
  const allSkills = /* @__PURE__ */ new Map();
  for (const src of sources) {
    const skills = scanSourceDirectory(src.path, src.source);
    for (const skill of skills) {
      const baseId = skill.id.replace(/^[^:]+:/, "");
      const existing = allSkills.get(baseId);
      if (!existing || src.priority > (sources.find((s) => s.source === existing.source)?.priority ?? 0)) {
        allSkills.set(baseId, skill);
      }
    }
  }
  return Array.from(allSkills.values());
}
function estimateTokens(content) {
  return Math.ceil(content.length / 4);
}
function loadSkill(skill, level) {
  switch (level) {
    case 1:
      return loadLevel1(skill);
    case 2:
      return loadLevel2(skill);
    case 3:
      return loadLevel3(skill);
    default:
      return loadLevel1(skill);
  }
}
function loadLevel1(skill) {
  const tagsStr = skill.tags ? skill.tags.join(", ") : "";
  const content = `Available Skill: ${skill.name}
Description: ${skill.description}${tagsStr ? `
Tags: ${tagsStr}` : ""}${skill.version ? `
Version: ${skill.version}` : ""}${skill.author ? `
Author: ${skill.author}` : ""}`;
  return {
    level: 1,
    tokens: estimateTokens(content),
    content
  };
}
function loadLevel2(skill) {
  return {
    level: 2,
    tokens: estimateTokens(skill.content),
    content: skill.content
  };
}
function loadLevel3(skill) {
  let fullContent = skill.content;
  const scriptsLoaded = [];
  if (skill.references && skill.references.length > 0) {
    for (const refPath of skill.references) {
      try {
        const refContent = fs.readFileSync(refPath, "utf-8");
        fullContent += `

---

## Reference: ${refPath.split("/").pop()}

${refContent}`;
      } catch {
      }
    }
  }
  if (skill.scripts && Object.keys(skill.scripts).length > 0) {
    for (const [name, path2] of Object.entries(skill.scripts)) {
      try {
        const scriptContent = fs.readFileSync(path2, "utf-8");
        fullContent += `

---

## Script: ${name}

\`\`\`${path2.split(".").pop()}
${scriptContent}
\`\`\``;
        scriptsLoaded.push(name);
      } catch {
      }
    }
  }
  return {
    level: 3,
    tokens: estimateTokens(fullContent),
    content: fullContent,
    scriptsLoaded
  };
}
async function executeSkillTool(skill, toolName, args) {
  if (!skill.scripts) {
    return {
      success: false,
      error: `Skill '${skill.name}' has no scripts directory`
    };
  }
  const scriptPath = skill.scripts[toolName];
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    return {
      success: false,
      error: `Script '${toolName}' not found in skill '${skill.name}'. Available: ${Object.keys(skill.scripts).join(", ")}`
    };
  }
  const ext = scriptPath.split(".").pop()?.toLowerCase();
  let command;
  let commandArgs;
  switch (ext) {
    case "js":
      command = "node";
      commandArgs = [scriptPath];
      break;
    case "ts":
      command = "tsx";
      commandArgs = [scriptPath];
      break;
    case "py":
      command = "python3";
      commandArgs = [scriptPath];
      break;
    case "sh":
      command = "bash";
      commandArgs = [scriptPath];
      break;
    default:
      return {
        success: false,
        error: `Unsupported script extension: .${ext}`
      };
  }
  const env = {
    ...process.env,
    SKILL_TOOL_ARGS: JSON.stringify(args),
    SKILL_TOOL_NAME: toolName,
    SKILL_ID: skill.id
  };
  return new Promise((resolve) => {
    const child = child_process.spawn(command, commandArgs, {
      env,
      cwd: path.dirname(scriptPath),
      timeout: 3e4
      // 30 seconds
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (err) => {
      if (ext === "ts" && command === "tsx") {
        const fallback = child_process.spawn("ts-node", [scriptPath], { env, cwd: path.dirname(scriptPath), timeout: 3e4 });
        let fbStdout = "";
        let fbStderr = "";
        fallback.stdout.on("data", (d) => {
          fbStdout += d.toString();
        });
        fallback.stderr.on("data", (d) => {
          fbStderr += d.toString();
        });
        fallback.on("close", (code) => {
          if (code === 0) {
            resolve({ success: true, output: fbStdout.trim() });
          } else {
            resolve({ success: false, error: fbStderr.trim() || `Script exited with code ${code}` });
          }
        });
        fallback.on("error", (fbErr) => {
          resolve({ success: false, error: `Failed to run TypeScript script: ${fbErr.message}` });
        });
        return;
      }
      resolve({ success: false, error: `Failed to spawn process: ${err.message}` });
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({
          success: false,
          error: stderr.trim() || `Script exited with code ${code}`,
          output: stdout.trim() || void 0
        });
      }
    });
  });
}
function getSkillToolAsProviderTool(skill) {
  if (!skill.tools || skill.tools.length === 0) return [];
  return skill.tools.map((t) => ({
    name: `${skill.id.replace(/:/g, "_")}_${t.name}`,
    description: `[Skill: ${skill.name}] ${t.description}`,
    parameters: t.parameters || { type: "object", properties: {} }
  }));
}
function getGlobalSkillsPath() {
  return path.join(os.homedir(), ".opendesk", "skills");
}
async function exportSkill(skillPath, outputDir) {
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Skill path does not exist: ${skillPath}`);
  }
  const skillName = path.basename(skillPath);
  const destPath = path.join(outputDir, skillName);
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }
  fs.cpSync(skillPath, destPath, { recursive: true, force: true });
  return destPath;
}
async function importSkillFromFolder(sourcePath, targetDir) {
  if (!fs.existsSync(sourcePath)) {
    return { success: false, error: `Source path does not exist: ${sourcePath}` };
  }
  const skillMdPath = path.join(sourcePath, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    return { success: false, error: `No SKILL.md found in ${sourcePath}` };
  }
  const destDir = getGlobalSkillsPath();
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const skillName = path.basename(sourcePath);
  const destPath = path.join(destDir, skillName);
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }
  try {
    fs.cpSync(sourcePath, destPath, { recursive: true, force: true });
  } catch (err) {
    return { success: false, error: `Failed to copy: ${err instanceof Error ? err.message : String(err)}` };
  }
  const skill = scanSkillDirectory(destPath, "global");
  if (!skill) {
    return { success: false, error: "Failed to parse imported skill" };
  }
  return { success: true, skill };
}
async function importSkillFromGitHub(repoUrl, targetDir) {
  let normalizedUrl = repoUrl.trim();
  if (!normalizedUrl.startsWith("http")) {
    if (normalizedUrl.includes("/") && !normalizedUrl.startsWith("github.com")) {
      normalizedUrl = `https://github.com/${normalizedUrl}`;
    } else if (normalizedUrl.startsWith("github.com/")) {
      normalizedUrl = `https://${normalizedUrl}`;
    } else {
      return { success: false, error: `Invalid GitHub URL or shorthand: ${repoUrl}` };
    }
  }
  const zipUrl = normalizedUrl.replace(/\.git$/, "") + "/archive/refs/heads/main.zip";
  const zipUrlMaster = normalizedUrl.replace(/\.git$/, "") + "/archive/refs/heads/master.zip";
  const destDir = getGlobalSkillsPath();
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const tmpDir = path.join(destDir, ".tmp-import-" + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  const zipPath = path.join(tmpDir, "download.zip");
  try {
    let response = await fetch(zipUrl);
    if (!response.ok) {
      response = await fetch(zipUrlMaster);
    }
    if (!response.ok) {
      return { success: false, error: `Failed to download repository: ${response.status} ${response.statusText}` };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(zipPath, buffer);
    const { spawn } = await import("child_process");
    await new Promise((resolve, reject) => {
      const child = spawn("unzip", ["-q", "-o", zipPath, "-d", tmpDir]);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`unzip exited with code ${code}`));
      });
      child.on("error", reject);
    });
    const extracted = fs.readdirSync(tmpDir).find((d) => d !== "download.zip" && fs.statSync(path.join(tmpDir, d)).isDirectory());
    if (!extracted) {
      return { success: false, error: "Could not find extracted repository contents" };
    }
    const extractedPath = path.join(tmpDir, extracted);
    const rootSkillMd = path.join(extractedPath, "SKILL.md");
    if (fs.existsSync(rootSkillMd)) {
      const skillName = path.basename(normalizedUrl.replace(/\.git$/, ""));
      const finalPath = path.join(destDir, skillName);
      if (fs.existsSync(finalPath)) fs.rmSync(finalPath, { recursive: true, force: true });
      fs.cpSync(extractedPath, finalPath, { recursive: true, force: true });
      fs.rmSync(tmpDir, { recursive: true, force: true });
      const skill = scanSkillDirectory(finalPath, "github");
      if (!skill) return { success: false, error: "Failed to parse imported skill" };
      return { success: true, skill };
    }
    const entries = fs.readdirSync(extractedPath);
    const importedSkills = [];
    for (const entry of entries) {
      const entryPath = path.join(extractedPath, entry);
      if (!fs.statSync(entryPath).isDirectory()) continue;
      if (fs.existsSync(path.join(entryPath, "SKILL.md"))) {
        const finalPath = path.join(destDir, entry);
        if (fs.existsSync(finalPath)) fs.rmSync(finalPath, { recursive: true, force: true });
        fs.cpSync(entryPath, finalPath, { recursive: true, force: true });
        const skill = scanSkillDirectory(finalPath, "github");
        if (skill) importedSkills.push(skill);
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (importedSkills.length === 0) {
      return { success: false, error: "No valid skills found in repository" };
    }
    return { success: true, skill: importedSkills[0] };
  } catch (err) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
    }
    return { success: false, error: `Import failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
async function deleteGlobalSkill(skillId) {
  const globalPath = getGlobalSkillsPath();
  const name = skillId.replace(/^global:/, "");
  const skillPath = path.join(globalPath, name);
  if (!fs.existsSync(skillPath)) {
    return false;
  }
  try {
    fs.rmSync(skillPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
function createSkillTemplate(name, description, tags) {
  const tagsYaml = tags.length > 0 ? `
tags: [${tags.map((t) => `"${t}"`).join(", ")}]` : "";
  return `---
name: ${name}
description: ${description}${tagsYaml}
version: 1.0.0
author: opendesk-user
---

## Instructions

When the user asks about ${name}, follow these guidelines:

1. Understand the user's request clearly
2. Apply the appropriate techniques and best practices
3. Provide clear, actionable output

## Capabilities

- Add your capabilities here

## Examples

### Example 1
User: ...
Assistant: ...

## Notes

- Add any important notes or constraints here
`;
}
async function saveNewSkill(name, description, tags) {
  const globalPath = getGlobalSkillsPath();
  const skillDir = path.join(globalPath, name.toLowerCase().replace(/\s+/g, "-"));
  if (!fs.existsSync(globalPath)) {
    fs.mkdirSync(globalPath, { recursive: true });
  }
  if (fs.existsSync(skillDir)) {
    return { success: false, error: `Skill '${name}' already exists` };
  }
  fs.mkdirSync(skillDir, { recursive: true });
  const template = createSkillTemplate(name, description, tags);
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), template, "utf-8");
  const skill = scanSkillDirectory(skillDir, "global");
  if (!skill) {
    return { success: false, error: "Failed to create skill" };
  }
  return { success: true, skill };
}
const defaultSettings = {
  activeProviderId: null,
  providers: [],
  mcpServers: [],
  theme: "dark",
  language: "en",
  startupBehavior: "restore",
  autoUpdate: false,
  desktopEnabled: false,
  approvalMode: "suggest",
  showThinking: false
};
let settings = { ...defaultSettings };
const abortControllers = /* @__PURE__ */ new Map();
const toolRegistry = new ToolRegistry();
registerBuiltins(toolRegistry);
function getWorkspacePath(workspaceId) {
  if (!workspaceId) return null;
  const workspaces = listWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId);
  return ws?.folderPath ?? null;
}
function isPathAllowed(filePath, workspacePath) {
  if (!workspacePath) return false;
  const resolvedFile = path.resolve(filePath);
  const resolvedWorkspace = path.resolve(workspacePath);
  return resolvedFile === resolvedWorkspace || resolvedFile.startsWith(resolvedWorkspace + path.sep);
}
async function executeBuiltinTool(toolCall, workspaceId) {
  const tool = toolRegistry.get(toolCall.name);
  if (!tool) {
    return {
      toolCallId: toolCall.id,
      content: `Tool '${toolCall.name}' not found`,
      isError: true
    };
  }
  if (toolCall.name.startsWith("desktop_")) {
    if (!settings.desktopEnabled) {
      return {
        toolCallId: toolCall.id,
        content: "Desktop control is disabled. Enable it in Settings.",
        isError: true
      };
    }
  }
  if (toolCall.name.startsWith("file_") || toolCall.name === "apply_patch") {
    const workspacePath = getWorkspacePath(workspaceId);
    const targetPath = toolCall.arguments.path || "";
    if (workspacePath && !isPathAllowed(targetPath, workspacePath)) {
      return {
        toolCallId: toolCall.id,
        content: `Path is outside the workspace directory (${workspacePath})`,
        isError: true
      };
    }
  }
  try {
    const result = await tool.handler(toolCall.arguments);
    return { toolCallId: toolCall.id, content: result, isError: false };
  } catch (err) {
    return {
      toolCallId: toolCall.id,
      content: err instanceof Error ? err.message : String(err),
      isError: true
    };
  }
}
async function executeTool(toolCall, workspaceId) {
  const skillToolMatch = toolCall.name.match(/^([^_]+_[^_]+)_(.+)$/);
  if (skillToolMatch) {
    const possibleSkillId = skillToolMatch[1].replace(/_/g, ":");
    const toolName = skillToolMatch[2];
    const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || void 0);
    const skill = allSkills.find((s) => s.id === possibleSkillId || s.id.endsWith(":" + skillToolMatch[1].split("_").pop()));
    if (skill && skill.scripts && skill.scripts[toolName]) {
      const result = await executeSkillTool(skill, toolName, toolCall.arguments);
      return {
        toolCallId: toolCall.id,
        content: result.success ? result.output || "" : result.error || "Unknown error",
        isError: !result.success
      };
    }
  }
  const mcpTools = mcpBridge.getAllTools();
  const isMcpTool = mcpTools.some((t) => t.name === toolCall.name);
  if (isMcpTool) {
    try {
      const result = await mcpBridge.callTool(toolCall.name, toolCall.arguments);
      return { toolCallId: toolCall.id, content: result, isError: false };
    } catch (err) {
      return {
        toolCallId: toolCall.id,
        content: err instanceof Error ? err.message : String(err),
        isError: true
      };
    }
  }
  return executeBuiltinTool(toolCall, workspaceId);
}
function buildTools(workspaceId) {
  const mcpTools = mcpBridge.getAllTools();
  const builtinTools = toolRegistry.toProviderTools();
  const tools = [
    ...builtinTools,
    ...mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }))
  ];
  const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || void 0);
  for (const skill of allSkills) {
    const skillTools = getSkillToolAsProviderTool(skill);
    tools.push(...skillTools);
  }
  return tools;
}
function getConfigDir() {
  const dir = path.join(electron.app.getPath("userData"), "opendesk");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getSettingsPath() {
  return path.join(getConfigDir(), "settings.json");
}
function getKeysPath() {
  return path.join(getConfigDir(), "keys.bin");
}
function getMessagesDir() {
  const dir = path.join(getConfigDir(), "messages");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getThreadsPath() {
  return path.join(getConfigDir(), "threads.json");
}
function getDraftPath() {
  return path.join(getConfigDir(), "draft.json");
}
function loadDraft() {
  try {
    const p = getDraftPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}
function saveDraft(draft) {
  try {
    fs.writeFileSync(getDraftPath(), JSON.stringify(draft));
  } catch {
  }
}
function loadSettingsFromDisk() {
  const p = getSettingsPath();
  if (!fs.existsSync(p)) return { ...defaultSettings };
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return { ...defaultSettings };
  }
}
function saveSettingsToDisk(s) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), "utf-8");
}
function loadKeys() {
  const p = getKeysPath();
  if (!fs.existsSync(p)) return {};
  try {
    const buf = fs.readFileSync(p);
    const decrypted = electron.safeStorage.decryptString(buf);
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}
function saveKeys(keys) {
  const encrypted = electron.safeStorage.encryptString(JSON.stringify(keys));
  fs.writeFileSync(getKeysPath(), encrypted);
}
function buildProvider(providerId, apiKey) {
  const config = settings.providers.find((p) => p.id === providerId);
  if (!config) return null;
  if (config.type === "anthropic") return new AnthropicProvider(apiKey, config.model);
  if (config.type === "openai" || config.type === "openai-compatible")
    return new OpenAIProvider(apiKey, config.model, config.baseUrl);
  if (config.type === "ollama")
    return new OpenAIProvider(apiKey || "ollama", config.model, config.baseUrl || "http://localhost:11434/v1");
  return null;
}
function loadThreads() {
  const p = getThreadsPath();
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}
function saveThreads(threads) {
  fs.writeFileSync(getThreadsPath(), JSON.stringify(threads, null, 2), "utf-8");
}
function getMessagesPath(threadId) {
  return path.join(getMessagesDir(), `${threadId}.json`);
}
function loadMessages(threadId) {
  const p = getMessagesPath(threadId);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}
function saveMessages(threadId, messages) {
  fs.writeFileSync(getMessagesPath(threadId), JSON.stringify(messages, null, 2), "utf-8");
}
async function fetchModels(type, baseUrl, apiKey) {
  try {
    let url;
    let headers = {};
    if (type === "ollama") {
      url = (baseUrl || "http://localhost:11434") + "/api/tags";
    } else if (type === "openai-compatible" || type === "openai") {
      url = (baseUrl || "https://api.openai.com") + "/v1/models";
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (type === "anthropic") {
      return [
        { id: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet", contextWindow: 2e5, supportsVision: true, supportsTools: true },
        { id: "claude-3-5-haiku-20241022", displayName: "Claude 3.5 Haiku", contextWindow: 2e5, supportsVision: false, supportsTools: true },
        { id: "claude-3-opus-20240229", displayName: "Claude 3 Opus", contextWindow: 2e5, supportsVision: true, supportsTools: true }
      ];
    } else {
      return [];
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (type === "ollama") {
      const models2 = data.models || [];
      return models2.map((m) => ({
        id: m.name || m.model,
        displayName: m.name || m.model
      }));
    }
    const models = data.data || [];
    return models.map((m) => ({
      id: m.id,
      displayName: m.id
    }));
  } catch {
    return [];
  }
}
async function captureScreenshot() {
  try {
    const primaryDisplay = electron.screen.getPrimaryDisplay();
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: primaryDisplay.size
    });
    const primarySource = sources.find((s) => s.display_id === String(primaryDisplay.id)) || sources[0];
    if (!primarySource) throw new Error("No screen source found");
    return primarySource.thumbnail.toPNG().toString("base64");
  } catch (err) {
    throw new Error(`Screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
function registerIpcHandlers(win) {
  settings = loadSettingsFromDisk();
  for (const server of settings.mcpServers) {
    if (server.enabled) {
      mcpBridge.connectServer(server).catch((err) => {
        console.error(`Failed to connect MCP server ${server.name} on startup:`, err);
      });
    }
  }
  const channelsToRemove = [
    "chat:send",
    "chat:abort",
    "chat:regenerate",
    "chat:editMessage",
    "skills:scan",
    "skills:load",
    "skills:executeTool",
    "skills:export",
    "skills:importFromFolder",
    "skills:importFromGitHub",
    "skills:delete",
    "skills:getBuiltins",
    "skills:create"
  ];
  for (const ch of channelsToRemove) {
    electron.ipcMain.removeAllListeners(ch);
  }
  electron.ipcMain.handle("settings:get", () => ({ ...settings }));
  electron.ipcMain.handle("settings:set", (_e, next) => {
    settings = { ...settings, ...next };
    saveSettingsToDisk(settings);
    return true;
  });
  electron.ipcMain.handle("settings:setApiKey", (_e, providerId, apiKey) => {
    const keys = loadKeys();
    keys[providerId] = apiKey;
    saveKeys(keys);
    return true;
  });
  electron.ipcMain.handle("settings:getApiKey", (_e, providerId) => {
    return loadKeys()[providerId] ?? null;
  });
  electron.ipcMain.handle("settings:testProvider", async (_e, type, model, apiKey, baseUrl) => {
    let provider = null;
    if (type === "anthropic") provider = new AnthropicProvider(apiKey, model);
    else if (type === "openai") provider = new OpenAIProvider(apiKey, model);
    else if (type === "openai-compatible") provider = new OpenAIProvider(apiKey, model, baseUrl);
    else if (type === "ollama") provider = new OpenAIProvider(apiKey || "ollama", model, baseUrl || "http://localhost:11434/v1");
    if (!provider) return false;
    return provider.test();
  });
  electron.ipcMain.handle("draft:load", () => loadDraft());
  electron.ipcMain.handle("draft:save", (_e, draft) => {
    saveDraft({ ...draft, timestamp: Date.now() });
    return true;
  });
  electron.ipcMain.handle("settings:fetchModels", async (_e, type, apiKey, baseUrl) => {
    return fetchModels(type, baseUrl, apiKey);
  });
  electron.ipcMain.handle("mcp:listServers", () => {
    return settings.mcpServers.map((s) => ({
      ...s,
      status: mcpBridge.getServerStatus(s.name)
    }));
  });
  electron.ipcMain.handle("mcp:addServer", (_e, config) => {
    const exists = settings.mcpServers.find((s) => s.name === config.name);
    if (exists) return false;
    settings.mcpServers.push(config);
    saveSettingsToDisk(settings);
    if (config.enabled) {
      mcpBridge.connectServer(config).catch((err) => {
        console.error(`Failed to connect MCP server ${config.name}:`, err);
      });
    }
    return true;
  });
  electron.ipcMain.handle("mcp:removeServer", async (_e, name) => {
    await mcpBridge.disconnectServer(name);
    settings.mcpServers = settings.mcpServers.filter((s) => s.name !== name);
    saveSettingsToDisk(settings);
    return true;
  });
  electron.ipcMain.handle("mcp:toggleServer", async (_e, name) => {
    const server = settings.mcpServers.find((s) => s.name === name);
    if (!server) return false;
    server.enabled = !server.enabled;
    saveSettingsToDisk(settings);
    if (server.enabled) {
      await mcpBridge.connectServer(server).catch((err) => {
        console.error(`Failed to connect MCP server ${name}:`, err);
      });
    } else {
      await mcpBridge.disconnectServer(name);
    }
    return true;
  });
  electron.ipcMain.handle("mcp:listTools", () => {
    return mcpBridge.getAllTools();
  });
  electron.ipcMain.handle("mcp:callTool", async (_e, name, args) => {
    return mcpBridge.callTool(name, args);
  });
  electron.ipcMain.handle("skills:scan", () => {
    return scanAllSkills();
  });
  electron.ipcMain.handle("skills:list", () => {
    return scanAllSkills();
  });
  electron.ipcMain.handle("skills:load", (_e, skillId, level) => {
    const allSkills = scanAllSkills();
    const skill = allSkills.find((s) => s.id === skillId);
    if (!skill) {
      return { level, tokens: 0, content: "" };
    }
    return loadSkill(skill, level);
  });
  electron.ipcMain.handle("skills:executeTool", async (_e, skillId, toolName, args) => {
    const allSkills = scanAllSkills();
    const skill = allSkills.find((s) => s.id === skillId);
    if (!skill) {
      return { success: false, error: `Skill '${skillId}' not found` };
    }
    return executeSkillTool(skill, toolName, args);
  });
  electron.ipcMain.handle("skills:export", async (_e, skillId, outputPath) => {
    const allSkills = scanAllSkills();
    const skill = allSkills.find((s) => s.id === skillId);
    if (!skill) {
      throw new Error(`Skill '${skillId}' not found`);
    }
    return exportSkill(skill.path, outputPath);
  });
  electron.ipcMain.handle("skills:importFromFolder", async (_e, sourcePath) => {
    return importSkillFromFolder(sourcePath);
  });
  electron.ipcMain.handle("skills:importFromGitHub", async (_e, repoUrl) => {
    return importSkillFromGitHub(repoUrl);
  });
  electron.ipcMain.handle("skills:delete", async (_e, skillId) => {
    return deleteGlobalSkill(skillId);
  });
  electron.ipcMain.handle("skills:getBuiltins", () => {
    return scanAllSkills().filter((s) => s.isBuiltIn);
  });
  electron.ipcMain.handle("skills:create", async (_e, name, description, tags) => {
    return saveNewSkill(name, description, tags);
  });
  electron.ipcMain.handle("workspace:list", () => {
    return listWorkspaces();
  });
  electron.ipcMain.handle("workspace:add", async () => {
    const folderPath = await pickFolder();
    if (!folderPath) return null;
    const existing = listWorkspaces().find((w) => w.folderPath === folderPath);
    if (existing) return existing;
    return createWorkspace({ folderPath });
  });
  electron.ipcMain.handle("workspace:remove", (_e, id) => {
    return removeWorkspace(id);
  });
  electron.ipcMain.handle("workspace:update", (_e, id, patch) => {
    return updateWorkspace(id, patch);
  });
  electron.ipcMain.handle("workspace:relink", async (_e, id, newPath) => {
    const path2 = newPath || await pickFolder();
    if (!path2) return null;
    return relinkWorkspace(id, path2);
  });
  electron.ipcMain.handle("workspace:scanAgentsMd", (_e, folderPath) => {
    return scanWorkspaceAgentsMd(folderPath);
  });
  electron.ipcMain.handle("thread:list", (_e, workspaceId) => {
    const threads = loadThreads();
    return threads.filter((t) => t.workspaceId === workspaceId);
  });
  electron.ipcMain.handle("thread:create", (_e, payload) => {
    const now = Date.now();
    const thread = {
      id: crypto.randomUUID(),
      workspaceId: payload.workspaceId,
      title: payload.title || "New Chat",
      createdAt: now,
      updatedAt: now,
      providerId: payload.providerId || settings.activeProviderId || "",
      model: payload.model || "",
      totalInputTokens: 0,
      totalOutputTokens: 0,
      status: "active",
      skillId: payload.skillId
    };
    const threads = loadThreads();
    threads.push(thread);
    saveThreads(threads);
    return thread;
  });
  electron.ipcMain.handle("thread:update", (_e, id, patch) => {
    const threads = loadThreads();
    const idx = threads.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    threads[idx] = { ...threads[idx], ...patch, updatedAt: Date.now() };
    saveThreads(threads);
    return threads[idx];
  });
  electron.ipcMain.handle("thread:delete", (_e, id) => {
    const threads = loadThreads();
    const filtered = threads.filter((t) => t.id !== id);
    if (filtered.length === threads.length) return false;
    saveThreads(filtered);
    const msgPath = getMessagesPath(id);
    if (fs.existsSync(msgPath)) {
      try {
        fs.rmSync(msgPath);
      } catch {
      }
    }
    return true;
  });
  electron.ipcMain.handle("thread:loadMessages", (_e, threadId) => {
    return loadMessages(threadId);
  });
  electron.ipcMain.handle("thread:saveMessages", (_e, threadId, messages) => {
    saveMessages(threadId, messages);
    return true;
  });
  async function doChatStream(payload, regenerate = false, editIndex) {
    const { messages, providerId, systemPrompt, workspaceId, threadId } = payload;
    const apiKey = loadKeys()[providerId] ?? "";
    const provider = buildProvider(providerId, apiKey);
    if (!provider) {
      win.webContents.send("chat:error", { message: "Provider not found or not configured", type: "provider" });
      return;
    }
    let skillSystemContent = "";
    const activeSkillIds = [];
    if (threadId) {
      const threads = loadThreads();
      const thread = threads.find((t) => t.id === threadId);
      if (thread?.skillId) {
        activeSkillIds.push(thread.skillId);
      }
    }
    const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || void 0);
    for (const skill of allSkills) {
      if (activeSkillIds.includes(skill.id)) {
        const l1 = loadSkill(skill, 1);
        skillSystemContent += `

${l1.content}`;
      }
    }
    let finalMessages = messages;
    let combinedSystemPrompt = systemPrompt || "";
    if (skillSystemContent) {
      combinedSystemPrompt += (combinedSystemPrompt ? "\n\n" : "") + skillSystemContent;
    }
    if (combinedSystemPrompt) {
      finalMessages = [
        { id: "system", role: "system", content: combinedSystemPrompt, timestamp: Date.now() },
        ...messages
      ];
    }
    const ac = new AbortController();
    abortControllers.set(providerId, ac);
    const availableTools = buildTools(workspaceId);
    try {
      let currentMessages = finalMessages;
      let iteration = 0;
      const maxIterations = 5;
      while (iteration < maxIterations && !ac.signal.aborted) {
        iteration++;
        const stream = provider.stream(
          currentMessages,
          ac.signal,
          availableTools.length > 0 ? availableTools : void 0
        );
        let assistantContent = "";
        const pendingToolCalls = [];
        let assistantMessageId = crypto.randomUUID();
        for await (const chunk of stream) {
          if (ac.signal.aborted) break;
          if (typeof chunk === "string") {
            assistantContent += chunk;
            win.webContents.send("chat:token", chunk);
          } else {
            pendingToolCalls.push(chunk);
            win.webContents.send("chat:tool_call", {
              id: chunk.id,
              name: chunk.name,
              arguments: chunk.arguments
            });
          }
        }
        if (pendingToolCalls.length === 0) {
          break;
        }
        currentMessages.push({
          id: assistantMessageId,
          role: "assistant",
          content: assistantContent,
          timestamp: Date.now(),
          metadata: {
            toolCalls: pendingToolCalls
          }
        });
        for (const tc of pendingToolCalls) {
          const result = await executeTool(tc, workspaceId);
          win.webContents.send("chat:tool_result", {
            toolCallId: result.toolCallId,
            content: result.content,
            isError: result.isError
          });
          currentMessages.push({
            id: crypto.randomUUID(),
            role: "tool",
            content: result.content,
            timestamp: Date.now(),
            kind: "tool_result",
            toolCallId: tc.id,
            metadata: { toolName: tc.name, isError: result.isError }
          });
        }
      }
      win.webContents.send("chat:done", { regenerate, editIndex, workspaceId, threadId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let type = "generic";
      const lower = msg.toLowerCase();
      if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("authentication") || lower.includes("invalid key")) {
        type = "auth";
      } else if (lower.includes("network") || lower.includes("fetch") || lower.includes("connect") || lower.includes("timeout") || lower.includes("econnrefused") || lower.includes("ENOTFOUND")) {
        type = "network";
      } else if (lower.includes("model") || lower.includes("not found") || lower.includes("does not exist")) {
        type = "model";
      } else if (lower.includes("ollama") || lower.includes("localhost:11434")) {
        type = "ollama";
      } else if (lower.includes("workspace") || lower.includes("directory") || lower.includes("path")) {
        type = "workspace";
      }
      win.webContents.send("chat:error", { message: msg, type });
    } finally {
      abortControllers.delete(providerId);
    }
  }
  electron.ipcMain.on("chat:send", async (_event, payload) => {
    await doChatStream(payload);
  });
  electron.ipcMain.on("chat:abort", (_e, providerId) => {
    abortControllers.get(providerId)?.abort();
  });
  electron.ipcMain.on("chat:regenerate", async (_e, payload) => {
    await doChatStream(payload, true);
  });
  electron.ipcMain.on("chat:editMessage", async (_e, payload) => {
    const { editIndex, ...chatPayload } = payload;
    await doChatStream(chatPayload, false, editIndex);
  });
  electron.ipcMain.handle("desktop:capture", async () => {
    const base64 = await captureScreenshot();
    return base64;
  });
  electron.ipcMain.handle("desktop:emergencyStop", () => {
    for (const [id, ac] of abortControllers.entries()) {
      ac.abort();
    }
    abortControllers.clear();
    win.webContents.send("desktop:emergencyStop");
    return true;
  });
  electron.ipcMain.handle("desktop:getWindows", async () => {
    try {
      const sources = await electron.desktopCapturer.getSources({ types: ["window"], thumbnailSize: { width: 0, height: 0 } });
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        appIcon: s.appIcon ? s.appIcon.toPNG().toString("base64") : void 0
      }));
    } catch (err) {
      return [];
    }
  });
  electron.ipcMain.handle("doctor:run", () => {
    return runDoctor();
  });
  electron.ipcMain.handle("tools:readFile", (_e, path2) => readFile(path2));
  electron.ipcMain.handle("tools:writeFile", (_e, path2, content) => writeFile(path2, content));
  electron.ipcMain.handle("tools:listDirectory", (_e, path2) => listDirectory(path2));
  electron.ipcMain.handle("tools:applyPatch", (_e, path2, patch) => applyPatch(path2, patch));
}
let trayInstance = null;
function createIcon() {
  const iconPath = path.join(process.resourcesPath || __dirname, "resources", "icon.png");
  if (existsSync(iconPath)) {
    return electron.nativeImage.createFromPath(iconPath);
  }
  const size = { width: 16, height: 16 };
  electron.nativeImage.createEmpty();
  const canvas = electron.nativeImage.createFromBuffer(Buffer.alloc(size.width * size.height * 4), size);
  return canvas;
}
function existsSync(p) {
  try {
    const { existsSync: fsExists } = require("fs");
    return fsExists(p);
  } catch {
    return false;
  }
}
function createTray(win) {
  if (trayInstance) {
    trayInstance.destroy();
  }
  const icon = createIcon();
  trayInstance = new electron.Tray(icon);
  trayInstance.setToolTip("OpenDesk");
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "New Chat",
      click: () => {
        win.webContents.send("app:new-chat");
        if (!win.isVisible()) win.show();
        win.focus();
      }
    },
    {
      label: "Show Window",
      click: () => {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => {
        win.webContents.send("app:open-settings");
        if (!win.isVisible()) win.show();
        win.focus();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  trayInstance.setContextMenu(contextMenu);
  trayInstance.on("click", () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  return trayInstance;
}
function destroyTray() {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
  }
}
function registerShortcuts(win) {
  const toggleKey = process.platform === "darwin" ? "Command+Shift+Space" : "Control+Shift+Space";
  electron.globalShortcut.register(toggleKey, () => {
    if (win.isVisible() && win.isFocused()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  const stopKey = process.platform === "darwin" ? "Command+." : "Control+.";
  electron.globalShortcut.register(stopKey, () => {
    win.webContents.send("desktop:emergencyStop");
  });
  const focusKey = process.platform === "darwin" ? "Command+K" : "Control+K";
  electron.globalShortcut.register(focusKey, () => {
    if (!win.isVisible()) win.show();
    win.focus();
    win.webContents.send("app:focus-input");
  });
  const newChatKey = process.platform === "darwin" ? "Command+N" : "Control+N";
  electron.globalShortcut.register(newChatKey, () => {
    if (!win.isVisible()) win.show();
    win.focus();
    win.webContents.send("app:new-chat");
  });
  const settingsKey = process.platform === "darwin" ? "Command+," : "Control+,";
  electron.globalShortcut.register(settingsKey, () => {
    if (!win.isVisible()) win.show();
    win.focus();
    win.webContents.send("app:open-settings");
  });
}
function unregisterShortcuts() {
  electron.globalShortcut.unregisterAll();
}
let mainWindow = null;
function createWindow() {
  const backgroundColor = "#0f0f0f";
  const win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    show: false,
    titleBarStyle: "hiddenInset",
    vibrancy: "sidebar",
    visualEffectState: "active",
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.on("ready-to-show", () => {
    win.show();
  });
  win.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  win.on("close", (event) => {
    if (process.platform === "darwin") {
      event.preventDefault();
      win.hide();
    } else {
      event.preventDefault();
      win.hide();
    }
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  return win;
}
async function detectOllama() {
  try {
    const response = await fetch("http://localhost:11434/v1/models", { signal: AbortSignal.timeout(3e3) });
    if (!response.ok) return { available: false, models: [] };
    const data = await response.json();
    const models = data.data?.map((m) => m.id) || [];
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}
function loadSettings() {
  try {
    const dir = path.join(electron.app.getPath("userData"), "opendesk");
    const path$1 = path.join(dir, "settings.json");
    if (!fs.existsSync(path$1)) return {};
    return JSON.parse(fs.readFileSync(path$1, "utf-8"));
  } catch {
    return {};
  }
}
function saveSettings(settings2) {
  try {
    const dir = path.join(electron.app.getPath("userData"), "opendesk");
    const path$1 = path.join(dir, "settings.json");
    fs.writeFileSync(path$1, JSON.stringify(settings2, null, 2));
  } catch {
  }
}
async function autoDetectOllama() {
  const settings2 = loadSettings();
  const hasOllama = settings2.providers?.some((p) => p.type === "ollama");
  if (hasOllama) return;
  const { available, models } = await detectOllama();
  if (!available) return;
  const defaultModel = models.find((m) => m.includes("llama")) || models[0] || "llama3";
  const ollamaProvider = {
    id: `ollama-auto-${Date.now()}`,
    type: "ollama",
    name: "Ollama (Auto-detected)",
    model: defaultModel,
    baseUrl: "http://localhost:11434/v1",
    enabled: true
  };
  settings2.providers = [...settings2.providers || [], ollamaProvider];
  if (!settings2.activeProviderId) {
    settings2.activeProviderId = ollamaProvider.id;
  }
  saveSettings(settings2);
  console.log("[Ollama] Auto-detected and added provider:", ollamaProvider.id);
}
electron.app.whenReady().then(async () => {
  mainWindow = createWindow();
  registerIpcHandlers(mainWindow);
  createTray(mainWindow);
  registerShortcuts(mainWindow);
  await autoDetectOllama();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      registerIpcHandlers(mainWindow);
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});
electron.app.on("window-all-closed", () => {
});
electron.app.on("before-quit", () => {
  if (mainWindow) {
    mainWindow.removeAllListeners("close");
    mainWindow.close();
  }
  unregisterShortcuts();
  destroyTray();
});
electron.app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
