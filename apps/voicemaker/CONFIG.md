# Voicemaker 安全配置指南

本文档说明如何安全地配置豆包 API Key 和 Resource ID。

## 🔒 安全存储位置

**所有敏感信息应存储在 `.env.local` 文件中，该文件已被 `.gitignore` 排除，不会提交到 Git 仓库。**

## 📝 配置步骤

### 1. 打开配置文件

在项目根目录找到 `.env.local` 文件（如果不存在，请创建它）：

```bash
# 在项目根目录
cd /Users/xxz/XX-s-personal-site
nano .env.local
# 或使用你喜欢的编辑器
code .env.local
```

### 2. 添加豆包配置

在 `.env.local` 文件中添加以下配置：

```bash
# ======================
# Voicemaker - 豆包 TTS API 配置
# ======================

# 豆包 API Key（必需）
# 从豆包/火山引擎控制台获取：https://console.volcengine.com/
DOUBAO_API_KEY=your_doubao_api_key_here

# 豆包 Resource ID（可选，根据实际 API 要求）
# 如果 API 需要 Resource-Id，请在此填写
DOUBAO_RESOURCE_ID=your_resource_id_here

# 豆包 TTS API 端点（可选，默认值）
# 默认使用 openspeech API，如需自定义可修改此值
DOUBAO_TTS_URL=https://openspeech.bytedance.com/api/v1/tts

# 豆包 AppID（声音复刻功能必需）
DOUBAO_APP_ID=your_app_id_here

# 声音复刻 API 端点（可选，默认值）
DOUBAO_VOICE_CLONE_URL=https://openspeech.bytedance.com/api/v1/voice/clone
```

### 3. 保存文件

保存 `.env.local` 文件。**重要：不要提交此文件到 Git！**

### 4. 重启开发服务器

配置更改后，需要重启 Next.js 开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

## 🔑 获取 API Key

### 方法一：豆包开放平台

1. 访问 [豆包开放平台](https://www.volcengine.com/product/doubao)
2. 注册/登录账号
3. 创建应用
4. 在应用设置中获取 API Key

### 方法二：火山引擎控制台

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 进入"语音技术"或"豆包"服务
3. 创建应用并获取凭证
4. 获取以下信息：
   - **API Key** (Access Token) - 必需
   - **AppID** - 声音复刻功能必需
   - **Resource ID** - 可选，根据实际 API 要求

## ✅ 验证配置

配置完成后，可以通过以下方式验证：

### 1. 检查环境变量

```bash
# 在项目根目录执行（仅用于测试，不要在生产环境使用）
node -e "console.log('API Key:', process.env.DOUBAO_API_KEY ? '已配置' : '未配置')"
```

### 2. 测试应用

1. 启动开发服务器：`npm run dev`
2. 访问：`http://localhost:3000/apps/voicemaker`
3. 尝试生成语音
4. 如果配置正确，应该能成功生成语音

## 🛡️ 安全注意事项

### ✅ 应该做的：

- ✅ 将敏感信息存储在 `.env.local` 文件中
- ✅ 确保 `.env.local` 在 `.gitignore` 中（已自动配置）
- ✅ 使用不同的 API Key 用于开发和生产环境
- ✅ 定期轮换 API Key
- ✅ 在生产环境使用环境变量管理工具（如 Vercel、Railway 等）

### ❌ 不应该做的：

- ❌ **不要**将 `.env.local` 提交到 Git
- ❌ **不要**在代码中硬编码 API Key
- ❌ **不要**在公开场合分享 API Key
- ❌ **不要**将 API Key 提交到 GitHub、GitLab 等公开仓库
- ❌ **不要**在客户端代码中暴露 API Key（应只在服务端使用）

## 🌐 生产环境配置

在生产环境（如 Vercel、Railway、Netlify 等），需要在平台的环境变量设置中添加：

### Vercel 配置示例

1. 进入 Vercel 项目设置
2. 选择 "Environment Variables"
3. 添加以下变量：
   - `DOUBAO_API_KEY` = `your_production_api_key`
   - `DOUBAO_RESOURCE_ID` = `your_production_resource_id` (可选)
   - `DOUBAO_TTS_URL` = `https://openspeech.bytedance.com/api/v1/tts` (可选)

### Railway 配置示例

1. 进入 Railway 项目设置
2. 选择 "Variables"
3. 添加环境变量（同上）

## 📋 配置检查清单

- [ ] `.env.local` 文件已创建
- [ ] `DOUBAO_API_KEY` 已配置
- [ ] `DOUBAO_RESOURCE_ID` 已配置（如需要）
- [ ] `.env.local` 已在 `.gitignore` 中（自动）
- [ ] 开发服务器已重启
- [ ] 本地测试通过
- [ ] 生产环境变量已配置（如已部署）

## 🔍 故障排查

### 问题：API Key 未生效

**解决方案**：
1. 检查 `.env.local` 文件是否存在
2. 确认变量名拼写正确（大小写敏感）
3. 确认没有多余的空格或引号
4. 重启开发服务器

### 问题：环境变量未加载

**解决方案**：
1. 确认文件名为 `.env.local`（不是 `.env`）
2. 确认文件在项目根目录
3. 检查 `.gitignore` 是否意外排除了文件
4. 重启开发服务器

## 📞 需要帮助？

如果遇到配置问题：

1. 检查本文档的故障排查部分
2. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 详细部署指南
3. 检查服务器日志中的错误信息
4. 确认 API Key 格式正确

---

**记住：`.env.local` 文件是安全的，不会被提交到 Git！** 🔒
