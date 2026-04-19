// extension/background.js
// Service worker – takes screenshots, uploads steps to the SnapGuide API.

'use strict';

const API_URL = 'http://localhost:5001'; // Change in production

// ── Listen for steps from content script ─────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'CAPTURE_STEP') {
    handleCaptureStep(msg).then(sendResponse).catch((err) => {
      console.error('[SnapGuide] capture step failed:', err.message);
      sendResponse({ ok: false, error: err.message });
    });
    return true; // keep channel open for async
  }
});

/**
 * Takes a screenshot of the active tab, uploads the step + screenshot to backend.
 */
async function handleCaptureStep(msg) {
  const { tutorialId, stepOrder, actionType, elementSelector,
          elementDescription, instruction, pageUrl, metadata } = msg;

  // Get auth token
  const { token } = await chrome.storage.local.get('token');
  if (!token) return { ok: false, error: 'Not authenticated' };
  if (!tutorialId) return { ok: false, error: 'No active tutorial' };

  // Take screenshot
  let screenshotUrl = '';
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    // Upload screenshot as base64
    const uploadRes = await fetch(`${API_URL}/api/assets/upload-base64`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ dataUrl, tutorial_id: tutorialId }),
    });

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      screenshotUrl = uploadData.asset?.url || '';
    }
  } catch (err) {
    console.warn('[SnapGuide] screenshot failed:', err.message);
  }

  // Create step via API
  const stepRes = await fetch(`${API_URL}/api/steps`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      tutorial_id:         tutorialId,
      order_index:         stepOrder,
      action_type:         actionType,
      element_selector:    elementSelector,
      element_description: elementDescription,
      instruction,
      page_url:            pageUrl,
      screenshot_url:      screenshotUrl,
      metadata:            JSON.stringify(metadata || {}),
    }),
  });

  if (!stepRes.ok) {
    const err = await stepRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create step');
  }

  const stepData = await stepRes.json();

  // Update badge with step count
  const { stepOrder: currentOrder = 0 } = await chrome.storage.local.get('stepOrder');
  chrome.action.setBadgeText({ text: String(currentOrder) });
  chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });

  return { ok: true, step: stepData.step };
}

// ── Auth helper ───────────────────────────────────────────────────────────
// Called from popup to verify credentials
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'LOGIN') {
    doLogin(msg.email, msg.password).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }

  if (msg.type === 'REGISTER') {
    doRegister(msg.email, msg.password, msg.name).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }

  if (msg.type === 'CREATE_TUTORIAL') {
    createTutorial(msg.title, msg.description).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }

  if (msg.type === 'STOP_AND_SAVE') {
    // Just clear state; steps are already saved in real-time
    chrome.storage.local.set({ isRecording: false, currentTutorialId: null, stepOrder: 0 });
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
  }
});

async function doLogin(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  await chrome.storage.local.set({ token: data.token, user: data.user });
  return { ok: true, user: data.user };
}

async function doRegister(email, password, name) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  await chrome.storage.local.set({ token: data.token, user: data.user });
  return { ok: true, user: data.user };
}

async function createTutorial(title, description) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/api/tutorials`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ title: title || 'Recorded Tutorial', description: description || '' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create tutorial');
  return { ok: true, tutorial: data.tutorial };
}
