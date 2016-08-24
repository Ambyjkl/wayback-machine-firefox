/*
 * LICENSE: AGPL-3
 * Copyright 2016, Internet Archive
 */
(function() {
  var enforceBannerInterval;
  var archiveLinkWasClicked = false;
  var bannerWasShown = false;
  var bannerWasClosed = false;

  /**
   * Brute force inline css style reset
   */
  function resetStyesInline(el) {
    el.style.margin = 0;
    el.style.padding = 0;
    el.style.border = 0;
    el.style.fontSize = "100%";
    el.style.font = "inherit";
    el.style.verticalAlign = "baseline";
    el.style.lineHeight = "1";
    el.style.boxSizing = "content-box";
    el.style.overflow = "auto";
    el.style.fontWeight = "inherit";
    el.style.height = "auto";
    el.style.position = "relative";
    el.style.width = "auto";
    el.style.display = "inline";
    el.style.backgroundColor = "transparent";
    el.style.color = "#333";
    el.style.textAlign = "left";
  }

  /**
   * Communicates with background.js
   * @param action {string}
   * @param complete {function}
   */
  function sendTelemetry(action, complete) {
    chrome.runtime.sendMessage({action: action}, complete);
  }

  /**
   * @param {string} type
   * @param {function} handler(el)
   * @param remaining args are children
   * @returns {object} DOM element
   */
  function createEl(type, handler) {
    var el = document.createElement(type);
    resetStyesInline(el);
    if (handler !== undefined) {
      handler(el);
    }
    // Append *args to created el
    for (var i = 2; i < arguments.length; i++) {
      el.appendChild(arguments[i]);
    }
    return el;
  }

  function createBanner(wayback_url) {
    if (document.getElementById("no-more-404s-message") !== null) {
      return;
    }
    document.body.appendChild(
      createEl("div",
        function(el) {
          el.id = "no-more-404s-message";
          el.style.position = "fixed";
          el.style.top = "0";
          el.style.left = "0";
          el.style.width = "100%";
          el.style.minHeight = "50px";
          el.style.borderBottom = "1px solid rgba(0,0,0,.3)";
          el.style.boxSizing = "border-box";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "space-between";
          el.style.padding = "5px 14px 5px 12px";
          el.style.background = "linear-gradient(#FBFBFB, #E6E6E6)";
          el.style.color = "#333";
          el.style.font = "14px message-box, sans-serif";
          el.style.transition = "transform 150ms cubic-bezier(.1,.7,.15,1)";
          el.style.transform = "translate(0, -100%)";
          el.style.zIndex = "999999999";
          el.style.overflow = "hidden";
        },
        createEl("img", function(el) {
          el.src = chrome.extension.getURL("images/insetIcon.svg");
          el.style.margin = "0 2px 0 0";
          el.style.width = "30px";
          el.style.height = "30px";
          el.width = "30";
          el.height = "30";
        }),
        createEl("div",
          function(el) {
            el.style.flex = "1";
            el.style.lineHeight = "1.2em";
            el.style.margin = "0 0 0 8px";
          },
          document.createTextNode("This page appears to be missing. "),
          createEl("a", function(el) {
            el.id = "no-more-404s-message-link";
            el.href = wayback_url;
            el.style.color = "#0996F8";
            el.style.textDecoration = "none";
            el.appendChild(document.createTextNode("View a saved version courtesy of the Wayback Machine."));
            el.onclick = function(e) {
              archiveLinkWasClicked = true;

              // Work-around for myspace which hijacks the link
              if (window.location.hostname.indexOf("myspace.com") >= 0) {
                sendTelemetry("viewed", function() {
                  setInterval(function() {
                    window.location.href = wayback_url;
                  }, 100);
                });
                e.preventDefault();
                return false;
              } else {
                sendTelemetry("viewed");
              }
            };
          })
        ),
        createEl("button",
          function(el) {
            el.style.width = "20px";
            el.style.height = "20px";
            el.style.borderRadius = "3px";
            el.style.boxSizing = "border-box";
            el.style.padding = "3px 0 0 0";
            el.style.border = "none";
            el.onclick = function() {
              clearInterval(enforceBannerInterval);
              document.getElementById("no-more-404s-message").style.display = "none";
              bannerWasClosed = true;
              sendTelemetry("dismissed");
            };
            el.onmouseenter = function() {
              el.style.backgroundColor = "#E6E6E6";
              el.style.boxShadow = "0 1px 0 0 rgba(0,0,0,.1) inset";
            };
            el.onmousedown = function() {
              el.style.backgroundColor = "#CACACA";
              el.style.boxShadow = "0 1px 0 0 rgba(0,0,0,.15) inset";
            };
            el.onmouseup = function() {
              el.style.backgroundColor = "#E6E6E6";
              el.style.boxShadow = "0 1px 0 0 rgba(0,0,0,.1) inset";
            };
            el.onmouseleave = function() {
              el.style.backgroundColor = "transparent";
              el.style.boxShadow = "";
            };
          },
          createEl("img", function(el) {
            el.src = chrome.extension.getURL("images/close.svg");
            el.alt = "close";
            el.style.borderRadius = "3px";
            el.style.height = "14px";
            el.style.width = "14px";
            el.style.transition = "color 100ms";
          })
        )
      )
    );
    // Focus the link for accessibility
    document.getElementById("no-more-404s-message-link").focus();

    // Transition element in from top of page
    setTimeout(function() {
      document.getElementById("no-more-404s-message").style.transform = "translate(0, 0%)";
    }, 100);

    bannerWasShown = true;
  }

  function checkIt(wayback_url) {
    // Some pages use javascript to update the dom so poll to ensure
    // the banner gets recreated if it is deleted.
    enforceBannerInterval = setInterval(function() {
      createBanner(wayback_url);
    }, 500);

    // Bind leave page for telemetry
    window.onunload = function() {
      if (bannerWasShown && !bannerWasClosed && !archiveLinkWasClicked) {
        sendTelemetry("ignored");
      }
    };
  }

  // Listen to message from background.js
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.type === "SHOW_BANNER") {
        if (request.wayback_url) {
          checkIt(request.wayback_url);
        }
      }
  });
})();
