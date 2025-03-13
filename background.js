function initializeDatabase() {
    const request = indexedDB.open('TabsWallDB', 1);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 创建第一个对象存储空间，包含 host, url, title, screenshot 字段
        if (!db.objectStoreNames.contains('tabInfo')) {
            const tabInfoStore = db.createObjectStore('tabInfo', { keyPath: 'id', autoIncrement: true });
            tabInfoStore.createIndex('host', 'host', { unique: false });
            tabInfoStore.createIndex('url', 'url', { unique: true });
            tabInfoStore.createIndex('title', 'title', { unique: false });
            tabInfoStore.createIndex('screenshot', 'screenshot', { unique: false });
        }
        // 创建第二个对象存储空间，只有一列数据叫 host
        if (!db.objectStoreNames.contains('hosts')) {
            db.createObjectStore('hosts', { keyPath: 'id', autoIncrement: true }).createIndex('host', 'host', { unique: true });
        }
        // 创建第三个对象存储空间，包含 url, keywords 字段
        if (!db.objectStoreNames.contains('urlKeywords')) {
            const urlKeywordsStore = db.createObjectStore('urlKeywords', { keyPath: 'id', autoIncrement: true });
            urlKeywordsStore.createIndex('url', 'url', { unique: true });
            urlKeywordsStore.createIndex('keywords', 'keywords', { unique: false });
        }
    };

    request.onsuccess = () => {
        console.log('Database initialized successfully');
    };

    request.onerror = (event) => {
        console.error('Database initialization failed:', event.target.error);
    };
}

// 监听插件安装和更新事件
browser.runtime.onInstalled.addListener(initializeDatabase);

// 监听浏览器启动事件
browser.runtime.onStartup.addListener(initializeDatabase);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'captureTabs' && message.tabId) {
        browser.tabs.captureTab(message.tabId).then((dataUrl) => {
            console.log('Screenshot captured:', dataUrl);
            sendResponse({ dataUrl: dataUrl });
        }).catch((error) => {
            console.error('Error capturing screenshot:', error);
        });
        return true; // Keep the message channel open for sendResponse
    }
});

browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({
        url: browser.runtime.getURL('capture.html')
    });
});