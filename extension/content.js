// extension/content.js
// Injected into every page. Captures user interactions and sends them to the background worker.

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────────
  let isRecording = false;
  let currentTutorialId = null;
  let stepOrder = 0;
  const EXTENSION_CLASS = 'snapguide-highlight';
  const INDICATOR_ID    = 'snapguide-recording-indicator';

  // ── Boot: sync recording state from storage ───────────────────────────────
  chrome.storage.local.get(['isRecording', 'currentTutorialId', 'stepOrder'], (data) => {
    if (data.isRecording) {
      isRecording       = true;
      currentTutorialId = data.currentTutorialId;
      stepOrder         = data.stepOrder || 0;
      showRecordingIndicator();
    }
  });

  // ── Listen for messages from popup / background ──────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'START_RECORDING') {
      isRecording       = true;
      currentTutorialId = msg.tutorialId;
      stepOrder         = msg.stepOrder || 0;
      showRecordingIndicator();
      sendResponse({ ok: true });
    } else if (msg.type === 'STOP_RECORDING') {
      isRecording       = false;
      currentTutorialId = null;
      hideRecordingIndicator();
      sendResponse({ ok: true });
    } else if (msg.type === 'PING') {
      sendResponse({ isRecording, currentTutorialId, stepOrder });
    }
  });

  // ── Click listener ──────────────────────────────────────────────────────
  document.addEventListener('click', handleClick, true);

  function handleClick(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target || target.id === INDICATOR_ID || target.closest(`#${INDICATOR_ID}`)) return;
    // Ignore snapguide injected elements
    if (target.closest('[data-snapguide]')) return;

    const actionData = {
      actionType:        'click',
      elementSelector:   generateSelector(target),
      elementDescription: describeElement(target),
      instruction:       generateInstruction(target, 'click', ''),
      pageUrl:           window.location.href,
      metadata:          {
        tagName:   target.tagName,
        text:      (target.textContent || '').trim().slice(0, 100),
        href:      target.getAttribute('href') || '',
        className: target.className || '',
      },
    };

    highlightElement(target);
    sendAction(actionData);
  }

  // ── Input listener (fires on blur for better UX) ────────────────────────
  document.addEventListener('focusout', handleInput, true);

  function handleInput(e) {
    if (!isRecording) return;
    const target = e.target;
    if (!target) return;
    const tag = target.tagName?.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;
    if (target.closest('[data-snapguide]')) return;

    const isPassword = target.type === 'password';
    const value      = isPassword ? '••••••' : (target.value || '');

    const actionData = {
      actionType:         'input',
      elementSelector:    generateSelector(target),
      elementDescription: describeElement(target),
      instruction:        generateInstruction(target, 'input', value),
      pageUrl:            window.location.href,
      metadata: {
        tagName:     tag,
        inputType:   target.type || 'text',
        placeholder: target.placeholder || '',
        name:        target.name || '',
        value:       isPassword ? '' : value, // never store raw password
      },
    };

    sendAction(actionData);
  }

  // ── Navigation listener ────────────────────────────────────────────────
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (!isRecording) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const actionData = {
        actionType:         'navigate',
        elementSelector:    '',
        elementDescription: 'Page navigation',
        instruction:        `Navigate to ${window.location.href}`,
        pageUrl:            window.location.href,
        metadata:           { url: window.location.href },
      };
      sendAction(actionData);
    }
  });

  observer.observe(document, { subtree: true, childList: true });

  // ── Send action to background worker ─────────────────────────────────────
  function sendAction(actionData) {
    stepOrder++;
    chrome.storage.local.set({ stepOrder });
    chrome.runtime.sendMessage({
      type:      'CAPTURE_STEP',
      tutorialId: currentTutorialId,
      stepOrder,
      ...actionData,
    });
  }

  // ── Visual highlight injected before screenshot ───────────────────────────
  function highlightElement(el) {
    const existing = document.querySelector(`.${EXTENSION_CLASS}`);
    if (existing) existing.classList.remove(EXTENSION_CLASS);

    if (!document.getElementById('snapguide-style')) {
      const style = document.createElement('style');
      style.id = 'snapguide-style';
      style.textContent = `
        .${EXTENSION_CLASS} {
          outline: 3px solid #4F46E5 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 6px rgba(79,70,229,0.18) !important;
          border-radius: 4px !important;
          transition: outline 0.1s ease !important;
        }
      `;
      document.head.appendChild(style);
    }

    el.classList.add(EXTENSION_CLASS);
    // Remove highlight after screenshot is taken (background will notify via message)
    setTimeout(() => el.classList.remove(EXTENSION_CLASS), 1500);
  }

  // ── Recording indicator banner ────────────────────────────────────────────
  function showRecordingIndicator() {
    if (document.getElementById(INDICATOR_ID)) return;

    const div = document.createElement('div');
    div.id = INDICATOR_ID;
    div.setAttribute('data-snapguide', 'true');
    div.innerHTML = `
      <span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;margin-right:8px;animation:snapguide-pulse 1.2s infinite;"></span>
      SnapGuide Recording…
      <style>
        @keyframes snapguide-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(0.85); }
        }
      </style>
    `;
    Object.assign(div.style, {
      position:   'fixed',
      top:        '12px',
      right:      '12px',
      zIndex:     '2147483647',
      background: '#1e1b4b',
      color:      'white',
      padding:    '8px 16px',
      borderRadius: '999px',
      fontSize:   '13px',
      fontFamily: 'system-ui, sans-serif',
      display:    'flex',
      alignItems: 'center',
      boxShadow:  '0 4px 14px rgba(0,0,0,0.25)',
      pointerEvents: 'none',
    });
    document.documentElement.appendChild(div);
  }

  function hideRecordingIndicator() {
    const el = document.getElementById(INDICATOR_ID);
    if (el) el.remove();
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  /**
   * Generates a short CSS selector for an element.
   * Priority: #id > [data-testid] > aria-label > tag.class[:nth-child]
   */
  function generateSelector(el) {
    if (!el || el === document.body) return 'body';

    // ID
    if (el.id && /^[a-z_][\w-]*$/i.test(el.id)) return `#${el.id}`;

    // data-testid
    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;

    // Build tag + classes
    let sel = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/)
        .filter(c => c && !c.startsWith('snapguide'))
        .slice(0, 2)
        .map(c => `.${c}`)
        .join('');
      sel += classes;
    }

    // Add :nth-child if there are siblings
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el) + 1;
        sel += `:nth-of-type(${idx})`;
      }
    }

    return sel;
  }

  /**
   * Returns the best human-readable name for an element.
   */
  function describeElement(el) {
    return (
      el.getAttribute('aria-label')     ||
      el.getAttribute('title')          ||
      el.getAttribute('placeholder')    ||
      el.getAttribute('name')           ||
      el.getAttribute('alt')            ||
      (el.textContent || '').trim().slice(0, 60) ||
      el.tagName.toLowerCase()
    );
  }

  /**
   * Generates a human-readable instruction string for a step.
   */
  function generateInstruction(el, actionType, value) {
    const tag  = el.tagName?.toLowerCase() || '';
    const name = describeElement(el) || tag;
    const role = el.getAttribute('role') || '';

    switch (actionType) {
      case 'click': {
        if (tag === 'button' || role === 'button' || el.type === 'submit' || el.type === 'button') {
          return `Click the "${name}" button`;
        }
        if (tag === 'a') return `Click the "${name}" link`;
        if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) {
          return `Select the "${name}" option`;
        }
        if (role === 'tab') return `Click the "${name}" tab`;
        if (role === 'menuitem') return `Click the "${name}" menu item`;
        return `Click on "${name}"`;
      }
      case 'input': {
        if (el.type === 'password') return `Enter your password in the "${name}" field`;
        if (el.type === 'email')    return `Enter your email in the "${name}" field`;
        if (el.tagName?.toLowerCase() === 'select') return `Select "${value}" from the "${name}" dropdown`;
        return value ? `Type "${value}" in the "${name}" field` : `Click the "${name}" field`;
      }
      case 'navigate':
        return `Navigate to ${value}`;
      default:
        return `Interact with "${name}"`;
    }
  }
})();
