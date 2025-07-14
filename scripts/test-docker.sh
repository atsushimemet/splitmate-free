#!/bin/bash

# Docker環境でGoogle認証テストを実行するスクリプト

echo "🧪 Starting Google Authentication Tests in Docker Environment..."

# Docker Composeを使用してテスト環境を起動
echo "📦 Building and starting test containers..."
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# テスト結果の取得
TEST_EXIT_CODE=$?

# コンテナの停止とクリーンアップ
echo "🧹 Cleaning up test containers..."
docker-compose -f docker-compose.test.yml down --volumes

# テスト結果の報告
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Google Authentication Tests PASSED"
else
    echo "❌ Google Authentication Tests FAILED"
    exit $TEST_EXIT_CODE
fi

echo "🎉 Test execution completed!" 
