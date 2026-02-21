'use strict';

const MENU_ID = 'toggleAutoNavigate';
const GROKIPEDIA_BASE = 'https://grokipedia.com/page/';

// Helpers

async function getAutoNavigate() {
  const { autoNavigate = false } = await chrome.storage.local.get('autoNavigate');
  return autoNavigate;
}

function menuTitle(on) {
  return `Auto-navigate to Grokipedia: ${on ? 'ON ✓' : 'OFF'}`;
}

// Lifecycle

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ autoNavigate: false });

  // Remove any stale menu items from previous installs before creating.
  try { chrome.contextMenus.remove(MENU_ID, () => chrome.runtime.lastError); } catch (_) {}

  chrome.contextMenus.create({
    id: MENU_ID,
    title: menuTitle(false),
    contexts: ['action'],
  });
});

// Sync menu label after browser restart (service worker recreated, menu persists).
chrome.runtime.onStartup.addListener(async () => {
  const on = await getAutoNavigate();
  chrome.contextMenus.update(MENU_ID, { title: menuTitle(on) });
});

// Auto-nav context-menu toggle

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) return;
  const was = await getAutoNavigate();
  const now = !was;
  await chrome.storage.local.set({ autoNavigate: now });
  chrome.contextMenus.update(MENU_ID, { title: menuTitle(now) });
});

// Grokipedia existence check
//
// Wikipedia article titles use underscores for spaces; Grokipedia does the
// same, so we can pass the raw path segment directly.
//
// Possible return statuses:
//   'found'         – article confirmed to exist
//   'not_found'     – article confirmed to be absent
//   'login_required'– redirected to auth wall; existence unknown
//   'error'         – network or other failure

// Escape a string for use inside a RegExp literal.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Return url with #anchor appended when the fetched HTML contains a matching
// id="…" attribute, otherwise return url unchanged.
function resolveAnchor(html, baseUrl, anchor) {
  if (!anchor) return baseUrl;
  const pattern = new RegExp(`id=["']${escapeRegex(anchor)}["']`, 'i');
  return pattern.test(html) ? `${baseUrl}#${anchor}` : baseUrl;
}

async function checkGrokipedia(articleTitle, anchor) {
  const url = GROKIPEDIA_BASE + articleTitle;

  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include', // send Grokipedia session cookie if the user is logged in
      redirect: 'follow',
    });

    // If we were redirected away from the expected article URL, the user needs
    // to authenticate.  Detect common auth-redirect patterns.
    const landed = res.url;
    const isAuthRedirect =
      landed !== url &&
      (landed.includes('/login') ||
        landed.includes('/signin') ||
        landed.includes('/auth') ||
        landed.includes('/account') ||
        !landed.startsWith(GROKIPEDIA_BASE));

    if (isAuthRedirect) {
      // Cannot verify anchor existence without fetching the page; include it
      // optimistically — worst case the user lands at the top of the article.
      return { status: 'login_required', url: anchor ? `${url}#${anchor}` : url };
    }

    if (!res.ok) {
      return { status: 'not_found', url };
    }

    const html = await res.text();
    const lower = html.toLowerCase();

    // Grokipedia displays "This page doesn't exist… yet." for missing articles.
    if (lower.includes("doesn't exist") || lower.includes("does not exist")) {
      return { status: 'not_found', url };
    }

    return { status: 'found', url: resolveAnchor(html, url, anchor) };
  } catch (err) {
    return { status: 'error', url, error: err.message };
  }
}

// Message bus

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CHECK_GROKIPEDIA') {
    (async () => {
      const result = await checkGrokipedia(msg.articleTitle, msg.anchor);

      // If the article was confirmed to exist, honour the auto-navigate toggle.
      if (result.status === 'found' && sender.tab?.id != null) {
        const on = await getAutoNavigate();
        if (on) {
          chrome.tabs.update(sender.tab.id, { url: result.url });
          // Let the content script know we navigated so it can skip the banner.
          sendResponse({ ...result, navigated: true });
          return;
        }
      }

      sendResponse({ ...result, navigated: false });
    })();
    return true; // keep message channel open for async sendResponse
  }
});
