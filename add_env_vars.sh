#!/bin/bash
# 添加 Voicemaker 环境变量脚本

echo "═══════════════════════════════════════════════════════════════"
echo "Voicemaker 环境变量配置"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd /Users/xxz/XX-s-personal-site

echo "📋 需要添加的环境变量："
echo "   1. DOUBAO_API_KEY - 豆包 API Key"
echo "   2. DOUBAO_APP_ID - 豆包 AppID（声音复刻功能）"
echo ""

echo "🔧 使用以下命令添加环境变量："
echo ""
echo "vercel env add DOUBAO_API_KEY production"
echo "vercel env add DOUBAO_APP_ID production"
echo ""

echo "或者使用交互式方式："
echo ""

read -p "是否现在添加 DOUBAO_API_KEY？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel env add DOUBAO_API_KEY production
fi

read -p "是否现在添加 DOUBAO_APP_ID？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel env add DOUBAO_APP_ID production
fi

echo ""
echo "✅ 环境变量配置完成！"
echo ""
echo "📋 接下来需要："
echo "   1. 执行生产数据库迁移"
echo "   2. 重新部署以应用环境变量（如果需要）"
echo ""
