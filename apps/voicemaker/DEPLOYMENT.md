# Voicemaker 部署指南

本文档将指导您一步步完成 Voicemaker 应用的部署上线。

## 📋 部署步骤概览

1. ✅ 代码已创建（已完成）
2. 🔧 配置环境变量
3. 💾 执行数据库迁移
4. 🧪 测试应用
5. 🚀 部署上线

---

## 步骤 1: 配置环境变量

### 1.1 编辑环境变量文件

在主项目根目录的 `.env.local` 文件中添加以下配置：

```bash
# 豆包 TTS API 配置
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_RESOURCE_ID=your_resource_id_here  # 可选，根据实际 API 要求
DOUBAO_TTS_URL=https://openspeech.bytedance.com/api/v1/tts  # 可选，默认值
```

### 1.2 获取豆包 API Key

1. 访问 [豆包开放平台](https://www.volcengine.com/product/doubao) 或 [火山引擎控制台](https://console.volcengine.com/)
2. 创建应用并获取 API Key
3. 如果 API 要求 Resource-Id，请在控制台获取
4. 将获取的 Key 填入 `.env.local` 文件

### 1.3 验证配置

确保 `.env.local` 文件包含以下必需的变量：

- `DATABASE_URL` - 数据库连接字符串（应该已存在）
- `DOUBAO_API_KEY` - 豆包 API Key（必需）

---

## 步骤 2: 执行数据库迁移

### 2.1 方法一：使用部署脚本（推荐）

```bash
# 在项目根目录执行
./scripts/deploy-voicemaker.sh
```

如果脚本没有执行权限：

```bash
chmod +x scripts/deploy-voicemaker.sh
./scripts/deploy-voicemaker.sh
```

### 2.2 方法二：手动执行 SQL

如果无法使用脚本，可以手动执行 SQL 文件：

```bash
# 使用 psql 执行
psql $DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $DATABASE_URL -f sql/012_voicemaker_app.sql
```

或者直接在数据库客户端中执行 SQL 文件内容。

### 2.3 验证数据库迁移

执行以下 SQL 查询验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'voicemaker_generations';

-- 检查应用是否注册
SELECT * FROM public.apps WHERE slug = 'voicemaker';
```

---

## 步骤 3: 本地测试

### 3.1 启动开发服务器

```bash
# 在项目根目录
npm run dev
```

### 3.2 访问应用

打开浏览器访问：

```
http://localhost:3000/apps/voicemaker
```

### 3.3 测试功能

1. **输入文本测试**
   - 在文本框中输入一些测试文本（如："你好，这是测试文本"）
   - 选择音色
   - 点击"生成语音"按钮

2. **检查错误**
   - 如果出现错误，检查浏览器控制台和服务器日志
   - 常见问题：
     - API Key 未配置 → 检查 `.env.local` 文件
     - 数据库连接失败 → 检查 `DATABASE_URL`
     - API 调用失败 → 检查豆包 API Key 和端点配置

3. **测试播放和下载**
   - 生成成功后，测试音频播放功能
   - 测试下载功能，确认可以下载 MP3 文件

### 3.4 查看日志

检查服务器日志中的相关信息：

```bash
# 如果使用 npm run dev，日志会在终端显示
# 查找类似这样的日志：
[Voicemaker] 生成语音: text="你好，这是测试文本...", voice="zh-CN-XiaoxiaoNeural"
```

---

## 步骤 4: 修复常见问题

### 问题 1: API Key 未配置

**错误信息**: `DOUBAO_API_KEY 未配置`

**解决方案**:
- 检查 `.env.local` 文件中是否包含 `DOUBAO_API_KEY`
- 确保 API Key 格式正确（无多余空格）
- 重启开发服务器

### 问题 2: 数据库表不存在

**错误信息**: `relation "voicemaker_generations" does not exist`

**解决方案**:
- 执行数据库迁移脚本
- 检查 `DATABASE_URL` 是否正确
- 确认已连接到正确的数据库

### 问题 3: API 调用失败

**错误信息**: `TTS API 错误: 401` 或 `TTS API 错误: 403`

**解决方案**:
- 检查 API Key 是否正确
- 确认 API Key 有调用 TTS 服务的权限
- 检查 API 端点 URL 是否正确
- 参考豆包官方文档确认参数格式

### 问题 4: 音频生成失败

**错误信息**: `生成语音失败` 或 API 返回错误

**解决方案**:
- 检查文本内容是否符合要求（长度、字符类型）
- 验证音色 ID 是否正确
- 查看服务器日志获取详细错误信息
- 根据豆包 API 文档调整参数格式

---

## 步骤 5: 部署上线

### 5.1 构建生产版本

```bash
npm run build
```

### 5.2 配置生产环境变量

在生产环境（如 Vercel、Railway 等）配置以下环境变量：

- `DATABASE_URL` - 生产数据库连接字符串
- `DOUBAO_API_KEY` - 豆包 API Key
- `DOUBAO_RESOURCE_ID` - （如需要）
- `DOUBAO_TTS_URL` - （如需要自定义）

### 5.3 执行生产数据库迁移

在生产数据库中执行迁移脚本：

```bash
# 使用生产环境的 DATABASE_URL
psql $PRODUCTION_DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $PRODUCTION_DATABASE_URL -f sql/012_voicemaker_app.sql
```

### 5.4 部署到 Vercel（示例）

如果使用 Vercel：

1. 推送代码到 Git 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量（在 Vercel 项目设置中）
4. 部署应用

### 5.5 验证生产部署

1. 访问生产环境 URL: `https://www.xxlab.io/apps/voicemaker`
2. 执行完整的功能测试
3. 检查错误日志
4. 确认数据库记录正常创建

---

## 📝 检查清单

部署前请确认：

- [ ] 环境变量已正确配置（`.env.local`）
- [ ] 数据库迁移已执行
- [ ] 本地测试通过
- [ ] 生产环境变量已配置
- [ ] 生产数据库迁移已执行
- [ ] 生产环境部署成功
- [ ] 生产环境功能测试通过

---

## 🔗 相关资源

- [Voicemaker README](./README.md) - 项目说明文档
- [豆包 API 文档](https://www.volcengine.com/docs/6561/79821) - 官方 API 文档
- [Next.js 部署文档](https://nextjs.org/docs/deployment) - Next.js 部署指南

---

## 📞 获取帮助

如果遇到问题：

1. 查看服务器日志和浏览器控制台
2. 检查环境变量配置
3. 验证数据库迁移状态
4. 参考豆包 API 文档
5. 检查代码中的注释和错误信息

---

**祝部署顺利！** 🎉
