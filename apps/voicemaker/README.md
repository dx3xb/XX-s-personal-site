# Voicemaker - AI 文字转语音工具

Voicemaker 是一个基于豆包 TTS API 的文字转语音工具，支持标准音色和声音复刻功能，允许用户输入文本并选择音色，生成高质量的语音内容。

## 功能特性

- ✅ 文本转语音生成（最多 2000 个字符）
- ✅ 多种标准音色选择（16 种中文音色，包括男声和女声）
- ✅ **声音复刻功能**：上传音频样本创建专属音色
- ✅ 实时音频播放
- ✅ 音频文件下载
- ✅ 生成记录存储到数据库

## 部署位置

- 前端页面：`www.xxlab.io/apps/voicemaker`
- API 路由：
  - `/api/voicemaker/generate` - 生成语音
  - `/api/voicemaker/download/[id]` - 下载音频
  - `/api/voicemaker/custom-voice/create` - 创建自定义音色

## 环境变量配置

在 `.env` 或 `.env.local` 文件中配置以下环境变量：

```bash
# 豆包 API Key（必需）
DOUBAO_API_KEY=your_doubao_api_key_here

# 豆包 AppID（声音复刻功能必需）
DOUBAO_APP_ID=your_app_id_here

# 豆包 Resource ID（可选，根据实际 API 要求）
DOUBAO_RESOURCE_ID=your_resource_id_here

# 豆包 TTS API 端点（可选，默认值）
DOUBAO_TTS_URL=https://openspeech.bytedance.com/api/v1/tts

# 声音复刻 API 端点（可选，默认值）
DOUBAO_VOICE_CLONE_URL=https://openspeech.bytedance.com/api/v1/voice/clone
```

## 数据库设置

1. 运行 SQL 文件创建表结构：

```sql
-- 创建语音生成记录表
\i sql/011_voicemaker_generations.sql

-- 在 apps 表中注册应用
\i sql/012_voicemaker_app.sql

-- 创建自定义音色表（声音复刻）
\i sql/013_voicemaker_custom_voices.sql
```

或使用部署脚本：

```bash
./scripts/deploy-voicemaker.sh
```

## 支持的音色

### 标准音色

应用支持以下 16 种中文标准音色：

**女声：**
- 晓晓、晓伊、晓辰、晓涵、晓梦、晓墨、晓秋、晓睿、晓双、晓萱、晓颜、晓悠、晓甄

**男声：**
- 云希、云扬、云健

### 自定义音色（声音复刻）

通过上传至少 5 秒的音频样本，可以创建专属音色：
- 支持 MP3 和 WAV 格式
- 训练完成后即可使用
- 详细说明请查看 [VOICE_CLONE_SETUP.md](./VOICE_CLONE_SETUP.md)

## API 使用说明

### 生成语音

```bash
POST /api/voicemaker/generate
Content-Type: application/json

{
  "text": "要转换的文本内容",
  "voice_id": "zh-CN-XiaoxiaoNeural"  // 或自定义音色ID
}
```

### 创建自定义音色

```bash
POST /api/voicemaker/custom-voice/create
Content-Type: multipart/form-data

{
  "name": "我的声音",
  "description": "个人音色",
  "audio": <音频文件>
}
```

### 获取自定义音色列表

```bash
GET /api/voicemaker/custom-voice/create?status=ready
```

### 下载音频

```bash
GET /api/voicemaker/download/[id]
```

## 使用指南

### 快速开始

1. 配置环境变量（见 [ENV_SETUP.md](./ENV_SETUP.md)）
2. 执行数据库迁移
3. 启动应用：`npm run dev`
4. 访问：`http://localhost:3000/apps/voicemaker`

### 使用标准音色

1. 输入文本内容
2. 选择音色
3. 点击"生成语音"
4. 播放或下载生成的音频

### 使用声音复刻

1. 点击"创建自定义音色"
2. 填写音色名称和描述
3. 上传至少 5 秒的音频文件
4. 等待训练完成（通常几分钟）
5. 在音色选择中选择你的自定义音色
6. 使用自定义音色生成语音

详细说明请查看 [VOICE_CLONE_SETUP.md](./VOICE_CLONE_SETUP.md)

## 注意事项

1. **API 配置**：豆包的 TTS API 参数格式可能需要根据实际 API 文档调整。当前实现基于通用格式，如果遇到问题，请参考[豆包官方文档](https://www.volcengine.com/docs/6561/1305191)进行调整。

2. **音频存储**：当前实现将音频数据存储在数据库的 `bytea` 字段中。对于大量使用场景，建议考虑使用对象存储（如 S3、OSS）存储音频文件，数据库中只存储 URL。

3. **字符限制**：当前限制为 2000 个字符。如需支持更长文本，可以考虑使用异步 API 或分块处理。

4. **音色列表**：音色 ID 可能需要根据豆包实际提供的音色列表进行调整。

5. **声音复刻**：需要配置 `DOUBAO_APP_ID` 才能使用声音复刻功能。

## 相关文档

- [快速配置指南](./ENV_SETUP.md) - 快速配置环境变量
- [详细配置指南](./CONFIG.md) - 完整配置说明
- [声音复刻配置](./VOICE_CLONE_SETUP.md) - 声音复刻功能详细说明
- [部署指南](./DEPLOYMENT.md) - 完整部署步骤

## 开发

项目使用 Next.js 16 和 TypeScript 开发。

- 前端页面：`src/app/apps/voicemaker/page.tsx`
- API 路由：`src/app/api/voicemaker/`
- 数据库表：
  - `sql/011_voicemaker_generations.sql` - 生成记录表
  - `sql/012_voicemaker_app.sql` - 应用注册
  - `sql/013_voicemaker_custom_voices.sql` - 自定义音色表

## 许可证

与主项目保持一致。
