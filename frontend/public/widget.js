// ============================================================
// frontend/public/widget.js
// Self-contained embed script for Fairquanta Agent Factory
// Usage: <script src="https://fairquanta.ai/widget.js" data-agent-id="abc123"></script>
// Injects a floating chat button + iframe into any website
// ============================================================

(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────
  var WIDGET_BASE = "https://fairquanta.ai";
  var FRAME_PATH  = "/widget-frame.html";
  var OPEN_COLOR  = "#2563EB";  // blue-600
  var Z_INDEX     = 99999;

  // Get agent ID from script tag attribute
  var scripts   = document.getElementsByTagName("script");
  var thisScript = scripts[scripts.length - 1];
  var agentId   = thisScript.getAttribute("data-agent-id");

  if (!agentId) {
    console.warn("[FairQuanta Widget] Missing data-agent-id attribute.");
    return;
  }

  // Prevent double-init
  if (window.__fqWidgetLoaded) return;
  window.__fqWidgetLoaded = true;

  // ── State ───────────────────────────────────────────────────
  var isOpen  = false;
  var iframe  = null;
  var button  = null;
  var container = null;

  // ── Styles ──────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#fq-widget-container {",
    "  position: fixed;",
    "  bottom: 24px;",
    "  right: 24px;",
    "  z-index: " + Z_INDEX + ";",
    "  display: flex;",
    "  flex-direction: column;",
    "  align-items: flex-end;",
    "  gap: 12px;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
    "}",
    "#fq-widget-frame {",
    "  width: 380px;",
    "  height: 560px;",
    "  border: none;",
    "  border-radius: 16px;",
    "  box-shadow: 0 20px 60px rgba(0,0,0,0.18);",
    "  opacity: 0;",
    "  transform: translateY(12px) scale(0.96);",
    "  transition: opacity 0.2s ease, transform 0.2s ease;",
    "  pointer-events: none;",
    "  background: #fff;",
    "}",
    "#fq-widget-frame.fq-open {",
    "  opacity: 1;",
    "  transform: translateY(0) scale(1);",
    "  pointer-events: all;",
    "}",
    "#fq-widget-button {",
    "  width: 56px;",
    "  height: 56px;",
    "  border-radius: 50%;",
    "  background: " + OPEN_COLOR + ";",
    "  border: none;",
    "  cursor: pointer;",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  box-shadow: 0 4px 16px rgba(37,99,235,0.4);",
    "  transition: transform 0.15s ease, box-shadow 0.15s ease;",
    "  flex-shrink: 0;",
    "}",
    "#fq-widget-button:hover {",
    "  transform: scale(1.08);",
    "  box-shadow: 0 6px 20px rgba(37,99,235,0.5);",
    "}",
    "#fq-widget-button svg { pointer-events: none; }",
    "@media (max-width: 480px) {",
    "  #fq-widget-frame { width: 100vw; height: 100vh; border-radius: 0; }",
    "  #fq-widget-container { bottom: 0; right: 0; }",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // ── DOM ─────────────────────────────────────────────────────
  function createWidget() {
    container = document.createElement("div");
    container.id = "fq-widget-container";

    // Iframe
    iframe = document.createElement("iframe");
    iframe.id = "fq-widget-frame";
    iframe.title = "AI Agent Chat";
    iframe.allow = "microphone";
    iframe.src = WIDGET_BASE + FRAME_PATH + "?agentId=" + encodeURIComponent(agentId);

    // Toggle button
    button = document.createElement("button");
    button.id = "fq-widget-button";
    button.setAttribute("aria-label", "Open chat");
    button.innerHTML = getChatIcon();
    button.addEventListener("click", toggleWidget);

    container.appendChild(iframe);
    container.appendChild(button);
    document.body.appendChild(container);

    // Listen for close message from iframe
    window.addEventListener("message", function (e) {
      if (e.data === "fq:close") closeWidget();
    });
  }

  function toggleWidget() {
    if (isOpen) closeWidget();
    else openWidget();
  }

  function openWidget() {
    isOpen = true;
    iframe.classList.add("fq-open");
    button.innerHTML = getCloseIcon();
    button.setAttribute("aria-label", "Close chat");
  }

  function closeWidget() {
    isOpen = false;
    iframe.classList.remove("fq-open");
    button.innerHTML = getChatIcon();
    button.setAttribute("aria-label", "Open chat");
  }

  // ── Icons ────────────────────────────────────────────────────
  function getChatIcon() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }

  function getCloseIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  // ── Init ─────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();