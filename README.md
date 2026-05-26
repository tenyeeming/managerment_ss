# Anonymous WebSocket Chat

一个基于 AWS 无服务器架构的匿名实时聊天系统。

## 线上体验

前端网址：https://tenyeeming.github.io/managerment_ss/

## 系统架构

```
Browser (React) ──WebSocket──▶ API Gateway ──▶ Lambda (x3) ──▶ DynamoDB
     │                                                               │
GitHub Pages                                              存储连线 ID
```

| 组件 | 技术 |
|------|------|
| 前端 | React + Vite + TypeScript，部署于 GitHub Pages |
| API | AWS API Gateway v2 WebSocket |
| 后端 | AWS Lambda (Python 3.12) x3 |
| 数据库 | AWS DynamoDB（仅存储活跃连线） |
| 部署 | AWS SAM |

## Lambda 函数

| 函数 | 路由 | 功能 |
|------|------|------|
| `chat-connect` | `$connect` | 用户连线时写入 DynamoDB，广播 user_joined |
| `chat-disconnect` | `$disconnect` | 用户离线时删除 DynamoDB 记录，广播 user_left |
| `chat-send-message` | `sendMessage` | 从 DynamoDB 取得所有连线，fan-out 广播消息 |

## 目录结构

```
.
├── lambda/
│   ├── connect/          # $connect Lambda
│   ├── disconnect/       # $disconnect Lambda
│   └── send_message/     # sendMessage Lambda
├── webui/                # React 前端
│   └── src/
│       └── config.ts     # WebSocket endpoint 设定
├── docement/             # 设计文档
├── template.yaml         # AWS SAM 模板
└── README.md
```

## 部署

### 后端（AWS SAM）

```bash
sam build
sam deploy --guided
```

### 前端（GitHub Pages）

推送到 main 分支后 GitHub Actions 自动部署。

## WebSocket Endpoint

```
wss://lxhki5y572.execute-api.ap-northeast-1.amazonaws.com/prod
```
