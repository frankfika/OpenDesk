"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    set: (next) => electron.ipcRenderer.invoke("settings:set", next),
    setApiKey: (providerId, apiKey) => electron.ipcRenderer.invoke("settings:setApiKey", providerId, apiKey),
    getApiKey: (providerId) => electron.ipcRenderer.invoke("settings:getApiKey", providerId),
    testProvider: (type, model, apiKey, baseUrl) => electron.ipcRenderer.invoke("settings:testProvider", type, model, apiKey, baseUrl),
    fetchModels: (type, apiKey, baseUrl) => electron.ipcRenderer.invoke("settings:fetchModels", type, apiKey, baseUrl)
  },
  draft: {
    load: () => electron.ipcRenderer.invoke("draft:load"),
    save: (draft) => electron.ipcRenderer.invoke("draft:save", draft)
  },
  mcp: {
    listServers: () => electron.ipcRenderer.invoke("mcp:listServers"),
    addServer: (config) => electron.ipcRenderer.invoke("mcp:addServer", config),
    removeServer: (name) => electron.ipcRenderer.invoke("mcp:removeServer", name),
    toggleServer: (name) => electron.ipcRenderer.invoke("mcp:toggleServer", name),
    listTools: () => electron.ipcRenderer.invoke("mcp:listTools"),
    callTool: (name, args) => electron.ipcRenderer.invoke("mcp:callTool", name, args)
  },
  skills: {
    list: () => electron.ipcRenderer.invoke("skills:list"),
    scan: () => electron.ipcRenderer.invoke("skills:scan"),
    load: (skillId, level) => electron.ipcRenderer.invoke("skills:load", skillId, level),
    executeTool: (skillId, toolName, args) => electron.ipcRenderer.invoke("skills:executeTool", skillId, toolName, args),
    export: (skillId, outputPath) => electron.ipcRenderer.invoke("skills:export", skillId, outputPath),
    importFromFolder: (sourcePath) => electron.ipcRenderer.invoke("skills:importFromFolder", sourcePath),
    importFromGitHub: (repoUrl) => electron.ipcRenderer.invoke("skills:importFromGitHub", repoUrl),
    delete: (skillId) => electron.ipcRenderer.invoke("skills:delete", skillId),
    getBuiltins: () => electron.ipcRenderer.invoke("skills:getBuiltins"),
    create: (name, description, tags) => electron.ipcRenderer.invoke("skills:create", name, description, tags)
  },
  workspace: {
    list: () => electron.ipcRenderer.invoke("workspace:list"),
    add: () => electron.ipcRenderer.invoke("workspace:add"),
    remove: (id) => electron.ipcRenderer.invoke("workspace:remove", id),
    update: (id, patch) => electron.ipcRenderer.invoke("workspace:update", id, patch),
    relink: (id, newPath) => electron.ipcRenderer.invoke("workspace:relink", id, newPath),
    scanAgentsMd: (folderPath) => electron.ipcRenderer.invoke("workspace:scanAgentsMd", folderPath)
  },
  thread: {
    list: (workspaceId) => electron.ipcRenderer.invoke("thread:list", workspaceId),
    create: (payload) => electron.ipcRenderer.invoke("thread:create", payload),
    update: (id, patch) => electron.ipcRenderer.invoke("thread:update", id, patch),
    delete: (id) => electron.ipcRenderer.invoke("thread:delete", id),
    loadMessages: (threadId) => electron.ipcRenderer.invoke("thread:loadMessages", threadId),
    saveMessages: (threadId, messages) => electron.ipcRenderer.invoke("thread:saveMessages", threadId, messages)
  },
  chat: {
    send: (payload) => electron.ipcRenderer.send("chat:send", payload),
    abort: (providerId) => electron.ipcRenderer.send("chat:abort", providerId),
    regenerate: (payload) => electron.ipcRenderer.send("chat:regenerate", payload),
    editMessage: (payload) => electron.ipcRenderer.send("chat:editMessage", payload),
    onToken: (cb) => {
      const listener = (_e, token) => cb(token);
      electron.ipcRenderer.on("chat:token", listener);
      return () => electron.ipcRenderer.removeListener("chat:token", listener);
    },
    onDone: (cb) => {
      const listener = (_e, meta) => cb(meta);
      electron.ipcRenderer.on("chat:done", listener);
      return () => electron.ipcRenderer.removeListener("chat:done", listener);
    },
    onError: (cb) => {
      const listener = (_e, error) => cb(error);
      electron.ipcRenderer.on("chat:error", listener);
      return () => electron.ipcRenderer.removeListener("chat:error", listener);
    },
    onToolCall: (cb) => {
      const listener = (_e, toolCall) => cb(toolCall);
      electron.ipcRenderer.on("chat:tool_call", listener);
      return () => electron.ipcRenderer.removeListener("chat:tool_call", listener);
    },
    onToolResult: (cb) => {
      const listener = (_e, result) => cb(result);
      electron.ipcRenderer.on("chat:tool_result", listener);
      return () => electron.ipcRenderer.removeListener("chat:tool_result", listener);
    }
  },
  desktop: {
    capture: () => electron.ipcRenderer.invoke("desktop:capture"),
    emergencyStop: () => electron.ipcRenderer.invoke("desktop:emergencyStop"),
    getWindows: () => electron.ipcRenderer.invoke("desktop:getWindows")
  },
  doctor: {
    run: () => electron.ipcRenderer.invoke("doctor:run")
  },
  app: {
    onNewChat: (cb) => {
      const listener = () => cb();
      electron.ipcRenderer.on("app:new-chat", listener);
      return () => electron.ipcRenderer.removeListener("app:new-chat", listener);
    },
    onOpenSettings: (cb) => {
      const listener = () => cb();
      electron.ipcRenderer.on("app:open-settings", listener);
      return () => electron.ipcRenderer.removeListener("app:open-settings", listener);
    },
    onFocusInput: (cb) => {
      const listener = () => cb();
      electron.ipcRenderer.on("app:focus-input", listener);
      return () => electron.ipcRenderer.removeListener("app:focus-input", listener);
    },
    onEmergencyStop: (cb) => {
      const listener = () => cb();
      electron.ipcRenderer.on("desktop:emergencyStop", listener);
      return () => electron.ipcRenderer.removeListener("desktop:emergencyStop", listener);
    }
  }
});
