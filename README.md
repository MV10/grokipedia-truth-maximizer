# Grokipedia Truth Maximizer <img src="https://github.com/MV10/grokipedia-truth-maximizer/blob/master/extension/icons/icon32.png" height="32px"/>

A very lightweight Chromium browser extension which finds matching [Grokipedia](https://grokipedia.com) pages when you're viewing Wikipedia.

* Displays a banner with the Grokipedia link.
* Does not interfere with the Wikipedia content.
* Ignores non-article pages (home page, editing, etc.)
* Correctly recognizes `#` anchor-tag navigation and retains if available.
* Right-click the toolbar icon to toggle automatic navigation.
* Probably only works with the English-language sites.
* Requires a Grokipedia account (likely your X.com account).

This does not store, require, or forward any personal data or similar sensitive information.

Elon has clearly stated his goal for Grok is to "maximize truth-seeking", and that mission-statement extends to Grokipedia. Meanwhile, Wikipedia has gained a reputation for gatekeeping an _opinionated_ view of the truth. Because Grokipedia is so new, article availability is hit-or-miss, plus many sources still tend to use Wikipedia by default. I found myself wishing for a way to check Grokipedia first -- then decided to do something about it.

Pull-requests are welcome.

> As of Feb-21-2026 the extension has been submitted for review. If you want to sideload it, clone the repository, go to your browser's Extensions page, activate "Developer mode", click "Load unpacked" and choose the `extensions` directory in your local copy of the repository.

## Similar Extensions

* [Grokify](https://github.com/shanev/grokify)
* [Grokiphile](https://github.com/qKitNp/grokiphile)

## TODO List

* A future release may allow you to submit a Grokipedia content-request if there is no match for the Wikipedia article you're viewing. This is difficult because the Grokipedia submission shows a script-based dialog.

* Currently matching is pretty basic: it strictly looks for the same content URL, it doesn't actually perform a search. At the moment this seems to work well, but it seems likely this will fail more often as new/custom Grokipedia content diverges from its origins as a partial Wikipedia clone. At that point I may add OpenAI API support to allow the user to request a search of Grokipedia for matching content recommendations. 

* Hit me up in the Issues if you have other requests or ideas.
