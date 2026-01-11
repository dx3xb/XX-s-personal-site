# 🚀 Voicemaker 立即部署指南

## 📋 快速部署步骤

### 步骤 1：检查文件状态

```bash
cd /Users/xxz/XX-s-personal-site
git status
```

### 步骤 2：提交代码（如果还未提交）

```bash
# 添加所有新文件
git add sql/011_voicemaker_generations.sql
git add sql/012_voicemaker_app.sql
git add sql/013_voicemaker_custom_voices.sql
git add src/app/apps/voicemaker/
git add src/app/api/voicemaker/
git add apps/voicemaker/
git add scripts/deploy-voicemaker.sh

# 提交
git commit -m "Add Voicemaker app with voice clone support"

# 推送到远程仓库
git push
```

### 步骤 3：在 Vercel 中配置环境变量

1. 访问 Vercel Dashboard: https://vercel.com/dashboard
2. 选择你的项目
3. 进入 Settings > Environment Variables
4. 添加以下环境变量：

```
DATABASE_URL=你的生产数据库连接字符串
DOUBAO_API_KEY=你的豆包API_Key
DOUBAO_APP_ID=你的豆包AppID
```

### 步骤 4：执行生产数据库迁移

```bash
# 连接到生产数据库并执行迁移
psql $PRODUCTION_DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $PRODUCTION_DATABASE_URL -f sql/012_voicemaker_app.sql
psql $PRODUCTION_DATABASE_URL -f sql/013_voicemaker_custom_voices.sql
```

### 步骤 5：触发部署

**如果使用 Vercel：**

- 代码推送后自动部署，或
- 在 Vercel Dashboard 中点击 "Redeploy"

**如果使用其他平台：**

```bash
npm run build
npm run start
```

### 步骤 6：验证部署

访问：`https://www.xxlab.io/apps/voicemaker`

---

## ⚠️ 重要提示

1. **环境变量**：确保在生产环境配置了所有必需的环境变量
2. **数据库迁移**：必须在生产数据库执行迁移脚本
3. **API Key**：使用生产环境的 API Key，不要使用测试环境的
4. **测试**：部署后务必测试所有功能

---

## 🔍 部署状态检查

部署完成后检查：

- [ ] 页面可以访问
- [ ] 标准音色生成功能正常
- [ ] 声音复刻功能正常
- [ ] 音频播放和下载功能正常
- [ ] 数据库记录正常创建

---

**准备就绪？开始部署吧！** 🚀
