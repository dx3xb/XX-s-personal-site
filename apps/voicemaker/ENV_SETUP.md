# 快速配置环境变量

## 🎯 快速开始

在项目根目录的 **`.env.local`** 文件中添加以下配置：

```bash
# 豆包 TTS API 配置
DOUBAO_API_KEY=在这里输入你的豆包API_Key
DOUBAO_APP_ID=在这里输入你的AppID（声音复刻必需）
DOUBAO_RESOURCE_ID=在这里输入你的Resource_ID（可选）
```

## 📍 文件位置

```
/Users/xxz/XX-s-personal-site/.env.local
```

## 🔒 安全性

- ✅ `.env.local` 文件已被 `.gitignore` 排除
- ✅ 不会被提交到 Git 仓库
- ✅ 只有本地可以访问
- ✅ 是 Next.js 推荐的安全存储方式

## 📝 详细步骤

1. **打开文件**
   ```bash
   cd /Users/xxz/XX-s-personal-site
   code .env.local  # 或使用你喜欢的编辑器
   ```

2. **添加配置**
   在文件末尾添加：
   ```bash
   # Voicemaker 配置
   DOUBAO_API_KEY=your_api_key_here
   DOUBAO_RESOURCE_ID=your_resource_id_here
   ```

3. **保存并重启**
   ```bash
   # 保存文件后，重启开发服务器
   npm run dev
   ```

## 🔑 获取 API Key

访问以下任一平台获取：
- [豆包开放平台](https://www.volcengine.com/product/doubao)
- [火山引擎控制台](https://console.volcengine.com/)

## ✅ 验证

访问 `http://localhost:3000/apps/voicemaker` 测试功能。

---

**详细说明请查看 [CONFIG.md](./CONFIG.md)**
