import { app, BrowserWindow, globalShortcut, Menu, nativeImage, Tray } from "electron";

const DEFAULT_WEB_URL = process.env.MATEON_WEB_URL ?? "http://localhost:3000";
const DEFAULT_ROOM_HOST_USER_ID = process.env.MATEON_ROOM_HOST_USER_ID ?? "";
const DEFAULT_SIGNAL_ROLE = process.env.MATEON_SIGNAL_ROLE === "host" ? "host" : "viewer";
const DEFAULT_SIGNAL_AUTOCONNECT = process.env.MATEON_SIGNAL_AUTOCONNECT ?? "1";
const DEFAULT_CONTENT_PROTECTION = process.env.MATEON_CONTENT_PROTECTION ?? "1";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isClickThrough = false;
let isQuitting = false;

function isEnabled(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "off";
}

function resolveOverlayUrl() {
  try {
    const url = new URL(DEFAULT_WEB_URL);
    if (DEFAULT_ROOM_HOST_USER_ID.trim()) {
      url.searchParams.set("hostUserId", DEFAULT_ROOM_HOST_USER_ID.trim());
    }
    url.searchParams.set("signalRole", DEFAULT_SIGNAL_ROLE);
    if (DEFAULT_SIGNAL_AUTOCONNECT === "1" || DEFAULT_SIGNAL_AUTOCONNECT.toLowerCase() === "true") {
      url.searchParams.set("signalAutoConnect", "1");
    }
    url.searchParams.set("overlay", "1");
    return url.toString();
  } catch {
    return DEFAULT_WEB_URL;
  }
}

function createTrayIcon() {
  return nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEVHcEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8l0fJAAAAEHRSTlMABgcIDQ4PFB0eHyQnL0DV2AAAAF9JREFUGNNjYMAEJiZmFkYGBmYGNlYGZiY2NhYGBhY2TmY2VgYGJmY2NkYGBgYQABMDCwMDAwQJwMDAwMDA8Pj4xMTEwsLAwMDAwMjIyMDAwAAAv2gM8t7Pj6wAAAABJRU5ErkJggg=="
  );
}

function refreshTrayMenu() {
  if (!tray || !mainWindow) {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow.isVisible() ? "Hide Overlay" : "Show Overlay",
      click: () => {
        if (!mainWindow) {
          return;
        }

        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
        refreshTrayMenu();
      }
    },
    {
      label: "Always On Top",
      type: "checkbox",
      checked: mainWindow.isAlwaysOnTop(),
      click: () => {
        if (!mainWindow) {
          return;
        }
        mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop(), "screen-saver");
        refreshTrayMenu();
      }
    },
    {
      label: "Click Through",
      type: "checkbox",
      checked: isClickThrough,
      click: () => {
        if (!mainWindow) {
          return;
        }
        isClickThrough = !isClickThrough;
        mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
        refreshTrayMenu();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 420,
    transparent: true,
    frame: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    webPreferences: {
      backgroundThrottling: false
    }
  });

  if (isEnabled(DEFAULT_CONTENT_PROTECTION)) {
    mainWindow.setContentProtection(true);
  }

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  void mainWindow.loadURL(resolveOverlayUrl());

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
    refreshTrayMenu();
  });

  mainWindow.on("show", refreshTrayMenu);
  mainWindow.on("hide", refreshTrayMenu);
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("Mate.on Overlay");
  tray.on("click", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    refreshTrayMenu();
  });

  refreshTrayMenu();
}

function registerGlobalShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+A", () => {
    if (!mainWindow) {
      return;
    }
    mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop(), "screen-saver");
    refreshTrayMenu();
  });

  globalShortcut.register("CommandOrControl+Shift+X", () => {
    if (!mainWindow) {
      return;
    }
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    refreshTrayMenu();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();
});

app.on("activate", () => {
  if (!mainWindow) {
    createWindow();
    refreshTrayMenu();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
  refreshTrayMenu();
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
