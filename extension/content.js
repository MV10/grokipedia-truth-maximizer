'use strict';

// Wikipedia URI filter
// Only run on genuine encyclopedia articles; skip the main page, talk pages,
// special pages, and every other named namespace.

const IGNORED_PREFIXES = [
  'Special:',
  'Wikipedia:',
  'Help:',
  'Talk:',
  'User:',
  'User_talk:',
  'File:',
  'Image:',
  'Category:',
  'Template:',
  'Template_talk:',
  'Portal:',
  'Module:',
  'Module_talk:',
  'MOS:',
  'Draft:',
  'Book:',
  'TimedText:',
  'MediaWiki:',
  'MediaWiki_talk:',
];

function isContentPage() {
  // Strip any hash before namespace/title checks so that anchored URLs such as
  // /wiki/Diplomacy_(game)#Postal_and_email_play are treated identically to
  // /wiki/Diplomacy_(game).  location.pathname already excludes the fragment,
  // but we strip explicitly here as a defensive measure.
  const rawTitle = decodeURIComponent(
    location.pathname.replace(/^\/wiki\//, '')
  ).split('#')[0];
  if (!rawTitle || rawTitle === 'Main_Page') return false;
  return !IGNORED_PREFIXES.some((prefix) => rawTitle.startsWith(prefix));
}

if (!isContentPage()) {
  // Nothing to do — exit silently without throwing to keep the console clean.
  // (The content script still loads because the manifest match pattern is broad.)
} else {
  // Strip any hash so that /wiki/Foo#Section looks up "Foo", not "Foo#Section".
  const articleTitle = location.pathname.replace(/^\/wiki\//, '').split('#')[0];
  // location.hash is "" when absent, or "#Section" when present; strip the "#".
  const anchor = location.hash.slice(1);

  chrome.runtime.sendMessage(
    { type: 'CHECK_GROKIPEDIA', articleTitle, anchor },
    (result) => {
      if (chrome.runtime.lastError) return; // extension context invalidated
      if (!result) return;

      // Do not show the banner when auto-navigation has already fired — the
      // tab is being redirected and the banner would flash needlessly.
      if (result.navigated) return;

      if (result.status === 'found' || result.status === 'login_required') {
        showBanner(result.url, result.status === 'login_required');
      }
    }
  );
}

// Banner

function showBanner(grokUrl, loginRequired) {
  if (document.getElementById('grokipedia-banner')) return;

  const loginNote = loginRequired
    ? ' <span class="groki-note">(log in to Grokipedia to confirm)</span>'
    : '';

  const banner = document.createElement('div');
  banner.id = 'grokipedia-banner';
  banner.setAttribute('role', 'complementary');
  banner.setAttribute('aria-label', 'Grokipedia article available');

  banner.innerHTML = `
    <div class="groki-inner">
      <img class="groki-icon"
           src="${chrome.runtime.getURL('icons/icon48.png')}"
           alt="Grokipedia" width="24" height="24">
      <p class="groki-msg">
        This Wikipedia article has a counterpart on
        <a class="groki-link"
           href="${grokUrl}">Grokipedia</a>${loginNote}.
      </p>
      <button class="groki-close" aria-label="Dismiss banner" title="Dismiss">&#x2715;</button>
    </div>
  `;

  // Prepend to <body> before measuring height so layout is available.
  document.body.insertAdjacentElement('afterbegin', banner);

  // Push page content down so the fixed banner doesn't obscure it.
  const height = banner.getBoundingClientRect().height;
  document.body.style.marginTop = `${height}px`;

  banner.querySelector('.groki-close').addEventListener('click', () => {
    document.body.style.marginTop = '';
    banner.style.transition = 'opacity 0.2s ease, max-height 0.25s ease';
    banner.style.opacity = '0';
    banner.style.maxHeight = '0';
    banner.style.overflow = 'hidden';
    setTimeout(() => banner.remove(), 260);
  });
}
