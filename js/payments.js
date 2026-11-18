(() => {
  let data = null;
  let tab = "pending";

  function session() {
    try { return JSON.parse(localStorage.getItem("bloc-cuenta") || "null"); } catch { return null; }
  }

  function headers(json) {
    const current = session();
    const result = {};
    if (json) result["Content-Type"] = "application/json";
    if (current?.token) result.Authorization = `Bearer ${current.token}`;
    return result;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function money(amount) {
    return `$${Math.round(Number(amount) || 0).toLocaleString("es-CO")}`;
  }

  function when(ms) {
    if (!ms) return "";
    return new Date(ms).toLocaleString("es", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  }

  function statusName(status) {
    return { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" }[status] || status;
  }

  function note(message, bad) {
    const el = document.getElementById("pay-note");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.style.color = bad ? "#9a3412" : "";
  }

  function paintMethods() {
    const wrap = document.getElementById("pay-methods");
    if (!wrap) return;
    const methods = (data?.methods || []).filter((item) => item.active !== false);
    wrap.innerHTML = methods.map((item, index) => `
      <label class="pay-method">
        <input id="pay-method-${escapeHtml(item.id)}" type="radio" name="pay-method" value="${escapeHtml(item.id)}" ${index === 0 ? "checked" : ""}>
        <span>
          <strong>${escapeHtml(item.label)}</strong>
          ${item.account ? `<span class="pay-account">${escapeHtml(item.account)} <button type="button" data-copy="${escapeHtml(item.account)}">Copiar</button></span>` : ""}
          ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
        </span>
      </label>`).join("") || "<p class=\"color-note-title\">Todavía no hay medios de pago.</p>";
  }

  function requestItem(item, review) {
    const proof = item.hasProof ? `<button type="button" class="ghost tiny" data-proof="${escapeHtml(item.id)}">Ver pantallazo</button>` : "";
    const actions = review && item.status === "pending"
      ? `<span class="pay-actions"><button type="button" class="solid tiny" data-review="${escapeHtml(item.id)}" data-status="approved">Aprobar</button><button type="button" class="ghost tiny" data-review="${escapeHtml(item.id)}" data-status="rejected">Rechazar</button>${proof}</span>`
      : proof;
    return `<li>
      <span class="pay-row-top"><strong>${escapeHtml(item.username || "Usuario")} · ${money(item.amount)}</strong><span class="pay-status ${escapeHtml(item.status)}">${statusName(item.status)}</span></span>
      <span>${escapeHtml(item.methodLabel)}${item.account ? ` · ${escapeHtml(item.account)}` : ""}${item.period ? ` · ${escapeHtml(item.period)}` : ""}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span>
      <span>${when(item.createdAt)}</span>
      ${actions}
    </li>`;
  }

  function paintList() {
    const list = document.getElementById("pay-list");
    const filter = document.getElementById("pay-filter")?.value || "all";
    const rows = (data?.requests || []).filter((item) => filter === "all" || item.status === filter);
    if (list) list.innerHTML = rows.map((item) => requestItem(item, false)).join("") || "<li>No hay solicitudes.</li>";
  }

  function paintReview() {
    const admin = document.getElementById("pay-admin");
    if (admin) admin.hidden = !data?.admin;
    if (!data?.admin) return;
    document.querySelectorAll("[data-pay-tab]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.payTab === tab));
    });
    const review = document.getElementById("pay-review");
    const editor = document.getElementById("pay-methods-editor");
    if (editor) editor.hidden = tab !== "methods";
    if (review) review.hidden = tab === "methods";
    if (tab === "methods") {
      const rows = document.getElementById("pay-method-rows");
      if (rows) {
        rows.innerHTML = (data.methods || []).map((item) => `
          <div class="pay-method-row">
            <input id="method-label-${escapeHtml(item.id)}" name="method-label-${escapeHtml(item.id)}" type="text" data-method="label" value="${escapeHtml(item.label)}" aria-label="Nombre" placeholder="Nombre" autocomplete="off">
            <input id="method-account-${escapeHtml(item.id)}" name="method-account-${escapeHtml(item.id)}" type="text" data-method="account" value="${escapeHtml(item.account)}" aria-label="Cuenta o llave" placeholder="Cuenta o llave" autocomplete="off">
            <label class="info-switch"><input id="method-active-${escapeHtml(item.id)}" name="method-active-${escapeHtml(item.id)}" type="checkbox" data-method="active" ${item.active !== false ? "checked" : ""}>Activo</label>
            <input id="method-id-${escapeHtml(item.id)}" name="method-id-${escapeHtml(item.id)}" type="hidden" data-method="id" value="${escapeHtml(item.id)}">
            <input id="method-detail-${escapeHtml(item.id)}" name="method-detail-${escapeHtml(item.id)}" type="hidden" data-method="detail" value="${escapeHtml(item.detail)}">
          </div>`).join("");
      }
      return;
    }
    const visible = tab === "pending"
      ? (data.review || []).filter((item) => item.status === "pending")
      : (data.review || []).filter((item) => item.status === "approved");
    if (review) review.innerHTML = visible.map((item) => requestItem(item, true)).join("") || "<li>No hay solicitudes en esta lista.</li>";
  }

  function inApp() {
    return Boolean(window.BlocNative);
  }

  function untilDay(ms) {
    return new Date(ms).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  }

  function accessView() {
    if (data?.admin) return null;
    if (data?.permanent) return { kind: "permanent", title: "Permanente", detail: "Sin cobro" };
    if (Number(data?.until) > Date.now()) {
      const listed = Number(data?.listed) || 0;
      const period = (data?.plan?.periods || []).find((item) => Number(item.price) === listed);
      const title = period?.label || "Activa";
      const price = listed ? money(listed) : "";
      const detail = [price, `Vence el ${untilDay(data.until)}`].filter(Boolean).join(" · ");
      return { kind: "active", title, detail };
    }
    return { kind: "off", title: "Sin suscripción", detail: "No hay un plan activo" };
  }

  function paintAccess() {
    document.body.classList.toggle("needs-plan", Boolean(data?.needsPlan));
    const gate = document.getElementById("plan-gate");
    if (gate) gate.hidden = !data?.needsPlan;
    ["pay-balance", "account-balance"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `Saldo ${money(data?.balance)}`;
    });
    const view = accessView();
    ["pay-until", "account-until"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!view) {
        el.hidden = true;
        el.innerHTML = "";
        return;
      }
      el.hidden = false;
      el.className = `sub-status sub-status-${view.kind}`;
      el.innerHTML = `<small>Suscripción</small><strong>${escapeHtml(view.title)}</strong><span>${escapeHtml(view.detail)}</span>`;
    });
    const copy = document.getElementById("plan-copy");
    if (copy) copy.textContent = data?.plan?.description || "";
    const periods = document.getElementById("plan-periods");
    const useBalance = document.getElementById("plan-use-balance");
    if (useBalance) useBalance.hidden = inApp() || data?.admin || data?.permanent;
    const form = document.getElementById("pay-form");
    if (form) form.hidden = inApp();
    if (!periods) {
      paintCoupons();
      return;
    }
    const rows = data?.plan?.periods || [];
    periods.innerHTML = rows.map((item) => `
      <button type="button" class="plan-period${chosen === item.id ? " is-on" : ""}" data-period="${escapeHtml(item.id)}" data-price="${item.price}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${money(item.price)}${item.discount ? ` · ${item.discount}% menos` : ""}</span>
      </button>`).join("") + (inApp() ? "" : `<button type="button" class="plan-period${chosen === "" ? " is-on" : ""}" data-period="" data-price="">Solo recargar saldo</button>`);
    paintCoupons();
  }

  let couponQuery = "";
  let couponPage = 1;
  let couponSize = 5;

  function paintCoupons() {
    const list = document.getElementById("coupon-list");
    const tools = document.getElementById("coupon-tools");
    const pager = document.getElementById("coupon-pager");
    const adminBox = document.getElementById("coupon-admin");
    const admin = Boolean(data?.admin);
    if (adminBox) adminBox.hidden = !admin;
    if (tools) tools.hidden = !admin;
    if (pager) pager.hidden = !admin;
    if (!list) return;
    if (!admin) {
      list.innerHTML = "";
      return;
    }
    const query = couponQuery.trim().toLocaleLowerCase("es");
    const rows = (data.coupons || []).filter((item) => {
      const blob = `${item.code || ""} ${item.amount || ""} ${money(item.amount)} ${item.uses || ""} ${item.days || ""}`.toLocaleLowerCase("es");
      return !query || blob.includes(query);
    });
    const size = couponSize === 0 ? Math.max(rows.length, 1) : couponSize;
    const pages = Math.max(1, Math.ceil(rows.length / size) || 1);
    if (couponPage > pages) couponPage = pages;
    const slice = rows.slice((couponPage - 1) * size, (couponPage - 1) * size + size);
    list.innerHTML = slice.map((item) => {
      const code = escapeHtml(item.code);
      const on = item.active !== false;
      const meta = [`${item.usedCount || 0}/${item.uses || 1} usos`];
      if (item.days) meta.push(`${item.days} días`);
      if (item.expired) meta.push("vencido");
      else if (item.used) meta.push("agotado");
      return `<li class="user-row">
        <span class="user-name">${code}<small class="user-parent">${money(item.amount)} · ${meta.join(" · ")}</small></span>
        <button type="button" class="switch${on ? " is-on" : ""}" data-coupon-active="${code}" aria-pressed="${on}" aria-label="${on ? "Desactivar" : "Activar"}"></button>
        <button type="button" class="user-ico" data-coupon-edit="${code}" data-amount="${escapeHtml(item.amount)}" data-uses="${item.uses || 1}" data-days="${item.days || ""}" aria-label="Editar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 16.5 15.2 5.3a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L7.5 20H4v-3.5z"/></svg></button>
        <button type="button" class="user-ico user-ico-delete" data-coupon-delete="${code}" aria-label="Eliminar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" d="M5 7.4h14"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" d="M9.2 7.2V5.4h5.6v1.8"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" d="M7.4 7.4 8.3 19h7.4l.9-11.6"/></svg></button>
      </li>`;
    }).join("") || `<li class="user-empty">${query ? "No hay cupones con esa búsqueda." : "No hay cupones."}</li>`;
    const label = document.getElementById("coupon-page");
    if (label) label.textContent = `Página ${couponPage} de ${pages}`;
    const prev = document.getElementById("coupon-prev");
    const next = document.getElementById("coupon-next");
    if (prev) prev.disabled = couponPage <= 1;
    if (next) next.disabled = couponPage >= pages;
  }

  let chosen = "month";

  function paint() {
    paintAccess();
    paintMethods();
    paintList();
    paintReview();
    paintPrices();
    const plan = document.getElementById("user-edit-plan");
    if (plan) fillPlanChoices(plan);
    const price = document.getElementById("user-edit-price");
    if (price) fillPriceChoices(price, price.value || "principal");
  }

  const PRICE_BITS = [
    ["month", "1 mes"],
    ["quarter", "3 meses"],
    ["half", "6 meses"],
    ["year", "1 año"],
  ];

  function pricePayload(prefix) {
    return {
      month: document.getElementById(`${prefix}month`)?.value || "",
      quarter: document.getElementById(`${prefix}quarter`)?.value || "",
      half: document.getElementById(`${prefix}half`)?.value || "",
      year: document.getElementById(`${prefix}year`)?.value || "",
    };
  }

  function fillPlanChoices(select) {
    const rows = data?.plan?.periods || [];
    if (!select || !rows.length) return;
    const current = select.value;
    select.innerHTML = `<option value="">Activar membresía</option>${rows.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)} · ${money(item.price)}</option>`).join("")}`;
    select.value = [...select.options].some((option) => option.value === current) ? current : "";
  }

  function fillPriceChoices(select, selected) {
    if (!select) return;
    const rows = data?.priceLists?.length ? data.priceLists : [{ id: "principal", name: "Principal" }];
    const current = selected || select.value || "principal";
    select.innerHTML = rows.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name || "Precio")}</option>`).join("");
    select.value = [...select.options].some((option) => option.value === current) ? current : "principal";
  }

  window.fillPlanChoices = fillPlanChoices;
  window.fillPriceChoices = fillPriceChoices;

  function paintPrices() {
    const list = document.getElementById("price-list");
    if (!list || !data?.admin) return;
    const rows = data.priceLists || [];
    list.innerHTML = rows.length ? rows.map((row) => {
      const bits = PRICE_BITS.map(([key, label]) => `${label} ${money(row.prices?.[key])}`).join(" · ");
      const remove = row.id === "principal" ? "" : `<button type="button" class="user-ico user-ico-delete" data-price-delete="${escapeHtml(row.id)}" data-price-name="${escapeHtml(row.name || "Precio")}" aria-label="Eliminar"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" d="M5 7.4h14"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" d="M9.2 7.2V5.4h5.6v1.8"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" d="M7.4 7.4 8.3 19h7.4l.9-11.6"/></svg></button>`;
      return `<li class="user-row price-row" data-price-open="${escapeHtml(row.id)}"><span class="user-name">${escapeHtml(row.name || "Precio")}<span class="price-bits">${bits}</span></span>${remove}</li>`;
    }).join("") : `<li class="user-empty">Todavía no hay precios.</li>`;
  }

  function priceNote(id, message, bad) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("cal-conflict", Boolean(message && bad));
  }

  function closePriceEdit() {
    const modal = document.getElementById("price-edit-modal");
    if (modal) modal.hidden = true;
  }

  function openPriceEdit(id) {
    const row = (data?.priceLists || []).find((item) => item.id === id);
    if (!row) return;
    const modal = document.getElementById("price-edit-modal");
    if (!modal) return;
    modal.dataset.id = row.id;
    const name = document.getElementById("price-edit-name");
    if (name) {
      name.value = row.id === "principal" ? "Principal" : (row.name || "");
      name.readOnly = row.id === "principal";
    }
    const fields = { month: "price-edit-month", quarter: "price-edit-quarter", half: "price-edit-half", year: "price-edit-year" };
    Object.entries(fields).forEach(([key, field]) => {
      const input = document.getElementById(field);
      if (input) input.value = row.prices?.[key] ?? "";
    });
    const lead = document.getElementById("price-edit-note");
    if (lead) lead.textContent = row.id === "principal" ? "Este es el precio que ve el usuario." : "Precio interno del super. El usuario ve el principal.";
    const error = document.getElementById("price-edit-error");
    if (error) error.hidden = true;
    modal.hidden = false;
    (row.id === "principal" ? document.getElementById("price-edit-month") : name)?.focus();
  }

  async function load() {
    const response = await fetch("/api/payments", { headers: headers(false) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los pagos.");
    data = payload;
    paint();
  }

  async function send(path, body) {
    const response = await fetch(path, { method: "POST", headers: headers(true), body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
    data = payload;
    paint();
  }

  document.getElementById("pay-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const methodId = document.querySelector("input[name='pay-method']:checked")?.value;
    const amount = document.getElementById("pay-amount")?.value || "";
    const file = document.getElementById("pay-proof")?.files?.[0];
    if (!file) {
      note("Adjunta el pantallazo de la transferencia.", true);
      return;
    }
    const proof = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
    try {
      await send("/api/payments", { methodId, amount, proof, period: chosen });
      document.getElementById("pay-form")?.reset();
      document.getElementById("pay-proof-name").textContent = "Pantallazo de la transferencia";
      note("Solicitud enviada. Queda pendiente de revisión.");
    } catch (error) {
      note(error.message, true);
    }
  });

  document.getElementById("pay-proof")?.addEventListener("change", (event) => {
    const name = event.target.files?.[0]?.name || "Pantallazo de la transferencia";
    document.getElementById("pay-proof-name").textContent = name;
  });

  document.getElementById("pay-filter")?.addEventListener("change", paintList);
  document.getElementById("pay-page")?.addEventListener("click", async (event) => {
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      event.preventDefault();
      try { await navigator.clipboard.writeText(copy.dataset.copy || ""); } catch { /* el navegador no copió */ }
      return;
    }
    const proof = event.target.closest("[data-proof]");
    if (proof) {
      const response = await fetch(`/api/payments/proof/${proof.dataset.proof}`, { headers: headers(false) });
      if (!response.ok) return;
      const blob = await response.blob();
      if (window.BlocNative?.viewImage) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.readAsDataURL(blob);
        });
        window.BlocNative.viewImage(dataUrl);
        return;
      }
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }
    const review = event.target.closest("[data-review]");
    if (review) {
      try { await send("/api/payments/review", { id: review.dataset.review, status: review.dataset.status }); }
      catch (error) { note(error.message, true); }
    }
  });

  document.querySelectorAll("[data-pay-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      tab = button.dataset.payTab;
      paintReview();
    });
  });

  document.getElementById("pay-method-add")?.addEventListener("click", () => {
    data.methods = data.methods || [];
    data.methods.push({ id: "", label: "", account: "", detail: "", active: true });
    paintReview();
  });

  document.getElementById("pay-method-save")?.addEventListener("click", async () => {
    const methods = [...document.querySelectorAll("#pay-method-rows .pay-method-row")].map((row) => ({
      id: row.querySelector("[data-method='id']")?.value || "",
      label: row.querySelector("[data-method='label']")?.value || "",
      account: row.querySelector("[data-method='account']")?.value || "",
      detail: row.querySelector("[data-method='detail']")?.value || "",
      active: row.querySelector("[data-method='active']")?.checked !== false,
    }));
    const message = document.getElementById("pay-method-note");
    try {
      await send("/api/payments/methods", { methods });
      if (message) {
        message.hidden = false;
        message.textContent = "Medios guardados.";
      }
    } catch (error) {
      if (message) {
        message.hidden = false;
        message.textContent = error.message;
      }
    }
  });

  document.getElementById("plan-periods")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-period]");
    if (!button) return;
    chosen = button.dataset.period || "";
    const amount = document.getElementById("pay-amount");
    if (amount && button.dataset.price) amount.value = button.dataset.price;
    paintAccess();
    if (!inApp() || !chosen) return;
    if (window.BlocNative.buyPlan) {
      window.BlocNative.buyPlan(chosen);
      note("Abriendo Google Play…");
      return;
    }
    note("Actualiza la aplicación para pagar con Google Play.", true);
  });

  document.getElementById("plan-use-balance")?.addEventListener("click", async () => {
    if (!chosen) {
      note("Elige un plazo para activarlo con saldo.", true);
      return;
    }
    try {
      await send("/api/subscription/activate", { period: chosen });
      note("Suscripción activa.");
    } catch (error) {
      note(error.message, true);
    }
  });

  document.getElementById("plan-go-pay")?.addEventListener("click", () => window.openBlocPay());

  async function redeemCoupon(code, say, clear) {
    if (!session()?.token) {
      say("Entra a la cuenta para canjear el cupón.", true);
      window.openBlocAccount?.();
      return;
    }
    await send("/api/coupons/redeem", { code });
    clear();
    say("Cupón canjeado. El saldo ya está en la cuenta.");
  }

  document.getElementById("coupon-redeem")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const box = document.getElementById("coupon-note");
    const say = (text, bad) => {
      if (!box) return;
      box.hidden = !text;
      box.textContent = text || "";
      box.style.color = bad ? "#9a3412" : "";
    };
    try {
      await redeemCoupon(document.getElementById("coupon-code")?.value || "", say, () => {
        document.getElementById("coupon-code").value = "";
      });
    } catch (error) {
      say(error.message, true);
    }
  });

  document.getElementById("menu-coupon")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const box = document.getElementById("menu-coupon-note");
    const say = (text, bad) => {
      if (!box) return;
      box.hidden = !text;
      box.textContent = text || "";
      box.style.color = bad ? "#9a3412" : "";
    };
    try {
      await redeemCoupon(document.getElementById("menu-coupon-code")?.value || "", say, () => {
        document.getElementById("menu-coupon-code").value = "";
      });
    } catch (error) {
      say(error.message, true);
    }
  });

  document.getElementById("coupon-create")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const box = document.getElementById("coupon-create-note");
    const say = (text) => { if (box) { box.hidden = !text; box.textContent = text || ""; } };
    const code = (document.getElementById("coupon-custom")?.value || "").trim();
    const uses = (document.getElementById("coupon-uses")?.value || "").trim();
    if (!code) {
      say("Escribe el código del cupón.");
      return;
    }
    if (!uses) {
      say("Escribe el número de usos.");
      return;
    }
    try {
      const response = await fetch("/api/coupons/create", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({
          amount: document.getElementById("coupon-amount")?.value || "",
          code,
          uses,
          days: document.getElementById("coupon-days")?.value || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo crear el cupón.");
      document.getElementById("coupon-create")?.reset();
      couponPage = 1;
      say(`Cupón ${payload.code} por ${money(payload.amount)}.`);
      await load();
    } catch (error) {
      say(error.message);
    }
  });

  async function postCoupon(path, body) {
    const response = await fetch(path, { method: "POST", headers: headers(true), body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
    await load();
  }

  document.getElementById("coupon-list")?.addEventListener("click", async (event) => {
    const toggle = event.target.closest("[data-coupon-active]");
    const edit = event.target.closest("[data-coupon-edit]");
    const remove = event.target.closest("[data-coupon-delete]");
    if (toggle) {
      const next = toggle.getAttribute("aria-pressed") !== "true";
      try {
        await postCoupon("/api/coupons/update", { code: toggle.dataset.couponActive, active: next });
      } catch (error) {
        note(error.message, true);
      }
      return;
    }
    if (edit) {
      const modal = document.getElementById("coupon-edit-modal");
      if (modal) {
        modal.dataset.code = edit.dataset.couponEdit;
        modal.hidden = false;
      }
      const amount = document.getElementById("coupon-edit-amount");
      const code = document.getElementById("coupon-edit-code");
      const uses = document.getElementById("coupon-edit-uses");
      const days = document.getElementById("coupon-edit-days");
      const error = document.getElementById("coupon-edit-error");
      if (amount) amount.value = edit.dataset.amount || "";
      if (code) code.value = edit.dataset.couponEdit || "";
      if (uses) uses.value = edit.dataset.uses || "";
      if (days) days.value = edit.dataset.days || "";
      if (error) error.hidden = true;
      return;
    }
    if (remove && confirm(`¿Eliminar el cupón ${remove.dataset.couponDelete}?`)) {
      try {
        await postCoupon("/api/coupons/delete", { code: remove.dataset.couponDelete });
      } catch (error) {
        note(error.message, true);
      }
    }
  });
  function closeCouponEdit() {
    const modal = document.getElementById("coupon-edit-modal");
    if (modal) modal.hidden = true;
  }
  document.getElementById("coupon-edit-close")?.addEventListener("click", closeCouponEdit);
  document.getElementById("coupon-edit-modal")?.addEventListener("pointerdown", (event) => {
    if (event.target.id === "coupon-edit-modal") closeCouponEdit();
  });
  document.getElementById("coupon-edit-save")?.addEventListener("click", async () => {
    const modal = document.getElementById("coupon-edit-modal");
    const error = document.getElementById("coupon-edit-error");
    const say = (text) => { if (error) { error.hidden = !text; error.textContent = text || ""; } };
    try {
      await postCoupon("/api/coupons/update", {
        code: modal?.dataset.code || "",
        nextCode: document.getElementById("coupon-edit-code")?.value || "",
        amount: document.getElementById("coupon-edit-amount")?.value || "",
        uses: document.getElementById("coupon-edit-uses")?.value || "",
        days: document.getElementById("coupon-edit-days")?.value || "",
      });
      closeCouponEdit();
    } catch (err) {
      say(err.message || "No se pudo guardar el cupón.");
    }
  });

  document.getElementById("coupon-search")?.addEventListener("input", (event) => {
    couponQuery = event.target.value;
    couponPage = 1;
    const clear = document.getElementById("coupon-search-clear");
    if (clear) clear.hidden = !couponQuery;
    paintCoupons();
  });
  document.getElementById("coupon-search-clear")?.addEventListener("click", () => {
    const field = document.getElementById("coupon-search");
    if (field) field.value = "";
    couponQuery = "";
    couponPage = 1;
    document.getElementById("coupon-search-clear").hidden = true;
    paintCoupons();
  });
  document.getElementById("coupon-size")?.addEventListener("change", (event) => {
    couponSize = Number(event.target.value);
    couponPage = 1;
    paintCoupons();
  });
  document.getElementById("coupon-prev")?.addEventListener("click", () => {
    couponPage = Math.max(1, couponPage - 1);
    paintCoupons();
  });
  document.getElementById("coupon-next")?.addEventListener("click", () => {
    couponPage += 1;
    paintCoupons();
  });

  window.onPlayPurchase = async function onPlayPurchase(period, token) {
    try {
      await send("/api/subscription/play", { period, token });
      note("Compra de Google Play activa.");
    } catch (error) {
      note(error.message, true);
    }
  };

  window.refreshBlocPlan = function refreshBlocPlan() {
    if (!session()) return;
    load().catch(() => {});
  };

  window.openBlocPay = function openBlocPay() {
    window.closeBlocAccount?.();
    document.body.classList.remove("prices-open");
    const prices = document.getElementById("prices-page");
    if (prices) prices.hidden = true;
    const page = document.getElementById("pay-page");
    if (page) page.hidden = false;
    document.body.classList.add("account-open", "pay-open");
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Pagos";
    load().catch((error) => note(error.message, true));
  };

  window.closeBlocPay = function closeBlocPay() {
    document.body.classList.remove("pay-open");
    const page = document.getElementById("pay-page");
    if (page) page.hidden = true;
    const account = document.getElementById("account-modal");
    if (!account || account.hidden) document.body.classList.remove("account-open");
    const title = document.querySelector("#account-bar h2");
    if (title && !document.body.classList.contains("prices-open")) title.textContent = "Cuenta";
  };

  window.openBlocPrices = function openBlocPrices() {
    window.closeBlocPay?.();
    const page = document.getElementById("prices-page");
    if (page) page.hidden = false;
    document.body.classList.add("account-open", "prices-open");
    const title = document.querySelector("#account-bar h2");
    if (title) title.textContent = "Membresías";
    priceNote("price-create-note", "");
    load().catch((error) => priceNote("price-create-note", error.message, true));
  };

  window.closeBlocPrices = function closeBlocPrices() {
    document.body.classList.remove("prices-open");
    const page = document.getElementById("prices-page");
    if (page) page.hidden = true;
    closePriceEdit();
    const title = document.querySelector("#account-bar h2");
    if (title && !document.body.classList.contains("pay-open")) title.textContent = "Cuenta";
  };

  document.getElementById("prices-back")?.addEventListener("click", () => window.closeBlocPrices());
  document.getElementById("price-edit-close")?.addEventListener("click", closePriceEdit);
  document.getElementById("price-edit-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "price-edit-modal") closePriceEdit();
  });
  document.getElementById("price-list")?.addEventListener("click", async (event) => {
    const remove = event.target.closest("[data-price-delete]");
    if (remove) {
      event.stopPropagation();
      const name = remove.dataset.priceName || "este precio";
      if (!confirmTwice(`¿Eliminar el precio ${name}?`, "Segunda confirmación. Los super que lo tengan vuelven al precio principal.")) return;
      try {
        await send("/api/prices/delete", { id: remove.dataset.priceDelete });
        window.refreshBlocUsers?.();
      } catch (error) {
        priceNote("price-create-note", error.message, true);
      }
      return;
    }
    const open = event.target.closest("[data-price-open]");
    if (open) openPriceEdit(open.dataset.priceOpen);
  });
  document.getElementById("price-create")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("price-name")?.value.trim() || "";
    const prices = pricePayload("price-");
    if (!name || Object.values(prices).some((value) => !String(value).trim())) {
      priceNote("price-create-note", "Escribe el nombre y los cuatro precios.", true);
      return;
    }
    try {
      await send("/api/prices/save", { name, prices });
      event.target.reset();
      priceNote("price-create-note", "");
      window.refreshBlocUsers?.();
    } catch (error) {
      priceNote("price-create-note", error.message, true);
    }
  });
  document.getElementById("price-edit-save")?.addEventListener("click", async () => {
    const modal = document.getElementById("price-edit-modal");
    const id = modal?.dataset.id || "";
    const name = document.getElementById("price-edit-name")?.value.trim() || "";
    const prices = pricePayload("price-edit-");
    const error = document.getElementById("price-edit-error");
    if (!name || Object.values(prices).some((value) => !String(value).trim())) {
      if (error) {
        error.hidden = false;
        error.textContent = "Escribe el nombre y los cuatro precios.";
      }
      return;
    }
    try {
      await send("/api/prices/save", { id, name, prices });
      closePriceEdit();
      window.refreshBlocUsers?.();
    } catch (err) {
      if (error) {
        error.hidden = false;
        error.textContent = err.message || "No se pudo guardar.";
      }
    }
  });

  window.refreshBlocPlan();
})();
