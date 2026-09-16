# Local Dead Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除明确无调用入口的本地遗留代码和资源，同时保持已部署业务调用链不变。

**Architecture:** 以 `app.json`、页面模板引用与 `cloudbaserc.json` 作为运行时入口事实来源。先运行现有功能测试建立基线，再删除无入口文件并收敛仍在使用的工具模块；通过全量测试、活动函数目录检查和运行时代码引用扫描验证。

**Tech Stack:** 微信小程序 JavaScript、CloudBase 云函数配置、Node.js 内置测试运行器。

**Spec:** `docs/superpowers/specs/2026-09-17-local-dead-code-cleanup-design.md`

## Global Constraints

- 只修改本地项目；不删除远端云函数、数据或存储对象。
- 不删除 `cloudbaserc.json` 中声明的云函数目录。
- 不暂存或恢复用户已有的无关文章删除。
- 不增加第三方依赖。

---

### Task 1: 建立清理前的功能基线

**Files:**
- Modify: 无。

**Interfaces:**
- Consumes: 现有页面与云函数测试。
- Produces: 清理前的测试基线，证明后续文件删除不改变当前行为。

- [ ] **Step 1: 运行当前功能测试**

```bash
node --test pages/**/*.test.js cloudfunctions/*/*.test.js cloudfunctions/*/tests/*.test.js
```

- [ ] **Step 2: 记录失败项或通过基线**

```text
若现有测试失败，先区分其是否与本次删除目标有关；不将既有失败归因于本次清理。
```


### Task 2: 删除遗留目录、资源和工具接口

**Files:**
- Delete: `cloudfunctions/generatePoem/**`, `cloudfunctions/generatePoem_test/**`
- Delete: `cloudfunctions/validateImageRuntime/**`, `cloudfunctions/validateImageRuntimeV2/**`, `cloudfunctions/validateImageRuntimeV3/**`
- Delete: `components/navigation-bar/**`, `utils/env.js`, `utils/poem.js`, `utils/canvasPoster.js`
- Delete: `assets/CodeBubbyAssets/**`, `static/img/placeholder-upload.png`, `static/qr/poster-entry.png`, `static/share/**`, `minitest/test.config.json`
- Modify: `app.js`, `utils/requestHelper.js`, `utils/errorHandler.js`, `utils/image.js`
- Test: 现有页面与云函数测试。

**Interfaces:**
- Consumes: Task 1 建立的功能测试基线与设计文档中的遗留路径清单。
- Produces: 仅保留当前页面、活动云函数与其实际依赖的本地项目结构。

- [ ] **Step 1: 删除设计文档列出的遗留路径**

```text
删除前逐项核对路径均不在 app.json、cloudbaserc.json 或运行时代码引用中。
```

- [ ] **Step 2: 最小化收敛工具模块**

```js
module.exports = {
  downloadFileWithTimeout,
  uploadFileWithTimeout,
  callFunctionWithTimeout
}
```

- [ ] **Step 3: 删除 app.js 的未读取 globalData**

```js
wx.cloud.init({ env: ENV_ID, traceUser: true })
```

- [ ] **Step 4: 运行受影响功能测试确认通过**

Run: `node --test pages/**/*.test.js cloudfunctions/*/*.test.js cloudfunctions/*/tests/*.test.js`

Expected: PASS。

### Task 3: 全量验证与提交

**Files:**
- Modify: 仅 Task 1 与 Task 2 产生的文件变更。

**Interfaces:**
- Consumes: 本地清理后的项目。
- Produces: 已验证且仅包含本次清理内容的 `main` 提交。

- [ ] **Step 1: 运行全部 Node 测试**

Run: `node --test pages/**/*.test.js cloudfunctions/*/*.test.js cloudfunctions/*/tests/*.test.js tests/*.test.js`

Expected: PASS。

- [ ] **Step 2: 验证活动云函数目录**

Run: Node 脚本读取 `cloudbaserc.json`，逐一检查 `cloudfunctions/<name>/index.js` 存在。

Expected: PASS。

- [ ] **Step 3: 搜索遗留引用**

Run: `rg` 搜索旧函数、组件、工具与资源名称，排除历史文档和本清理测试。

Expected: 不存在运行时代码引用。

- [ ] **Step 4: 检查暂存内容并提交**

```bash
git diff --cached --check
git commit -m "chore: 清理未调用项目代码"
```

Expected: 提交不包含用户已有的文章删除。
