(() => {
  const SESSION_KEY = "bloc-cuenta";
  const BACKUP_KEY = "bloc-copias-v1";
  const REV_KEY = "bloc-rev";
  let quiet = false;
  let pushing = false;
  let pending = false;
  let replaceNext = false;
  let timer = null;

  const bloc = () => window.Bloc;

  function session() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveSession(next) {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }

  function rev() {
    return Number(localStorage.getItem(REV_KEY) || 0);
  }

  function setRev(value) {
    localStorage.setItem(REV_KEY, String(value));
  }

  function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function backupStorageKey() {
    const current = session();
    const who = (current?.email || current?.username || "").toLowerCase();
    return who ? `${BACKUP_KEY}:${who}` : BACKUP_KEY;
  }

  function backups() {
    try {
      const data = JSON.parse(localStorage.getItem(backupStorageKey()) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function backupKey(item) {
    return item.manual && item.id ? item.id : item.date;
  }

  function writeBackups(items) {
    const byKey = new Map();
    items.forEach((item) => {
      if (!item?.date || !item.state) return;
      const key = backupKey(item);
      const current = byKey.get(key);
      if (!current || (item.savedAt || 0) >= (current.savedAt || 0)) byKey.set(key, item);
    });
    const all = [...byKey.values()];
    const manuals = all.filter((item) => item.manual).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).slice(0, 10);
    const daily = all.filter((item) => !item.manual).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    const next = [...manuals, ...daily].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    localStorage.setItem(backupStorageKey(), JSON.stringify(next));
    return next;
  }

  function updateTodayBackup() {
    const api = bloc();
    if (!api) return backups();
    const today = dayKey();
    const copy = { date: today, savedAt: Date.now(), manual: false, state: api.snapshot() };
    const items = backups().filter((item) => item.manual || item.date !== today);
    return writeBackups([copy, ...items]);
  }

  function restoreCopy(copy) {
    const api = bloc();
    if (!api || !copy) return;
    quiet = true;
    api.applyRemoteState(copy.state);
    quiet = false;
    setRev(Date.now());
    updateTodayBackup();
    replaceNext = true;
    schedulePush();
    renderAccount();
  }

  function createManualBackup() {
    const api = bloc();
    if (!api) return;
    const now = Date.now();
    const copy = { id: `manual-${now}`, date: dayKey(), savedAt: now, manual: true, state: api.snapshot() };
    writeBackups([copy, ...backups()]);
    if (session()) schedulePush();
    renderAccount();
  }

  function backupLabel(item) {
    const hour = new Date(item.savedAt || Date.now()).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", hour12: true });
    return item.manual ? `Manual · ${item.date} ${hour}` : item.date;
  }

  let serverReachable = true;

  function appOfflineMode() {
    return Boolean(window.BlocNative) && bloc()?.state?.offlineMode !== false;
  }

  function online() {
    if (window.BlocNative) {
      if (!appOfflineMode()) return true;
      return serverReachable && navigator.onLine;
    }
    return navigator.onLine;
  }

  function markServer(up) {
    const was = serverReachable;
    serverReachable = up;
    if (up && !was && session()) push();
    else renderAccount();
  }

  function syncText() {
    const current = session();
    if (!current) return "";
    if (!online()) return "Sin internet. Se sincroniza al volver la conexión.";
    if (pending || pushing) return "Sincronizando…";
    return "Sincronizado.";
  }

  function renderAccount() {
    const current = session();
    const guest = document.getElementById("account-guest");
    const inside = document.getElementById("account-in");
    if (guest) guest.hidden = Boolean(current);
    if (inside) inside.hidden = !current;
    const who = document.getElementById("account-who");
    if (who && current) who.textContent = current.username || current.email || "";
    const full = document.getElementById("backup-full");
    if (full) full.hidden = current?.role !== "admin";
    const coupons = document.getElementById("coupon-admin");
    if (coupons) coupons.hidden = current?.role !== "admin";
    const pricesBtn = document.getElementById("open-prices");
    if (pricesBtn) pricesBtn.hidden = current?.role !== "admin";
    const admin = document.getElementById("account-admin");
    const staff = current?.role === "admin" || current?.role === "super";
    if (admin) admin.hidden = !staff;
    const createBox = document.getElementById("admin-create-box");
    const kind = document.getElementById("admin-kind");
    if (current?.role === "super") {
      if (createBox) createBox.hidden = true;
      if (kind) kind.hidden = true;
    } else if (current?.role === "admin") {
      if (createBox) createBox.hidden = false;
      if (kind) kind.hidden = false;
    }
    const deleteAccount = document.getElementById("account-delete");
    if (deleteAccount) {
      const blocked = current?.role === "admin";
      deleteAccount.disabled = blocked;
      deleteAccount.title = blocked ? "El administrador no puede cerrar esta cuenta." : "";
    }
    if (staff) loadUsers();
    window.refreshBlocPlan?.();
    syncGate();
    window.paintMasterAccount?.();
    const list = document.getElementById("account-backups");
    if (!list) return;
    const items = backups();
    list.innerHTML = items.length
      ? items.map((item) => `<li><span>${backupLabel(item)}</span><span class="backup-row-actions"><button type="button" class="ghost tiny" data-export="${backupKey(item)}">${item.imported ? "Importada" : "Exportar"}</button><button type="button" class="ghost tiny" data-restore="${backupKey(item)}">Restaurar</button></span></li>`).join("")
      : `<li><span>El día se guarda solo. Crear copia guarda una manual.</span></li>`;
  }

  function showError(message) {
    const el = document.getElementById("account-error");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
  }

  async function api(path, options = {}) {
    const current = session();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (current?.token) headers.Authorization = `Bearer ${current.token}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo sincronizar.");
    return data;
  }

  function mergeById(left, right) {
    const found = new Map();
    [...(left || []), ...(right || [])].forEach((item) => {
      if (!item?.id) return;
      const prev = found.get(item.id);
      if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) found.set(item.id, item);
    });
    return [...found.values()];
  }

  function applyServer(data) {
    const apiBloc = bloc();
    if (data?.masterHash && !localStorage.getItem("bloc-master")) localStorage.setItem("bloc-master", data.masterHash);
    if (Array.isArray(data?.backups)) writeBackups([...backups(), ...data.backups]);
    if (!apiBloc || !data?.state) return;
    const local = apiBloc.snapshot();
    const remote = data.state;
    const merged = { ...remote, ...local };
    merged.files = mergeById(remote.files, local.files);
    merged.alarms = mergeById(remote.alarms, local.alarms);
    merged.templates = { ...(remote.templates || {}) };
    Object.entries(local.templates || {}).forEach(([id, tpl]) => {
      const old = merged.templates[id];
      merged.templates[id] = old ? { ...old, ...tpl } : tpl;
      if (old?.deletedAt && !tpl?.deletedAt) merged.templates[id].deletedAt = old.deletedAt;
      if (tpl?.deletedAt && !old?.deletedAt) merged.templates[id].deletedAt = tpl.deletedAt;
      if (old?.purged || tpl?.purged) merged.templates[id].purged = true;
    });
    const remoteFiles = new Map((remote.files || []).map((file) => [file.id, file.updatedAt || 0]));
    const changed = merged.files.length !== remoteFiles.size || merged.files.some((file) => !remoteFiles.has(file.id) || remoteFiles.get(file.id) !== (file.updatedAt || 0));
    quiet = true;
    apiBloc.applyRemoteState(merged);
    setRev(Math.max(data.updatedAt || 0, rev()));
    quiet = false;
    updateTodayBackup();
    if (changed) schedulePush();
  }

  async function push() {
    const current = session();
    const apiBloc = bloc();
    if (!current || !apiBloc || !online() || pushing) {
      pending = Boolean(current);
      renderAccount();
      return;
    }
    pushing = true;
    pending = false;
    renderAccount();
    const sent = rev();
    const replacing = replaceNext;
    try {
      const data = await api("/api/sync", {
        method: "POST",
        body: JSON.stringify({
          updatedAt: sent,
          replace: replacing,
          state: apiBloc.snapshot(),
          backups: backups(),
          masterHash: localStorage.getItem("bloc-master") || "",
        }),
      });
      if (replacing) replaceNext = false;
      quiet = true;
      if (data.state && !replaceNext) apiBloc.applyRemoteState(data.state);
      if (data.updatedAt) setRev(data.updatedAt);
      else if (Array.isArray(data.backups)) writeBackups([...backups(), ...data.backups]);
      quiet = false;
      pending = false;
      if (window.BlocNative) serverReachable = true;
    } catch {
      pending = true;
      if (appOfflineMode()) serverReachable = false;
    } finally {
      pushing = false;
      renderAccount();
    }
  }

  function schedulePush() {
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(push, 400);
  }

  async function pull() {
    const current = session();
    if (!current || !online()) {
      pending = Boolean(current);
      renderAccount();
      return;
    }
    try {
      const before = rev();
      const data = await api("/api/sync");
      applyServer(data);
      if (before > (data.updatedAt || 0)) schedulePush();
      if (window.BlocNative) serverReachable = true;
    } catch {
      pending = true;
      if (appOfflineMode()) serverReachable = false;
    }
    renderAccount();
  }

  function openAccount() {
    document.body.classList.remove("prices-open", "shortcuts-open");
    const prices = document.getElementById("prices-page");
    if (prices) prices.hidden = true;
    const shortcuts = document.getElementById("shortcuts-page");
    if (shortcuts) shortcuts.hidden = true;
    window.closeBlocPay?.();
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Cuenta";
    renderAccount();
    document.body.classList.add("account-open");
    const modal = document.getElementById("account-modal");
    if (modal) modal.hidden = false;
    const api = bloc();
    if (api && api.state.accountOpen !== true) {
      api.state.accountOpen = true;
      api.save();
    }
    api?.render();
  }

  function syncGate() {
    const locked = !session();
    document.documentElement.classList.toggle("locked-out", locked);
    const close = document.getElementById("account-close");
    if (close) close.hidden = locked;
    if (locked) {
      const modal = document.getElementById("account-modal");
      if (modal) modal.hidden = false;
    }
  }

  function closeAccount() {
    if (!session()) return;
    document.body.classList.remove("account-open", "prices-open", "shortcuts-open");
    const modal = document.getElementById("account-modal");
    if (modal) modal.hidden = true;
    const prices = document.getElementById("prices-page");
    if (prices) prices.hidden = true;
    const shortcuts = document.getElementById("shortcuts-page");
    if (shortcuts) shortcuts.hidden = true;
    const priceEdit = document.getElementById("price-edit-modal");
    if (priceEdit) priceEdit.hidden = true;
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Cuenta";
    const api = bloc();
    if (api && api.state.accountOpen) {
      api.state.accountOpen = false;
      api.save();
    }
    api?.render();
  }

  function restoreAccount() {
    const api = bloc();
    if (!api?.state.accountOpen || !session()) return;
    document.body.classList.add("account-open");
    const modal = document.getElementById("account-modal");
    if (modal) modal.hidden = false;
    renderAccount();
  }

  window.restoreAccount = restoreAccount;

  window.closeBlocAccount = closeAccount;
  window.refreshBlocUsers = () => loadUsers();
  window.openBlocAccount = openAccount;

  let userRows = [];
  let userQuery = "";
  let userPage = 1;
  let userSize = 5;
  let actorCanCreate = false;
  const PLAN_LABEL = { month: "1 mes", quarter: "3 meses", half: "6 meses", year: "1 año" };

  function memberWhen(user) {
    if (user.permanent) return "Permanente, sin cobro";
    if (!user.until) return "Sin membresía";
    const when = new Date(user.until).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
    if (user.until > Date.now()) {
      const name = PLAN_LABEL[user.periodId] || "Membresía";
      return `${name} · vence el ${when}`;
    }
    return `Venció el ${when}`;
  }

  function showCreateBox() {
    const box = document.getElementById("admin-create-box");
    const kind = document.getElementById("admin-kind");
    const role = session()?.role;
    if (kind) kind.hidden = role !== "admin";
    if (box) box.hidden = role === "super" ? !actorCanCreate : role !== "admin";
  }

  function paintUsers() {
    const list = document.getElementById("user-list");
    const pageLabel = document.getElementById("user-page");
    if (!list) return;
    const query = userQuery.trim().toLocaleLowerCase("es");
    const onlyDebt = Boolean(document.getElementById("user-debt")?.checked);
    const filtered = userRows.filter((user) => {
      if (user.role === "admin") return false;
      if (onlyDebt && !(Number(user.balance) < 0)) return false;
      const blob = `${user.username || ""} ${user.email || ""}`.toLocaleLowerCase("es");
      return !query || blob.includes(query);
    });
    const size = userSize === 0 ? Math.max(filtered.length, 1) : userSize;
    const pages = Math.max(1, Math.ceil(filtered.length / size) || 1);
    if (userPage > pages) userPage = pages;
    const slice = filtered.slice((userPage - 1) * size, (userPage - 1) * size + size);
    const mine = session()?.email || session()?.username;
    list.innerHTML = slice.map((user) => {
      const name = (user.username || user.email || "Sin nombre").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
      const self = user.email === mine || user.username === mine;
      const on = user.active !== false;
      const parent = user.parent ? `<small class="user-parent">de ${String(user.parent).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]))}</small>` : "";
      const kind = user.role === "super"
        ? `<small class="user-parent">super</small>`
        : user.role === "google"
          ? `<small class="user-parent">google</small>`
          : user.role === "registro"
            ? `<small class="user-parent">registro</small>`
            : "";
      const manage = session()?.role === "admin";
      const boss = manage || session()?.role === "super";
      const saldo = `$${Math.round(Number(user.balance) || 0).toLocaleString("es-CO")}`;
      const prices = user.listed
        ? `<small class="user-parent">Ve $${Math.round(user.listed).toLocaleString("es-CO")}${user.charged && user.charged !== user.listed ? ` · interno $${Math.round(user.charged).toLocaleString("es-CO")}` : ""}</small>`
        : "";
      const member = `<small class="user-parent">${memberWhen(user)}</small>`;
      const priceLine = user.role === "super" && user.priceName ? `<small class="user-parent">Precio ${String(user.priceName).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]))}</small>` : "";
      const apply = boss && !manage && !user.permanent ? `<select class="user-plan" data-user-plan="${user.id}" aria-label="Aplicar membresía"><option value="">Aplicar membresía</option><option value="month">1 mes</option><option value="quarter">3 meses</option><option value="half">6 meses</option><option value="year">1 año</option></select>` : "";
      const credit = boss ? `<button type="button" class="user-ico user-ico-credit" data-user-credit="${user.id}" aria-label="Sumar saldo"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><text x="2" y="16" fill="#fff" font-size="11" font-family="sans-serif">$</text><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M16 7v10M11 12h10"/></svg></button>` : "";
      const tools = manage ? `<button type="button" class="switch${on ? " is-on" : ""}" data-user-active="${user.id}" data-username="${user.username || ""}" data-email="${user.email || ""}" aria-pressed="${on}" aria-label="${on ? "Desactivar" : "Activar"}" ${self ? "disabled" : ""}></button>
        <button type="button" class="user-ico" data-user-edit="${user.id}" data-role="${user.role || "user"}" data-username="${user.username || ""}" data-email="${user.email || ""}" data-negative="${user.allowNegative ? "1" : "0"}" data-permanent="${user.permanent ? "1" : "0"}" data-create="${user.canCreateRegistro ? "1" : "0"}" data-price="${user.priceListId || "principal"}" aria-label="Editar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 16.5 15.2 5.3a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L7.5 20H4v-3.5z"/></svg></button>
        <button type="button" class="user-ico user-ico-delete" data-user-delete="${user.id}" aria-label="Eliminar" ${self ? "disabled" : ""}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" d="M5 7.4h14"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" d="M9.2 7.2V5.4h5.6v1.8"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" d="M7.4 7.4 8.3 19h7.4l.9-11.6"/></svg></button>` : "";
      return `<li class="user-row">
        <span class="user-name">${name}${kind}${parent}<small class="user-parent">Saldo ${saldo}</small>${member}${priceLine}${prices}</span>
        ${credit}
        ${apply}
        ${tools}
      </li>`;
    }).join("") || "<li class=\"user-empty\">No hay usuarios.</li>";
    if (pageLabel) pageLabel.textContent = `Página ${userPage} de ${pages}`;
    const prev = document.getElementById("user-prev");
    const next = document.getElementById("user-next");
    if (prev) prev.disabled = userPage <= 1;
    if (next) next.disabled = userPage >= pages;
  }

  async function loadUsers() {
    const list = document.getElementById("user-list");
    if (!list || !session()) return;
    try {
      const data = await api("/api/users");
      userRows = data.users || [];
      actorCanCreate = Boolean(data.canCreate);
      showCreateBox();
      paintUsers();
      const week = 7 * 24 * 60 * 60 * 1000;
      const day = 24 * 60 * 60 * 1000;
      const soon = userRows.filter((user) => user.until && !user.permanent && user.until - Date.now() <= week && user.until - Date.now() >= -day);
      window.setMembershipNotices?.(soon);
    } catch {
      list.innerHTML = "<li class=\"user-empty\">No se pudo cargar la lista.</li>";
    }
  }

  async function enterWith(data) {
    saveSession({
      username: data.username,
      email: data.email,
      provider: data.provider,
      role: data.role,
      token: data.token,
    });
    if (!rev()) setRev(Date.now());
    applyServer(data);
    if (!data.updatedAt || data.updatedAt < rev()) schedulePush();
    renderAccount();
    closeAccount();
  }

  function clearLocalAccount() {
    const apiBloc = bloc();
    quiet = true;
    if (apiBloc) {
      apiBloc.applyRemoteState({ files: [], alarms: [], templates: {}, templateLook: { layout: "titles", size: 22 } });
    }
    localStorage.removeItem(backupStorageKey());
    setRev(0);
    saveSession(null);
    pending = false;
    quiet = false;
  }

  function accountNotice(message) {
    const status = document.getElementById("account-sync");
    if (status && message) status.textContent = message;
  }

  async function logout(scope) {
    const note = document.getElementById("logout-note");
    const say = (text) => { if (note) { note.hidden = !text; note.textContent = text || ""; } };
    try {
      await api("/api/logout", { method: "POST", body: JSON.stringify({ scope }) });
    } catch (error) {
      if (scope === "all") {
        say(error.message === "Failed to fetch" ? "No hay conexión con el servidor." : (error.message || "No se pudo cerrar la sesión en los demás equipos."));
        return;
      }
    }
    saveSession(null);
    pending = false;
    document.body.classList.remove("account-open");
    say("");
    const modal = document.getElementById("logout-modal");
    if (modal) modal.hidden = true;
    renderAccount();
  }

  document.getElementById("btn-account")?.addEventListener("click", openAccount);
  document.getElementById("account-close")?.addEventListener("click", closeAccount);
  document.getElementById("account-modal")?.addEventListener("pointerdown", (event) => {
    if (event.target.id === "account-modal" && session()) closeAccount();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pass-toggle]");
    if (!button) return;
    const input = document.getElementById(button.dataset.passToggle);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.classList.toggle("is-open", show);
    button.setAttribute("aria-pressed", show ? "true" : "false");
    button.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
  });
  function closeRecover() {
    const modal = document.getElementById("recover-modal");
    if (modal) modal.hidden = true;
  }
  document.getElementById("recover-toggle")?.addEventListener("click", () => {
    const modal = document.getElementById("recover-modal");
    const note = document.getElementById("recover-note");
    if (modal) modal.hidden = false;
    if (note) note.hidden = true;
    document.getElementById("recover-id")?.focus();
  });
  document.getElementById("recover-close")?.addEventListener("click", closeRecover);
  document.getElementById("recover-cancel")?.addEventListener("click", closeRecover);
  document.getElementById("recover-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "recover-modal") closeRecover();
  });
  document.getElementById("create-toggle")?.addEventListener("click", () => {
    const modal = document.getElementById("create-modal");
    const note = document.getElementById("create-error");
    if (modal) modal.hidden = false;
    if (note) note.hidden = true;
    document.getElementById("create-user")?.focus();
  });
  document.getElementById("create-close")?.addEventListener("click", () => {
    const modal = document.getElementById("create-modal");
    if (modal) modal.hidden = true;
  });
  document.getElementById("create-cancel")?.addEventListener("click", () => {
    const modal = document.getElementById("create-modal");
    if (modal) modal.hidden = true;
  });
  document.getElementById("create-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "create-modal") {
      document.getElementById("create-modal").hidden = true;
    }
  });
  document.getElementById("account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const identifier = document.getElementById("account-id").value.trim().toLowerCase();
    const password = document.getElementById("account-pass").value;
    if (!identifier) {
      showError("Escribe el correo o el usuario.");
      return;
    }
    showError("");
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ identifier, email: identifier.includes("@") ? identifier : "", username: identifier.includes("@") ? "" : identifier, password }),
      });
      document.getElementById("account-pass").value = "";
      await enterWith(data);
    } catch (error) {
      showError(error.message || "No se pudo entrar.");
    }
  });
  document.getElementById("create-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("create-user").value.trim().toLowerCase();
    const email = document.getElementById("create-mail").value.trim().toLowerCase();
    const password = document.getElementById("create-pass").value;
    const again = document.getElementById("create-pass2").value;
    const error = document.getElementById("create-error");
    const fail = (text) => { if (error) { error.hidden = !text; error.textContent = text || ""; } };
    if (!username || !email || !password) {
      fail("Usuario, correo y contraseña son obligatorios.");
      return;
    }
    if (password !== again) {
      fail("Las contraseñas no coinciden.");
      return;
    }
    fail("");
    try {
      const data = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      document.getElementById("create-pass").value = "";
      document.getElementById("create-pass2").value = "";
      if (data.pending) {
        fail(data.message || "Revisa el correo para confirmar la cuenta.");
        return;
      }
      await enterWith(data);
    } catch (err) {
      fail(err.message || "No se pudo crear el usuario.");
    }
  });
  document.getElementById("recover-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("recover-note");
    const identifier = document.getElementById("recover-id").value.trim();
    if (!identifier) return;
    try {
      const data = await api("/api/recover", { method: "POST", body: JSON.stringify({ identifier }) });
      if (note) {
        note.hidden = false;
        note.textContent = data.message;
      }
    } catch (error) {
      if (note) {
        note.hidden = false;
        note.textContent = error.message;
      }
    }
  });
  document.getElementById("reset-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = new URLSearchParams(location.search).get("reset");
    const note = document.getElementById("reset-note");
    try {
      await api("/api/reset", {
        method: "POST",
        body: JSON.stringify({ token, password: document.getElementById("reset-pass").value }),
      });
      if (note) {
        note.hidden = false;
        note.textContent = "Contraseña actualizada. Entra de nuevo en todos los dispositivos.";
      }
      document.getElementById("reset-pass").value = "";
    } catch (error) {
      if (note) {
        note.hidden = false;
        note.textContent = error.message;
      }
    }
  });
  document.getElementById("account-out")?.addEventListener("click", () => {
    const modal = document.getElementById("logout-modal");
    if (modal) modal.hidden = false;
  });
  document.getElementById("logout-close")?.addEventListener("click", () => {
    document.getElementById("logout-modal").hidden = true;
  });
  document.getElementById("logout-modal")?.addEventListener("pointerdown", (event) => {
    if (event.target.id === "logout-modal") document.getElementById("logout-modal").hidden = true;
  });
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      logout(button.dataset.logout);
    });
  });
  document.getElementById("account-delete")?.addEventListener("click", () => {
    const note = document.getElementById("close-account-note");
    if (note) note.hidden = true;
    document.getElementById("close-account-modal").hidden = false;
  });
  const hideCloseAccount = () => { document.getElementById("close-account-modal").hidden = true; };
  document.getElementById("close-account-close")?.addEventListener("click", hideCloseAccount);
  document.getElementById("close-account-cancel")?.addEventListener("click", hideCloseAccount);
  document.getElementById("close-account-modal")?.addEventListener("pointerdown", (event) => {
    if (event.target.id === "close-account-modal") hideCloseAccount();
  });
  document.getElementById("close-account-confirm")?.addEventListener("click", async () => {
    const note = document.getElementById("close-account-note");
    const say = (text) => { if (note) { note.hidden = !text; note.textContent = text || ""; } };
    if (!online()) {
      say("Hace falta internet para cerrar la cuenta. Tus notas siguen en este equipo.");
      return;
    }
    try {
      await api("/api/account/close", { method: "POST", body: "{}" });
    } catch (error) {
      say(error.message || "No se cerró la cuenta. Tus notas siguen en este equipo.");
      return;
    }
    hideCloseAccount();
    clearLocalAccount();
    renderAccount();
  });
  document.getElementById("password-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("password-note");
    const next = document.getElementById("password-next").value;
    const again = document.getElementById("password-again").value;
    const show = (text) => {
      if (!note) return;
      note.hidden = false;
      note.textContent = text;
    };
    if (next !== again) {
      show("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (!online()) {
      show("Hace falta internet para cambiar la contraseña.");
      return;
    }
    try {
      await api("/api/password", {
        method: "POST",
        body: JSON.stringify({ current: document.getElementById("password-current").value, password: next }),
      });
      document.getElementById("password-form").reset();
      show("Contraseña actualizada. Los otros equipos tendrán que entrar de nuevo.");
    } catch (error) {
      show(error.message || "No se pudo cambiar la contraseña.");
    }
  });
  document.getElementById("user-search")?.addEventListener("input", (event) => {
    userQuery = event.target.value;
    userPage = 1;
    const clear = document.getElementById("user-search-clear");
    if (clear) clear.hidden = !userQuery;
    paintUsers();
  });
  document.getElementById("user-search-clear")?.addEventListener("click", () => {
    const field = document.getElementById("user-search");
    if (field) field.value = "";
    userQuery = "";
    userPage = 1;
    document.getElementById("user-search-clear").hidden = true;
    paintUsers();
  });
  document.getElementById("user-size")?.addEventListener("change", (event) => {
    userSize = Number(event.target.value);
    userPage = 1;
    paintUsers();
  });
  document.getElementById("user-prev")?.addEventListener("click", () => {
    userPage = Math.max(1, userPage - 1);
    paintUsers();
  });
  document.getElementById("user-next")?.addEventListener("click", () => {
    userPage += 1;
    paintUsers();
  });
  document.getElementById("admin-create")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("admin-create-note");
    const say = (text) => { if (note) { note.hidden = !text; note.textContent = text || ""; } };
    const username = document.getElementById("admin-user").value.trim();
    const email = document.getElementById("admin-mail").value.trim();
    const password = document.getElementById("admin-pass").value;
    const missing = [];
    if (!username) missing.push("el usuario");
    if (!email) missing.push("el correo");
    if (!password) missing.push("la contraseña");
    if (missing.length) {
      say(`Falta ${missing.join(", ")}.`);
      return;
    }
    if (password.length < 6) {
      say("La contraseña necesita al menos 6 caracteres.");
      return;
    }
    try {
      await api("/api/users/create", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
          role: session()?.role === "admin" ? (document.getElementById("admin-kind")?.value || "registro") : "registro",
        }),
      });
      document.getElementById("admin-create").reset();
      say("Usuario creado. Ya puede entrar.");
      loadUsers();
    } catch (error) {
      say(error.message || "No se pudo crear el usuario.");
    }
  });
  function closeCredit() {
    const modal = document.getElementById("user-credit-modal");
    if (modal) modal.hidden = true;
  }
  document.getElementById("user-credit-close")?.addEventListener("click", closeCredit);
  document.getElementById("user-credit-cancel")?.addEventListener("click", closeCredit);
  document.getElementById("user-credit-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "user-credit-modal") closeCredit();
  });
  document.getElementById("user-credit-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const modal = document.getElementById("user-credit-modal");
    const note = document.getElementById("user-credit-error");
    const amount = document.getElementById("user-credit-amount")?.value || "";
    try {
      await api("/api/users/credit", { method: "POST", body: JSON.stringify({ id: modal?.dataset.userId, amount }) });
      if (note) note.hidden = true;
      closeCredit();
      loadUsers();
    } catch (error) {
      if (note) {
        note.hidden = false;
        note.textContent = error.message || "No se pudo sumar el saldo.";
      }
    }
  });
  document.getElementById("open-prices")?.addEventListener("click", () => window.openBlocPrices?.());
  document.getElementById("user-list")?.addEventListener("change", async (event) => {
    const pick = event.target.closest("[data-user-plan]");
    if (!pick) return;
    const period = pick.value;
    pick.value = "";
    if (!period) return;
    const row = userRows.find((item) => item.id === pick.dataset.userPlan);
    const who = row?.username || row?.email || "este usuario";
    const label = PLAN_LABEL[period] || "la membresía";
    if (!confirm(`¿Activar ${label} para ${who}? Se descuenta del saldo de ese usuario.`)) return;
    try {
      await api("/api/users/membership", { method: "POST", body: JSON.stringify({ id: pick.dataset.userPlan, period }) });
      loadUsers();
    } catch (error) {
      accountNotice(error.message || "No se pudo activar la membresía.");
    }
  });
  document.getElementById("user-list")?.addEventListener("click", async (event) => {
    const credit = event.target.closest("[data-user-credit]");
    if (credit) {
      const modal = document.getElementById("user-credit-modal");
      const input = document.getElementById("user-credit-amount");
      const note = document.getElementById("user-credit-error");
      if (modal) {
        modal.dataset.userId = credit.dataset.userCredit;
        modal.hidden = false;
      }
      if (input) input.value = "";
      if (note) note.hidden = true;
      input?.focus();
      return;
    }
    const planPick = event.target.closest("[data-user-plan]");
    if (planPick) return;
    const toggle = event.target.closest("[data-user-active]");
    const edit = event.target.closest("[data-user-edit]");
    const remove = event.target.closest("[data-user-delete]");
    if (toggle && !toggle.disabled) {
      const next = toggle.getAttribute("aria-pressed") !== "true";
      try {
        await api("/api/users/update", {
          method: "POST",
          body: JSON.stringify({
            id: toggle.dataset.userActive,
            username: toggle.dataset.username || "",
            email: toggle.dataset.email || "",
            active: next,
          }),
        });
        const row = userRows.find((item) => item.id === toggle.dataset.userActive);
        if (row) row.active = next;
        paintUsers();
      } catch (error) {
        accountNotice(error.message || "No se pudo cambiar el estado.");
      }
      return;
    }
    if (edit) {
      document.getElementById("user-edit-modal").dataset.userId = edit.dataset.userEdit;
      document.getElementById("user-edit-name").value = edit.dataset.username || "";
      document.getElementById("user-edit-mail").value = edit.dataset.email || "";
      document.getElementById("user-edit-pass").value = "";
      const balance = document.getElementById("user-edit-balance");
      if (balance) balance.value = "";
      const negative = document.getElementById("user-edit-negative");
      if (negative) negative.checked = edit.dataset.negative === "1";
      const permanent = document.getElementById("user-edit-permanent");
      if (permanent) permanent.checked = edit.dataset.permanent === "1";
      const rolePick = document.getElementById("user-edit-role");
      if (rolePick) rolePick.value = ["super", "google", "registro"].includes(edit.dataset.role) ? edit.dataset.role : "registro";
      const createRow = document.getElementById("user-edit-create-row");
      const createBox = document.getElementById("user-edit-create");
      if (createRow) createRow.hidden = rolePick?.value !== "super";
      if (createBox) createBox.checked = edit.dataset.create === "1";
      const price = document.getElementById("user-edit-price");
      if (price) {
        price.hidden = rolePick?.value !== "super";
        window.fillPriceChoices?.(price, edit.dataset.price || "principal");
      }
      const plan = document.getElementById("user-edit-plan");
      if (plan) plan.value = "";
      window.fillPlanChoices?.(plan);
      syncPermanent();
      const note = document.getElementById("user-edit-error");
      if (note) note.hidden = true;
      document.getElementById("user-edit-modal").hidden = false;
      return;
    }
    if (!remove) return;
    if (!confirm("¿Eliminar este usuario? Se borran sus notas, copias y sesiones.")) return;
    try {
      await api("/api/users/delete", { method: "POST", body: JSON.stringify({ id: remove.dataset.userDelete }) });
      loadUsers();
    } catch (error) {
      accountNotice(error.message || "No se pudo eliminar.");
    }
  });
  document.getElementById("user-edit-close")?.addEventListener("click", () => {
    document.getElementById("user-edit-modal").hidden = true;
  });
  document.getElementById("user-edit-modal")?.addEventListener("pointerdown", (event) => {
    if (event.target.id === "user-edit-modal") document.getElementById("user-edit-modal").hidden = true;
  });
  document.getElementById("user-edit-role")?.addEventListener("change", (event) => {
    const createRow = document.getElementById("user-edit-create-row");
    if (createRow) createRow.hidden = event.target.value !== "super";
    const price = document.getElementById("user-edit-price");
    if (price) price.hidden = event.target.value !== "super";
  });
  function syncPermanent() {
    const plan = document.getElementById("user-edit-plan");
    const on = Boolean(document.getElementById("user-edit-permanent")?.checked);
    if (plan) plan.hidden = on;
  }
  document.getElementById("user-edit-permanent")?.addEventListener("change", syncPermanent);
  document.getElementById("user-edit-save")?.addEventListener("click", async () => {
    const note = document.getElementById("user-edit-error");
    const fail = (text) => { if (note) { note.hidden = !text; note.textContent = text || ""; } };
    try {
      await api("/api/users/update", {
        method: "POST",
        body: JSON.stringify({
          id: document.getElementById("user-edit-modal").dataset.userId,
          username: document.getElementById("user-edit-name").value.trim(),
          email: document.getElementById("user-edit-mail").value.trim(),
          password: document.getElementById("user-edit-pass").value,
          role: ["super", "google", "registro"].includes(document.getElementById("user-edit-role")?.value) ? document.getElementById("user-edit-role").value : "registro",
          allowNegative: Boolean(document.getElementById("user-edit-negative")?.checked),
          permanent: Boolean(document.getElementById("user-edit-permanent")?.checked),
          canCreateRegistro: document.getElementById("user-edit-role")?.value === "super" && Boolean(document.getElementById("user-edit-create")?.checked),
          priceListId: document.getElementById("user-edit-role")?.value === "super" ? (document.getElementById("user-edit-price")?.value || "principal") : "principal",
          membership: document.getElementById("user-edit-permanent")?.checked ? "" : (document.getElementById("user-edit-plan")?.value || ""),
        }),
      });
      document.getElementById("user-edit-modal").hidden = true;
      loadUsers();
    } catch (error) {
      const text = error.message === "Failed to fetch" ? "No hay conexión con el servidor." : (error.message || "No se pudo guardar.");
      fail(text);
    }
  });
  function setBusy(on) {
    const box = document.getElementById("busy-spin");
    if (box) box.hidden = !on;
  }
  document.getElementById("backup-download-all")?.addEventListener("click", async () => {
    setBusy(true);
    try {
      const data = await api("/api/admin/export", { method: "GET" });
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `bloc-todo-${dayKey()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      alert(error.message || "No se pudo descargar todo.");
    } finally {
      setBusy(false);
    }
  });
  document.getElementById("backup-import-all")?.addEventListener("click", () => {
    document.getElementById("backup-full-file")?.click();
  });
  document.getElementById("backup-full-file")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!confirm("Esto sustituye usuarios, contraseñas, notas y pagos. ¿Continuar?")) return;
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      if (data?.kind !== "bloc-full") throw new Error("El archivo no es una copia de todo el sistema.");
      await api("/api/admin/import", { method: "POST", body: JSON.stringify(data) });
      alert("Copia completa restaurada. Vuelve a entrar.");
      clearLocalAccount();
      location.reload();
    } catch (error) {
      alert(error.message || "No se pudo importar todo.");
      setBusy(false);
    }
  });
  document.getElementById("backup-create")?.addEventListener("click", createManualBackup);
  document.getElementById("backup-import")?.addEventListener("click", () => {
    document.getElementById("backup-file")?.click();
  });
  document.getElementById("backup-file")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.kind === "bloc-full") {
        throw new Error("Esta copia es de todo el sistema. Solo el admin la importa con Importar absolutamente todo.");
      }
      const state = data.state && typeof data.state === "object" ? data.state : data;
      if (!state || typeof state !== "object" || !state.files && !state.templates) {
        throw new Error("El archivo no es una copia de Bloc.");
      }
      const now = Date.now();
      const copy = {
        id: `manual-${now}`,
        date: dayKey(),
        savedAt: now,
        manual: true,
        imported: true,
        state,
      };
      if (!confirm("¿Importar esta copia? Sustituye las notas de esta cuenta.")) return;
      writeBackups([copy, ...backups()]);
      restoreCopy(copy);
    } catch (error) {
      alert(error.message || "No se pudo importar la copia.");
    }
  });
  document.getElementById("account-backups")?.addEventListener("click", (event) => {
    const apiBloc = bloc();
    if (!apiBloc) return;
    const exportButton = event.target.closest("[data-export]");
    if (exportButton) {
      const copy = backups().find((item) => backupKey(item) === exportButton.dataset.export);
      if (!copy) return;
      const name = `bloc-copia-${copy.date}.json`;
      const text = JSON.stringify(copy);
      if (window.BlocNative?.saveText) {
        window.BlocNative.saveText(name, text);
        return;
      }
      const blob = new Blob([text], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    const button = event.target.closest("[data-restore]");
    if (!button || !apiBloc) return;
    const copy = backups().find((item) => backupKey(item) === button.dataset.restore);
    if (!copy) return;
    if (!confirm(`¿Restaurar la copia ${backupLabel(copy)}? Sustituye las notas de esta cuenta.`)) return;
    restoreCopy(copy);
  });

  document.addEventListener("bloc-saved", () => {
    if (quiet) return;
    setRev(Date.now());
    updateTodayBackup();
    if (session()) schedulePush();
    else renderAccount();
  });
  window.addEventListener("online", () => {
    if (window.BlocNative) serverReachable = true;
    if (session()) push();
  });
  window.addEventListener("offline", () => {
    if (appOfflineMode()) serverReachable = false;
    pending = Boolean(session());
    renderAccount();
  });
  setInterval(() => {
    if (!appOfflineMode() || !session() || serverReachable) return;
    fetch("/api/lan", { cache: "no-store" })
      .then((response) => { if (response.ok) markServer(true); })
      .catch(() => {});
  }, 8000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") updateTodayBackup();
  });
  window.addEventListener("pagehide", updateTodayBackup);
  setInterval(() => {
    const today = dayKey();
    const items = backups();
    if (!items.some((item) => item.date === today)) updateTodayBackup();
    renderAccount();
  }, 60000);

  updateTodayBackup();
  if (session()) pull();
  const resetToken = new URLSearchParams(location.search).get("reset");
  const verifyToken = new URLSearchParams(location.search).get("verify");
  if (resetToken) {
    const form = document.getElementById("reset-form");
    if (form) form.hidden = false;
    openAccount();
  }
  if (verifyToken) {
    openAccount();
    api("/api/verify", { method: "POST", body: JSON.stringify({ token: verifyToken }) })
      .then((data) => enterWith(data))
      .catch((error) => {
        const box = document.getElementById("create-error");
        const form = document.getElementById("create-form");
        if (form) form.hidden = false;
        if (box) {
          box.hidden = false;
          box.textContent = error.message || "No se pudo confirmar el correo.";
        }
      });
  }
  renderAccount();
  restoreAccount();
})();
