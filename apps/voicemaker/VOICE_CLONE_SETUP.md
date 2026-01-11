# 声音复刻（自定义音色）配置指南

本文档说明如何配置和使用豆包的声音复刻功能，创建你自己的专属音色。

## 📋 功能说明

声音复刻功能允许你：
- 上传至少 5 秒的音频样本
- 系统自动训练并创建你的专属音色
- 使用自定义音色生成语音内容

## 🔧 配置步骤

### 1. 获取必要的凭证

在火山引擎控制台获取以下信息：

1. **AppID** - 应用ID
2. **Access Token** - 访问令牌（API Key）

访问：[火山引擎控制台](https://console.volcengine.com/)

### 2. 配置环境变量

在 `.env.local` 文件中添加以下配置：

```bash
# 豆包 API Key（必需）
DOUBAO_API_KEY=your_access_token_here

# 豆包 AppID（声音复刻必需）
DOUBAO_APP_ID=your_app_id_here

# 声音复刻 API 端点（可选，默认值）
DOUBAO_VOICE_CLONE_URL=https://openspeech.bytedance.com/api/v1/voice/clone
```

### 3. 执行数据库迁移

创建自定义音色表：

```bash
# 使用部署脚本
./scripts/deploy-voicemaker.sh

# 或手动执行
psql $DATABASE_URL -f sql/013_voicemaker_custom_voices.sql
```

## 🎤 使用声音复刻

### 步骤 1：准备音频样本

**要求：**
- 格式：MP3 或 WAV
- 时长：至少 5 秒，建议 10-30 秒
- 质量：清晰、无背景噪音
- 内容：自然说话，避免朗读感

**录制建议：**
- 使用清晰的麦克风
- 在安静的环境中录制
- 说话自然，语速适中
- 可以录制一段自我介绍或短文

### 步骤 2：创建自定义音色

1. 访问应用：`http://localhost:3000/apps/voicemaker`
2. 点击"创建自定义音色"按钮
3. 填写音色名称和描述（可选）
4. 上传音频文件
5. 点击"创建音色"

### 步骤 3：等待训练完成

- 创建后，音色状态为 `training`（训练中）
- 训练通常需要几分钟时间
- 训练完成后，状态变为 `ready`（就绪）
- 训练完成后即可使用该音色生成语音

### 步骤 4：使用自定义音色

1. 在音色选择下拉菜单中选择你的自定义音色
2. 输入要生成的文本
3. 点击"生成语音"
4. 系统将使用你的声音生成语音内容

## 📝 API 使用说明

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

### 使用自定义音色生成语音

使用自定义音色的 `voice_id` 作为 `voice_id` 参数调用生成接口：

```bash
POST /api/voicemaker/generate
Content-Type: application/json

{
  "text": "要生成的文本",
  "voice_id": "custom_voice_id_from_api"
}
```

## 🔍 故障排查

### 问题 1：创建音色失败

**可能原因：**
- AppID 未配置
- API Key 无效
- 音频文件格式不正确
- 音频时长不足 5 秒

**解决方案：**
- 检查 `.env.local` 中的 `DOUBAO_APP_ID` 配置
- 验证 API Key 是否正确
- 确保音频文件为 MP3 或 WAV 格式
- 确保音频时长至少 5 秒

### 问题 2：音色训练失败

**可能原因：**
- 音频质量不佳
- 音频内容不合适
- API 配额不足

**解决方案：**
- 使用更清晰的音频样本
- 确保音频是自然说话，不是朗读
- 检查 API 配额和权限

### 问题 3：无法使用自定义音色

**可能原因：**
- 音色尚未训练完成（状态不是 `ready`）
- 音色 ID 不正确

**解决方案：**
- 等待训练完成
- 检查音色状态
- 确认使用的音色 ID 正确

## 📚 参考文档

- [豆包语音合成接口文档](https://www.volcengine.com/docs/6561/1305191)
- [火山引擎控制台](https://console.volcengine.com/)
- [Voicemaker 配置指南](./CONFIG.md)

## ⚠️ 注意事项

1. **音频质量**：音频质量直接影响复刻效果，建议使用高质量录音
2. **训练时间**：训练通常需要几分钟，请耐心等待
3. **API 配额**：声音复刻功能可能需要额外的 API 配额
4. **隐私保护**：上传的音频样本会存储在数据库中，请注意隐私保护
5. **使用限制**：请遵守豆包 API 的使用限制和条款

---

**祝你创建出满意的专属音色！** 🎤✨
