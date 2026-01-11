#!/bin/bash
# Voicemaker 部署脚本
# 用于执行数据库迁移和应用部署

set -e

echo "🚀 开始部署 Voicemaker 应用..."

# 检查数据库连接
if [ -z "$DATABASE_URL" ]; then
    echo "❌ 错误: DATABASE_URL 环境变量未设置"
    echo "请在 .env.local 文件中设置 DATABASE_URL"
    exit 1
fi

# 提取数据库连接信息
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📊 数据库信息:"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"

# 执行 SQL 迁移文件
echo ""
echo "📝 执行数据库迁移..."

# 检查 psql 是否可用
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql 未找到，请手动执行以下 SQL 文件:"
    echo "   1. sql/011_voicemaker_generations.sql"
    echo "   2. sql/012_voicemaker_app.sql"
    echo ""
    echo "或使用以下命令:"
    echo "   psql \$DATABASE_URL -f sql/011_voicemaker_generations.sql"
    echo "   psql \$DATABASE_URL -f sql/012_voicemaker_app.sql"
    exit 0
fi

# 执行迁移
echo "   执行 011_voicemaker_generations.sql..."
psql "$DATABASE_URL" -f sql/011_voicemaker_generations.sql

echo "   执行 012_voicemaker_app.sql..."
psql "$DATABASE_URL" -f sql/012_voicemaker_app.sql

echo "   执行 013_voicemaker_custom_voices.sql..."
psql "$DATABASE_URL" -f sql/013_voicemaker_custom_voices.sql

echo ""
echo "✅ 数据库迁移完成!"

# 检查环境变量
echo ""
echo "🔍 检查环境变量配置..."
if [ -z "$DOUBAO_API_KEY" ]; then
    echo "⚠️  警告: DOUBAO_API_KEY 未设置"
    echo "   请在 .env.local 文件中添加: DOUBAO_API_KEY=your_api_key"
else
    echo "✅ DOUBAO_API_KEY 已配置"
fi

if [ -z "$DOUBAO_APP_ID" ]; then
    echo "⚠️  警告: DOUBAO_APP_ID 未设置（声音复刻功能需要）"
    echo "   如需使用声音复刻功能，请在 .env.local 中添加: DOUBAO_APP_ID=your_app_id"
else
    echo "✅ DOUBAO_APP_ID 已配置"
fi

if [ -z "$DOUBAO_RESOURCE_ID" ]; then
    echo "ℹ️  DOUBAO_RESOURCE_ID 未设置（可选）"
else
    echo "✅ DOUBAO_RESOURCE_ID 已配置"
fi

echo ""
echo "✨ 部署脚本执行完成!"
echo ""
echo "📋 下一步:"
echo "   1. 确保环境变量已正确配置 (.env.local)"
echo "   2. 启动 Next.js 开发服务器: npm run dev"
echo "   3. 访问应用: http://localhost:3000/apps/voicemaker"
echo ""
echo "🔗 相关文档: apps/voicemaker/README.md"
