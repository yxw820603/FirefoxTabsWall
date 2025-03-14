#!/bin/bash

# Define the extension name and version
EXTENSION_NAME="FirefoxTabsWall"
EXTENSION_VERSION=$(jq -r '.version' manifest.json)

# Define the output filename for the package
OUTPUT_FILE="${EXTENSION_NAME}-${EXTENSION_VERSION}.xpi"

# Set API key and secret
# export WEB_EXT_API_KEY=your_jwt_issuer
# export WEB_EXT_API_SECRET=your_jwt_secret

# Sign the extension, specify the channel and ignore the package.sh file
web-ext sign --channel=unlisted --ignore-files=package.sh --api-key=$WEB_EXT_API_KEY --api-secret=$WEB_EXT_API_SECRET --ignore-files=package.sh "*.DS_Store" ".git/*" ".gitignore" ".vscode/*"

if [ $? -ne 0 ]; then
    echo "签名过程中出现错误，请检查上述输出信息。"
    exit 1
fi

# Package the extension files, ignoring more unnecessary files and directories
# zip -r "$OUTPUT_FILE" . -x "package.sh" "*.DS_Store" ".git/*" ".gitignore" ".vscode/*"

echo "The extension has been successfully packaged as $OUTPUT_FILE"