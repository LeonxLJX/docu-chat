/**
 * Docu-Chat embeddable widget.
 * Loaded from <origin>/widget.js. Reads config from window.__DOCU_CHAT_CFG__.
 * Fully standalone — no build step, no external deps beyond fetch.
 *
 * Features:
 *   - Floating chat FAB + window, dark/light theme, brand color
 *   - Smart mode: visitor asking for a human creates a ticket immediately
 *   - Dedicated "Talk to human" button that skips the bot entirely
 *   - Persistent anonymous visitor id in localStorage
 */
(function () {
  "use strict";
  if (window.__DOCU_CHAT_LOADED__) return;
  window.__DOCU_CHAT_LOADED__ = true;

  var cfg = window.__DOCU_CHAT_CFG__ || {};
  var origin = cfg.origin || "";
  var title = cfg.title || "Need help?";
  var welcome = cfg.welcome || "Ask me anything about this product.";
  var placeholder = cfg.placeholder || "Type your question...";
  var theme = cfg.theme || "light";
  var brandColor = cfg.brandColor || "#2563eb";

  var isDark = theme === "dark";
  var bg = isDark ? "#1f2937" : "#ffffff";
  var fg = isDark ? "#f9fafb" : "#0f172a";
  var muted = isDark ? "#9ca3af" : "#64748b";
  var border = isDark ? "#374151" : "#e2e8f0";
  var bubbleUser = isDark ? "#374151" : brandColor;
  var bubbleUserFg = "#ffffff";
  var bubbleBot = isDark ? "#111827" : "#f1f5f9";
  var bubbleBotFg = isDark ? "#e5e7eb" : "#0f172a";

  // --- styles ---
  var css = [
    "#__dc__root *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0}",
    "#__dc__root{position:fixed;bottom:20px;right:20px;z-index:2147483647}",
    "#__dc__fab{width:56px;height:56px;border-radius:50%;background:" + brandColor + ";color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.2);transition:transform .15s}",
    "#__dc__fab:hover{transform:scale(1.05)}",
    "#__dc__fab svg{width:28px;height:28px;fill:#fff}",
    "#__dc__window{position:absolute;bottom:68px;right:0;width:360px;height:560px;background:" + bg + ";color:" + fg + ";border:1px solid " + border + ";border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(10px) scale(.98);pointer-events:none;transition:all .2s}",
    "#__dc__window.__open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}",
    "#__dc__hdr{padding:14px 16px;border-bottom:1px solid " + border + ";font-weight:600;display:flex;align-items:center;justify-content:space-between}",
    "#__dc__close{background:none;border:none;color:" + muted + ";cursor:pointer;font-size:18px}",
    "#__dc__msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    "#__dc__msg{max-width:85%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.55;word-break:break-word}",
    "#__dc__msg.__bot{background:" + bubbleBot + ";color:" + bubbleBotFg + ";border-bottom-left-radius:4px}",
    "#__dc__msg.__user{align-self:flex-end;background:" + bubbleUser + ";color:" + bubbleUserFg + ";border-bottom-right-radius:4px}",
    "#__dc__msg.__typing{display:flex;gap:4px;padding:10px 14px}",
    "#__dc__msg.__typing span{width:6px;height:6px;border-radius:50%;background:" + muted + ";animation:__dc__bounce 1.2s infinite ease-in-out}",
    "#__dc__msg.__typing span:nth-child(2){animation-delay:.15s}",
    "#__dc__msg.__typing span:nth-child(3){animation-delay:.3s}",
    "@keyframes __dc__bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}",
    "#__dc__composer{border-top:1px solid " + border + ";padding:10px;display:flex;gap:8px}",
    "#__dc__input{flex:1;border:1px solid " + border + ";background:transparent;color:" + fg + ";border-radius:8px;padding:8px 12px;font-size:14px;outline:none}",
    "#__dc__input:focus{border-color:" + brandColor + "}",
    "#__dc__send{background:" + brandColor + ";color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;font-weight:600}",
    "#__dc__footer{text-align:center;font-size:11px;color:" + muted + ";padding:6px 0 2px}",
    "#__dc__toolbar{padding:0 10px 8px;display:flex;gap:6px}",
    "#__dc__human-btn{flex:1;background:transparent;color:" + brandColor + ";border:1px dashed " + brandColor + ";border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;text-align:center}",
    "#__dc__human-btn:hover{background:" + brandColor + "15}",
    "#__dc__human-form{position:absolute;inset:0;background:" + bg + ";z-index:10;display:flex;flex-direction:column;padding:16px;gap:10px}",
    "#__dc__human-form h3{font-size:15px;font-weight:600;margin-bottom:4px}",
    "#__dc__human-form input,#__dc__human-form textarea{width:100%;border:1px solid " + border + ";border-radius:8px;padding:8px 10px;background:transparent;color:" + fg + ";font-size:13px;font-family:inherit;outline:none}",
    "#__dc__human-form textarea{resize:vertical;min-height:80px}",
    "#__dc__human-form input:focus,#__dc__human-form textarea:focus{border-color:" + brandColor + "}",
    "#__dc__human-form .__dc__row{display:flex;gap:8px}",
    "#__dc__human-form button{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none}",
    "#__dc__human-form .__dc__submit{background:" + brandColor + ";color:#fff}",
    "#__dc__human-form .__dc__cancel{background:transparent;color:" + muted + "}",
  ].join("");

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // --- DOM ---
  var root = document.createElement("div");
  root.id = "__dc__root";

  var widget = [
    '<div id="__dc__window">',
    '  <div id="__dc__hdr">',
    '    <span>' + title + '</span>',
    '    <button id="__dc__close" aria-label="Close">✕</button>',
    "  </div>",
    '  <div id="__dc__msgs">',
    '    <div class="__dc__msg __bot">' + welcome + "</div>",
    "  </div>",
    '  <div id="__dc__toolbar">',
    '    <button id="__dc__human-btn" class="__dc__human-btn">👤 Talk to a human</button>',
    "  </div>",
    '  <div id="__dc__composer">',
    '    <input id="__dc__input" type="text" placeholder="' + placeholder + '" autocomplete="off" />',
    '    <button id="__dc__send">Send</button>',
    "  </div>",
    '  <div id="__dc__footer">Powered by Docu-Chat</div>',
    "</div>",
    '<div id="__dc__fab" aria-label="Open chat">',
    '  <svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-2 10H6v-2h12v2zm0-4H6V6h12v2z"/></svg>',
    "</div>",
  ].join("");
  root.innerHTML = widget;
  document.body.appendChild(root);

  var win = root.querySelector("#__dc__window");
  var fab = root.querySelector("#__dc__fab");
  var close = root.querySelector("#__dc__close");
  var msgs = root.querySelector("#__dc__msgs");
  var input = root.querySelector("#__dc__input");
  var send = root.querySelector("#__dc__send");
  var humanBtn = root.querySelector("#__dc__human-btn");

  function toggle() {
    win.classList.toggle("__open");
  }
  fab.addEventListener("click", toggle);
  close.addEventListener("click", toggle);

  function appendMsg(text, kind) {
    var el = document.createElement("div");
    el.className = "__dc__msg " + (kind === "user" ? "__user" : "__bot");
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function appendTyping() {
    var el = document.createElement("div");
    el.className = "__dc__msg __bot __typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  var visitorId = localStorage.getItem("__dc__vid");
  if (!visitorId) {
    visitorId =
      "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("__dc__vid", visitorId);
  }

  async function ask() {
    var q = input.value.trim();
    if (!q) return;
    input.value = "";
    appendMsg(q, "user");
    var typing = appendTyping();

    try {
      var res = await fetch(origin + "/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, visitorId: visitorId }),
      });
      var data = await res.json();
      typing.remove();
      if (res.ok) {
        appendMsg(data.answer, "bot");
        if (data.mode === "human") {
          appendMsg("📎 Your request has been logged. The seller will reach out by email.", "bot");
        }
      } else {
        appendMsg("Error: " + (data.error || "unknown"), "bot");
      }
    } catch (e) {
      typing.remove();
      appendMsg("Network error — please try again.", "bot");
    }
  }

  send.addEventListener("click", ask);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") ask();
  });

  // --- "Talk to a human" overlay form ---
  function showHumanForm() {
    // prevent duplicates
    if (root.querySelector("#__dc__human-form-overlay")) return;

    var form = document.createElement("div");
    form.id = "__dc__human-form-overlay";
    form.className = "__dc__human-form";
    form.innerHTML = [
      "<h3>Talk to a real person</h3>",
      '<p style="font-size:12px;color:' + muted + ';margin-bottom:6px;">Leave a message and the seller will get back to you.</p>',
      '<input id="__dc__h-email" type="email" placeholder="Your email (optional)" />',
      '<input id="__dc__h-subject" type="text" placeholder="Subject" />',
      '<textarea id="__dc__h-msg" placeholder="What do you need help with?"></textarea>',
      '<div class="__dc__row" style="justify-content:flex-end">',
      '  <button class="__dc__cancel">Cancel</button>',
      '  <button class="__dc__submit">Send request</button>',
      "</div>",
    ].join("");
    win.appendChild(form);

    form.querySelector(".__dc__cancel").addEventListener("click", function () {
      form.remove();
    });

    form.querySelector(".__dc__submit").addEventListener("click", async function () {
      var subject = form.querySelector("#__dc__h-subject").value.trim() || "Need help";
      var message = form.querySelector("#__dc__h-msg").value.trim();
      var contactEmail = form.querySelector("#__dc__h-email").value.trim();
      if (!message) {
        form.querySelector("#__dc__h-msg").focus();
        return;
      }
      form.remove();
      appendMsg("Talk to a human — submitting...", "user");
      var typing = appendTyping();
      try {
        var res = await fetch(origin + "/api/tickets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            visitorId: visitorId,
            subject: subject,
            message: message,
            contactEmail: contactEmail || null,
          }),
        });
        typing.remove();
        if (res.ok) {
          appendMsg(
            "✅ Request sent! The seller has been notified and will reply as soon as possible." +
              (contactEmail ? " (Reply to " + contactEmail + ")" : ""),
            "bot"
          );
        } else {
          appendMsg("Couldn't send — please try again or email the seller directly.", "bot");
        }
      } catch (e) {
        typing.remove();
        appendMsg("Network error — please try again later.", "bot");
      }
    });
  }

  humanBtn.addEventListener("click", showHumanForm);
})();
