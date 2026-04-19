// extension/popup/popup.js
// Controls all popup UI state and communicates with background.js

'use strict';

const FRONTEND_URL = 'http://localhost:3000'; // Change in production

// ── DOM references ──────────────────────────────────────────────────────────
const screenAuth      = document.getElementById('screen-auth');
const screenDashboard = document.getElementById('screen-dashboard');

const formLogin    = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const loginError   = document.getElementById('login-error');
const registerError= document.getElementById('register-error');

const tabs = document.querySelectorAll('.tab');

const userNameEl   = document.getElementById('user-name');
const btnLogout    = document.getElementById('btn-logout');

const stateIdle      = document.getElementById('state-idle');
const stateRecording = document.getElementById('state-recording');
const stateDone      = document.getElementById('state-done');

const tutorialTitleInput = document.getElementById('tutorial-title');
const tutorialDescInput  = document.getElementById('tutorial-desc');
const startError         = document.getElementById('start-error');

const btnStart    = document.getElementById('btn-start');
const btnStop     = document.getElementById('btn-stop');
const btnNew      = document.getElementById('btn-new');
const btnView     = document.getElementById('btn-view');

const recTitleEl  = document.getElementById('rec-title');
const stepCountEl = document.getElementById('step-count');
const doneStepsEl = document.getElementById('done-steps');

// ── Boot ────────────────────────────────────────────────────────────────────
chrome.storage.local.get(['token', 'user', 'isRecording', 'currentTutorialId', 'recordingTitle', 'stepOrder'], (data) => {
  if (data.token && data.user) {
    showDashboard(data.user, data);
  } else {
    showAuth();
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden'); }
function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function hideError(el) { el.classList.add('hidden'); }

function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : label;
}

function showAuth() {
  show(screenAuth);
  hide(screenDashboard);
}

function showDashboard(user, storageData = {}) {
  hide(screenAuth);
  show(screenDashboard);
  userNameEl.textContent = user.name || user.email;

  if (storageData.isRecording) {
    showRecordingState(storageData.recordingTitle || '…', storageData.stepOrder || 0);
  } else {
    showIdleState();
  }
}

function showIdleState() {
  show(stateIdle);
  hide(stateRecording);
  hide(stateDone);
}

function showRecordingState(title, count) {
  hide(stateIdle);
  show(stateRecording);
  hide(stateDone);
  recTitleEl.textContent  = title;
  stepCountEl.textContent = String(count || 0);
}

function showDoneState(tutorialId, stepCount) {
  hide(stateIdle);
  hide(stateRecording);
  show(stateDone);
  doneStepsEl.textContent = `${stepCount} step${stepCount !== 1 ? 's' : ''} recorded`;
  btnView.href = `${FRONTEND_URL}/tutorials/${tutorialId}`;
}

// ── Keep step count live while recording ─────────────────────────────────
setInterval(() => {
  chrome.storage.local.get(['isRecording', 'stepOrder'], (data) => {
    if (data.isRecording && stepCountEl) {
      stepCountEl.textContent = String(data.stepOrder || 0);
    }
  });
}, 1500);

// ── Tab switching ────────────────────────────────────────────────────────
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    formLogin.classList.toggle('active', target === 'login');
    formRegister.classList.toggle('active', target === 'register');
    hideError(loginError);
    hideError(registerError);
  });
});

// ── Login ────────────────────────────────────────────────────────────────
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(loginError);
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  const btn      = formLogin.querySelector('button[type=submit]');
  setLoading(btn, true, 'Sign In');

  chrome.runtime.sendMessage({ type: 'LOGIN', email, password }, (res) => {
    setLoading(btn, false, 'Sign In');
    if (res?.ok) {
      chrome.storage.local.get(['user'], (d) => showDashboard(d.user || res.user));
    } else {
      showError(loginError, res?.error || 'Login failed');
    }
  });
});

// ── Register ─────────────────────────────────────────────────────────────
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(registerError);
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value;
  const btn      = formRegister.querySelector('button[type=submit]');
  setLoading(btn, true, 'Create Account');

  chrome.runtime.sendMessage({ type: 'REGISTER', email, password, name }, (res) => {
    setLoading(btn, false, 'Create Account');
    if (res?.ok) {
      chrome.storage.local.get(['user'], (d) => showDashboard(d.user || res.user));
    } else {
      showError(registerError, res?.error || 'Registration failed');
    }
  });
});

// ── Logout ────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  chrome.storage.local.remove(['token', 'user', 'isRecording', 'currentTutorialId', 'stepOrder', 'recordingTitle'], () => {
    chrome.action.setBadgeText({ text: '' });
    showAuth();
  });
});

// ── Start Recording ───────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  hideError(startError);
  const title = tutorialTitleInput.value.trim() || `Recording ${new Date().toLocaleTimeString()}`;
  const desc  = tutorialDescInput.value.trim();

  setLoading(btnStart, true, 'Starting…');

  chrome.runtime.sendMessage({ type: 'CREATE_TUTORIAL', title, description: desc }, async (res) => {
    if (!res?.ok) {
      setLoading(btnStart, false, '⏺ Start Recording');
      showError(startError, res?.error || 'Failed to create tutorial');
      return;
    }

    const { tutorial } = res;

    await chrome.storage.local.set({
      isRecording:       true,
      currentTutorialId: tutorial.id,
      recordingTitle:    tutorial.title,
      stepOrder:         0,
    });

    // Notify content script in active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type:      'START_RECORDING',
        tutorialId: tutorial.id,
        stepOrder:  0,
      }).catch(() => {}); // Tab may not have content script (e.g. chrome:// pages)
    }

    setLoading(btnStart, false, '⏺ Start Recording');
    showRecordingState(tutorial.title, 0);
  });
});

// ── Stop Recording ────────────────────────────────────────────────────────
btnStop.addEventListener('click', async () => {
  setLoading(btnStop, true, 'Stopping…');

  const { currentTutorialId, stepOrder = 0 } = await chrome.storage.local.get(['currentTutorialId', 'stepOrder']);

  // Notify content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' }).catch(() => {});
  }

  chrome.runtime.sendMessage({ type: 'STOP_AND_SAVE' }, () => {
    setLoading(btnStop, false, '⏹ Stop Recording');
    showDoneState(currentTutorialId, stepOrder);
  });
});

// ── Record Another ────────────────────────────────────────────────────────
btnNew.addEventListener('click', () => {
  tutorialTitleInput.value = '';
  tutorialDescInput.value  = '';
  showIdleState();
});
