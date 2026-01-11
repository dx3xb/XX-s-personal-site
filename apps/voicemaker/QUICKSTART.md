# Voicemaker 快速开始指南

这是 Voicemaker 应用的快速部署指南。如需详细说明，请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## ⚡ 快速部署（3 步）

### 1️⃣ 配置环境变量

在 `.env.local` 文件中添加：

```bash
DOUBAO_API_KEY=your_api_key_here
```

### 2️⃣ 执行数据库迁移

```bash
# 使用部署脚本（推荐）
./scripts/deploy-voicemaker.sh

# 或手动执行 SQL
psql $DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $DATABASE_URL -f sql/012_voicemaker_app.sql
```

### 3️⃣ 启动并测试

```bash
# 启动开发服务器
npm run dev

# 访问应用
open http://localhost:3000/apps/voicemaker
```

## ✅ 验证部署

1. 访问 `http://localhost:3000/apps/voicemaker`
2. 输入测试文本："你好，这是测试文本"
3. 选择音色
4. 点击"生成语音"
5. 测试播放和下载功能

## 🚨 常见问题

- **API Key 未配置** → 检查 `.env.local` 文件
- **数据库表不存在** → 执行数据库迁移
- **API 调用失败** → 检查 API Key 和端点配置

## 📚 详细文档

- [完整部署指南](./DEPLOYMENT.md)
- [项目说明](./README.md)

---

**就这么简单！** 🎉
