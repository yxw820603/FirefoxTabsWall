function renderPhotoWall(hostGroups) {
    const photoWall = document.getElementById('photoWall');
    photoWall.innerHTML = '';

    const deleteCheckbox = document.getElementById('deleteOperation');
    const isDeleteMode = deleteCheckbox && deleteCheckbox.checked;

    for (const [host, tabs] of Object.entries(hostGroups)) {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('group');

        const groupTitle = document.createElement('h3');
        groupTitle.textContent = `${host} (${tabs.length})`;
        groupDiv.appendChild(groupTitle);

        tabs.forEach((tab) => {
            const photoDiv = document.createElement('div');
            photoDiv.classList.add('photo');
            photoDiv.style.border = '1px solid #ccc';
            photoDiv.style.padding = '5px';
            photoDiv.style.margin = '5px';
            photoDiv.style.width = '200px';
            photoDiv.style.cursor = 'pointer';

            const img = document.createElement('img');
            img.src = tab.screenshot;
            photoDiv.appendChild(img);

            const title = document.createElement('p');
            title.textContent = tab.title;
            title.style.whiteSpace = 'nowrap';
            title.style.overflow = 'hidden';
            title.style.textOverflow = 'ellipsis';
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

            photoDiv.addEventListener('click', () => {
                browser.tabs.create({ url: tab.url });
            });

            if (isDeleteMode) {
                const deleteIcon = document.createElement('span');
                deleteIcon.textContent = '×';
                deleteIcon.style.position = 'absolute';
                deleteIcon.style.top = '0';
                deleteIcon.style.right = '0';
                deleteIcon.style.color = 'red';
                deleteIcon.style.fontSize = '20px';
                deleteIcon.style.cursor = 'not-allowed';
                deleteIcon.addEventListener('mouseover', () => {
                    deleteIcon.style.cursor = 'pointer';
                });
                deleteIcon.addEventListener('mouseout', () => {
                    deleteIcon.style.cursor = 'not-allowed';
                });
                deleteIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const db = indexedDB.open('TabsWallDB', 1);
                    db.onsuccess = (event) => {
                        const dbInstance = event.target.result;
                        const transaction = dbInstance.transaction(['tabInfo'], 'readwrite');
                        const tabInfoStore = transaction.objectStore('tabInfo');
                        const index = tabInfoStore.index('url');
                        const getRequest = index.get(tab.url);
                        getRequest.onsuccess = () => {
                            const existingTab = getRequest.result;
                            if (existingTab) {
                                const deleteRequest = tabInfoStore.delete(existingTab.id);
                                deleteRequest.onsuccess = () => {
                                    console.log('Tab info deleted successfully');
                                    const hostsRequest = dbInstance.transaction(['hosts']).objectStore('hosts').getAll();
                                    hostsRequest.onsuccess = () => {
                                        const hosts = hostsRequest.result;
                                        const newHostGroups = {};
                                        hosts.forEach((host) => {
                                            const hostName = host.host;
                                            const tabInfoRequest = dbInstance.transaction(['tabInfo']).objectStore('tabInfo').index('host').getAll(hostName);
                                            tabInfoRequest.onsuccess = () => {
                                                const tabs = tabInfoRequest.result;
                                                newHostGroups[hostName] = tabs;
                                                renderPhotoWall(newHostGroups);
                                            };
                                        });
                                    };
                                };
                                deleteRequest.onerror = () => {
                                    console.error('Error deleting tab info:', deleteRequest.error);
                                };
                            }
                        };
                    };
                });
                photoDiv.style.position = 'relative';
                photoDiv.appendChild(deleteIcon);
            }

            groupDiv.appendChild(photoDiv);
        });

        photoWall.appendChild(groupDiv);
    }
}

// 添加一个函数来处理 checkbox 的变化
function handleShowFullTitleChange() {
    const showFullTitleCheckbox = document.getElementById('showFullTitle');
    const titles = document.querySelectorAll('.photo p:nth-child(2)');
    if (showFullTitleCheckbox.checked) {
        titles.forEach(title => {
            title.style.whiteSpace = 'normal';
            title.style.overflow = 'visible';
            title.style.textOverflow = 'clip';
        });
    } else {
        titles.forEach(title => {
            title.style.whiteSpace = 'nowrap';
            title.style.overflow = 'hidden';
            title.style.textOverflow = 'ellipsis';
        });
    }
}

// 添加一个函数来处理删除操作 checkbox 的变化
function handleDeleteOperationChange() {
    const hostsRequest = indexedDB.open('TabsWallDB', 1).onsuccess = (event) => {
        const db = event.target.result;
        const hostsTransaction = db.transaction(['hosts']);
        const hostsStore = hostsTransaction.objectStore('hosts');
        const hostsRequest = hostsStore.getAll();
        hostsRequest.onsuccess = () => {
            const hosts = hostsRequest.result;
            const hostGroups = {};
            hosts.forEach((host) => {
                const hostName = host.host;
                const tabInfoRequest = db.transaction(['tabInfo']).objectStore('tabInfo').index('host').getAll(hostName);
                tabInfoRequest.onsuccess = () => {
                    const tabs = tabInfoRequest.result;
                    hostGroups[hostName] = tabs;
                    renderPhotoWall(hostGroups);
                };
            });
        };
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const applyFilterBtn = document.getElementById('applyFilter');

    // 移除原有的 groupFilter 和 keywordFilter
    const groupFilter = document.getElementById('groupFilter');
    const keywordFilter = document.getElementById('keywordFilter');
    if (groupFilter) groupFilter.remove();
    if (keywordFilter) keywordFilter.remove();

    // 创建合并后的输入框
    const combinedFilter = document.createElement('input');
    combinedFilter.type = 'text';
    combinedFilter.id = 'combinedFilter';
    combinedFilter.placeholder = 'Filter by group, title or keyword';

    const container = document.createElement('div');
    container.appendChild(combinedFilter);
    container.appendChild(applyFilterBtn);

    // 添加显示完整标题的 checkbox
    const showFullTitleCheckbox = document.createElement('input');
    showFullTitleCheckbox.type = 'checkbox';
    showFullTitleCheckbox.id = 'showFullTitle';
    const showFullTitleLabel = document.createElement('label');
    showFullTitleLabel.textContent = '显示完整标题';
    showFullTitleLabel.htmlFor = 'showFullTitle';

    // 添加删除操作的 checkbox
    const deleteCheckbox = document.createElement('input');
    deleteCheckbox.type = 'checkbox';
    deleteCheckbox.id = 'deleteOperation';
    const deleteLabel = document.createElement('label');
    deleteLabel.textContent = '删除操作';
    deleteLabel.htmlFor = 'deleteOperation';

    const topContainer = document.createElement('div');
    topContainer.appendChild(showFullTitleCheckbox);
    topContainer.appendChild(showFullTitleLabel);
    topContainer.appendChild(deleteCheckbox);
    topContainer.appendChild(deleteLabel);
    topContainer.appendChild(container);

    document.body.insertBefore(topContainer, document.body.firstChild);

    showFullTitleCheckbox.addEventListener('change', handleShowFullTitleChange);
    deleteCheckbox.addEventListener('change', handleDeleteOperationChange);

    let db;
    let hostGroups = {}; // 将 hostGroups 提升到这里

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

            hosts.forEach((host) => {
                const hostName = host.host;
                const tabInfoRequest = tabInfoStore.index('host').getAll(hostName);
                tabInfoRequest.onsuccess = () => {
                    const tabs = tabInfoRequest.result;
                    hostGroups[hostName] = tabs;

                    renderPhotoWall(hostGroups);
                };
            });
        };

        applyFilterBtn.addEventListener('click', async () => {
            const filterValue = combinedFilter.value.trim();
            const filteredHostGroups = {};

            // 重新开启一个只读事务
            const transaction = db.transaction(['urlKeywords'], 'readonly');
            const urlKeywordsStore = transaction.objectStore('urlKeywords');

            for (const [host, tabs] of Object.entries(hostGroups)) {
                const filteredTabs = await Promise.all(tabs.map(async (tab) => {
                    return new Promise((resolve) => {
                        const urlKeywordsRequest = urlKeywordsStore.index('url').get(tab.url);
                        urlKeywordsRequest.onsuccess = () => {
                            const keywords = urlKeywordsRequest.result?.keywords || [];
                            const match = (
                                filterValue === '' ||
                                host.includes(filterValue) ||
                                tab.title.includes(filterValue) ||
                                keywords.some(keyword => keyword.includes(filterValue))
                            );
                            resolve(match ? tab : null);
                        };
                    });
                })).then(results => results.filter(tab => tab !== null));

                if (filteredTabs.length > 0) {
                    filteredHostGroups[host] = filteredTabs;
                }
            }

            renderPhotoWall(filteredHostGroups);
        });
        captureBtn.addEventListener('click', handleCaptureClick.bind({ db }));
    };
});

// Declare handleCaptureClick as an async function
async function handleCaptureClick() {
    const db = this.db; // Assume db is already defined in the outer scope
    const tabs = await browser.tabs.query({});
    const currentExtensionUrl = browser.runtime.getURL('');

    async function processTab(tab) {
        const url = tab.url;

        if (tab.pinned || url.startsWith(currentExtensionUrl)) {
            return;
        }

        const transaction = db.transaction(['tabInfo'], 'readonly');
        const tabInfoStore = transaction.objectStore('tabInfo');
        const index = tabInfoStore.index('url');
        const getRequest = index.get(url);

        await new Promise((resolve) => {
            function getRequestSuccess() {
                const existingTab = getRequest.result;
                if (existingTab && existingTab.screenshot) {
                    resolve();
                    return;
                }

                function captureSuccess(response) {
                    if (response && response.dataUrl) {
                        // console.log('Screenshot captured:', response.dataUrl);
                        const urlObj = new URL(url);
                        const host = urlObj.host;

                        const hostTransaction = db.transaction(['hosts'], 'readwrite');
                        const hostStore = hostTransaction.objectStore('hosts');
                        const hostIndex = hostStore.index('host');
                        const hostRequest = hostIndex.get(host);

                        hostRequest.onsuccess = () => {
                            if (!hostRequest.result) {
                                hostStore.add({ host: host });
                            }
                        };

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
                }

                function captureError(error) {
                    console.error('Error capturing screenshot:', error);
                }

                browser.runtime.sendMessage({ action: 'captureTabs', tabId: tab.id }).then(captureSuccess).catch(captureError);
                resolve();
            }

            function getRequestError() {
                console.error('Error checking database:', getRequest.error);
                resolve();
            }

            getRequest.onsuccess = getRequestSuccess;
            getRequest.onerror = getRequestError;
        });
    }

    for (const tab of tabs) {
        await processTab(tab);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
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

            hosts.forEach((host) => {
                const hostName = host.host;
                const tabInfoRequest = tabInfoStore.index('host').getAll(hostName);
                tabInfoRequest.onsuccess = () => {
                    const tabs = tabInfoRequest.result;
                    hostGroups[hostName] = tabs;

                    renderPhotoWall(hostGroups);
                };
            });
        };

        applyFilterBtn.addEventListener('click', handleApplyFilter);
        captureBtn.addEventListener('click', handleCaptureClick.bind({ db }));
    };
});
