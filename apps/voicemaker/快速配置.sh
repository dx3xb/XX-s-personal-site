#!/bin/bash
# Voicemaker 快速配置脚本

echo "═══════════════════════════════════════════════════════════════"
echo "Voicemaker - API Key 和 AppID 配置助手"
echo "═══════════════════════════════════════════════════════════════"
echo ""

ENV_FILE=".env.local"
PROJECT_ROOT="/Users/xxz/XX-s-personal-site"

cd "$PROJECT_ROOT" || exit 1

echo "📝 步骤 1: 检查配置文件..."
if [ ! -f "$ENV_FILE" ]; then
    echo "   创建 $ENV_FILE 文件..."
    touch "$ENV_FILE"
fi

echo "   配置文件位置: $PROJECT_ROOT/$ENV_FILE"
echo ""

echo "📋 步骤 2: 请手动编辑 $ENV_FILE 文件，添加以下内容："
echo ""
echo "───────────────────────────────────────────────────────────────"
echo "# Voicemaker 配置"
echo "DOUBAO_API_KEY=在这里输入你的API_Key"
echo "DOUBAO_APP_ID=在这里输入你的AppID"
echo "───────────────────────────────────────────────────────────────"
echo ""

echo "💡 提示："
echo "   1. 使用编辑器打开: code $ENV_FILE"
echo "   2. 或使用: nano $ENV_FILE"
echo "   3. 在文件末尾添加上述配置"
echo ""

echo "🔑 获取 API Key 和 AppID："
echo "   访问: https://console.volcengine.com/"
echo ""

read -p "按 Enter 键打开配置文件（使用 code 命令）..."
if command -v code &> /dev/null; then
    code "$ENV_FILE"
else
    echo "未找到 code 命令，请手动打开: $ENV_FILE"
fi

echo ""
echo "✅ 配置完成后，记得重启开发服务器："
echo "   npm run dev"
echo ""
