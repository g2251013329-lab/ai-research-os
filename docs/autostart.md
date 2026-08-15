# AI Research OS — 自启动与运维

## 启动方式

后端由 **launchd LaunchAgent** 托管（`~/Library/LaunchAgents/com.ai-research-os.backend.plist`）：

- **随登录自动启动**（RunAtLoad）
- **崩溃自动重启**（KeepAlive）
- 因此无需手动启动——任何时候打开 `http://127.0.0.1:8000` 即可使用
- 不依赖 dsh 会话：重启 dsh 不会影响后端

## 常用命令

```bash
# 查看状态（PID 与最近退出码）
launchctl list | grep ai-research

# 手动停止（下次登录或 bootstrap 时恢复）
launchctl bootout gui/$(id -u)/com.ai-research-os.backend

# 手动启动
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ai-research-os.backend.plist

# 查看日志
tail -f /tmp/airos-backend.log

# 卸载自启（删除 plist 后 bootout）
rm ~/Library/LaunchAgents/com.ai-research-os.backend.plist
launchctl bootout gui/$(id -u)/com.ai-research-os.backend
```

## 配置要点

| 项 | 值 |
|---|---|
| Python | `backend/.venv/bin/python -m uvicorn` |
| 端口 | `127.0.0.1:8000` |
| 数据目录 | `AIROS_DATA_DIR=/Users/mathew/dsh/.airos-data` |
| 工作目录 | `backend/`（读取 `app.main:app`） |
| 日志 | `/tmp/airos-backend.log` |

> 若修改了后端代码（`uv run` 之外的直接改动），重启服务：
> `launchctl kickstart -k gui/$(id -u)/com.ai-research-os.backend`
