import { formatMap } from './modules/cookie_format.mjs';
import getAllCookies from './modules/get_all_cookies.mjs';
import saveToFile from './modules/save_to_file.mjs';

/**
 * Update icon badge counter on active page
 */
const updateBadgeCounter = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    return;
  }
  const { id: tabId, url: urlString } = tab;
  if (!urlString) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }
  const url = new URL(urlString);
  const cookies = await getAllCookies({
    url: url.href,
    partitionKey: { topLevelSite: url.origin },
  });
  const text = cookies.length.toFixed();
  chrome.action.setBadgeText({ tabId, text });
};

chrome.cookies.onChanged.addListener(updateBadgeCounter);
chrome.tabs.onUpdated.addListener(updateBadgeCounter);
chrome.tabs.onActivated.addListener(updateBadgeCounter);
chrome.windows.onFocusChanged.addListener(updateBadgeCounter);

// This function will be called by the context menu
async function exportCookiesForTab() {
  try {
    console.log('Context menu export initiated.');
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab) {
      console.error('Could not find an active tab.');
      return;
    }

    console.log('Exporting for tab:', activeTab.url);

    // To prevent errors on special pages like chrome://extensions
    if (!activeTab.url || !activeTab.url.startsWith('http')) {
      console.warn(
        'Cannot export cookies for this page (not an http/https URL):',
        activeTab.url,
      );
      return;
    }

    const url = new URL(activeTab.url);
    const details = {
      url: url.href,
      partitionKey: { topLevelSite: url.origin },
    };

    console.log('Getting cookies with details:', details);
    const cookies = await getAllCookies(details);
    console.log(`Found ${cookies.length} cookies.`);

    const format = formatMap.json; // Hardcode to JSON as requested
    const text = format.serializer(cookies);
    console.log('Serialized cookies to JSON text.');

    const filename = `${url.hostname}_cookies`;
    console.log(`Saving to file: ${filename}.${format.ext}`);
    await saveToFile(text, filename, format, false);
    console.log('File save process initiated successfully.');
  } catch (error) {
    console.error('Error during context menu export:', error);
  }
}

// Update notification & Create context menu
chrome.runtime.onInstalled.addListener(({ previousVersion, reason }) => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'export-cookies-ctx-menu',
    title: 'Exporter les cookies (.JSON)',
    contexts: ['page'],
  });

  if (reason === 'update') {
    const currentVersion = chrome.runtime.getManifest().version;
    chrome.notifications.create('updated', {
      type: 'basic',
      title: 'Get cookies.txt LOCALLY',
      message: `Updated from ${previousVersion} to ${currentVersion}`,
      iconUrl: '/images/icon128.png',
      buttons: [{ title: 'Github Releases' }, { title: 'Uninstall' }],
    });
  }
});

// Listener for context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'export-cookies-ctx-menu') {
    exportCookiesForTab();
  }
});

// Update notification's button handler
chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    console.log(notificationId, buttonIndex);
    if (notificationId === 'updated') {
      switch (buttonIndex) {
        case 0:
          chrome.tabs.create({
            url: 'https://github.com/kairi003/Get-cookies.txt-LOCALLY/releases',
          });
          break;
        case 1:
          chrome.management.uninstallSelf({ showConfirmDialog: true });
          break;
      }
    }
  },
);

// TODO: use offscreen API to integrate implementation in chrome and firefox
// Save file message listener for firefox
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const { type, target, data } = message || {};
  if (target !== 'background') return;
  if (type === 'save') {
    const { text, name, format, saveAs } = data || {};
    await saveToFile(text, name, format, saveAs);
    sendResponse('done');
    return true;
  }
  return true;
});
