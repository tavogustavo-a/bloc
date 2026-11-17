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

  function accessText() {
    if (data?.admin) return "Admin, sin cobro.";
    if (data?.permanent) return "Permanente, sin cobro.";
    if (Number(data?.until) > Date.now()) return `Activo hasta ${when(data.until)}`;
    return "Sin suscripción activa.";
  }

  function paintAccess() {
    document.body.classList.toggle("needs-plan", Boolean(data?.needsPlan));
    const gate = document.getElementById("plan-gate");
    if (gate) gate.hidden = !data?.needsPlan;
    ["pay-balance", "account-balance"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `Saldo ${money(data?.balance)}`;
    });
    ["pay-until", "account-until"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = accessText();
    });
    const copy = document.getElementById("plan-copy");
    if (copy) copy.textContent = data?.plan?.description || "";
    const periods = document.getElementById("plan-periods");
    const useBalance = document.getElementById("plan-use-balance");
    if (useBalance) useBalance.hidden = inApp() || data?.admin || data?.permanent;
    const form = document.getElementById("pay-form");
    if (form) form.hidden = inApp();
    if (!periods) return;
    const rows = data?.plan?.periods || [];
    periods.innerHTML = rows.map((item) => `
      <button type="button" class="plan-period${chosen === item.id ? " is-on" : ""}" data-period="${escapeHtml(item.id)}" data-price="${item.price}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${money(item.price)}${item.discount ? ` · ${item.discount}% menos` : ""}</span>
      </button>`).join("") + (inApp() ? "" : `<button type="button" class="plan-period${chosen === "" ? " is-on" : ""}" data-period="" data-price="">Solo recargar saldo</button>`);
    const coupons = document.getElementById("coupon-list");
    if (coupons && data?.admin) {
      coupons.innerHTML = (data.coupons || []).map((item) => `<li><strong>${escapeHtml(item.code)}</strong> · ${money(item.amount)}${item.used ? " · usado" : ""}</li>`).join("") || "<li>No hay cupones.</li>";
    }
  }

  let chosen = "month";

  function paint() {
    const who = document.getElementById("account-who");
    if (who && data?.username) who.textContent = data.username;
    paintAccess();
    paintMethods();
    paintList();
    paintReview();
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
      await send("/api/coupons/redeem", { code: document.getElementById("coupon-code")?.value || "" });
      document.getElementById("coupon-code").value = "";
      say("Cupón canjeado. El saldo ya está en la cuenta.");
    } catch (error) {
      say(error.message, true);
    }
  });

  document.getElementById("coupon-create")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const box = document.getElementById("coupon-create-note");
    const say = (text) => { if (box) { box.hidden = !text; box.textContent = text || ""; } };
    try {
      const response = await fetch("/api/coupons/create", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({
          amount: document.getElementById("coupon-amount")?.value || "",
          code: document.getElementById("coupon-custom")?.value || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo crear el cupón.");
      document.getElementById("coupon-create")?.reset();
      say(`Cupón ${payload.code} por ${money(payload.amount)}.`);
      await load();
    } catch (error) {
      say(error.message);
    }
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
    if (title) title.textContent = "Cuenta";
  };

  window.refreshBlocPlan();
})();
