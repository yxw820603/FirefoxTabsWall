#!/bin/bash

# 定义扩展的名称和版本
EXTENSION_NAME="FirefoxTabsWall"
EXTENSION_VERSION=$(jq -r '.version' manifest.json)

# 定义打包输出的文件名
OUTPUT_FILE="${EXTENSION_NAME}-${EXTENSION_VERSION}.xpi"

# 打包扩展文件，同时忽略 .git 目录、package.sh 和 *.DS_Store
zip -r "$OUTPUT_FILE" . -x "package.sh" "*.DS_Store" ".git/*"

echo "扩展已成功打包为 $OUTPUT_FILE"