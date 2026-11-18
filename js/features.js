(() => {
  const B = () => window.Bloc;
  let hitIndex = 0;
  let readOnlyFocus = false;
  let wired = false;
  let tplMenuId = null;
  let tplPress = null;

  const themeMoon = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M14.8 3.1A8.4 8.4 0 1 0 20.9 15 6.7 6.7 0 0 1 14.8 3.1z"/></svg>`;
  const themeSun = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="3.3" fill="#fff"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" d="M12 3.2v2.1M12 18.7V21M4.5 4.5l1.5 1.5M18 18l1.5 1.5M3.2 12h2.1M18.7 12H21M4.5 19.5 6 18M18 6l1.5-1.5"/></svg>`;

  function applyTheme(theme) {
    document.body.classList.toggle("theme-dark", theme === "dark");
    const btn = document.getElementById("btn-theme");
    const icon = document.getElementById("theme-icon");
    const dark = theme === "dark";
    if (icon) icon.innerHTML = dark ? themeSun : themeMoon;
    if (btn) {
      btn.setAttribute("aria-pressed", String(dark));
      btn.setAttribute("aria-label", dark ? "Tema claro" : "Tema oscuro");
    }
  }

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
    const edge = wrap.getBoundingClientRect().right;
    const overflow = buttons.filter((button) => button.getBoundingClientRect().right > edge + 1);
    overflow.forEach((button) => { button.hidden = true; });
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
    const fullBox = document.getElementById("open-full");
    if (fullBox) fullBox.checked = bloc.state.showDetail === false;
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
    title.contentEditable = on ? "false" : "true";
    body.contentEditable = on ? "false" : "true";
    document.getElementById("focus-readonly")?.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("focus-readonly", on);
  };

  window.syncBlocChrome = function syncBlocChrome() {
    const bloc = B();
    if (!bloc) return;
    applyTheme(bloc.state.theme || "light");
    wireSnoozeChips();
    renderTemplateBar();
  };

  function bindOnce() {
    if (wired) return;
    const bloc = B();
    if (!bloc) return;
    wired = true;

    applyTheme(bloc.state.theme || "light");
    renderTemplateBar();

    document.getElementById("btn-theme")?.addEventListener("click", () => {
      bloc.state.theme = bloc.state.theme === "dark" ? "light" : "dark";
      bloc.save();
      applyTheme(bloc.state.theme);
      closeAppMenu();
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
    }
    document.getElementById("btn-back-home")?.addEventListener("click", goHome);
    appMenu?.addEventListener("click", (e) => {
      const kind = e.target.closest("[data-menu]")?.dataset.menu;
      if (kind === "home") goHome();
      if (kind === "export") exportCopy();
      if (kind === "import") document.getElementById("import-file")?.click();
      if (kind === "editor") openTemplateLook();
      if (kind === "account") window.openBlocAccount?.();
      if (kind === "pay") window.openBlocPay?.();
      if (kind && kind !== "account" && kind !== "pay") {
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
    document.getElementById("open-full")?.addEventListener("change", (e) => {
      bloc.state.showDetail = !e.target.checked;
      const panel = document.getElementById("show-panel");
      if (panel) panel.checked = !e.target.checked;
      if (!e.target.checked && panel) panel.checked = true;
      bloc.save();
      bloc.render();
    });
    document.getElementById("show-panel")?.addEventListener("change", (e) => {
      bloc.state.showDetail = e.target.checked;
      const full = document.getElementById("open-full");
      if (full) full.checked = !e.target.checked;
      if (!e.target.checked && full) full.checked = true;
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
      bloc.state.templates[id] = { label: name, title: name, body: "", color, order: 1, deletedAt: null, math: document.getElementById("tpl-new-math")?.checked === true };
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
  }, 30);
})();
