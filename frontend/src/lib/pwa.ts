import { computed, ref } from "vue";
import { registerSW } from "virtual:pwa-register";

type InstallPromptChoice = { outcome: "accepted" | "dismissed" };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallPromptChoice>;
};

const deferredInstallPrompt = ref<InstallPromptEvent | null>(null);
const installed = ref(false);
const iosSafari = ref(false);
export const updateAvailable = ref(false);
let installListenersReady = false;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

function isIosPlatform() {
  const userAgent = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(userAgent);
}

function refreshInstalledState() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let desktopInstallConfirmed = false;
  try { desktopInstallConfirmed = localStorage.getItem("pfa-pwa-install-confirmed-v2") === "1"; } catch { /* Storage is optional. */ }
  installed.value = isIosPlatform() ? standalone || iosStandalone : standalone && desktopInstallConfirmed;
}

export function initializePwa() {
  if (typeof window === "undefined" || installListenersReady) return;
  installListenersReady = true;
  const userAgent = navigator.userAgent || "";
  iosSafari.value = isIosPlatform() && /Safari/i.test(userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(userAgent);
  refreshInstalledState();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt.value = event as InstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    try { localStorage.setItem("pfa-pwa-install-confirmed-v2", "1"); } catch { /* The install prompt still works without storage. */ }
    deferredInstallPrompt.value = null;
    refreshInstalledState();
  });

  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", refreshInstalledState);
}

export function usePwaInstall() {
  const canPromptInstall = computed(() => Boolean(deferredInstallPrompt.value) && !installed.value);
  const shouldShowIosGuide = computed(() => iosSafari.value && !installed.value && !canPromptInstall.value);

  async function install() {
    const promptEvent = deferredInstallPrompt.value;
    if (!promptEvent) return "unavailable" as const;

    deferredInstallPrompt.value = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    return choice.outcome;
  }

  return { canPromptInstall, installed, shouldShowIosGuide, install };
}

export function registerPwaServiceWorker() {
  if (import.meta.env.DEV) return;
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable.value = true;
    },
  });
}

export async function applyPwaUpdate() {
  await updateServiceWorker?.(true);
}
