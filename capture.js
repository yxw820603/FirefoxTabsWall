document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const photoWall = document.getElementById('photoWall');
    const groupFilter = document.getElementById('groupFilter');
    const keywordFilter = document.getElementById('keywordFilter');
    const applyFilterBtn = document.getElementById('applyFilter');

    let db;

    const dbRequest = indexedDB.open('TabsWallDB', 1);

    dbRequest.onsuccess = (event) => {
        db = event.target.result;

        const transaction = db.transaction(['hosts', 'tabInfo', 'urlKeywords'], 'readonly');
        const hostsStore = transaction.objectStore('hosts');
        const tabInfoStore = transaction.objectStore('tabInfo');
        const urlKeywordsStore = transaction.objectStore('urlKeywords');

        const hostsRequest = hostsStore.getAll();

        hostsRequest.onsuccess = () => {
            const hosts = hostsRequest.result;
            const hostGroups = {};

            hosts.forEach(host => {
                const hostName = host.host;
                const tabInfoRequest = tabInfoStore.index('host').getAll(hostName);
                tabInfoRequest.onsuccess = () => {
                    const tabs = tabInfoRequest.result;
                    hostGroups[hostName] = tabs;

                    renderPhotoWall(hostGroups);
                };
            });
        };

        applyFilterBtn.addEventListener('click', () => {
            const groupFilterValue = groupFilter.value;
            const keywordFilterValue = keywordFilter.value;
            const filteredHostGroups = {};

            for (const [host, tabs] of Object.entries(hostGroups)) {
                if (groupFilterValue &&!host.includes(groupFilterValue)) continue;

                const filteredTabs = tabs.filter(tab => {
                    const urlKeywordsRequest = urlKeywordsStore.index('url').get(tab.url);
                    urlKeywordsRequest.onsuccess = () => {
                        const keywords = urlKeywordsRequest.result?.keywords || [];
                        return keywordFilterValue? keywords.some(keyword => keyword.includes(keywordFilterValue)) : true;
                    };
                    return urlKeywordsRequest.result;
                });

                if (filteredTabs.length > 0) {
                    filteredHostGroups[host] = filteredTabs;
                }
            }

            renderPhotoWall(filteredHostGroups);
        });

        captureBtn.addEventListener('click', async () => {
            const tabs = await browser.tabs.query({});
            const currentExtensionUrl = browser.runtime.getURL('');

            for (const tab of tabs) {
                const url = tab.url;

                console.log("table url:",url);
                console.log("current extension url:",currentExtensionUrl);
                console.log("======");

                if (url.startsWith(currentExtensionUrl)) {
                    console.log("!!!!!!!!!!!!!!!!!!!");
                    continue;
                }

                const transaction = db.transaction(['tabInfo'], 'readonly');
                const tabInfoStore = transaction.objectStore('tabInfo');
                const index = tabInfoStore.index('url');
                const getRequest = index.get(url);

                await new Promise((resolve) => {
                    getRequest.onsuccess = () => {
                        const existingTab = getRequest.result;
                        if (existingTab && existingTab.screenshot) {
                            resolve();
                            return;
                        }

                        browser.runtime.sendMessage({ action: 'captureTabs', tabId: tab.id }).then((response) => {
                            if (response && response.dataUrl) {
                                // console.log('Screenshot captured:', response.dataUrl);
                                // 提取 host
                                const urlObj = new URL(url);
                                const host = urlObj.host;

                                // 检查 host 是否存在于 hosts 存储空间
                                const hostTransaction = db.transaction(['hosts'], 'readwrite');
                                const hostStore = hostTransaction.objectStore('hosts');
                                const hostIndex = hostStore.index('host');
                                const hostRequest = hostIndex.get(host);

                                hostRequest.onsuccess = () => {
                                    if (!hostRequest.result) {
                                        // host 不存在，新增
                                        hostStore.add({ host: host });
                                    }
                                };

                                // 保存数据到 tabInfo 存储空间
                                const tabInfoTransaction = db.transaction(['tabInfo'], 'readwrite');
                                const newTabInfoStore = tabInfoTransaction.objectStore('tabInfo');
                                const newTabInfo = {
                                    host: host,
                                    url: url,
                                    title: tab.title,
                                    screenshot: response.dataUrl
                                };
                                newTabInfoStore.add(newTabInfo);

                                tabInfoTransaction.oncomplete = () => {
                                    console.log('Data saved to tabInfo successfully');
                                };

                                tabInfoTransaction.onerror = () => {
                                    console.error('Error saving data to tabInfo:', tabInfoTransaction.error);
                                };
                            }
                        }).catch((error) => {
                            console.error('Error capturing screenshot:', error);
                        });
                        resolve();
                    };
                    getRequest.onerror = () => {
                        console.error('Error checking database:', getRequest.error);
                        resolve();
                    };
                });
            }
        });
    };

    function renderPhotoWall(hostGroups) {
        photoWall.innerHTML = '';

        for (const [host, tabs] of Object.entries(hostGroups)) {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group');

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = `${host} (${tabs.length})`;
            groupDiv.appendChild(groupTitle);

            tabs.forEach(tab => {
                const photoDiv = document.createElement('div');
                photoDiv.classList.add('photo');

                const img = document.createElement('img');
                img.src = tab.screenshot;
                photoDiv.appendChild(img);

                const title = document.createElement('p');
                title.textContent = tab.title;
                photoDiv.appendChild(title);

                const urlKeywordsRequest = indexedDB.open('TabsWallDB', 1).onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['urlKeywords'], 'readonly');
                    const urlKeywordsStore = transaction.objectStore('urlKeywords');
                    const request = urlKeywordsStore.index('url').get(tab.url);
                    request.onsuccess = () => {
                        const keywords = request.result?.keywords || [];
                        const keywordsP = document.createElement('p');
                        keywordsP.textContent = `Keywords: ${keywords.join(', ')}`;
                        photoDiv.appendChild(keywordsP);
                    };
                };

                groupDiv.appendChild(photoDiv);
            });

            photoWall.appendChild(groupDiv);
        }
    }
});
