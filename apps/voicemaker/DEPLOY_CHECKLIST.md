# Voicemaker 部署上线检查清单

## ✅ 部署前检查

### 1. 代码完整性
- [x] 所有代码文件已创建
- [x] 前端页面已实现 (`src/app/apps/voicemaker/page.tsx`)
- [x] API 路由已实现 (`src/app/api/voicemaker/`)
- [x] 数据库迁移文件已创建 (`sql/011_voicemaker_generations.sql`, `sql/012_voicemaker_app.sql`, `sql/013_voicemaker_custom_voices.sql`)

### 2. 数据库迁移
- [ ] 生产数据库已执行迁移
- [ ] 验证表已创建成功

### 3. 环境变量配置
在生产环境（Vercel/其他平台）配置：
- [ ] `DATABASE_URL` - 生产数据库连接字符串
- [ ] `DOUBAO_API_KEY` - 豆包 API Key
- [ ] `DOUBAO_APP_ID` - 豆包 AppID（声音复刻功能）
- [ ] `DOUBAO_RESOURCE_ID` - （可选）
- [ ] `DOUBAO_TTS_URL` - （可选，默认值）

### 4. Git 提交
- [ ] 所有新文件已提交到 Git
- [ ] 代码已推送到远程仓库

---

## 🚀 部署步骤

### 方法一：Vercel 部署（推荐）

#### 1. 提交代码到 Git

```bash
cd /Users/xxz/XX-s-personal-site

# 添加所有新文件
git add .

# 提交
git commit -m "Add Voicemaker app with voice clone support"

# 推送到远程仓库
git push
```

#### 2. 在 Vercel 中部署

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 导入项目或更新现有项目
3. 配置环境变量（见下方）
4. 部署

#### 3. 配置环境变量

在 Vercel 项目设置 > Environment Variables 中添加：

```
DATABASE_URL=生产数据库连接字符串
DOUBAO_API_KEY=your_production_api_key
DOUBAO_APP_ID=your_production_app_id
DOUBAO_RESOURCE_ID=your_resource_id（可选）
DOUBAO_TTS_URL=https://openspeech.bytedance.com/api/v1/tts（可选）
```

#### 4. 执行生产数据库迁移

```bash
# 使用生产环境的 DATABASE_URL
psql $PRODUCTION_DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $PRODUCTION_DATABASE_URL -f sql/012_voicemaker_app.sql
psql $PRODUCTION_DATABASE_URL -f sql/013_voicemaker_custom_voices.sql
```

#### 5. 验证部署

1. 访问生产环境 URL: `https://www.xxlab.io/apps/voicemaker`
2. 测试标准音色生成
3. 测试声音复刻功能
4. 检查错误日志

---

### 方法二：手动部署

#### 1. 构建生产版本

```bash
cd /Users/xxz/XX-s-personal-site
npm run build
```

#### 2. 配置生产环境变量

在生产服务器上创建 `.env.production` 文件：

```bash
DATABASE_URL=生产数据库连接字符串
DOUBAO_API_KEY=your_production_api_key
DOUBAO_APP_ID=your_production_app_id
```

#### 3. 执行数据库迁移

```bash
psql $PRODUCTION_DATABASE_URL -f sql/011_voicemaker_generations.sql
psql $PRODUCTION_DATABASE_URL -f sql/012_voicemaker_app.sql
psql $PRODUCTION_DATABASE_URL -f sql/013_voicemaker_custom_voices.sql
```

#### 4. 启动生产服务器

```bash
npm run start
```

---

## 📋 部署后验证

### 功能测试

1. **标准音色测试**
   - [ ] 访问页面：`https://www.xxlab.io/apps/voicemaker`
   - [ ] 输入测试文本
   - [ ] 选择标准音色
   - [ ] 生成语音成功
   - [ ] 播放功能正常
   - [ ] 下载功能正常

2. **声音复刻测试**
   - [ ] 点击"创建自定义音色"
   - [ ] 上传音频文件
   - [ ] 创建成功
   - [ ] 使用自定义音色生成语音

3. **数据库测试**
   - [ ] 生成记录已保存到数据库
   - [ ] 自定义音色已保存到数据库

### 错误检查

- [ ] 检查浏览器控制台是否有错误
- [ ] 检查服务器日志是否有错误
- [ ] 检查 Vercel 函数日志（如使用 Vercel）

---

## 🔧 故障排查

### 问题：页面无法访问

**可能原因：**
- 部署失败
- 路由配置错误
- 环境变量未配置

**解决方案：**
- 检查 Vercel 部署日志
- 确认环境变量已配置
- 检查构建是否成功

### 问题：API 调用失败

**可能原因：**
- API Key 未配置或错误
- 数据库连接失败
- API 端点错误

**解决方案：**
- 检查环境变量配置
- 验证数据库连接
- 检查 API 端点 URL

### 问题：数据库表不存在

**可能原因：**
- 迁移未执行
- 连接错误的数据库

**解决方案：**
- 执行数据库迁移
- 验证 DATABASE_URL 配置

---

## 📞 需要帮助？

如果遇到部署问题：

1. 查看部署日志
2. 检查环境变量配置
3. 验证数据库迁移状态
4. 参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 详细部署指南

---

**祝部署顺利！** 🚀
