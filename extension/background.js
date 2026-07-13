// Leads Hunter — Service Worker
// Orquestra: painel -> abre WhatsApp -> aguarda envio -> fecha aba -> avisa painel.

const state = {
  panelTabId: null,
  waTabId: null,
  currentUrl: null,
  timeoutId: null,
  closingByCommand: false,
};

const HARD_TIMEOUT_MS = 45000; // dá tempo do WhatsApp Web carregar sem travar o fluxo

function clearWatchdog() {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }
}

async function closeWaTab() {
  clearWatchdog();
  if (state.waTabId != null) {
    try {
      state.closingByCommand = true;
      await chrome.tabs.remove(state.waTabId);
    } catch (_) {}
    state.waTabId = null;
  }
}

async function tabExists(tabId) {
  if (tabId == null) return false;
  try { await chrome.tabs.get(tabId); return true; } catch (_) { return false; }
}

async function openOrReuseWhatsApp(url) {
  if (await tabExists(state.waTabId)) {
    const tab = await chrome.tabs.update(state.waTabId, { url, active: true });
    return tab;
  }

  const tab = await chrome.tabs.create({ url, active: true });
  state.waTabId = tab.id;
  return tab;
}

async function notifyPanel(payload) {
  if (state.panelTabId == null) return;
  try {
    await chrome.tabs.update(state.panelTabId, { active: true });
    await chrome.tabs.sendMessage(state.panelTabId, payload);
  } catch (e) {
    console.warn("[LH bg] falha ao notificar painel", e);
  }
}

async function finish(status) {
  clearWatchdog();
  await notifyPanel({ type: "PODE_IR_PRO_PROXIMO", status, url: state.currentUrl });
  state.currentUrl = null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.type) return;

      if (msg.type === "ABRIR_WHATSAPP") {
        state.panelTabId = sender.tab?.id ?? state.panelTabId;
        state.currentUrl = msg.url;

        const tab = await openOrReuseWhatsApp(msg.url);
        state.waTabId = tab.id;

        clearWatchdog();
        state.timeoutId = setTimeout(() => {
          console.warn("[LH bg] timeout — pulando lead", state.currentUrl);
          finish("timeout");
        }, HARD_TIMEOUT_MS);

        sendResponse({ ok: true, waTabId: state.waTabId });
        return;
      }

      if (msg.type === "MENSAGEM_ENVIADA" || msg.type === "ERRO") {
        if (sender.tab?.id !== state.waTabId) return;
        const status = msg.type === "MENSAGEM_ENVIADA" ? "sent" : "error";
        await finish(status);
        sendResponse({ ok: true });
        return;
      }

      if (msg.type === "PANEL_HELLO") {
        state.panelTabId = sender.tab?.id ?? null;
        sendResponse({ ok: true, panelTabId: state.panelTabId, waTabId: state.waTabId });
        return;
      }

      if (msg.type === "ENCERRAR_ROBO") {
        clearWatchdog();
        if (msg.close) await closeWaTab();
        sendResponse({ ok: true });
        return;
      }
    } catch (e) {
      console.warn("[LH bg] erro no fluxo", e);
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // async sendResponse
});

// se usuário fechar a aba do WA manualmente, libera o robô sem travar
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.waTabId) {
    state.waTabId = null;
    clearWatchdog();
    if (!state.closingByCommand) {
      notifyPanel({ type: "PODE_IR_PRO_PROXIMO", status: "closed", url: state.currentUrl });
    }
    state.closingByCommand = false;
    state.currentUrl = null;
  }
});
