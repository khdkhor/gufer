/**
 * GUFER — Phase 3 behaviour
 *
 * 1. Persian / English language switching, driven by the existing
 *    data-i18n / data-en / data-en-* attributes in index.html.
 * 2. Mobile navigation toggle (drives the aria-expanded state the CSS reads).
 *
 * Internal anchors and Google Maps / phone / social links are plain HTML and
 * need no JavaScript. Smooth scrolling is handled by the CSS.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Language switching
   * ------------------------------------------------------------------ */

  const DEFAULT_LANGUAGE = 'fa';
  const STORAGE_KEY = 'gufer-language';

  const LANGUAGES = {
    fa: { lang: 'fa', dir: 'rtl' },
    en: { lang: 'en', dir: 'ltr' },
  };

  // English lives in data-en-<attribute>; the Persian value is the attribute itself.
  const TRANSLATABLE_ATTRIBUTES = [
    { englishSource: 'data-en-alt', target: 'alt' },
    { englishSource: 'data-en-aria-label', target: 'aria-label' },
    { englishSource: 'data-en-content', target: 'content' },
  ];

  const isSupportedLanguage = (value) =>
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(LANGUAGES, value);

  const readSavedLanguage = () => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return isSupportedLanguage(saved) ? saved : null;
    } catch (error) {
      return null; // storage blocked or unavailable
    }
  };

  const saveLanguage = (code) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch (error) {
      // Non-fatal: the choice simply won't persist.
    }
  };

  /**
   * Collect every translatable text node and attribute once, remembering the
   * original (Persian) value so switching back never depends on a second copy
   * of the content.
   */
  const collectTranslatables = () => {
    const textItems = [];
    document.querySelectorAll('[data-i18n][data-en]').forEach((element) => {
      textItems.push({
        element,
        persian: element.textContent,
        english: element.getAttribute('data-en'),
      });
    });

    const attributeItems = [];
    const selector = TRANSLATABLE_ATTRIBUTES
      .map(({ englishSource }) => `[${englishSource}]`)
      .join(',');
    document.querySelectorAll(selector).forEach((element) => {
      TRANSLATABLE_ATTRIBUTES.forEach(({ englishSource, target }) => {
        if (!element.hasAttribute(englishSource)) return;
        attributeItems.push({
          element,
          target,
          persian: element.getAttribute(target),
          english: element.getAttribute(englishSource),
        });
      });
    });

    return { textItems, attributeItems };
  };

  const initLanguageSwitcher = () => {
    const buttons = Array.from(
      document.querySelectorAll('.language-switcher__button[data-lang]')
    ).filter((button) => isSupportedLanguage(button.dataset.lang));

    if (buttons.length === 0) return;

    const root = document.documentElement;
    const { textItems, attributeItems } = collectTranslatables();
    let currentLanguage = null;

    const syncDocumentState = (code) => {
      root.lang = LANGUAGES[code].lang;
      root.dir = LANGUAGES[code].dir;
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.lang === code));
      });
    };

    const translateContent = (code) => {
      const useEnglish = code === 'en';
      textItems.forEach(({ element, persian, english }) => {
        element.textContent = useEnglish ? english : persian;
      });
      attributeItems.forEach(({ element, target, persian, english }) => {
        element.setAttribute(target, useEnglish ? english : persian);
      });
    };

    const setLanguage = (code) => {
      if (!isSupportedLanguage(code) || code === currentLanguage) return;
      const isInitialDefault = currentLanguage === null && code === DEFAULT_LANGUAGE;
      currentLanguage = code;
      syncDocumentState(code);
      // The markup is already Persian, so there is nothing to rewrite on a default load.
      if (!isInitialDefault) translateContent(code);
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const code = button.dataset.lang;
        if (code === currentLanguage) return;
        setLanguage(code);
        saveLanguage(code);
      });
    });

    setLanguage(readSavedLanguage() || DEFAULT_LANGUAGE);
  };

  /* ------------------------------------------------------------------ *
   * Mobile navigation
   * ------------------------------------------------------------------ */

  // Must match the CSS breakpoint where the toggle is hidden (min-width: 62rem).
  const DESKTOP_QUERY = '(min-width: 62rem)';

  const initMobileNavigation = () => {
    const toggle = document.querySelector('.nav-toggle');
    if (!toggle) return;

    const navigation = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!navigation) return;

    const header = toggle.closest('.site-header') || navigation.parentElement;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => toggle.setAttribute('aria-expanded', String(open));

    toggle.addEventListener('click', (event) => {
      const opening = !isOpen();
      setOpen(opening);

      // In the markup the toggle comes after the nav, so Tab from the toggle would
      // skip the links. When opened from the keyboard (click detail is 0), move
      // focus to the first link instead. Pointer and touch opens are unaffected.
      if (opening && event.detail === 0) {
        const firstLink = navigation.querySelector('a[href]');
        if (firstLink) firstLink.focus();
      }
    });

    // Selecting a link closes the panel; the browser still performs the anchor jump.
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a') && isOpen()) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !isOpen()) return;
      const focusWasInHeader = header.contains(document.activeElement);
      setOpen(false);
      // The panel is hidden by CSS once closed, so hand focus back to the toggle.
      if (focusWasInHeader) toggle.focus();
    });

    const desktop = window.matchMedia(DESKTOP_QUERY);
    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  };

  /* ------------------------------------------------------------------ */

  initLanguageSwitcher();
  initMobileNavigation();
})();
