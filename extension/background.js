// Leads Hunter — Service Worker
// Orquestra: painel -> abre WhatsApp -> aguarda envio -> fecha aba -> avisa painel.

const state = {
  panelTabId: null,
  waTabId: null,
  currentUrl: null,
  timeoutId: null,
};

const HARD_TIMEOUT_MS = 20000; // se WhatsApp não sinalizar em 20s, aborta

function clearWatchdog() {
  if (state.timeoutId) {
    clearTimeout(state.timeoutId);
    state.timeoutId = null;
  }
}

async function closeWaTab() {
  clearWatchdog();
  if (state.waTabId != null) {
    try { await chrome.tabs.remove(state.waTabId); } catch (_) {}
    state.waTabId = null;
  }
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
  await closeWaTab();
  await notifyPanel({ type: "PODE_IR_PRO_PROXIMO", status, url: state.currentUrl });
  state.currentUrl = null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) return;

    if (msg.type === "ABRIR_WHATSAPP") {
      state.panelTabId = sender.tab?.id ?? state.panelTabId;
      state.currentUrl = msg.url;

      // fecha resíduo anterior
      await closeWaTab();

      const tab = await chrome.tabs.create({ url: msg.url, active: true });
      state.waTabId = tab.id;

      clearWatchdog();
      state.timeoutId = setTimeout(() => {
        console.warn("[LH bg] timeout — abortando lead", state.currentUrl);
        finish("timeout");
      }, HARD_TIMEOUT_MS);

      sendResponse({ ok: true });
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
      sendResponse({ ok: true, panelTabId: state.panelTabId });
      return;
    }
  })();
  return true; // async sendResponse
});

// se usuário fechar a aba do WA manualmente, libera o robô
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.waTabId) {
    state.waTabId = null;
    clearWatchdog();
    notifyPanel({ type: "PODE_IR_PRO_PROXIMO", status: "closed", url: state.currentUrl });
    state.currentUrl = null;
  }
});
