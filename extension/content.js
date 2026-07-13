// Leads Hunter — content script (roda no painel E no WhatsApp Web)

(function () {
  const HOST = location.hostname;
  const IS_WA = HOST === "web.whatsapp.com";
  const LOG = (...a) => console.log("[LH cs]", ...a);

  // ============================================================
  // MODO WHATSAPP WEB — clica em enviar e reporta status
  // ============================================================
  if (IS_WA) {
    const DEADLINE_MS = 30000; // tempo para WhatsApp carregar sem travar o robô
    const POST_SEND_MS = 2500; // aguarda após clicar
    let lastHandledUrl = "";

    const isSendUrl = () =>
      /[?&]phone=/.test(location.href) && /[?&]text=/.test(location.href);

    const findSendButton = () => {
      const selectors = [
        'button[aria-label="Enviar"]',
        'button[aria-label="Send"]',
        'button[data-tab][aria-label="Enviar"]',
        'button[data-tab][aria-label="Send"]',
        '[data-testid="send"]',
        '[data-icon="send"]',
        'span[data-icon="send"]',
        'span[data-icon="wds-ic-send-filled"]',
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        const button = el?.tagName === "BUTTON" ? el : el?.closest?.("button");
        if (button) return button;
      }

      return null;
    };

    const hasInvalidNumberModal = () => {
      const dlg = document.querySelector('div[role="dialog"]');
      if (!dlg) return false;
      const txt = (dlg.textContent || "").toLowerCase();
      return /inválido|invalid|não faz parte|not on whatsapp|no válido|phone number shared via url|número de telefone compartilhado/.test(txt);
    };

    const send = (type) => {
      try { chrome.runtime.sendMessage({ type }); } catch (_) {}
    };

    const run = () => {
      if (!isSendUrl() || lastHandledUrl === location.href) return;
      lastHandledUrl = location.href;

      let done = false;
      const finish = (type) => {
        if (done) return;
        done = true;
        send(type);
      };

      const start = Date.now();
      const poll = setInterval(() => {
        if (done) { clearInterval(poll); return; }

        if (hasInvalidNumberModal()) {
          LOG("Número inválido detectado.");
          clearInterval(poll);
          finish("ERRO");
          return;
        }

        const btn = findSendButton();
        if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") {
          clearInterval(poll);
          LOG("Clicando enviar…");
          btn.click();
          setTimeout(() => finish("MENSAGEM_ENVIADA"), POST_SEND_MS);
          return;
        }

        if (Date.now() - start > DEADLINE_MS) {
          clearInterval(poll);
          LOG("Timeout aguardando botão.");
          finish("ERRO");
        }
      }, 500);
    };

    run();
    setInterval(run, 1000);
    return;
  }

  // ============================================================
  // MODO PAINEL — expõe API global usada pela plataforma
  // ============================================================
  window.__LEADS_HUNTER_EXT__ = { version: "2.0.0", ready: true };
  window.dispatchEvent(new CustomEvent("leads-hunter-ext-ready", { detail: { version: "2.0.0" } }));

  try { chrome.runtime.sendMessage({ type: "PANEL_HELLO" }); } catch (_) {}

  // Encaminha resposta do background pro app via window event
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "PODE_IR_PRO_PROXIMO") {
      window.dispatchEvent(new CustomEvent("leads-hunter-next", { detail: msg }));
    }
  });

  // Página pede pra abrir WhatsApp
  window.addEventListener("leads-hunter-open", (ev) => {
    const url = ev.detail?.url;
    if (!url) return;
    chrome.runtime.sendMessage({ type: "ABRIR_WHATSAPP", url });
  });

  window.addEventListener("leads-hunter-stop", (ev) => {
    chrome.runtime.sendMessage({ type: "ENCERRAR_ROBO", close: !!ev.detail?.close });
  });
})();
