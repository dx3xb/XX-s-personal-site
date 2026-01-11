# 配置 API Key 和 AppID

## 🔑 快速配置步骤

### 1. 找到配置文件

在项目根目录找到 `.env.local` 文件：

```
/Users/xxz/XX-s-personal-site/.env.local
```

如果文件不存在，请创建它。

### 2. 打开配置文件

```bash
# 在项目根目录执行
cd /Users/xxz/XX-s-personal-site
code .env.local
# 或使用其他编辑器
nano .env.local
```

### 3. 添加配置

在 `.env.local` 文件末尾添加以下内容：

```bash
# ======================
# Voicemaker - 豆包 TTS API 配置
# ======================

# 豆包 API Key（必需）
# 从火山引擎控制台获取：https://console.volcengine.com/
DOUBAO_API_KEY=在这里输入你的API_Key

# 豆包 AppID（声音复刻功能必需）
# 从火山引擎控制台获取：https://console.volcengine.com/
DOUBAO_APP_ID=在这里输入你的AppID
```

### 4. 保存文件

保存 `.env.local` 文件。

### 5. 重启开发服务器

**重要：配置更改后必须重启开发服务器！**

```bash
# 1. 停止当前服务器（按 Ctrl+C）

# 2. 重新启动
npm run dev
```

### 6. 访问页面

在浏览器中访问：

```
http://localhost:3000/apps/voicemaker
```

## 📋 配置示例

完整的 `.env.local` 文件示例：

```bash
# 数据库配置（应该已经存在）
DATABASE_URL=postgresql://...

# Voicemaker 配置
DOUBAO_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
DOUBAO_APP_ID=1234567890
```

## 🔍 如何获取 API Key 和 AppID

### 方法一：火山引擎控制台

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 登录你的账号
3. 进入"语音技术"或"豆包"服务
4. 创建应用或选择现有应用
5. 在应用设置中获取：
   - **Access Token** (这就是 DOUBAO_API_KEY)
   - **AppID** (这就是 DOUBAO_APP_ID)

### 方法二：豆包开放平台

1. 访问 [豆包开放平台](https://www.volcengine.com/product/doubao)
2. 注册/登录账号
3. 创建应用
4. 获取 API Key 和 AppID

## ⚠️ 重要提示

1. **不要提交 `.env.local` 到 Git**
   - 该文件已被 `.gitignore` 排除
   - 确保不会意外提交

2. **环境变量格式**
   - 不要使用引号（除非值中包含空格）
   - 不要在等号前后加空格
   - 确保没有多余的空格

3. **重启服务器**
   - 修改 `.env.local` 后必须重启开发服务器
   - 环境变量只在服务器启动时加载

4. **区分大小写**
   - 变量名区分大小写
   - 确保拼写正确：`DOUBAO_API_KEY` 和 `DOUBAO_APP_ID`

## ✅ 验证配置

配置完成后，检查：

1. 文件是否存在：`.env.local`
2. 变量是否添加：`DOUBAO_API_KEY` 和 `DOUBAO_APP_ID`
3. 服务器是否重启：`npm run dev`
4. 页面是否可访问：`http://localhost:3000/apps/voicemaker`

## 🐛 常见问题

### 问题：页面无法访问

**可能原因：**
- 服务器未启动
- 路径错误
- 构建错误

**解决方案：**
```bash
# 1. 确保服务器正在运行
npm run dev

# 2. 检查是否有错误信息
# 查看终端输出的错误信息

# 3. 访问正确的 URL
http://localhost:3000/apps/voicemaker
```

### 问题：配置未生效

**可能原因：**
- 文件位置错误
- 变量名拼写错误
- 服务器未重启

**解决方案：**
```bash
# 1. 确认文件在正确位置
ls -la .env.local  # 应该在项目根目录

# 2. 检查变量名拼写
# 确保是 DOUBAO_API_KEY 和 DOUBAO_APP_ID

# 3. 重启服务器
# Ctrl+C 停止，然后 npm run dev
```

### 问题：找不到配置文件

**解决方案：**
```bash
# 创建 .env.local 文件
cd /Users/xxz/XX-s-personal-site
touch .env.local

# 编辑文件
code .env.local
```

## 📞 需要帮助？

如果仍然无法访问页面：

1. 检查终端是否有错误信息
2. 确认服务器是否正在运行
3. 查看浏览器控制台的错误信息
4. 参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 详细部署指南

---

**记住：配置后必须重启服务器！** 🔄
