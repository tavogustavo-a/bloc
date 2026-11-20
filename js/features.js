(() => {
  const B = () => window.Bloc;
  let hitIndex = 0;
  let readOnlyFocus = false;
  let wired = false;
  let tplMenuId = null;
  let tplPress = null;

  const TOOL_IDS = ["bold", "italic", "strike", "under", "ink", "mark", "clear", "align", "ol", "ul", "check", "font", "image", "file", "find", "copy"];
  const TOOL_NAMES = {
    bold: "Negrita", italic: "Cursiva", strike: "Texto tachado", under: "Subrayado", ink: "Color del texto",
    mark: "Color de fondo", clear: "Borrar formato", align: "Alineación", ol: "Lista numerada", ul: "Lista con puntos",
    check: "Casillas", font: "Tipo de fuente", image: "Insertar imagen", file: "Adjuntar archivo", find: "Buscar texto", copy: "Copiar",
  };

  function orderTools() {
    const bloc = B();
    const scroll = document.getElementById("tool-scroll");
    if (!bloc || !scroll) return;
    const saved = Array.isArray(bloc.state.toolOrder) ? bloc.state.toolOrder.map(String).filter((id) => TOOL_IDS.includes(id)) : [];
    [...saved, ...TOOL_IDS.filter((id) => !saved.includes(id))].forEach((id) => {
      const el = scroll.querySelector(`[data-tool="${id}"]`);
      if (el) scroll.appendChild(el);
    });
    const ink = scroll.querySelector('[data-tool="ink"]');
    [...scroll.querySelectorAll("[data-ink]")].reverse().forEach((btn) => {
      if (ink) ink.after(btn);
    });
  }

  function applyToolChrome() {
    const bloc = B();
    if (!bloc) return;
    const hideBar = bloc.state.hideTools === true;
    const hideEditor = bloc.state.hideEditor === true;
    document.body.classList.toggle("hide-tools", hideBar);
    const editor = document.querySelector('[data-menu="editor"]');
    if (editor) editor.hidden = hideEditor;
    [
      ["shortcut-hide-tools", !hideBar],
      ["shortcut-hide-editor", hideEditor],
    ].forEach(([id, on]) => {
      const box = document.getElementById(id);
      if (!box) return;
      box.classList.toggle("is-on", on);
      box.setAttribute("aria-pressed", String(on));
    });
    const size = Number(bloc.state.toolSize);
    const px = size >= 36 && size <= 64 ? size : 46;
    document.documentElement.style.setProperty("--tool-size", `${px}px`);
    if (bloc.state.toolColor !== false && bloc.state.appColor) {
      document.documentElement.style.setProperty("--tool-bg", bloc.state.appColor);
    } else {
      document.documentElement.style.removeProperty("--tool-bg");
    }
    paintEditTools();
    paintBarTools();
    const field = document.getElementById("tool-size");
    if (field) field.value = String(px);
    orderTools();
  }

  function bindToolDrag() {
    const scroll = document.getElementById("tool-scroll");
    if (!scroll || scroll.dataset.bound) return;
    scroll.dataset.bound = "1";
    let drag = null;
    scroll.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      drag = {
        btn: event.target.closest(".tool-ico"),
        x: event.clientX,
        left: scroll.scrollLeft,
        moved: false,
      };
      scroll.setPointerCapture(event.pointerId);
    });
    scroll.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      if (!drag.btn) {
        scroll.scrollLeft = drag.left - dx;
        return;
      }
      drag.btn.classList.add("is-drag");
      const items = [...scroll.querySelectorAll(".tool-ico")];
      let next = null;
      for (const el of items) {
        if (el === drag.btn) continue;
        const box = el.getBoundingClientRect();
        if (event.clientX < box.left + box.width / 2) {
          next = el;
          break;
        }
      }
      if (next) scroll.insertBefore(drag.btn, next);
      else scroll.appendChild(drag.btn);
      const edge = scroll.getBoundingClientRect();
      if (event.clientX > edge.right - 36) scroll.scrollLeft += 14;
      if (event.clientX < edge.left + 36) scroll.scrollLeft -= 14;
    });
    const finish = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag.btn?.classList.remove("is-drag");
      drag = null;
      if (!moved) return;
      scroll.dataset.dragged = "1";
      const bloc = B();
      if (!bloc) return;
      bloc.state.toolOrder = [...scroll.querySelectorAll(".tool-ico")].map((el) => el.dataset.tool).filter(Boolean);
      bloc.save();
    };
    scroll.addEventListener("pointerup", finish);
    scroll.addEventListener("pointercancel", () => {
      drag?.btn?.classList.remove("is-drag");
      drag = null;
    });
    scroll.addEventListener("click", (event) => {
      if (scroll.dataset.dragged !== "1") return;
      event.preventDefault();
      event.stopPropagation();
      scroll.dataset.dragged = "";
    }, true);
    scroll.addEventListener("wheel", (event) => {
      if (scroll.scrollWidth <= scroll.clientWidth + 1) return;
      scroll.scrollLeft += event.deltaY || event.deltaX;
      event.preventDefault();
    }, { passive: false });
  }

  function paintEditTools() {
    const bloc = B();
    if (!bloc) return;
    [
      ["tool-color", bloc.state.toolColor !== false],
      ["tool-delete", bloc.state.toolDelete !== false],
      ["tool-copy", bloc.state.toolCopy !== false],
      ["tool-repeat", bloc.state.toolRepeat === true],
      ["tool-lock-edit", bloc.state.lockEdit === true],
      ["tool-applock", bloc.state.appLock === true],
    ].forEach(([id, on]) => {
      const box = document.getElementById(id);
      if (!box) return;
      box.classList.toggle("is-on", on);
      box.setAttribute("aria-pressed", String(on));
    });
  }

  function paintBarTools() {
    const bloc = B();
    const tools = bloc?.state.barTools || {};
    document.querySelectorAll("#tool-scroll [data-tool]").forEach((btn) => {
      btn.hidden = tools[btn.dataset.tool] === false;
    });
    const undoBtn = document.getElementById("focus-undo");
    const redoBtn = document.getElementById("focus-redo");
    if (undoBtn) undoBtn.hidden = tools.undo === false;
    if (redoBtn) redoBtn.hidden = tools.redo === false;
    document.querySelectorAll("#shortcuts-page [data-bar]").forEach((box) => {
      const on = tools[box.dataset.bar] !== false;
      box.classList.toggle("is-on", on);
      box.setAttribute("aria-pressed", String(on));
    });
    const auto = document.getElementById("tool-autohide");
    if (auto) {
      auto.classList.toggle("is-on", bloc?.state.autoHideBar === true);
      auto.setAttribute("aria-pressed", String(bloc?.state.autoHideBar === true));
    }
    const colors = document.getElementById("tool-color-shortcuts");
    const picks = document.getElementById("ink-picks");
    const onColors = bloc?.state.colorShortcuts === true;
    if (colors) {
      colors.classList.toggle("is-on", onColors);
      colors.setAttribute("aria-pressed", String(onColors));
    }
    if (picks) picks.hidden = !onColors;
    const inks = bloc?.state.inkShortcuts || [];
    document.querySelectorAll("[data-ink]").forEach((btn) => {
      const hex = inks[Number(btn.dataset.ink)] || "#1a1814";
      btn.hidden = !onColors;
      btn.style.background = hex;
    });
    ["ink-1", "ink-2", "ink-3"].forEach((id, index) => {
      const field = document.getElementById(id);
      if (field && inks[index]) field.value = inks[index];
    });
    const size = document.getElementById("bar-size");
    if (size && document.activeElement !== size) size.value = String(bloc?.state.toolSize || 46);
    document.getElementById("open-tool-order")?.classList.toggle("is-locked", bloc?.state.hideTools === true);
  }

  function applyMenuShortcuts() {
    const bloc = B();
    if (!bloc) return;
    [
      ["export", "shortcut-export", bloc.state.showExport !== false],
      ["import", "shortcut-import", bloc.state.showImport !== false],
    ].forEach(([menu, id, on]) => {
      const row = document.querySelector(`[data-menu="${menu}"]`);
      if (row) row.hidden = !on;
      const box = document.getElementById(id);
      if (!box) return;
      box.classList.toggle("is-on", on);
      box.setAttribute("aria-pressed", String(on));
    });
    applyToolChrome();
  }

  function applyTheme(theme) {
    document.body.classList.toggle("theme-dark", theme === "dark");
    const box = document.getElementById("theme-dark");
    const dark = theme === "dark";
    if (box) {
      box.classList.toggle("is-on", dark);
      box.setAttribute("aria-pressed", String(dark));
    }
  }

  function closeShortcuts() {
    document.body.classList.remove("shortcuts-open", "tool-order-open");
    const order = document.getElementById("tool-order-page");
    if (order) order.hidden = true;
    const page = document.getElementById("shortcuts-page");
    if (page) page.hidden = true;
    const account = document.getElementById("account-modal");
    const stay = document.body.classList.contains("pay-open")
      || document.body.classList.contains("prices-open")
      || (account && !account.hidden);
    if (!stay) document.body.classList.remove("account-open");
    const title = document.querySelector("#account-bar h2");
    if (title && !stay) title.textContent = "Cuenta";
    const bloc = B();
    if (bloc?.state.shortcutsOpen) {
      bloc.state.shortcutsOpen = false;
      bloc.save();
    }
  }

  function openShortcuts() {
    window.closeBlocAccount?.();
    window.closeBlocPay?.();
    window.closeBlocPrices?.();
    const page = document.getElementById("shortcuts-page");
    if (page) page.hidden = false;
    document.body.classList.add("account-open", "shortcuts-open");
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Accesos directos";
    applyTheme(B()?.state.theme || "light");
    applyMenuShortcuts();
    applyToolChrome();
    applyTemplateLook();
    bindToolDrag();
    const bloc = B();
    if (bloc && bloc.state.shortcutsOpen !== true) {
      bloc.state.shortcutsOpen = true;
      bloc.state.accountOpen = false;
      bloc.save();
    }
  }

  function paintToolOrder() {
    const list = document.getElementById("tool-order-list");
    const bloc = B();
    if (!list || !bloc) return;
    const saved = Array.isArray(bloc.state.toolOrder) ? bloc.state.toolOrder.filter((id) => TOOL_IDS.includes(id)) : [];
    const ids = [...saved, ...TOOL_IDS.filter((id) => !saved.includes(id))];
    list.innerHTML = ids.map((id) => `<li><span>${TOOL_NAMES[id] || id}</span><button type="button" data-up="${id}" aria-label="Subir">↑</button><button type="button" data-down="${id}" aria-label="Bajar">↓</button></li>`).join("");
  }

  function openToolOrder() {
    const bloc = B();
    if (!bloc || bloc.state.hideTools === true) return;
    const page = document.getElementById("tool-order-page");
    const shortcuts = document.getElementById("shortcuts-page");
    if (shortcuts) shortcuts.hidden = true;
    if (page) page.hidden = false;
    document.body.classList.add("tool-order-open");
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Orden de la barra";
    paintToolOrder();
  }

  function closeToolOrder() {
    const page = document.getElementById("tool-order-page");
    const shortcuts = document.getElementById("shortcuts-page");
    if (page) page.hidden = true;
    if (shortcuts) shortcuts.hidden = false;
    document.body.classList.remove("tool-order-open");
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Accesos directos";
  }

  window.closeBlocShortcuts = closeShortcuts;
  window.openBlocShortcuts = openShortcuts;

  function closeAppMenu() {
    const menu = document.getElementById("app-menu");
    const btn = document.getElementById("btn-app-menu");
    if (menu) menu.hidden = true;
    btn?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("app-menu-open");
  }

  function askSure(text) {
    const modal = document.getElementById("sure-modal");
    const copy = document.getElementById("sure-text");
    const yes = document.getElementById("sure-yes");
    const no = document.getElementById("sure-no");
    const close = document.getElementById("sure-close");
    if (!modal || !yes || !no) return Promise.resolve(false);
    if (copy) copy.textContent = text;
    modal.hidden = false;
    return new Promise((resolve) => {
      const done = (ok) => {
        modal.hidden = true;
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        close?.removeEventListener("click", onNo);
        resolve(ok);
      };
      const onYes = () => done(true);
      const onNo = () => done(false);
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      close?.addEventListener("click", onNo);
    });
  }

  function exportCopy() {
    const bloc = B();
    if (!bloc) return;
    const name = `bloc-copia-${new Date().toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify(bloc.state, null, 2);
    if (window.BlocNative?.saveText) {
      window.BlocNative.saveText(name, text);
      return;
    }
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const COLOR_NAMES = { sand: "Arena", leaf: "Hoja", sky: "Cielo", rose: "Rosa" };
  const TEMPLATE_FONTS = [
    ["serif", "Fraunces"],
    ["sans", "Outfit"],
    ["georgia", "Georgia"],
    ["mono", "Consolas"],
  ];

  function templateFont(key) {
    const fonts = {
      serif: "Fraunces, Georgia, serif",
      sans: "Outfit, Segoe UI, sans-serif",
      georgia: "Georgia, serif",
      mono: "Consolas, monospace",
    };
    return fonts[key] || fonts.serif;
  }

  function renderFontList() {
    const bloc = B();
    const list = document.getElementById("tpl-font-list");
    if (!bloc || !list) return;
    const entries = Object.entries(bloc.state.templates || {})
      .filter(([, tpl]) => tpl && !tpl.deletedAt && !tpl.purged)
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    list.innerHTML = entries.map(([id, tpl]) => {
      const size = Number(tpl.size) || Number(bloc.state.templateLook?.size) || 18;
      return `<li><span>${bloc.escapeHtml(tpl.label || tpl.title)}</span><input id="tpl-size-${id}" name="tpl-size-${id}" type="range" min="14" max="32" step="1" value="${size}" data-tpl-size="${id}" aria-label="Tamaño de ${bloc.escapeHtml(tpl.label || tpl.title)}"></li>`;
    }).join("") || "<li><span>No hay plantillas.</span></li>";
  }

  function paintTemplateNotes(bloc, id) {
    const color = bloc.state.templates[id]?.color;
    if (!color) return;
    (bloc.state.files || []).forEach((file) => {
      if (file.templateId === id && !file.colorOwn) file.color = color;
    });
  }

  function templateEntries(bloc) {
    return Object.entries(bloc.state.templates || {})
      .filter(([, tpl]) => tpl && !tpl.deletedAt && !tpl.purged)
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  }

  function renderTemplateBar() {
    const bloc = B();
    if (!bloc || !bloc.state.templates) return;
    const entries = templateEntries(bloc);
    const wrap = document.getElementById("template-chips");
    if (!wrap) return;
    wrap.innerHTML = entries.map(([id, tpl]) => {
      const on = bloc.state.activeTemplate === id ? " is-on" : "";
      return `<button type="button" class="${on}" data-template="${id}" style="font-family:${templateFont(tpl.font)}">${bloc.escapeHtml(tpl.label || tpl.title)}</button>`;
    }).join("");
    applyTemplateLook();
    requestAnimationFrame(() => fitTemplates());
  }

  function fitTemplates() {
    const wrap = document.getElementById("template-chips");
    const more = document.getElementById("template-more");
    const all = document.getElementById("template-all");
    if (!wrap || !more || !all) return;
    const buttons = [...wrap.querySelectorAll("[data-template]")];
    buttons.forEach((button) => { button.hidden = false; });
    const bar = wrap.parentElement;
    const moreWidth = more.offsetWidth || 28;
    const available = Math.max(0, (bar?.clientWidth || wrap.clientWidth) - moreWidth - 8);
    const active = buttons.find((button) => button.classList.contains("is-on"));
    let used = 0;
    let activeShown = !active;
    const overflow = [];
    buttons.forEach((button) => {
      const width = button.offsetWidth + 6;
      const reserve = active && !activeShown && button !== active ? active.offsetWidth + 6 : 0;
      if (used + width + reserve <= available + 6) {
        used += width;
        if (button === active) activeShown = true;
        return;
      }
      if (button === active) {
        activeShown = true;
        return;
      }
      button.hidden = true;
      overflow.push(button);
    });
    more.hidden = overflow.length === 0;
    const listed = overflow;
    const search = listed.length > 5 ? `<input id="template-find" name="template-find" type="search" placeholder="Buscar plantilla" autocomplete="off" aria-label="Buscar plantilla">` : "";
    all.innerHTML = search + listed.map((button) => {
      const copy = button.cloneNode(true);
      copy.hidden = false;
      return copy.outerHTML;
    }).join("");
  }

  function applyTemplateLook() {
    const bloc = B();
    const bar = document.getElementById("template-bar");
    const wrap = document.getElementById("template-chips");
    if (!bloc || !bar || !wrap) return;
    const look = bloc.state.templateLook || { layout: "titles", size: 22 };
    bar.style.setProperty("--tpl-size", `${look.size}px`);
    wrap.classList.remove("layout-titles", "layout-cards", "layout-list");
    wrap.classList.add(`layout-${look.layout}`);
    const gap = Number(bloc.state.noteGap);
    const space = gap >= 0 && gap <= 18 ? gap : 6;
    const font = Number(bloc.state.noteFont);
    const text = font >= 16 && font <= 28 ? font : 18;
    const lineSize = Number(bloc.state.noteLine);
    const line = lineSize >= 22 && lineSize <= 44 ? lineSize : 28;
    const width = Number(bloc.state.noteWidth);
    const sheet = width >= 640 && width <= 1100 ? width : 920;
    const card = Number(bloc.state.cardSize);
    const cardSize = card >= 0 && card <= 24 ? card : 0;
    document.documentElement.style.setProperty("--note-gap", `${space}px`);
    document.documentElement.style.setProperty("--note-pad", `${Math.max(2, Math.round(space * 0.6 + 2))}px`);
    document.documentElement.style.setProperty("--note-font", `${text}px`);
    document.documentElement.style.setProperty("--note-line", `${line}px`);
    document.documentElement.style.setProperty("--note-width", `${sheet}px`);
    document.documentElement.style.setProperty("--card-size", `${cardSize}px`);
    const gapField = document.getElementById("note-gap");
    if (gapField) gapField.value = String(space);
    const lines = bloc.state.noteLines === true;
    document.body.classList.toggle("note-lines", lines);
    const linesBox = document.getElementById("note-lines");
    if (linesBox) linesBox.checked = lines;
    const hideAlarms = bloc.state.hideNoteAlarms === true;
    document.body.classList.toggle("hide-note-alarms", hideAlarms);
    const hideBox = document.getElementById("hide-note-alarms");
    if (hideBox) hideBox.checked = hideAlarms;
    const offlineBox = document.getElementById("offline-mode");
    if (offlineBox) offlineBox.checked = bloc.state.offlineMode === true;
    const showInfo = bloc.state.showInfo !== false;
    document.body.classList.toggle("hide-info", !showInfo);
    const infoBox = document.getElementById("show-info");
    if (infoBox) infoBox.checked = showInfo;
    const sizeField = document.getElementById("tpl-size");
    if (sizeField) sizeField.value = String(look.size);
    const fontField = document.getElementById("note-font");
    if (fontField) fontField.value = String(text);
    const lineField = document.getElementById("note-line");
    if (lineField) lineField.value = String(line);
    const widthField = document.getElementById("note-width");
    if (widthField) widthField.value = String(sheet);
    const cardField = document.getElementById("card-size");
    if (cardField) cardField.value = String(cardSize);
    const soundBox = document.getElementById("alarm-sound");
    if (soundBox) soundBox.checked = bloc.state.sound !== false;
    const continuous = document.getElementById("alarm-continuous");
    if (continuous) continuous.checked = bloc.state.alarmContinuous === true;
    const extra = document.getElementById("alarm-continuous-opts");
    if (extra) extra.hidden = bloc.state.alarmContinuous !== true;
    const panelBox = document.getElementById("show-panel");
    if (panelBox) panelBox.checked = bloc.state.showDetail !== false;
    const askBox = document.getElementById("ask-password");
    if (askBox) askBox.checked = bloc.state.askPasswordEvery === true;
    const confirmBox = document.getElementById("confirm-delete");
    if (confirmBox) confirmBox.checked = bloc.state.confirmDelete !== false;
    const noTpl = document.getElementById("no-templates");
    if (noTpl) noTpl.checked = bloc.state.noTemplates === true;
    document.body.classList.toggle("no-templates", bloc.state.noTemplates === true);
  }

  function openTemplateLook() {
    applyTemplateLook();
    const modal = document.getElementById("tpl-look-modal");
    if (modal) modal.hidden = false;
  }

  function closeTemplateLook() {
    const modal = document.getElementById("tpl-look-modal");
    if (modal) modal.hidden = true;
  }

  function openNewTemplate() {
    const bloc = B();
    const modal = document.getElementById("tpl-new-modal");
    if (!bloc || !modal || bloc.state.noTemplates) return;
    document.getElementById("tpl-new-name").value = "";
    const math = document.getElementById("tpl-new-math");
    if (math) math.checked = false;
    const calendar = document.getElementById("tpl-new-calendar");
    if (calendar) calendar.checked = false;
    const next = Object.values(bloc.state.templates).filter((tpl) => tpl && !tpl.deletedAt && !tpl.purged).length + 1;
    const order = document.getElementById("tpl-new-order");
    if (order) {
      order.max = String(next);
      order.value = String(next);
    }
    bloc.setColorPair("tpl-new-color", "tpl-new-hex", "#fff3c4");
    modal.hidden = false;
    document.getElementById("tpl-new-name")?.focus();
  }

  function closeNewTemplate() {
    const modal = document.getElementById("tpl-new-modal");
    if (modal) modal.hidden = true;
  }

  function closeTemplateMenu() {
    const menu = document.getElementById("template-menu");
    if (menu) menu.hidden = true;
    tplMenuId = null;
    document.body.classList.remove("tpl-context-open");
  }

  function openTemplateMenu(id, x, y) {
    tplMenuId = id;
    const menu = document.getElementById("template-menu");
    if (!menu) return;
    menu.hidden = false;
    document.body.classList.add("tpl-context-open");
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    if (rect.bottom > window.innerHeight - 8) menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  }

  function openTemplateEditor(id) {
    const bloc = B();
    if (!bloc) return;
    const tpl = bloc.state.templates?.[id];
    if (!tpl) return;
    closeTemplateMenu();
    const modal = document.getElementById("template-modal");
    if (!modal) return;
    modal.dataset.tplId = id;
    document.getElementById("tpl-label").value = tpl.label || tpl.title || "";
    document.getElementById("tpl-title").value = tpl.title || "";
    document.getElementById("tpl-body").value = tpl.body || "";
    const math = document.getElementById("tpl-math");
    if (math) math.checked = tpl.math === true;
    const calendar = document.getElementById("tpl-calendar");
    if (calendar) calendar.checked = tpl.calendar === true;
    modal.hidden = false;
    document.getElementById("tpl-label")?.focus();
  }

  function closeTemplateEditor() {
    const modal = document.getElementById("template-modal");
    if (modal) modal.hidden = true;
  }

  function scheduleQuickWhole(when) {
    const bloc = B();
    if (!bloc) return;
    const file = bloc.state.files.find((f) => f.id === bloc.state.openId);
    if (!file) return;
    const text = bloc.noteScheduleText(file);
    if (!text || when.getTime() <= Date.now()) return;
    const alarm = {
      id: crypto.randomUUID(),
      fileId: file.id,
      text: text.slice(0, 180),
      at: when.getTime(),
      status: "pending",
      repeat: "none",
      intervalDays: 2,
      preAlert: 0,
      preSent: false,
    };
    bloc.markWholeNote(file, alarm.id);
    bloc.state.alarms.push(alarm);
    bloc.save();
    bloc.render();
    document.getElementById("status").textContent = `Programado para ${bloc.formatLong(when)}.`;
  }

  function wireSnoozeChips() {
    const bloc = B();
    if (!bloc) return;
    const wrap = document.getElementById("post-chips");
    if (!wrap) return;
    const order = ["10", "60", "tomorrow"];
    const fav = bloc.state.lastSnoozeQuick || "10";
    const sorted = [fav, ...order.filter((v) => v !== fav)];
    wrap.innerHTML = sorted.map((v) => {
      const labels = { 10: "Dentro de 10 min", 60: "Dentro de 1 hora", tomorrow: "Mañana, misma hora" };
      return `<button type="button" data-quick="${v}">${labels[v]}</button>`;
    }).join("");
  }

  function cycleHit(step) {
    const hits = [...document.querySelectorAll("mark.hit")];
    if (!hits.length) return;
    hitIndex = (hitIndex + step + hits.length) % hits.length;
    hits.forEach((h, i) => h.classList.toggle("hit-active", i === hitIndex));
    hits[hitIndex].scrollIntoView({ block: "center", behavior: "smooth" });
  }

  window.setBlocReadOnly = function setReadOnly(on) {
    readOnlyFocus = on;
    const title = document.getElementById("file-title");
    const body = document.getElementById("body");
    const frozen = on || B()?.state.lockEdit === true;
    title.contentEditable = frozen ? "false" : "true";
    body.contentEditable = frozen ? "false" : "true";
    document.getElementById("focus-readonly")?.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("focus-readonly", on);
  };

  window.syncBlocChrome = function syncBlocChrome() {
    const bloc = B();
    if (!bloc) return;
    applyTheme(bloc.state.theme || "light");
    applyMenuShortcuts();
    wireSnoozeChips();
    renderTemplateBar();
  };

  function bindOnce() {
    if (wired) return;
    const bloc = B();
    if (!bloc) return;
    wired = true;

    applyTheme(bloc.state.theme || "light");
    applyMenuShortcuts();
    bindToolDrag();
    renderTemplateBar();

    document.getElementById("theme-dark")?.addEventListener("click", () => {
      const dark = bloc.state.theme !== "dark";
      bloc.state.theme = dark ? "dark" : "light";
      bloc.save();
      applyTheme(bloc.state.theme);
    });
    document.getElementById("shortcut-export")?.addEventListener("click", () => {
      bloc.state.showExport = bloc.state.showExport === false;
      bloc.save();
      applyMenuShortcuts();
    });
    document.getElementById("shortcut-import")?.addEventListener("click", () => {
      bloc.state.showImport = bloc.state.showImport === false;
      bloc.save();
      applyMenuShortcuts();
    });
    document.getElementById("shortcut-hide-tools")?.addEventListener("click", () => {
      bloc.state.hideTools = bloc.state.hideTools !== true;
      bloc.save();
      applyToolChrome();
    });
    document.getElementById("tool-color")?.addEventListener("click", () => {
      if (bloc.state.hideTools) return;
      if (bloc.state.toolColor === false) {
        bloc.state.toolColor = true;
        bloc.save();
        paintEditTools();
        bloc.openAppColor?.();
        return;
      }
      bloc.state.toolColor = false;
      bloc.save();
      applyToolChrome();
    });
    document.getElementById("tool-delete")?.addEventListener("click", () => {
      if (bloc.state.hideTools) return;
      bloc.state.toolDelete = bloc.state.toolDelete === false;
      bloc.save();
      paintEditTools();
    });
    document.getElementById("tool-copy")?.addEventListener("click", () => {
      if (bloc.state.hideTools) return;
      bloc.state.toolCopy = bloc.state.toolCopy === false;
      bloc.save();
      paintEditTools();
    });
    document.getElementById("tool-repeat")?.addEventListener("click", async () => {
      if (bloc.state.hideTools) return;
      const next = bloc.state.toolRepeat !== true;
      const ok = await askSure(next
        ? "El texto que elijas se puede repetir en los días del aviso. ¿Activar repetir texto?"
        : "Los avisos nuevos quedan en un solo día. ¿Quitar repetir texto?");
      if (!ok) return;
      bloc.state.toolRepeat = next;
      bloc.save();
      paintEditTools();
    });
    document.getElementById("tool-lock-edit")?.addEventListener("click", () => {
      if (bloc.state.hideTools) return;
      bloc.state.lockEdit = bloc.state.lockEdit !== true;
      bloc.save();
      paintEditTools();
      bloc.render();
    });
    document.getElementById("tool-applock")?.addEventListener("click", () => {
      if (bloc.state.hideTools) return;
      bloc.askMasterForAppLock?.(bloc.state.appLock !== true);
    });
    document.getElementById("edit-sec")?.addEventListener("click", (e) => {
      const info = e.target.closest(".info-ico");
      if (!info) return;
      e.preventDefault();
      e.stopPropagation();
      const heading = document.getElementById("info-heading");
      const text = document.getElementById("info-text");
      const modal = document.getElementById("info-modal");
      if (heading) heading.textContent = info.getAttribute("aria-label") || "Información";
      if (text) text.textContent = info.dataset.info || "";
      if (modal) modal.hidden = false;
    });
    document.getElementById("shortcuts-page")?.addEventListener("click", (e) => {
      const box = e.target.closest("[data-bar]");
      if (!box || (bloc.state.hideTools && box.closest("#bar-sec"))) return;
      const key = box.dataset.bar;
      bloc.state.barTools = { ...(bloc.state.barTools || {}) };
      bloc.state.barTools[key] = bloc.state.barTools[key] === false;
      bloc.save();
      paintBarTools();
    });
    document.getElementById("tool-ink")?.addEventListener("input", (e) => {
      bloc.editCommand?.("foreColor", e.target.value);
    });
    document.getElementById("tool-mark")?.addEventListener("input", (e) => {
      bloc.editCommand?.("hiliteColor", e.target.value);
    });
    document.getElementById("tool-image")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) bloc.insertNoteFile?.(file, true);
      e.target.value = "";
    });
    document.getElementById("tool-file")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) bloc.insertNoteFile?.(file, false);
      e.target.value = "";
    });
    document.getElementById("tool-scroll")?.addEventListener("click", async (e) => {
      if (e.defaultPrevented) return;
      const swatch = e.target.closest("[data-ink]");
      if (swatch && bloc.state.lockEdit !== true) {
        bloc.editCommand?.("foreColor", (bloc.state.inkShortcuts || [])[Number(swatch.dataset.ink)] || "#1a1814");
        return;
      }
      const btn = e.target.closest("[data-tool]");
      if (!btn || bloc.state.lockEdit === true) return;
      const tool = btn.dataset.tool;
      if (tool === "bold") bloc.editCommand?.("bold");
      else if (tool === "italic") bloc.editCommand?.("italic");
      else if (tool === "strike") bloc.editCommand?.("strikeThrough");
      else if (tool === "under") bloc.editCommand?.("underline");
      else if (tool === "clear") bloc.editCommand?.("removeFormat");
      else if (tool === "ol") bloc.editCommand?.("insertOrderedList");
      else if (tool === "ul") bloc.editCommand?.("insertUnorderedList");
      else if (tool === "check") bloc.editCommand?.("insertText", "☐ ");
      else if (tool === "align") bloc.cycleAlign?.();
      else if (tool === "font") bloc.cycleFont?.();
      else if (tool === "ink") document.getElementById("tool-ink")?.click();
      else if (tool === "mark") document.getElementById("tool-mark")?.click();
      else if (tool === "image") document.getElementById("tool-image")?.click();
      else if (tool === "file") document.getElementById("tool-file")?.click();
      else if (tool === "find") document.getElementById(document.body.classList.contains("focus-open") ? "focus-search" : "search")?.focus();
      else if (tool === "copy") {
        if (bloc.state.toolCopy === false) return;
        const file = bloc.state.files.find((item) => item.id === bloc.state.openId);
        if (!file) return;
        const text = `${bloc.plain(file.title)}\n${bloc.plain(file.body)}`.trim();
        if (!text) return;
        try { await navigator.clipboard.writeText(text); } catch { /* sin permiso */ }
      }
    });
    document.getElementById("open-tool-order")?.addEventListener("click", openToolOrder);
    document.getElementById("tool-order-list")?.addEventListener("click", (e) => {
      const up = e.target.closest("[data-up]");
      const down = e.target.closest("[data-down]");
      const id = up?.dataset.up || down?.dataset.down;
      if (!id || bloc.state.hideTools) return;
      const saved = Array.isArray(bloc.state.toolOrder) ? bloc.state.toolOrder.filter((item) => TOOL_IDS.includes(item)) : [];
      const ids = [...saved, ...TOOL_IDS.filter((item) => !saved.includes(item))];
      const index = ids.indexOf(id);
      const next = up ? index - 1 : index + 1;
      if (index < 0 || next < 0 || next >= ids.length) return;
      [ids[index], ids[next]] = [ids[next], ids[index]];
      bloc.state.toolOrder = ids;
      bloc.save();
      orderTools();
      paintToolOrder();
    });
    document.getElementById("tool-autohide")?.addEventListener("click", () => {
      bloc.state.autoHideBar = bloc.state.autoHideBar !== true;
      bloc.save();
      paintBarTools();
      syncAutoBar();
    });
    document.getElementById("tool-color-shortcuts")?.addEventListener("click", () => {
      bloc.state.colorShortcuts = bloc.state.colorShortcuts !== true;
      bloc.save();
      paintBarTools();
    });
    ["ink-1", "ink-2", "ink-3"].forEach((id, index) => {
      document.getElementById(id)?.addEventListener("input", (e) => {
        const colors = [...(bloc.state.inkShortcuts || ["#c45b52", "#1a1814", "#2f6f4e"])];
        colors[index] = e.target.value;
        bloc.state.inkShortcuts = colors;
        bloc.save();
        paintBarTools();
      });
    });
    document.getElementById("bar-size")?.addEventListener("input", (e) => {
      bloc.state.toolSize = Number(e.target.value);
      const other = document.getElementById("tool-size");
      if (other) other.value = e.target.value;
      bloc.save();
      applyToolChrome();
    });
    function syncAutoBar() {
      const typing = bloc.state.autoHideBar === true && bloc.state.hideTools !== true;
      const field = document.activeElement;
      const writing = field && (field.id === "file-title" || field.id === "body");
      const sel = document.getSelection();
      const selecting = Boolean(sel && !sel.isCollapsed && writing);
      document.body.classList.toggle("bar-auto-hide", Boolean(typing && writing && !selecting));
    }
    document.addEventListener("focusin", syncAutoBar);
    document.addEventListener("focusout", () => setTimeout(syncAutoBar, 0));
    document.addEventListener("selectionchange", syncAutoBar);
    document.getElementById("shortcut-hide-editor")?.addEventListener("click", () => {
      bloc.state.hideEditor = bloc.state.hideEditor !== true;
      bloc.save();
      applyToolChrome();
    });

    const appMenu = document.getElementById("app-menu");
    document.getElementById("btn-app-menu")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!appMenu) return;
      if (!appMenu.hidden) {
        closeAppMenu();
        return;
      }
      const role = (() => { try { return JSON.parse(localStorage.getItem("bloc-cuenta") || "null")?.role; } catch { return ""; } })();
      const cuenta = appMenu.querySelector("#btn-account .info-ico");
      if (cuenta) {
        cuenta.dataset.info = role === "admin"
          ? "Entra a la cuenta, cambia la contraseña, crea usuarios y marcas superusuarios."
          : role === "super"
            ? "Entra a la cuenta, cambia la contraseña y crea los usuarios que dependen de ti."
            : "Entra a la cuenta y cambia la contraseña.";
      }
      appMenu.hidden = false;
      appMenu.style.width = "";
      appMenu.style.left = "0";
      appMenu.style.top = "0";
      document.body.classList.add("app-menu-open");
      e.currentTarget.setAttribute("aria-expanded", "true");
    });
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest("#info-modal")) return;
      if (!appMenu?.hidden && !appMenu.contains(e.target) && e.target.id !== "btn-app-menu" && !e.target.closest("#btn-app-menu")) closeAppMenu();
    });
    appMenu?.addEventListener("click", (e) => {
      const info = e.target.closest(".info-ico");
      if (!info) return;
      e.preventDefault();
      e.stopPropagation();
      const row = info.closest("button");
      const name = row?.querySelector("span:not(.menu-ico):not(.info-ico)")?.textContent?.trim() || "Información";
      const heading = document.getElementById("info-heading");
      const text = document.getElementById("info-text");
      const modal = document.getElementById("info-modal");
      if (heading) heading.textContent = name;
      if (text) text.textContent = info.dataset.info || "";
      if (modal) modal.hidden = false;
    }, true);
    document.getElementById("info-close")?.addEventListener("click", () => {
      const modal = document.getElementById("info-modal");
      if (modal) modal.hidden = true;
    });
    document.getElementById("info-modal")?.addEventListener("pointerdown", (e) => {
      if (e.target.id === "info-modal") e.currentTarget.hidden = true;
    });
    function goHome() {
      if (document.body.classList.contains("tool-order-open")) {
        closeToolOrder();
        return;
      }
      if (document.body.classList.contains("shortcuts-open")) {
        closeShortcuts();
        return;
      }
      const api = B();
      if (api?.state.focusOpen) {
        api.closeFocus();
        return;
      }
      if (window.matchMedia("(max-width: 700px)").matches && api?.state.openId) {
        api.state.openId = null;
        api.save();
        api.render();
        return;
      }
      if (api && api.state.listView !== "active") {
        api.state.listView = "active";
        api.save();
        api.render();
      }
      window.closeBlocAccount?.();
      window.closeBlocPay?.();
      window.closeBlocShortcuts?.();
    }
    document.getElementById("btn-back-home")?.addEventListener("click", goHome);
    appMenu?.addEventListener("click", (e) => {
      if (e.target.closest(".info-ico")) return;
      const kind = e.target.closest("[data-menu]")?.dataset.menu;
      if (kind === "home") goHome();
      if (kind === "export") exportCopy();
      if (kind === "import") document.getElementById("import-file")?.click();
      if (kind === "editor") openTemplateLook();
      if (kind === "account") window.openBlocAccount?.();
      if (kind === "pay") window.openBlocPay?.();
      if (kind === "shortcuts") window.openBlocShortcuts?.();
      if (kind && kind !== "account" && kind !== "pay" && kind !== "shortcuts") {
        window.closeBlocAccount?.();
        window.closeBlocPay?.();
      }
      if (kind) closeAppMenu();
    });
    document.getElementById("toggle-archived")?.addEventListener("click", () => closeAppMenu());
    document.getElementById("toggle-trash")?.addEventListener("click", () => closeAppMenu());

    const templateBar = document.getElementById("template-bar");
    let tplSuppress = false;
    const templateAll = document.getElementById("template-all");
    const templateMore = document.getElementById("template-more");
    window.addEventListener("resize", () => fitTemplates());
    templateAll?.addEventListener("input", (e) => {
      const field = e.target.closest("#template-find");
      if (!field) return;
      const query = field.value.trim().toLocaleLowerCase("es");
      templateAll.querySelectorAll("[data-template]").forEach((button) => {
        button.hidden = Boolean(query) && !button.textContent.toLocaleLowerCase("es").includes(query);
      });
    });
    const placeTemplateMenu = () => {
      const page = document.querySelector(".list-page");
      if (!templateAll || !page || templateAll.hidden) return;
      const pageBox = page.getBoundingClientRect();
      const moreBox = templateMore.getBoundingClientRect();
      const width = Math.max(220, pageBox.width - 16);
      let left = pageBox.left + 8;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
      let top = moreBox.bottom + 6;
      const height = Math.min(templateAll.scrollHeight, Math.min(420, window.innerHeight - 24));
      if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
      templateAll.style.top = `${top}px`;
      templateAll.style.left = `${left}px`;
      templateAll.style.width = `${width}px`;
    };
    const setTplMenu = (open) => {
      if (templateAll) templateAll.hidden = !open;
      templateMore?.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("tpl-menu-open", open);
    };
    templateMore?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!templateAll) return;
      templateAll.hidden = !templateAll.hidden;
      setTplMenu(!templateAll.hidden);
      if (!templateAll.hidden) requestAnimationFrame(placeTemplateMenu);
    });
    window.addEventListener("resize", placeTemplateMenu);
    document.addEventListener("pointerdown", (e) => {
      if (!templateAll || templateAll.hidden) return;
      if (e.target.closest("#template-all") || e.target.closest("#template-more")) return;
      setTplMenu(false);
    });

    templateBar?.addEventListener("click", (e) => {
      if (tplSuppress) return;
      const btn = e.target.closest("[data-template]");
      if (!btn) return;
      bloc.selectTemplate(btn.dataset.template);
      if (templateAll) setTplMenu(false);
      templateMore?.setAttribute("aria-expanded", "false");
    });

    templateBar?.addEventListener("contextmenu", (e) => {
      const btn = e.target.closest("[data-template]");
      if (!btn) return;
      e.preventDefault();
      tplSuppress = true;
      setTimeout(() => { tplSuppress = false; }, 500);
      openTemplateMenu(btn.dataset.template, e.clientX, e.clientY);
    });

    templateBar?.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest("[data-template]");
      if (!btn || e.pointerType === "mouse") return;
      const id = btn.dataset.template;
      const x = e.clientX;
      const y = e.clientY;
      tplPress = {
        x,
        y,
        timer: setTimeout(() => {
          tplSuppress = true;
          setTimeout(() => { tplSuppress = false; }, 700);
          if (navigator.vibrate) navigator.vibrate(18);
          openTemplateMenu(id, x, y);
        }, 560),
      };
    });

    function cancelTplPress() {
      if (!tplPress) return;
      clearTimeout(tplPress.timer);
      tplPress = null;
    }

    templateBar?.addEventListener("pointerup", cancelTplPress);
    templateBar?.addEventListener("pointercancel", cancelTplPress);
    templateBar?.addEventListener("pointermove", (e) => {
      if (!tplPress) return;
      if (Math.hypot(e.clientX - tplPress.x, e.clientY - tplPress.y) > 12) cancelTplPress();
    });

    function sortedTemplateIds() {
      return Object.entries(bloc.state.templates).filter(([, tpl]) => tpl && !tpl.deletedAt && !tpl.purged).sort((a, b) => (a[1].order || 0) - (b[1].order || 0)).map(([id]) => id);
    }

    function moveTemplate(id, position) {
      const ids = sortedTemplateIds().filter((item) => item !== id);
      const index = Math.max(0, Math.min(Number(position) || 1, ids.length + 1) - 1);
      ids.splice(index, 0, id);
      ids.forEach((item, itemIndex) => { bloc.state.templates[item].order = itemIndex + 1; });
    }

    function openTemplateQuick(action) {
      const id = tplMenuId;
      const tpl = bloc.state.templates?.[id];
      if (!tpl) return;
      closeTemplateMenu();
      const modal = document.getElementById("tpl-quick-modal");
      const heading = document.getElementById("tpl-quick-heading");
      const colorField = document.getElementById("tpl-quick-color-field");
      const numberField = document.getElementById("tpl-quick-number-field");
      const textField = document.getElementById("tpl-quick-text-field");
      modal.dataset.action = action;
      modal.dataset.tplId = id;
      colorField.hidden = action !== "color";
      numberField.hidden = action !== "order";
      textField.hidden = action !== "text";
      if (action === "color") {
        heading.textContent = "Cambiar color";
        bloc.setColorPair("tpl-quick-color", "tpl-quick-hex", tpl.color);
      } else if (action === "order") {
        heading.textContent = "Cambiar posición";
        const total = sortedTemplateIds().length;
        document.getElementById("tpl-quick-number").value = String(tpl.order || 1);
        document.getElementById("tpl-quick-number").max = String(total);
      } else {
        heading.textContent = "Cambiar título";
        document.getElementById("tpl-quick-text").value = tpl.title || tpl.label || "";
      }
      modal.hidden = false;
    }

    document.getElementById("template-menu")?.addEventListener("click", (e) => {
      const action = e.target.closest("[data-tpl-action]")?.dataset.tplAction;
      if (!action || !tplMenuId) return;
      if (action === "edit") {
        openTemplateEditor(tplMenuId);
        return;
      }
      if (action === "delete") {
        const id = tplMenuId;
        const name = bloc.state.templates[id]?.label || "esta plantilla";
        closeTemplateMenu();
        if (bloc.state.confirmDelete !== false && !bloc.confirmTwice(
          `¿Eliminar «${name}» y sus notas?`,
          "Segunda confirmación. Pasan a eliminados durante 30 días."
        )) return;
        bloc.deleteTemplate(id);
        return;
      }
      openTemplateQuick(action);
    });
    document.getElementById("tpl-quick-close")?.addEventListener("click", () => {
      document.getElementById("tpl-quick-modal").hidden = true;
    });
    document.getElementById("tpl-quick-modal")?.addEventListener("pointerdown", (e) => {
      if (e.target.id === "tpl-quick-modal") document.getElementById("tpl-quick-modal").hidden = true;
    });
    document.getElementById("tpl-quick-palette")?.addEventListener("click", (e) => {
      const color = e.target.closest("[data-quick-color]")?.dataset.quickColor;
      const id = document.getElementById("tpl-quick-modal")?.dataset.tplId;
      if (!color || !id || !bloc.state.templates[id]) return;
      bloc.state.templates[id].color = color;
      paintTemplateNotes(bloc, id);
      bloc.save();
      document.getElementById("tpl-quick-modal").hidden = true;
      renderTemplateBar();
    });
    document.getElementById("tpl-quick-save")?.addEventListener("click", () => {
      const modal = document.getElementById("tpl-quick-modal");
      const id = modal.dataset.tplId;
      const tpl = bloc.state.templates?.[id];
      if (!tpl) return;
      if (modal.dataset.action === "order") {
        moveTemplate(id, document.getElementById("tpl-quick-number").value);
      } else if (modal.dataset.action === "color") {
        tpl.color = bloc.readColorPair("tpl-quick-color", "tpl-quick-hex");
        paintTemplateNotes(bloc, id);
      } else {
        const text = document.getElementById("tpl-quick-text").value.trim();
        if (!text) {
          alert("Escribe el título.");
          return;
        }
        tpl.label = text;
        tpl.title = text;
      }
      bloc.save();
      modal.hidden = true;
      renderTemplateBar();
    });

    document.getElementById("tpl-look-close")?.addEventListener("click", closeTemplateLook);
    document.getElementById("tpl-look-modal")?.addEventListener("pointerdown", (e) => {
      if (e.target.id === "tpl-look-modal") closeTemplateLook();
    });
    document.getElementById("tpl-size")?.addEventListener("input", (e) => {
      const size = Number(e.target.value);
      bloc.state.templateLook = { ...(bloc.state.templateLook || {}), size };
      bloc.save();
      applyTemplateLook();
    });
    document.getElementById("note-gap")?.addEventListener("input", (e) => {
      bloc.state.noteGap = Number(e.target.value);
      bloc.save();
      applyTemplateLook();
    });
    document.getElementById("note-font")?.addEventListener("input", (e) => {
      bloc.state.noteFont = Number(e.target.value);
      bloc.save();
      applyTemplateLook();
    });
    document.getElementById("note-line")?.addEventListener("input", (e) => {
      bloc.state.noteLine = Number(e.target.value);
      bloc.save();
      applyTemplateLook();
    });
    document.getElementById("note-width")?.addEventListener("input", (e) => {
      bloc.state.noteWidth = Number(e.target.value);
      bloc.save();
      applyTemplateLook();
    });
    document.getElementById("card-size")?.addEventListener("input", (e) => {
      bloc.state.cardSize = Number(e.target.value);
      bloc.save();
      applyTemplateLook();
    });
    document.getElementById("tool-size")?.addEventListener("input", (e) => {
      bloc.state.toolSize = Number(e.target.value);
      bloc.save();
      applyToolChrome();
    });
    document.getElementById("alarm-sound")?.addEventListener("change", async (e) => {
      const next = e.target.checked;
      e.target.checked = !next;
      const ok = await askSure(next ? "¿Activar el sonido de los avisos?" : "¿Quitar el sonido de los avisos?");
      if (!ok) return;
      e.target.checked = next;
      bloc.state.sound = next;
      bloc.save();
    });
    document.getElementById("alarm-continuous")?.addEventListener("change", async (e) => {
      const next = e.target.checked;
      e.target.checked = !next;
      const ok = await askSure(next ? "¿Dejar el sonido continuo? El aviso se repite hasta que lo pares." : "¿Quitar el sonido continuo?");
      if (!ok) return;
      e.target.checked = next;
      bloc.state.alarmContinuous = next;
      const extra = document.getElementById("alarm-continuous-opts");
      if (extra) extra.hidden = !next;
      bloc.save();
    });
    document.getElementById("show-panel")?.addEventListener("change", async (e) => {
      const next = e.target.checked;
      e.target.checked = !next;
      const side = bloc.state.showDetail !== false;
      const text = side
        ? "Ahora, al tocar una nota, se abre en el panel de al lado. Un doble toque la abre a pantalla completa. ¿Quitar el panel y abrir cada nota a pantalla completa?"
        : "Ahora, al tocar una nota, se abre a pantalla completa. ¿Volver a abrirla en el panel de al lado? El doble toque sigue abriéndola a pantalla completa.";
      const ok = await askSure(text);
      if (!ok) return;
      e.target.checked = next;
      bloc.state.showDetail = next;
      bloc.save();
      bloc.render();
    });
    document.getElementById("ask-password")?.addEventListener("change", (e) => {
      const next = e.target.checked;
      e.target.checked = bloc.state.askPasswordEvery === true;
      window.askMasterForSetting?.(next);
    });
    document.getElementById("confirm-delete")?.addEventListener("change", (e) => {
      bloc.state.confirmDelete = e.target.checked;
      bloc.save();
    });
    document.getElementById("no-templates")?.addEventListener("change", async (e) => {
      const next = e.target.checked;
      if (next) {
        e.target.checked = false;
        const ok = await askSure("¿Ocultar las plantillas? Las notas se juntan. Al volver a mostrarlas, las que no tengan plantilla quedan en Otros.");
        if (!ok) return;
        e.target.checked = true;
      }
      bloc.setNoTemplates(next);
      renderTemplateBar();
    });
    document.getElementById("note-lines")?.addEventListener("change", (e) => {
      bloc.state.noteLines = e.target.checked;
      document.body.classList.toggle("note-lines", e.target.checked);
      bloc.save();
    });
    document.getElementById("hide-note-alarms")?.addEventListener("change", (e) => {
      bloc.state.hideNoteAlarms = e.target.checked;
      document.body.classList.toggle("hide-note-alarms", e.target.checked);
      bloc.save();
    });
    document.getElementById("offline-mode")?.addEventListener("change", (e) => {
      bloc.state.offlineMode = e.target.checked;
      bloc.save();
    });
    document.getElementById("offline-info")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const heading = document.getElementById("info-heading");
      const text = document.getElementById("info-text");
      const modal = document.getElementById("info-modal");
      if (heading) heading.textContent = "Usar sin internet";
      if (text) text.textContent = "En la web esta opción no cambia nada. En la aplicación del celular sí: el bloc sigue funcionando sin internet y, al volver la conexión con el computador, las notas se sincronizan. Si el computador también cambió algo, las dos informaciones se juntan.";
      if (modal) modal.hidden = false;
    });
    document.getElementById("show-info")?.addEventListener("change", (e) => {
      bloc.state.showInfo = e.target.checked;
      document.body.classList.toggle("hide-info", !e.target.checked);
      bloc.save();
    });

    bloc.bindColorPair("tpl-quick-color", "tpl-quick-hex");
    const paintQuickColor = () => {
      const modal = document.getElementById("tpl-quick-modal");
      const id = modal?.dataset.tplId;
      const tpl = bloc.state.templates?.[id];
      if (!tpl || modal.dataset.action !== "color" || modal.hidden) return;
      tpl.color = bloc.readColorPair("tpl-quick-color", "tpl-quick-hex");
      paintTemplateNotes(bloc, id);
      bloc.save();
      bloc.render();
      renderTemplateBar();
    };
    document.getElementById("tpl-quick-color")?.addEventListener("input", paintQuickColor);
    document.getElementById("tpl-quick-hex")?.addEventListener("input", paintQuickColor);
    document.getElementById("tpl-quick-text")?.addEventListener("input", () => {
      const modal = document.getElementById("tpl-quick-modal");
      const tpl = bloc.state.templates?.[modal?.dataset.tplId];
      const text = document.getElementById("tpl-quick-text").value.trim();
      if (!tpl || modal.dataset.action !== "text" || !text) return;
      tpl.label = text;
      tpl.title = text;
      bloc.save();
      renderTemplateBar();
    });
    document.getElementById("tpl-quick-number")?.addEventListener("input", () => {
      const modal = document.getElementById("tpl-quick-modal");
      if (!modal || modal.hidden || modal.dataset.action !== "order") return;
      moveTemplate(modal.dataset.tplId, document.getElementById("tpl-quick-number").value);
      bloc.save();
      renderTemplateBar();
    });
    bloc.bindColorPair("tpl-new-color", "tpl-new-hex");
    document.getElementById("btn-add-template")?.addEventListener("click", openNewTemplate);
    document.getElementById("tpl-new-close")?.addEventListener("click", closeNewTemplate);
    document.getElementById("tpl-new-save")?.addEventListener("click", () => {
      const modal = document.getElementById("tpl-new-modal");
      const name = document.getElementById("tpl-new-name").value.trim();
      if (!name) {
        alert("Escribe un nombre.");
        return;
      }
      const color = bloc.readColorPair("tpl-new-color", "tpl-new-hex");
      const id = crypto.randomUUID();
      bloc.state.templates[id] = { label: name, title: name, body: "", color, order: 1, deletedAt: null, math: document.getElementById("tpl-new-math")?.checked === true, calendar: document.getElementById("tpl-new-calendar")?.checked === true };
      moveTemplate(id, document.getElementById("tpl-new-order").value);
      bloc.state.activeTemplate = id;
      bloc.state.listView = "active";
      bloc.state.openId = null;
      if (!bloc.state.noTemplates) bloc.parkLooseNotes();
      bloc.save();
      closeNewTemplate();
      renderTemplateBar();
    });
    document.getElementById("tpl-new-modal")?.addEventListener("pointerdown", (e) => {
      if (e.target.id === "tpl-new-modal") closeNewTemplate();
    });

    document.getElementById("tpl-close")?.addEventListener("click", closeTemplateEditor);
    document.getElementById("tpl-math")?.addEventListener("change", (e) => {
      const bloc = B();
      const id = document.getElementById("template-modal")?.dataset.tplId;
      const tpl = bloc?.state?.templates?.[id];
      if (!tpl) return;
      tpl.math = e.target.checked;
      bloc.save();
      bloc.render();
    });
    document.getElementById("tpl-calendar")?.addEventListener("change", (e) => {
      const bloc = B();
      const id = document.getElementById("template-modal")?.dataset.tplId;
      const tpl = bloc?.state?.templates?.[id];
      if (!tpl) return;
      tpl.calendar = e.target.checked;
      bloc.save();
    });
    document.getElementById("tpl-save")?.addEventListener("click", () => {
      const modal = document.getElementById("template-modal");
      const id = modal?.dataset.tplId;
      if (!id || !bloc.state.templates?.[id]) return;
      const label = document.getElementById("tpl-label").value.trim();
      const title = document.getElementById("tpl-title").value.trim();
      const body = document.getElementById("tpl-body").value.trim();
      if (!title) {
        alert("El título no puede estar vacío.");
        return;
      }
      const previous = bloc.state.templates[id];
      bloc.state.templates[id] = {
        label: label || title,
        title,
        body: body || "",
        color: previous.color,
        order: previous.order,
        deletedAt: previous.deletedAt || null,
        purged: Boolean(previous.purged),
        math: document.getElementById("tpl-math")?.checked === true,
        calendar: document.getElementById("tpl-calendar")?.checked === true,
      };
      bloc.save();
      closeTemplateEditor();
      renderTemplateBar();
      bloc.render();
    });
    document.getElementById("template-modal")?.addEventListener("pointerdown", (e) => {
      if (e.target.id === "template-modal") closeTemplateEditor();
    });

    document.addEventListener("pointerdown", (e) => {
      const menu = document.getElementById("template-menu");
      if (!menu?.hidden && !menu.contains(e.target) && !e.target.closest("[data-template]")) closeTemplateMenu();
    });

    document.getElementById("cal-upcoming")?.addEventListener("click", (e) => {
      const button = e.target.closest("[data-open]");
      if (!button) return;
      const file = bloc.state.files.find((f) => f.id === button.dataset.open);
      if (!file) return;
      bloc.state.listView = file.deletedAt ? "trash" : file.archived ? "archived" : "active";
      bloc.state.openId = file.id;
      bloc.save();
      if (typeof closeCalendar === "function") closeCalendar();
      bloc.render();
    });

    document.getElementById("cal-repeat")?.addEventListener("change", (e) => {
      const wrap = document.getElementById("cal-interval-wrap");
      if (wrap) wrap.hidden = e.target.value !== "interval";
    });

    document.getElementById("cal-time")?.addEventListener("change", () => {
      document.dispatchEvent(new Event("bloc-recal"));
    });
    document.addEventListener("bloc-recal", () => {
      if (typeof renderCalendar === "function") renderCalendar();
    });

    document.getElementById("focus-search")?.addEventListener("input", () => { hitIndex = 0; });

    document.getElementById("btn-empty-trash")?.addEventListener("click", () => {
      if (!bloc.confirmTwice(
        "¿Vaciar eliminados? Esas notas se borrarán ahora y no a los 30 días.",
        "Segunda confirmación. Esto no se puede deshacer."
      )) return;
      const ids = new Set(bloc.state.files.filter((f) => f.deletedAt).map((f) => f.id));
      bloc.state.files = bloc.state.files.filter((f) => !f.deletedAt);
      bloc.state.alarms = bloc.state.alarms.filter((a) => !ids.has(a.fileId));
      if (ids.has(bloc.state.openId)) bloc.state.openId = null;
      bloc.save();
      bloc.render();
    });

    document.getElementById("import-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        Object.assign(bloc.state, data);
        if (!Array.isArray(bloc.state.files)) bloc.state.files = [];
        if (!Array.isArray(bloc.state.alarms)) bloc.state.alarms = [];
        if (!bloc.state.templates) bloc.state.templates = structuredClone(bloc.DEFAULT_TEMPLATES);
        bloc.save();
        bloc.render();
        alert("Copia importada.");
      } catch {
        alert("No se pudo leer el archivo.");
      }
      e.target.value = "";
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (typeof rememberFile === "function") rememberFile();
      }
      if (e.key === "Escape") {
        closeTemplateMenu();
        closeTemplateEditor();
        closeNewTemplate();
        closeTemplateLook();
      }
    });
  }

  const wait = setInterval(() => {
    if (!window.Bloc) return;
    clearInterval(wait);
    bindOnce();
    window.syncBlocChrome();
    if (window.Bloc.state.shortcutsOpen) openShortcuts();
  }, 30);
})();
