import { useEffect, useRef, useState } from "react";

/**
 * Componente único para tratar:
 * - Android/Chrome: beforeinstallprompt
 * - iOS/Safari: instruções "Adicionar à Tela de Início"
 *
 * Como usar:
 *   <InstallPrompt />
 *
 * Requisitos:
 * - theme.css já contém .install-banner e .ios-banner
 * - Colocar este componente próximo à raiz (ex: em App.jsx)
 */
export default function InstallPrompt({
  delayMs = 1200,               // atraso p/ evitar "flash"
  storageKey = "aa_install_prompt_dismissed",
  remindDays = 14,              // relembrar após X dias
}) {
  const deferredPromptRef = useRef(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  // Helpers de ambiente
  const isStandalone = (() => {
    // iOS
    if ("standalone" in window.navigator && window.navigator.standalone) return true;
    // Demais browsers
    try {
      return window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      return false;
    }
  })();

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isSafari = (() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /safari/.test(ua) && !/chrome|android|crios|fxios|edgios/.test(ua);
    // iPadOS modernos podem se passar por macOS; o test abaixo ajuda
    const isIPadOS = (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return isApple || (isIOS && isApple) || isIPadOS;
  })();

  // Controle de “não mostrar de novo”
  const dismissedInfo = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  const isDismissedRecently = (() => {
    if (!dismissedInfo?.ts) return false;
    const ms = Date.now() - dismissedInfo.ts;
    return ms < remindDays * 24 * 60 * 60 * 1000;
  })();

  // Android/Chrome: capturar beforeinstallprompt
  useEffect(() => {
    if (isStandalone || isDismissedRecently) return;

    const onBip = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      // aguarda um pouquinho pra não “piscar” ao abrir a app
      const t = setTimeout(() => setShowAndroidBanner(true), delayMs);
      return () => clearTimeout(t);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [delayMs, isDismissedRecently, isStandalone]);

  // iOS/Safari: exibir instruções
  useEffect(() => {
    if (isStandalone || isDismissedRecently) return;
    if (isIOS && isSafari) {
      const t = setTimeout(() => setShowIOSBanner(true), delayMs);
      return () => clearTimeout(t);
    }
  }, [delayMs, isDismissedRecently, isIOS, isSafari, isStandalone]);

  // Ações
  const handleInstallClick = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    // após resposta do usuário, escondemos e limpamos
    setShowAndroidBanner(false);
    deferredPromptRef.current = null;

    if (choice?.outcome === "dismissed") {
      persistDismiss();
    }
  };

  const persistDismiss = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ts: Date.now() }));
    } catch {}
  };

  const handleClose = () => {
    setShowAndroidBanner(false);
    setShowIOSBanner(false);
    persistDismiss();
  };

  // Render
  return (
    <>
      {showAndroidBanner && (
        <div className="install-banner card" role="dialog" aria-live="polite">
          <span className="h3">Instalar o app AureoArtes</span>
          <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
            <button className="btn btn--primary" onClick={handleInstallClick}>
              Instalar agora
            </button>
            <button className="btn btn--muted" onClick={handleClose} aria-label="Fechar">
              Mais tarde
            </button>
          </div>
        </div>
      )}

      {showIOSBanner && (
        <div className="ios-banner card" role="dialog" aria-live="polite">
          <div className="vstack-4" style={{ textAlign: "center" }}>
            <span className="h3">Adicionar à Tela de Início</span>
            <p className="small text-muted">
              No Safari, toque no botão Compartilhar
              {" "}<span aria-label="ícone compartilhar iOS" title="Compartilhar">🔗</span>{" "}
              e selecione <b>“Adicionar à Tela de Início”</b>.
            </p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn--muted" onClick={handleClose} aria-label="Fechar">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
