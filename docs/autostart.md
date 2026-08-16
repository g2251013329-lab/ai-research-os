# AI Research OS — 自启动与运维

## 启动方式

两个 **launchd LaunchAgent** 托管，均随登录自动启动（RunAtLoad）、崩溃自动重启（KeepAlive），不依赖 dsh 会话：

| 服务 | plist | 作用 |
|---|---|---|
| 后端 | `~/Library/LaunchAgents/com.ai-research-os.backend.plist` | uvicorn 托管 `:8000` 与 `frontend/dist` 静态文件 |
| 前端自动构建 | `~/Library/LaunchAgents/com.ai-research-os.frontend-watch.plist` | `vite build --watch` 监听 `frontend/src`，改动即自动重新打包 dist |

因此：
- 打开 `http://127.0.0.1:8000` 即可使用，无需手动启动
- **修改前端源码后无需手动 `npm run build`**——watch 服务自动重建，强刷页面即可看到（dev 模式 `npm run dev` 的 `:5173` 则实时生效）
- 修改后端代码需重启后端服务（见下文命令）

## 常用命令

```bash
# 查看状态（PID 与最近退出码）
launchctl list | grep ai-research

# 后端：手动停止（下次登录或 bootstrap 时恢复）
launchctl bootout gui/$(id -u)/com.ai-research-os.backend

# 后端：手动启动
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ai-research-os.backend.plist

# 后端：修改了后端代码后重启
launchctl kickstart -k gui/$(id -u)/com.ai-research-os.backend

# 前端 watch：手动停止 / 启动
launchctl bootout gui/$(id -u)/com.ai-research-os.frontend-watch
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ai-research-os.frontend-watch.plist

# 查看日志
tail -f /tmp/airos-backend.log
tail -f /tmp/airos-frontend-watch.log

# 卸载自启（删除 plist 后 bootout）
rm ~/Library/LaunchAgents/com.ai-research-os.backend.plist
launchctl bootout gui/$(id -u)/com.ai-research-os.backend
rm ~/Library/LaunchAgents/com.ai-research-os.frontend-watch.plist
launchctl bootout gui/$(id -u)/com.ai-research-os.frontend-watch
```

## 配置要点

### 后端（com.ai-research-os.backend）

| 项 | 值 |
|---|---|
| Python | `backend/.venv/bin/python -m uvicorn` |
| 端口 | `127.0.0.1:8000` |
| 数据目录 | `AIROS_DATA_DIR=/Users/mathew/dsh/.airos-data` |
| 工作目录 | `backend/`（读取 `app.main:app`） |
| 日志 | `/tmp/airos-backend.log` |

### 前端自动构建（com.ai-research-os.frontend-watch）

| 项 | 值 |
|---|---|
| 命令 | `frontend/node_modules/.bin/vite build --watch` |
| 工作目录 | `frontend/` |
| 日志 | `/tmp/airos-frontend-watch.log` |
| 行为 | `frontend/src` 任一文件变化 → 自动重新打包 `frontend/dist`（约 200ms） |

> plist 模板保存在 `docs/com.ai-research-os.frontend-watch.plist`，改动后重新复制到 `~/Library/LaunchAgents/` 并 `launchctl bootout` + `bootstrap` 生效。
