# 🚀 Voicemaker 部署上线指南

## ✅ 已准备的文件

所有 Voicemaker 相关文件已就绪：

- ✅ 数据库迁移文件（`sql/011_*.sql`, `sql/012_*.sql`, `sql/013_*.sql`）
- ✅ 前端页面（`src/app/apps/voicemaker/page.tsx`）
- ✅ API 路由（`src/app/api/voicemaker/`）
- ✅ 配置文件（`apps/voicemaker/`）
- ✅ 部署脚本（`scripts/deploy-voicemaker.sh`）

---

## 📋 部署步骤

### 步骤 1：提交代码到 Git

代码已暂存，执行以下命令提交：

```bash
cd /Users/xxz/XX-s-personal-site

git commit -m "Add Voicemaker app with voice clone support

- Add voice generation API endpoints
- Add custom voice clone functionality  
- Add frontend page for voicemaker
- Add database migrations for voice generation and custom voices
- Add deployment scripts and documentation"

git push
```

### 步骤 2：在 Vercel 配置环境变量

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目（xx-s-personal-site）
3. 进入 **Settings** > **Environment Variables**
4. 添加以下环境变量：

```
DATABASE_URL = 你的生产数据库连接字符串
DOUBAO_API_KEY = 你的豆包API_Key
DOUBAO_APP_ID = 你的豆包AppID
DOUBAO_RESOURCE_ID = （可选）
DOUBAO_TTS_URL = https://openspeech.bytedance.com/api/v1/tts（可选）
DOUBAO_VOICE_CLONE_URL = https://openspeech.bytedance.com/api/v1/voice/clone（可选）
```

**重要：**
- 选择环境：Production、Preview、Development（全部）
- 点击 "Save" 保存

### 步骤 3：执行生产数据库迁移

连接到生产数据库并执行迁移：

```bash
# 方法一：使用环境变量
psql $PRODUCTION_DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $PRODUCTION_DATABASE_URL -f sql/012_voicemaker_app.sql
psql $PRODUCTION_DATABASE_URL -f sql/013_voicemaker_custom_voices.sql

# 方法二：直接连接
psql postgresql://user:password@host:port/database -f sql/011_voicemaker_generations.sql
psql postgresql://user:password@host:port/database -f sql/012_voicemaker_app.sql
psql postgresql://user:password@host:port/database -f sql/013_voicemaker_custom_voices.sql
```

或者使用部署脚本（需要先设置 DATABASE_URL）：

```bash
export DATABASE_URL=你的生产数据库连接字符串
./scripts/deploy-voicemaker.sh
```

### 步骤 4：触发部署

**如果使用 Vercel：**

代码推送到远程仓库后，Vercel 会自动触发部署。

或手动触发：

1. 在 Vercel Dashboard 中进入项目
2. 点击 **Deployments**
3. 点击 **Redeploy** 按钮

**如果使用其他平台：**

```bash
npm run build
npm run start
```

### 步骤 5：验证部署

部署完成后，访问：

```
https://www.xxlab.io/apps/voicemaker
```

**测试项目：**

1. ✅ 页面可以正常访问
2. ✅ 输入文本并选择音色，生成语音成功
3. ✅ 播放和下载功能正常
4. ✅ 创建自定义音色功能正常（需要 DOUBAO_APP_ID）
5. ✅ 使用自定义音色生成语音

---

## 🔍 部署后检查清单

### 功能测试

- [ ] 访问页面成功
- [ ] 标准音色生成功能正常
- [ ] 播放音频功能正常
- [ ] 下载音频功能正常
- [ ] 声音复刻功能正常（如果配置了 DOUBAO_APP_ID）
- [ ] 自定义音色可以正常使用

### 错误检查

- [ ] 检查浏览器控制台（F12）是否有错误
- [ ] 检查 Vercel 函数日志
- [ ] 检查数据库连接是否正常
- [ ] 检查 API 调用是否成功

---

## 🐛 常见问题

### 问题 1：页面 404

**可能原因：**
- 路由配置错误
- 文件未正确提交

**解决方案：**
- 检查 `src/app/apps/voicemaker/page.tsx` 是否存在
- 确认代码已推送到远程仓库
- 检查 Vercel 部署日志

### 问题 2：API 调用失败

**可能原因：**
- 环境变量未配置或错误
- API Key 无效

**解决方案：**
- 检查 Vercel 环境变量配置
- 验证 API Key 和 AppID 是否正确
- 查看 Vercel 函数日志中的错误信息

### 问题 3：数据库错误

**可能原因：**
- 数据库表不存在
- 连接字符串错误

**解决方案：**
- 执行数据库迁移
- 检查 DATABASE_URL 配置
- 验证数据库连接

---

## 📞 需要帮助？

如果遇到问题：

1. 查看 Vercel 部署日志
2. 检查环境变量配置
3. 验证数据库迁移状态
4. 参考详细文档：
   - [DEPLOYMENT.md](./apps/voicemaker/DEPLOYMENT.md)
   - [DEPLOY_CHECKLIST.md](./apps/voicemaker/DEPLOY_CHECKLIST.md)

---

## ✨ 部署成功标志

部署成功后，你应该能够：

- ✅ 访问 `https://www.xxlab.io/apps/voicemaker`
- ✅ 使用标准音色生成语音
- ✅ 创建和使用自定义音色（如果配置了）
- ✅ 播放和下载生成的音频

---

**祝部署顺利！** 🚀
