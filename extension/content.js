// Leads Hunter — auto-send no WhatsApp Web
// Detecta quando uma URL /send?phone=...&text=... termina de carregar
// e clica no botao de enviar automaticamente.

(function () {
  const LOG = (...a) => console.log("[LeadsHunterAutoSend]", ...a);

  let lastUrl = location.href;
  let attemptTimer = null;

  function isSendUrl() {
    return /[?&]phone=/.test(location.href) && /[?&]text=/.test(location.href);
  }

  function findSendButton() {
    // Botao "Enviar" — varios seletores de fallback (o WhatsApp Web muda DOM com frequencia)
    return (
      document.querySelector('button[aria-label="Enviar"]') ||
      document.querySelector('button[aria-label="Send"]') ||
      document.querySelector('[data-testid="send"]') ||
      document.querySelector('[data-icon="send"]')?.closest("button") ||
      document.querySelector('span[data-icon="send"]')?.closest("button") ||
      document.querySelector('span[data-icon="wds-ic-send-filled"]')?.closest("button")
    );
  }

  function dismissModals() {
    // Modal "Numero invalido" / "Usar WhatsApp aqui" — fechamos pra nao travar a fila
    const okBtn = document.querySelector('div[role="dialog"] button');
    if (okBtn && /OK|Ok|ok/.test(okBtn.textContent || "")) okBtn.click();
  }

  function tryAutoSend(deadlineMs) {
    const started = Date.now();
    clearInterval(attemptTimer);

    attemptTimer = setInterval(() => {
      if (!isSendUrl()) {
        clearInterval(attemptTimer);
        return;
      }
      dismissModals();
      const btn = findSendButton();
      if (btn) {
        clearInterval(attemptTimer);
        LOG("Enviando mensagem...");
        btn.click();
        return;
      }
      if (Date.now() - started > deadlineMs) {
        clearInterval(attemptTimer);
        LOG("Timeout — botao enviar nao apareceu.");
      }
    }, 600);
  }

  // Detecta SPA navigations (pushState/replaceState/popstate) sem recarga
  const fire = () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (isSendUrl()) tryAutoSend(20000);
  };

  const _ps = history.pushState;
  history.pushState = function () { _ps.apply(this, arguments); fire(); };
  const _rs = history.replaceState;
  history.replaceState = function () { _rs.apply(this, arguments); fire(); };
  window.addEventListener("popstate", fire);

  // Carregamento inicial
  if (isSendUrl()) {
    LOG("URL de envio detectada — aguardando WhatsApp carregar...");
    tryAutoSend(25000);
  }
})();
