const STORAGE_KEY = "bloc-notas-alarma-v2";
const OLD_KEY = "bloc-notas-alarma-v1";
const TRASH_MS = 30 * 24 * 60 * 60 * 1000;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const eyeOn = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.7" d="M2.4 12S6.2 6.6 12 6.6 21.6 12 21.6 12 17.8 17.4 12 17.4 2.4 12 2.4 12z"/><circle cx="12" cy="12" r="2.3" fill="#fff"/></svg>`;
const eyeOff = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.7" d="M3.2 7.2A12 12 0 0 1 12 6.4c2.4 0 4.5.7 6.2 1.8M4.6 16.2A11 11 0 0 0 12 17.6c1.6 0 3.1-.3 4.5-.9"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" d="M4 5.2 20 18.8"/><circle cx="12" cy="12" r="2.1" fill="#fff"/></svg>`;
const soundOn = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M4.4 9.7h3L11.4 6v12l-4-3.3h-3z"/><path fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" d="M14.8 9.6a3.6 3.6 0 0 1 0 4.8M17.2 7.4a6.4 6.4 0 0 1 0 9.2"/></svg>`;
const soundOff = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M4.4 9.7h3L11.4 6v12l-4-3.3h-3z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" d="M15.4 10.2 20 14.8M20 10.2l-4.6 4.6"/></svg>`;

const els = {
  book: document.querySelector(".book"),
  editorPage: document.querySelector(".editor-page"),
  focusView: document.getElementById("focus-view"),
  focusSlot: document.getElementById("focus-slot"),
  focusSearch: document.getElementById("focus-search"),
  list: document.getElementById("file-list"),
  search: document.getElementById("search"),
  toggleArchived: document.getElementById("toggle-archived"),
  toggleTrash: document.getElementById("toggle-trash"),
  editor: document.getElementById("editor"),
  editorEmpty: document.getElementById("editor-empty"),
  title: document.getElementById("file-title"),
  body: document.getElementById("body"),
  status: document.getElementById("status"),
  fileAlarms: document.getElementById("file-alarms"),
  add: document.getElementById("add-note"),
  sel: document.getElementById("sel-action"),
  menu: document.getElementById("note-menu"),
  eye: document.getElementById("btn-eye"),
  notify: document.getElementById("btn-notify"),
  calendar: document.getElementById("calendar-modal"),
  calHeading: document.getElementById("cal-heading"),
  calLead: document.getElementById("cal-lead"),
  calChips: document.getElementById("cal-chips"),
  calMonth: document.getElementById("cal-month"),
  calGrid: document.getElementById("cal-grid"),
  calTimeWrap: document.getElementById("cal-time-wrap"),
  calTime: document.getElementById("cal-time"),
  calPreview: document.getElementById("cal-preview"),
  calDayList: document.getElementById("cal-day-list"),
  calConfirm: document.getElementById("cal-confirm"),
  modal: document.getElementById("alarm-modal"),
  heading: document.getElementById("alarm-heading"),
  alarmClock: document.getElementById("alarm-clock"),
  alarmBody: document.getElementById("alarm-body"),
  postpone: document.getElementById("postpone"),
  postMonth: document.getElementById("post-month"),
  postGrid: document.getElementById("post-grid"),
  postTime: document.getElementById("post-time"),
  postPreview: document.getElementById("post-preview"),
  btnSnooze: document.getElementById("btn-snooze"),
  btnConfirm: document.getElementById("btn-confirm"),
};

const PALETTE = ["sand", "leaf", "sky", "rose"];
const NAMED_HEX = { sand: "#fff3c4", leaf: "#e4f3d4", sky: "#d9ecff", rose: "#ffe0d6" };

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function colorHex(value) {
  if (isHexColor(value)) return String(value).toLowerCase();
  return NAMED_HEX[value] || NAMED_HEX.sand;
}
const DEFAULT_TEMPLATES = {
  compras: { label: "Compras", title: "Compras", body: "Leche, pan, fruta, huevos.", color: "sand" },
  cita: { label: "Cita médica", title: "Cita médica", body: "Llevar la receta y la tarjeta del seguro.", color: "rose" },
  reunion: { label: "Reunión", title: "Reunión", body: "Revisar la agenda y llevar el cuaderno.", color: "sky" },
};

const state = load();
rememberTab();
purgeOldTrash();
const now = new Date();
const calView = { year: now.getFullYear(), month: now.getMonth(), date: keyFromDate(now), mode: "browse" };
const pickedDates = new Set();
const postView = { year: now.getFullYear(), month: now.getMonth(), date: keyFromDate(now) };

let ringingId = null;
let audioCtx = null;
let chimeTimer = null;
let menuFileId = null;
let underlineRange = null;
let alarmRange = null;
let scheduleTarget = null;
let suppressClick = false;
let press = null;
const baseTitle = document.title;

function blank() {
  return {
    files: [], alarms: [], sound: true, openId: null, listView: "active", lastSnoozeQuick: "10", theme: "light",
    showExport: true, showImport: true, hideTools: false, hideEditor: false, toolSize: 46,
    toolColor: true, toolDelete: true, toolCopy: true, toolRepeat: false, lockEdit: false, appLock: false, appColor: "",
    toolOrder: ["bold", "italic", "strike", "under", "ink", "mark", "clear", "align", "ol", "ul", "check", "font", "image", "file", "find", "copy"],
    barTools: { bold: true, italic: true, undo: true, redo: true, strike: true, under: true, ink: true, mark: true, clear: true, align: true, ol: true, ul: true, check: true, font: true, image: true, file: true, find: true, copy: true },
    autoHideBar: false, colorShortcuts: false, inkShortcuts: ["#c45b52", "#1a1814", "#2f6f4e"], showNotify: true,
    showDetail: false, focusOpen: false, activeTemplate: "compras", accountOpen: false, shortcutsOpen: false, toolOrderOpen: false, pricesOpen: false,
    templates: structuredClone(DEFAULT_TEMPLATES),
    templateLook: { layout: "titles", size: 22 },
    noteGap: 6,
    noteLines: false,
    noteFont: 18,
    noteLine: 28,
    noteWidth: 920,
    cardSize: 0,
    askPasswordEvery: false,
    confirmDelete: true,
    hideNoteAlarms: true,
    offlineMode: true,
    showInfo: true,
    noTemplates: false,
    alarmUntilTouch: false,
    alarmVibrate: false,
    alarmContinuous: false,
  };
}

function load() {
  let next = blank();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) next = normalize(JSON.parse(raw));
    else {
      const old = localStorage.getItem(OLD_KEY);
      if (old) next = migrate(JSON.parse(old));
    }
  } catch { /* guarda nueva */ }
  placeTab(next);
  return next;
}

function tabView() {
  return {
    openId: state.openId || null,
    listView: state.listView,
    showDetail: state.showDetail !== false,
    focusOpen: state.focusOpen === true,
    accountOpen: state.accountOpen === true,
    shortcutsOpen: state.shortcutsOpen === true,
    toolOrderOpen: state.toolOrderOpen === true,
    pricesOpen: state.pricesOpen === true,
    activeTemplate: state.activeTemplate || null,
  };
}

function rememberTab() {
  try { sessionStorage.setItem("bloc-vista", JSON.stringify(tabView())); } catch { /* privado */ }
}

function placeTab(target) {
  let view = null;
  try { view = JSON.parse(sessionStorage.getItem("bloc-vista") || "null"); } catch { view = null; }
  if (!view || typeof view !== "object") return;
  target.openId = view.openId || null;
  if (["active", "archived", "trash"].includes(view.listView)) target.listView = view.listView;
  if ("showDetail" in view) target.showDetail = view.showDetail !== false;
  target.focusOpen = view.focusOpen === true;
  target.accountOpen = view.accountOpen === true;
  target.shortcutsOpen = view.shortcutsOpen === true;
  target.toolOrderOpen = view.toolOrderOpen === true;
  target.pricesOpen = view.pricesOpen === true;
  target.activeTemplate = view.activeTemplate || null;
}

function normalize(data) {
  const next = blank();
  next.files = Array.isArray(data.files) ? data.files : [];
  next.alarms = Array.isArray(data.alarms) ? data.alarms : [];
  next.sound = data.sound !== false;
  next.openId = data.openId || null;
  next.lastSnoozeQuick = data.lastSnoozeQuick || "10";
  next.theme = data.theme === "dark" ? "dark" : "light";
  next.showExport = data.showExport !== false;
  next.showImport = data.showImport !== false;
  next.hideTools = data.hideTools === true;
  next.toolColor = data.toolColor !== false;
  next.toolDelete = data.toolDelete !== false;
  next.toolCopy = data.toolCopy !== false;
  next.toolRepeat = data.toolRepeat === true;
  next.lockEdit = data.lockEdit === true;
  next.appLock = data.appLock === true;
  next.appColor = isHexColor(data.appColor) ? data.appColor.toLowerCase() : "";
  const barSaved = data.barTools && typeof data.barTools === "object" ? data.barTools : {};
  next.barTools = {};
  ["bold", "italic", "undo", "redo", "strike", "under", "ink", "mark", "clear", "align", "ol", "ul", "check", "font", "image", "file", "find", "copy"].forEach((key) => {
    next.barTools[key] = barSaved[key] !== false;
  });
  next.autoHideBar = data.autoHideBar === true;
  next.showNotify = data.showNotify !== false;
  next.colorShortcuts = data.colorShortcuts === true;
  const inks = Array.isArray(data.inkShortcuts) ? data.inkShortcuts.filter(isHexColor).slice(0, 3) : [];
  next.inkShortcuts = [inks[0] || "#c45b52", inks[1] || "#1a1814", inks[2] || "#2f6f4e"];
  next.hideEditor = data.hideEditor === true;
  const toolSize = Number(data.toolSize);
  next.toolSize = toolSize >= 36 && toolSize <= 64 ? toolSize : 46;
  const toolIds = ["bold", "italic", "strike", "under", "ink", "mark", "clear", "align", "ol", "ul", "check", "font", "image", "file", "find", "copy"];
  const toolOrder = Array.isArray(data.toolOrder) ? data.toolOrder.map(String).filter((id) => toolIds.includes(id)) : [];
  next.toolOrder = [...toolOrder, ...toolIds.filter((id) => !toolOrder.includes(id))];
  next.listView = ["active", "archived", "trash"].includes(data.listView) ? data.listView : "active";
  next.showDetail = data.showDetail !== false;
  next.focusOpen = data.focusOpen === true;
  next.accountOpen = data.accountOpen === true;
  next.shortcutsOpen = data.shortcutsOpen === true;
  next.toolOrderOpen = data.toolOrderOpen === true;
  next.pricesOpen = data.pricesOpen === true;
  next.activeTemplate = data.activeTemplate || null;
  const look = data.templateLook && typeof data.templateLook === "object" ? data.templateLook : {};
  const size = Number(look.size);
  next.templateLook = {
    layout: ["titles", "cards", "list"].includes(look.layout) ? look.layout : "titles",
    size: size >= 16 && size <= 40 ? size : 22,
  };
  const gap = Number(data.noteGap);
  next.noteGap = gap >= 0 && gap <= 18 ? gap : 6;
  next.noteLines = data.noteLines === true;
  const font = Number(data.noteFont);
  next.noteFont = font >= 16 && font <= 28 ? font : 18;
  const line = Number(data.noteLine);
  next.noteLine = line >= 22 && line <= 44 ? line : 28;
  const width = Number(data.noteWidth);
  next.noteWidth = width >= 640 && width <= 1100 ? width : 920;
  const card = Number(data.cardSize);
  next.cardSize = card >= 0 && card <= 24 ? card : 0;
  next.askPasswordEvery = data.askPasswordEvery === true;
  next.confirmDelete = data.confirmDelete !== false;
  if (data.prefDefaults !== 3) {
    next.hideTools = false;
    next.hideEditor = false;
    next.sound = true;
    next.confirmDelete = true;
    next.hideNoteAlarms = true;
    next.offlineMode = true;
    next.showInfo = true;
    next.prefDefaults = 3;
  } else {
    next.hideNoteAlarms = data.hideNoteAlarms !== false;
    next.offlineMode = data.offlineMode !== false;
    next.prefDefaults = 3;
  }
  next.showInfo = data.showInfo !== false;
  next.noTemplates = data.noTemplates === true;
  next.alarmUntilTouch = data.alarmUntilTouch === true;
  next.alarmVibrate = data.alarmVibrate === true;
  next.alarmContinuous = data.alarmContinuous === true;
  next.templates = { ...structuredClone(DEFAULT_TEMPLATES), ...(data.templates && typeof data.templates === "object" ? data.templates : {}) };
  Object.keys(next.templates).forEach((id, index) => {
    const fallback = DEFAULT_TEMPLATES[id];
    const tpl = next.templates[id];
    if (!tpl || typeof tpl !== "object") {
      next.templates[id] = fallback ? structuredClone(fallback) : { label: "Plantilla", title: "Plantilla", body: "", color: PALETTE[index % PALETTE.length] };
      return;
    }
    tpl.label = String(tpl.label || tpl.title || fallback?.label || "Plantilla");
    tpl.title = String(tpl.title || tpl.label || fallback?.title || "Plantilla");
    tpl.body = String(tpl.body ?? fallback?.body ?? "");
    tpl.color = isHexColor(tpl.color) ? tpl.color.toLowerCase() : (PALETTE.includes(tpl.color) ? tpl.color : (fallback?.color || PALETTE[index % PALETTE.length]));
    tpl.deletedAt = Number(tpl.deletedAt) || null;
    tpl.purged = Boolean(tpl.purged);
    tpl.math = tpl.math === true;
    tpl.calendar = tpl.calendar === true;
    if (!Number.isFinite(tpl.order)) tpl.order = null;
  });
  const rankedTpl = Object.keys(next.templates).filter((id) => Number.isFinite(next.templates[id].order)).sort((a, b) => next.templates[a].order - next.templates[b].order);
  const freshTpl = Object.keys(next.templates).filter((id) => !Number.isFinite(next.templates[id].order));
  [...rankedTpl, ...freshTpl].forEach((id, index) => { next.templates[id].order = index + 1; });
  next.files.forEach((file) => {
    if (file.deletedAt === undefined) file.deletedAt = null;
    if (file.pinned === undefined) file.pinned = false;
    if (file.archivedAt === undefined) file.archivedAt = null;
    if (!file.color) file.color = cardColor(file.id);
    file.templateId = file.templateId || null;
    if (file.colorOwn === undefined) {
      const tplColor = file.templateId && next.templates[file.templateId]?.color;
      file.colorOwn = Boolean(tplColor && file.color !== tplColor);
    }
    file.deletedByTemplate = file.deletedByTemplate || null;
    file.loose = file.loose === true;
    if (!file.templateId && !file.loose && !next.noTemplates) {
      const title = plain(file.title);
      const match = Object.entries(next.templates).find(([, tpl]) => title && (plain(tpl.title) === title || plain(tpl.label) === title));
      if (match) file.templateId = match[0];
    }
    if (file.sound === undefined) file.sound = true;
    file.locked = Boolean(file.locked);
    if (!file.createdAt) file.createdAt = file.updatedAt || Date.now();
    if (!Number.isFinite(file.order)) file.order = null;
  });
  ["active", "archived", "trash"].forEach((view) => {
    const files = next.files.filter((file) => viewForFile(file) === view);
    const split = view === "active" && !next.noTemplates;
    const keys = split ? [...new Set(files.map((file) => file.templateId || ""))] : [""];
    keys.forEach((key) => {
      const group = files.filter((file) => !split || (file.templateId || "") === key)
        .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
      group.forEach((file, index) => { file.order = index + 1; });
    });
  });
  next.alarms.forEach((alarm) => {
    if (alarm.status === "ringing") alarm.status = "pending";
    if (!alarm.repeat) alarm.repeat = "none";
    if (alarm.intervalDays === undefined) alarm.intervalDays = 2;
    if (alarm.preAlert === undefined) alarm.preAlert = 0;
    if (alarm.preSent === undefined) alarm.preSent = false;
  });
  if (next.openId && !next.files.some((file) => file.id === next.openId)) next.openId = null;
  const live = Object.entries(next.templates).filter(([, tpl]) => !tpl.deletedAt && !tpl.purged).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  if (!live.some(([id]) => id === next.activeTemplate)) next.activeTemplate = live[0]?.[0] || null;
  next.files.forEach((file) => {
    if (next.noTemplates && !templateRecordLive(next.templates, file.templateId)) file.loose = true;
    if (!file.templateId && !file.loose && !next.noTemplates) file.templateId = next.activeTemplate;
  });
  return next;
}

function templateRecordLive(templates, id) {
  const tpl = id && templates?.[id];
  return Boolean(tpl && !tpl.deletedAt && !tpl.purged);
}

function templateIsLive(id) {
  return templateRecordLive(state.templates, id);
}

function viewForFile(file) {
  if (file.deletedAt) return "trash";
  if (file.archived) return "archived";
  return "active";
}

function fileInView(file, view) {
  return viewForFile(file) === view;
}

function orderMates(file) {
  const view = viewForFile(file);
  const split = view === "active" && !state.noTemplates;
  return state.files.filter((item) => item.id !== file.id && viewForFile(item) === view && (!split || item.templateId === file.templateId));
}

function resequence(view) {
  const files = state.files.filter((file) => viewForFile(file) === view);
  const split = view === "active" && !state.noTemplates;
  const keys = split ? [...new Set(files.map((file) => file.templateId || ""))] : [""];
  keys.forEach((key) => {
    const group = files.filter((file) => !split || (file.templateId || "") === key)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
    group.forEach((file, index) => { file.order = index + 1; });
  });
}

function confirmTwice(first, second) {
  return confirm(first) && confirm(second);
}

function liveTemplateIds() {
  return Object.entries(state.templates)
    .filter(([, tpl]) => tpl && !tpl.deletedAt && !tpl.purged)
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
    .map(([id]) => id);
}

function ensureOtros() {
  const found = Object.entries(state.templates).find(([, tpl]) => tpl && !tpl.purged && fold(plain(tpl.label || tpl.title)) === "otros");
  if (found) {
    found[1].deletedAt = null;
    return found[0];
  }
  const id = state.templates.otros ? `otros-${Date.now()}` : "otros";
  state.templates[id] = {
    label: "Otros",
    title: "Otros",
    body: "",
    color: "#fff3c4",
    order: liveTemplateIds().length + 1,
    deletedAt: null,
    purged: false,
    math: false,
    calendar: false,
  };
  return id;
}

function parkLooseNotes() {
  const loose = state.files.filter((file) => !file.deletedAt && !file.archived && (file.loose || !templateIsLive(file.templateId)));
  if (!loose.length) return;
  const id = ensureOtros();
  loose.forEach((file) => {
    file.templateId = id;
    file.loose = false;
    file.deletedByTemplate = null;
    if (!file.colorOwn) file.color = state.templates[id].color || file.color;
    file.updatedAt = Date.now();
  });
  state.activeTemplate = id;
  resequence("active");
}

function flattenActiveOrder() {
  const templates = liveTemplateIds();
  const files = state.files.filter((file) => viewForFile(file) === "active");
  files.sort((a, b) => {
    const ia = templates.indexOf(a.templateId);
    const ib = templates.indexOf(b.templateId);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0);
  });
  files.forEach((file, index) => { file.order = index + 1; });
}

function setNoTemplates(on) {
  state.noTemplates = on === true;
  if (state.noTemplates) flattenActiveOrder();
  else parkLooseNotes();
  save();
  render();
}

let restoreQueue = [];

function needsTemplatePick(file) {
  if (state.noTemplates) return false;
  if (templateIsLive(file.templateId)) return false;
  return liveTemplateIds().length > 0;
}

function finishRestore(file, templateId) {
  file.deletedAt = null;
  file.archived = false;
  file.archivedAt = null;
  file.deletedByTemplate = null;
  file.updatedAt = Date.now();
  if (state.noTemplates) {
    if (!templateIsLive(file.templateId)) {
      file.loose = true;
      file.templateId = null;
    }
  } else if (templateId && templateIsLive(templateId)) {
    file.templateId = templateId;
    file.loose = false;
    if (!file.colorOwn) file.color = state.templates[templateId].color || file.color;
  } else if (!templateIsLive(file.templateId)) {
    file.loose = true;
    file.templateId = null;
  }
  placeAtEnd(file);
  if (state.openId === file.id && state.listView !== "active") state.openId = null;
}

function openRestorePick(files) {
  const select = document.getElementById("restore-template-select");
  const modal = document.getElementById("restore-template-modal");
  const lead = document.getElementById("restore-template-lead");
  if (!select || !modal || !files.length) return;
  restoreQueue = files;
  select.innerHTML = liveTemplateIds().map((id) => {
    const label = state.templates[id]?.label || state.templates[id]?.title || "Plantilla";
    return `<option value="${id}">${escapeHtml(label)}</option>`;
  }).join("");
  if (lead) lead.textContent = files.length > 1
    ? "Estas notas ya no tienen su plantilla. Elige dónde se restauran."
    : "Esta nota ya no tiene su plantilla. Elige dónde se restaura.";
  modal.hidden = false;
}

function selectTemplate(id) {
  if (!state.templates[id] || state.templates[id].deletedAt) return;
  state.activeTemplate = id;
  state.listView = "active";
  const file = currentFile();
  if (file && file.templateId !== id) state.openId = null;
  save();
  render();
}

function deleteTemplate(id) {
  const tpl = state.templates[id];
  if (!tpl || tpl.deletedAt) return;
  const now = Date.now();
  tpl.deletedAt = now;
  state.files.forEach((file) => {
    if (file.templateId === id && !file.deletedAt) {
      file.deletedAt = now;
      file.deletedByTemplate = id;
      file.archived = false;
    }
  });
  if (state.activeTemplate === id) state.activeTemplate = liveTemplateIds()[0] || null;
  if (state.openId && state.files.find((file) => file.id === state.openId)?.deletedAt) state.openId = null;
  save();
  render();
}

function restoreTemplate(id) {
  const tpl = state.templates[id];
  if (!tpl || tpl.purged || !tpl.deletedAt) return;
  tpl.deletedAt = null;
  state.files.forEach((file) => {
    if (file.deletedByTemplate === id) {
      file.deletedAt = null;
      file.deletedByTemplate = null;
    }
  });
}

function restoreAllNotes() {
  const pending = [];
  state.files.forEach((file) => {
    if (!file.deletedAt || file.deletedByTemplate) return;
    if (needsTemplatePick(file)) pending.push(file);
    else finishRestore(file, file.templateId);
  });
  if (pending.length) openRestorePick(pending);
}

function restoreAllTemplates() {
  Object.keys(state.templates).forEach((id) => {
    if (state.templates[id]?.deletedAt && !state.templates[id].purged) restoreTemplate(id);
  });
  if (!state.activeTemplate) state.activeTemplate = liveTemplateIds()[0] || null;
}

function placeAtEnd(file) {
  file.order = orderMates(file).reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
  resequence(viewForFile(file));
}

function moveFileTo(file, position) {
  const view = viewForFile(file);
  const group = orderMates(file).sort((a, b) => (a.order || 0) - (b.order || 0));
  const index = Math.max(0, Math.min(Number(position) || 1, group.length + 1) - 1);
  group.splice(index, 0, file);
  group.forEach((item, itemIndex) => { item.order = itemIndex + 1; });
}

function openMoveTemplate(file) {
  const select = document.getElementById("move-template-select");
  const modal = document.getElementById("move-template-modal");
  if (!select || !modal) return;
  select.innerHTML = liveTemplateIds()
    .filter((id) => id !== file.templateId)
    .map((id) => {
      const label = state.templates[id]?.label || state.templates[id]?.title || "Plantilla";
      return `<option value="${id}">${escapeHtml(label)}</option>`;
    }).join("");
  modal.dataset.fileId = file.id;
  modal.hidden = false;
}

function moveNoteToTemplate(file, templateId) {
  if (!file || !state.templates[templateId] || file.templateId === templateId) return;
  const previous = viewForFile(file);
  file.templateId = templateId;
  if (!file.colorOwn) file.color = state.templates[templateId].color || file.color;
  file.order = orderMates(file).reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
  resequence(previous);
  resequence(viewForFile(file));
}

function openOrderDialog(file) {
  const total = orderMates(file).length + 1;
  const lead = document.getElementById("order-lead");
  const input = document.getElementById("order-input");
  const modal = document.getElementById("order-modal");
  if (lead) lead.textContent = `Ahora es la ${file.order} de ${total}. Escribe el número nuevo.`;
  if (input) {
    input.max = String(total);
    input.value = String(file.order || 1);
  }
  modal.dataset.fileId = file.id;
  modal.hidden = false;
  input?.focus();
  input?.select();
}

function purgeOldTrash() {
  const cutoff = Date.now() - TRASH_MS;
  const removed = new Set();
  state.files = state.files.filter((file) => {
    if (file.deletedAt && file.deletedAt < cutoff) {
      removed.add(file.id);
      return false;
    }
    return true;
  });
  let droppedTemplate = false;
  Object.values(state.templates).forEach((tpl) => {
    if (tpl.deletedAt && !tpl.purged && tpl.deletedAt < cutoff) {
      tpl.purged = true;
      droppedTemplate = true;
    }
  });
  if (!removed.size && !droppedTemplate) return;
  state.alarms = state.alarms.filter((alarm) => !removed.has(alarm.fileId));
  if (state.openId && removed.has(state.openId)) state.openId = null;
  save();
}

function syncListView() {
  const file = currentFile();
  if (file && !fileInView(file, state.listView)) state.openId = null;
}

function migrate(old) {
  const next = blank();
  next.sound = old.sound !== false;
  const notes = old.notes || {};
  Object.keys(notes).sort().forEach((key) => {
    const text = notes[key]?.text || "";
    if (!text.trim()) return;
    const id = crypto.randomUUID();
    const [y, m, d] = key.split("-").map(Number);
    const title = new Date(y, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
    next.files.push({ id, title: escapeHtml(title), body: escapeHtml(text).replace(/\n/g, "<br>"), archived: false, deletedAt: null, updatedAt: Date.now() });
    next.openId = id;
  });
  return next;
}

function snapshot() {
  return {
    files: state.files,
    alarms: state.alarms,
    sound: state.sound,
    openId: state.openId,
    listView: state.listView,
    showDetail: state.showDetail !== false,
    focusOpen: state.focusOpen === true,
    accountOpen: state.accountOpen === true,
    shortcutsOpen: state.shortcutsOpen === true,
    toolOrderOpen: state.toolOrderOpen === true,
    pricesOpen: state.pricesOpen === true,
    activeTemplate: state.activeTemplate,
    lastSnoozeQuick: state.lastSnoozeQuick,
    theme: state.theme,
    showExport: state.showExport !== false,
    showImport: state.showImport !== false,
    hideTools: state.hideTools === true,
    toolColor: state.toolColor !== false,
    toolDelete: state.toolDelete !== false,
    toolCopy: state.toolCopy !== false,
    toolRepeat: state.toolRepeat === true,
    lockEdit: state.lockEdit === true,
    appLock: state.appLock === true,
    appColor: state.appColor || "",
    barTools: state.barTools,
    autoHideBar: state.autoHideBar === true,
    showNotify: state.showNotify !== false,
    colorShortcuts: state.colorShortcuts === true,
    inkShortcuts: state.inkShortcuts,
    hideEditor: state.hideEditor === true,
    toolSize: state.toolSize,
    toolOrder: state.toolOrder,
    templates: state.templates,
    templateLook: state.templateLook,
    noteGap: state.noteGap,
    noteLines: state.noteLines === true,
    noteFont: state.noteFont,
    noteLine: state.noteLine,
    noteWidth: state.noteWidth,
    cardSize: state.cardSize,
    askPasswordEvery: state.askPasswordEvery === true,
    confirmDelete: state.confirmDelete !== false,
    hideNoteAlarms: state.hideNoteAlarms !== false,
    offlineMode: state.offlineMode !== false,
    prefDefaults: 3,
    showInfo: state.showInfo !== false,
    noTemplates: state.noTemplates === true,
    alarmUntilTouch: state.alarmUntilTouch === true,
    alarmVibrate: state.alarmVibrate === true,
    alarmContinuous: state.alarmContinuous === true,
  };
}

function save() {
  rememberTab();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  document.dispatchEvent(new Event("bloc-saved"));
  syncNativeAlarms();
}

function syncNativeAlarms() {
  const bridge = window.BlocNative;
  if (!bridge?.syncAlarms) return;
  const alarms = (state.alarms || [])
    .filter((alarm) => alarm.status === "pending" || alarm.status === "ringing")
    .map((alarm) => {
      const file = state.files.find((item) => item.id === alarm.fileId);
      return {
        id: alarm.id,
        at: alarm.at,
        text: alarm.text || "Aviso",
        title: plain(file?.title || "") || "Nota",
        sound: fileSoundOn(file),
        preAt: alarm.preAlert ? alarm.at - alarm.preAlert * 60000 : 0,
        preSent: alarm.preSent === true,
        repeat: alarm.repeat || "none",
        intervalDays: alarm.intervalDays || 2,
        monthDay: alarm.monthDay || 0,
        preAlert: alarm.preAlert || 0,
        nextAt: nextFutureRepeat(alarm) || 0,
      };
    });
  bridge.syncAlarms(JSON.stringify({
    alarms,
    continuous: state.alarmContinuous === true,
    vibrate: state.alarmVibrate === true,
  }));
}

function applyRemoteState(data) {
  const next = normalize(data || {});
  state.files = next.files;
  state.alarms = next.alarms;
  state.sound = next.sound;
  state.openId = next.openId;
  state.lastSnoozeQuick = next.lastSnoozeQuick;
  state.listView = next.listView;
  state.showDetail = next.showDetail;
  state.focusOpen = next.focusOpen;
  state.accountOpen = next.accountOpen;
  state.shortcutsOpen = next.shortcutsOpen === true;
  state.toolOrderOpen = next.toolOrderOpen === true;
  state.pricesOpen = next.pricesOpen === true;
  state.activeTemplate = next.activeTemplate;
  state.theme = next.theme;
  state.showExport = next.showExport !== false;
  state.showImport = next.showImport !== false;
  state.hideTools = next.hideTools === true;
  state.toolColor = next.toolColor !== false;
  state.toolDelete = next.toolDelete !== false;
  state.toolCopy = next.toolCopy !== false;
  state.toolRepeat = next.toolRepeat === true;
  state.lockEdit = next.lockEdit === true;
  state.appLock = next.appLock === true;
  state.appColor = next.appColor || "";
  state.barTools = next.barTools;
  state.autoHideBar = next.autoHideBar === true;
  state.showNotify = next.showNotify !== false;
  state.colorShortcuts = next.colorShortcuts === true;
  state.inkShortcuts = next.inkShortcuts;
  state.hideEditor = next.hideEditor === true;
  state.toolSize = next.toolSize;
  state.toolOrder = next.toolOrder;
  state.templates = next.templates;
  state.templateLook = next.templateLook;
  state.noteGap = next.noteGap;
  state.noteLines = next.noteLines;
  state.noteFont = next.noteFont;
  state.noteLine = next.noteLine;
  state.noteWidth = next.noteWidth;
  state.cardSize = next.cardSize;
  state.askPasswordEvery = next.askPasswordEvery;
  state.confirmDelete = next.confirmDelete;
  state.hideNoteAlarms = next.hideNoteAlarms !== false;
  state.offlineMode = next.offlineMode !== false;
  state.prefDefaults = 3;
  state.showInfo = next.showInfo;
  state.noTemplates = next.noTemplates === true;
  state.alarmUntilTouch = next.alarmUntilTouch === true;
  state.alarmVibrate = next.alarmVibrate === true;
  state.alarmContinuous = next.alarmContinuous === true;
  placeTab(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
  render();
  restorePlace();
  if (window.restoreAccount) window.restoreAccount();
}

function keyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return new Date(year, month, 1 - offset);
}

function formatHour(date) {
  return date.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatLong(date) {
  const day = date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return `${day}, ${formatHour(date)}`;
}

function prepareClocks() {
  ["cal", "post"].forEach((prefix) => {
    const hourEl = document.getElementById(`${prefix}-hour`);
    const minuteEl = document.getElementById(`${prefix}-minute`);
    if (!hourEl || hourEl.options.length) return;
    for (let hour = 1; hour <= 12; hour += 1) hourEl.add(new Option(String(hour), String(hour)));
    for (let minute = 0; minute < 60; minute += 1) {
      const label = String(minute).padStart(2, "0");
      minuteEl.add(new Option(label, String(minute)));
    }
  });
}

function setClock(prefix, date) {
  const hourEl = document.getElementById(`${prefix}-hour`);
  const minuteEl = document.getElementById(`${prefix}-minute`);
  const ampmEl = document.getElementById(`${prefix}-ampm`);
  if (!hourEl || !minuteEl || !ampmEl) return;
  const hour24 = date.getHours();
  hourEl.value = String(hour24 % 12 || 12);
  minuteEl.value = String(date.getMinutes());
  ampmEl.value = hour24 >= 12 ? "pm" : "am";
}

function readClock(prefix) {
  const hourEl = document.getElementById(`${prefix}-hour`);
  const minuteEl = document.getElementById(`${prefix}-minute`);
  const ampmEl = document.getElementById(`${prefix}-ampm`);
  if (!hourEl || !minuteEl || !ampmEl || hourEl.value === "" || minuteEl.value === "") return null;
  let hour = Number(hourEl.value);
  const minute = Number(minuteEl.value);
  if (ampmEl.value === "pm" && hour < 12) hour += 12;
  if (ampmEl.value === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function currentFile() {
  return state.files.find((file) => file.id === state.openId) || null;
}

function plain(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  return holder.textContent.replace(/\s+/g, " ").trim();
}

function serialize(node) {
  let html = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) html += escapeHtml(child.textContent);
    else if (child.nodeName === "BR") html += "<br>";
    else if (child.nodeName === "MARK" && child.dataset.alarm) {
      html += `<mark class="aviso" data-alarm="${escapeHtml(child.dataset.alarm)}">${escapeHtml(child.textContent)}</mark>`;
    } else if (child.nodeName === "U") html += `<u>${serialize(child)}</u>`;
    else if (child.nodeName === "S" || child.nodeName === "STRIKE" || child.nodeName === "DEL") html += `<s>${serialize(child)}</s>`;
    else if (child.nodeName === "B" || child.nodeName === "STRONG") html += `<b>${serialize(child)}</b>`;
    else if (child.nodeName === "I" || child.nodeName === "EM") html += `<i>${serialize(child)}</i>`;
    else if (child.nodeName === "UL" || child.nodeName === "OL") {
      const tag = child.nodeName.toLowerCase();
      html += `<${tag}>${serialize(child)}</${tag}>`;
    } else if (child.nodeName === "LI") html += `<li>${serialize(child)}</li>`;
    else if (child.nodeName === "IMG") {
      const src = child.getAttribute("src") || "";
      if (src.startsWith("data:image/") && src.length < 500000) html += `<img src="${escapeHtml(src)}" alt="">`;
    } else if (child.nodeName === "SPAN" || child.nodeName === "FONT") {
      const color = child.style?.color || child.getAttribute("color") || "";
      const bg = child.style?.backgroundColor || "";
      const face = child.style?.fontFamily || child.getAttribute("face") || "";
      let style = "";
      if (color) style += `color:${color};`;
      if (bg) style += `background-color:${bg};`;
      if (face) style += `font-family:${face};`;
      html += style ? `<span style="${escapeHtml(style)}">${serialize(child)}</span>` : serialize(child);
    } else if (child.nodeName === "DIV" || child.nodeName === "P") {
      const align = child.style?.textAlign || "";
      const inner = serialize(child);
      if (html && !html.endsWith("<br>") && !html.endsWith(">")) html += "<br>";
      html += align && align !== "start" && align !== "left"
        ? `<div style="text-align:${align}">${inner}</div>`
        : inner;
    } else html += serialize(child);
  });
  return html;
}

function unwrap(node) {
  const parent = node.parentNode;
  while (node.firstChild) parent.insertBefore(node.firstChild, node);
  parent.removeChild(node);
}

function pendingAlarms() {
  return state.alarms
    .filter((alarm) => alarm.status === "pending" || alarm.status === "ringing")
    .sort((a, b) => a.at - b.at);
}

function fileHasPending(fileId) {
  return state.alarms.some((alarm) => alarm.fileId === fileId && alarm.status !== "done");
}

function render() {
  renderList();
  renderEditor();
  renderEye();
  renderNotify();
  document.body.classList.toggle("note-open", window.matchMedia("(max-width: 700px)").matches && Boolean(state.openId) && !state.focusOpen);
  if (window.syncBlocChrome) window.syncBlocChrome();
}

function renderEye() {
  const icon = document.getElementById("eye-icon");
  const open = state.showDetail !== false;
  if (icon) icon.innerHTML = open ? eyeOn : eyeOff;
  const label = open ? "Ocultar panel" : "Mostrar panel";
  const eyeLabel = document.getElementById("eye-label");
  if (eyeLabel) eyeLabel.textContent = label;
  els.eye.setAttribute("aria-pressed", String(open));
  els.eye.setAttribute("aria-label", label);
  document.body.classList.toggle("hide-detail", !open);
}

const CARD_COLORS = PALETTE;
const COLOR_NAMES = { sand: "Arena", leaf: "Hoja", sky: "Cielo", rose: "Rosa" };
let colorFileId = null;

function cardColor(id) {
  let total = 0;
  for (const char of id) total += char.charCodeAt(0);
  return CARD_COLORS[total % CARD_COLORS.length];
}

function noteCardClass(file) {
  return file.color && CARD_COLORS.includes(file.color) ? file.color : cardColor(file.id);
}

function trashDaysLeft(file) {
  if (!file.deletedAt) return null;
  return Math.max(0, Math.ceil((file.deletedAt + TRASH_MS - Date.now()) / 86400000));
}

function fold(value) {
  return String(value || "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function renderList() {
  const view = state.listView || "active";
  document.body.classList.toggle("archive-only", view === "archived");
  const query = fold(els.search.value.trim());
  const shortcuts = state.shortcutsOpen === true || state.toolOrderOpen === true;
  const here = shortcuts ? "shortcuts" : state.accountOpen === true ? "account" : view;
  els.toggleArchived.setAttribute("aria-pressed", String(here === "archived"));
  els.toggleArchived.setAttribute("aria-label", view === "archived" ? "Volver a notas" : "Ver archivados");
  els.toggleTrash.setAttribute("aria-pressed", String(here === "trash"));
  document.querySelector("[data-menu='home']")?.setAttribute("aria-pressed", String(here === "active"));
  document.querySelector("[data-menu='shortcuts']")?.setAttribute("aria-pressed", String(here === "shortcuts"));
  document.querySelector("[data-menu='account']")?.setAttribute("aria-pressed", String(here === "account"));
  els.toggleTrash.setAttribute("aria-label", view === "trash" ? "Volver a notas" : "Eliminados");
  const files = state.files.filter((file) => fileInView(file, view))
    .filter((file) => {
      if (view === "trash" || state.noTemplates || !state.activeTemplate) return true;
      if (file.templateId === state.activeTemplate) return true;
      return view !== "active" && !templateIsLive(file.templateId);
    })
    .filter((file) => {
      if (!query) return true;
      const visible = noteSealed(file) ? "nota protegida" : `${plain(file.title)} ${plain(file.body)}`;
      return fold(visible).includes(query);
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const trashBar = document.getElementById("trash-actions");
  if (trashBar) trashBar.hidden = view !== "trash";
  const emptyTop = document.getElementById("btn-empty-trash-top");
  if (emptyTop) emptyTop.hidden = view !== "trash" || state.accountOpen === true;
  if (els.add) els.add.hidden = view !== "active";
  const tplBar = document.getElementById("template-bar");
  if (tplBar) tplBar.hidden = view !== "active" || state.noTemplates === true;
  const addTpl = document.getElementById("btn-add-template");
  if (addTpl) addTpl.hidden = state.noTemplates === true;
  document.body.classList.toggle("no-templates", state.noTemplates === true);
  if (!files.length) {
    const emptyByView = {
      active: "Esta plantilla no tiene notas.",
      archived: "No hay notas archivadas.",
      trash: "No hay eliminados.",
    };
    const message = query ? "Ninguna nota coincide." : emptyByView[view];
    els.list.innerHTML = `<li class="empty">${message}</li>`;
    return;
  }
  els.list.innerHTML = files.map((file) => {
    const sealed = noteSealed(file);
    const title = sealed ? "Nota protegida" : (plain(file.title) || "Sin título");
    const lock = file.locked ? '<i class="lock" aria-hidden="true">🔒</i> ' : "";
    const open = file.id === state.openId ? " open" : "";
    const dot = fileHasPending(file.id) ? '<i class="dot"></i>' : "";
    const pin = file.pinned ? '<i class="pin" aria-hidden="true"></i>' : "";
    const days = view === "trash" ? trashDaysLeft(file) : null;
    const meta = days != null ? `<small class="trash-meta">Se borra en ${days} día${days === 1 ? "" : "s"}</small>` : "";
    const tint = CARD_COLORS.includes(file.color) ? file.color : "";
    const stripe = file.color ? `<i class="row-stripe" style="background:${colorHex(file.color)}"></i>` : "";
    return `<li><button type="button" class="file-row ${tint}${open}${file.pinned ? " pinned" : ""}" data-file="${file.id}" style="--row-color:${colorHex(file.color)}">
      ${stripe}<strong><span class="order-num">${file.order}</span>${pin}${lock}${escapeHtml(title)}</strong>${dot}${meta}
    </button></li>`;
  }).join("");
}

function renderEditor() {
  const file = currentFile();
  const editingTitle = document.activeElement === els.title;
  const editingBody = document.activeElement === els.body;
  const lockedPanel = document.getElementById("editor-locked");
  if (!file) {
    els.editor.hidden = true;
    els.editorEmpty.hidden = false;
    if (lockedPanel) lockedPanel.hidden = true;
    return;
  }
  if (noteSealed(file)) {
    els.editor.hidden = true;
    els.editorEmpty.hidden = true;
    if (lockedPanel) lockedPanel.hidden = false;
    els.title.textContent = "";
    els.body.textContent = "";
    return;
  }
  if (lockedPanel) lockedPanel.hidden = true;
  syncHistoryFile();
  els.editor.hidden = false;
  els.editorEmpty.hidden = true;
  els.editor.classList.remove("sand", "leaf", "sky", "rose");
  if (CARD_COLORS.includes(file.color)) els.editor.classList.add(file.color);
  const paper = els.editor.querySelector(".paper");
  if (paper) paper.style.background = CARD_COLORS.includes(file.color) ? "" : colorHex(file.color);
  els.editor.style.setProperty("--note-stripe", file.color ? colorHex(file.color) : "transparent");
  if (!editingTitle && !document.getElementById("selection-pin")) els.title.innerHTML = file.title || "";
  if (!editingBody && !document.getElementById("selection-pin")) els.body.innerHTML = file.body || "";
  paintMarks(els.title);
  paintMarks(els.body);
  markEmpty(els.title);
  markEmpty(els.body);
  renderFileAlarms(file);
  paintMathTotal(file);
  if (!document.getElementById("selection-pin")) applyFocusSearch();
  const frozen = state.lockEdit === true;
  els.title.contentEditable = frozen ? "false" : "true";
  els.body.contentEditable = frozen ? "false" : "true";
}

function moneyToken(token) {
  let text = String(token || "").trim();
  const negative = text.startsWith("-");
  text = text.replace(/^-/, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function lineValues(line) {
  const debt = /\b(pago|debe|resta|descuento|abono)\b/i.test(line);
  const values = [];
  const re = /-?\d{1,3}(?:\.\d{3})+|-?\d+/g;
  let match;
  while ((match = re.exec(line))) {
    let value = moneyToken(match[0]);
    if (value == null) continue;
    const before = line.slice(Math.max(0, match.index - 3), match.index);
    if (value > 0 && (debt || /-\s*$/.test(before))) value = -value;
    values.push(value);
  }
  return values;
}

function lineCatMap(noteId) {
  try {
    return JSON.parse(localStorage.getItem("bloc-line-cats") || "{}")[noteId] || {};
  } catch (e) {
    return {};
  }
}

function htmlToLines(html) {
  const box = document.createElement("div");
  box.innerHTML = String(html || "");
  const blocks = [...box.childNodes];
  if (!blocks.some((node) => node.nodeName === "DIV" || node.nodeName === "P")) {
    const text = box.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    const holder = document.createElement("div");
    holder.innerHTML = text;
    return (holder.textContent || "").split("\n");
  }
  const lines = [];
  blocks.forEach((node) => {
    if (node.nodeName === "DIV" || node.nodeName === "P") lines.push(node.textContent || "");
    else if (node.nodeName === "BR") lines.push("");
    else if (node.nodeType === 3) {
      node.textContent.split("\n").forEach((bit, index) => {
        if (index === 0 && !lines.length) lines.push(bit);
        else if (index === 0) lines[lines.length - 1] = `${lines[lines.length - 1] || ""}${bit}`;
        else lines.push(bit);
      });
    }
  });
  return lines.length ? lines : [""];
}

function noteMathParts(html, noteId) {
  const lines = htmlToLines(html);
  const assigned = lineCatMap(noteId);
  const parts = [];
  const buckets = new Map();
  let current = { name: "", total: 0 };
  const flush = () => {
    if (current.name || current.total) parts.push(current);
    current = { name: "", total: 0 };
  };
  lines.forEach((raw, index) => {
    const line = raw.trim();
    const cat = assigned[String(index)];
    if (cat?.name) {
      flush();
      const values = lineValues(line);
      const prev = buckets.get(cat.name) || 0;
      buckets.set(cat.name, prev + values.reduce((sum, value) => sum + value, 0));
      return;
    }
    if (!line) return;
    const values = lineValues(line);
    if (!values.length) {
      flush();
      current = { name: line, total: 0 };
      return;
    }
    values.forEach((value) => { current.total += value; });
  });
  flush();
  buckets.forEach((total, name) => {
    if (total) parts.push({ name, total });
  });
  return parts;
}

function noteMathTotal(html) {
  return noteMathParts(html).reduce((sum, part) => sum + part.total, 0);
}

function moneyLabel(value) {
  return Math.round(value).toLocaleString("es-CO");
}

function iconExtra(noteId) {
  try {
    const saved = JSON.parse(localStorage.getItem("bloc-gastos") || "{}");
    return (saved.events || [])
      .filter((item) => item.note === noteId && !item.fromNote)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  } catch (e) {
    return 0;
  }
}

function paintMathTotal(file) {
  const box = document.getElementById("math-total");
  if (!box) return;
  const tpl = file?.templateId ? state.templates[file.templateId] : null;
  const mathOn = Boolean(file && tpl?.math);
  const source = els.body && file && state.openId === file.id ? els.body.innerHTML : file?.body;
  const parts = mathOn ? noteMathParts(source, file.id) : [];
  document.dispatchEvent(new CustomEvent("bloc-math", {
    detail: { noteId: file?.id || "", parts },
  }));
  if (!mathOn) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  const named = parts.filter((part) => part.name && part.total);
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  const extra = iconExtra(file.id);
  let split = false;
  try { split = JSON.parse(localStorage.getItem("bloc-gastos") || "{}").splitTotals === true; } catch (e) {}
  const lines = [];
  if (split || named.length) named.forEach((part) => lines.push(`Total ${part.name} ${moneyLabel(part.total)}`));
  lines.push(`Total ${moneyLabel(total)}`);
  if (extra) {
    lines.push(`Iconos ${moneyLabel(extra)}`);
    lines.push(`Total de todo ${moneyLabel(total + extra)}`);
  } else if (named.length || split) {
    lines[lines.length - 1] = `Total de todo ${moneyLabel(total)}`;
  }
  box.hidden = false;
  box.textContent = lines.join("\n");
}

function paintMarks(root) {
  root.querySelectorAll("mark[data-alarm]").forEach((mark) => {
    const alarm = state.alarms.find((item) => item.id === mark.dataset.alarm);
    mark.classList.toggle("done", !alarm || alarm.status === "done");
    mark.title = alarm && alarm.status !== "done" ? formatLong(new Date(alarm.at)) : "";
  });
}

function markEmpty(el) {
  el.classList.toggle("is-empty", !el.textContent.trim());
}

function repeatLabel(alarm) {
  if (alarm.repeat === "daily") return "cada día";
  if (alarm.repeat === "weekdays") return "lun–vie";
  if (alarm.repeat === "interval") return `cada ${alarm.intervalDays || 2} días`;
  if (alarm.repeat === "monthly") return "cada mes";
  return "";
}

function nextFutureRepeat(alarm) {
  if (!alarm || alarm.repeat === "none" || !alarm.repeat) return null;
  let cursor = alarm;
  let next = nextRepeatAt(cursor);
  for (let i = 0; next && next <= Date.now() && i < 400; i += 1) {
    cursor = { ...alarm, at: next };
    next = nextRepeatAt(cursor);
  }
  return next && next > Date.now() ? next : null;
}

function nextRepeatAt(alarm) {
  const base = new Date(alarm.at);
  if (alarm.repeat === "daily") return new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, base.getHours(), base.getMinutes(), 0, 0).getTime();
  if (alarm.repeat === "weekdays") {
    const next = new Date(base);
    do { next.setDate(next.getDate() + 1); } while (next.getDay() === 0 || next.getDay() === 6);
    next.setSeconds(0, 0);
    return next.getTime();
  }
  if (alarm.repeat === "interval") {
    const days = alarm.intervalDays || 2;
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, base.getHours(), base.getMinutes(), 0, 0).getTime();
  }
  if (alarm.repeat === "monthly") {
    const wanted = alarm.monthDay || base.getDate();
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1, base.getHours(), base.getMinutes(), 0, 0);
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(wanted, last));
    return next.getTime();
  }
  return null;
}

function renderFileAlarms(file) {
  const items = state.alarms.filter((alarm) => alarm.fileId === file.id).sort((a, b) => a.at - b.at);
  if (!items.length) {
    els.fileAlarms.innerHTML = `<li class="empty">Selecciona palabras del título o del texto para programar uno.</li>`;
    return;
  }
  els.fileAlarms.innerHTML = items.map((alarm) => {
    const when = formatLong(new Date(alarm.at));
    const done = alarm.status === "done" ? " <small>cumplido</small>" : "";
    const rep = alarm.repeat && alarm.repeat !== "none" ? ` <small class="repeat-tag">${repeatLabel(alarm)}</small>` : "";
    const pre = alarm.preAlert ? ` <small>pre ${alarm.preAlert} min</small>` : "";
    return `<li class="alarm-row"><span><strong>${escapeHtml(alarm.text)}</strong><small>${when}${rep}${pre}${done}</small></span>
      <button type="button" class="icon-btn" data-remove="${alarm.id}" aria-label="Quitar aviso">✕</button></li>`;
  }).join("");
}

function fileSoundOn(file) {
  return state.sound !== false && (!file || file.sound !== false);
}

function confirmDelete(first, second) {
  if (state.confirmDelete === false) return true;
  return confirmTwice(first, second);
}

function noticeItem(alarm) {
  const file = state.files.find((item) => item.id === alarm.fileId);
  const title = plain(file?.title || "") || "Sin título";
  return `<li class="notify-row">
    <button type="button" class="notify-main" data-notify-open="${alarm.fileId}">
      <strong>${escapeHtml(alarm.text || "Aviso")}</strong>
      <small>${formatLong(new Date(alarm.at))} · ${escapeHtml(title)}</small>
    </button>
    <button type="button" class="notify-trash" data-notify-delete="${alarm.id}" aria-label="Eliminar notificación">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M8 4.5h8l-.6 2H18v1.6H6V6.5h2.6L8 4.5zM7.2 9.2h9.6l-.7 10.2H7.9L7.2 9.2z"/></svg>
    </button>
  </li>`;
}

function renderNotifyPanel() {
  const upcoming = document.getElementById("notify-upcoming");
  const recent = document.getElementById("notify-recent");
  const members = document.getElementById("notify-members");
  const membersLabel = document.getElementById("notify-members-label");
  if (!upcoming || !recent) return;
  const now = Date.now();
  const next = state.alarms.filter((alarm) => alarm.at > now).sort((a, b) => a.at - b.at);
  const past = state.alarms.filter((alarm) => alarm.at <= now).sort((a, b) => b.at - a.at);
  upcoming.innerHTML = next.map(noticeItem).join("") || `<li class="notify-empty">No hay avisos por llegar.</li>`;
  recent.innerHTML = past.map(noticeItem).join("") || `<li class="notify-empty">No hay recientes.</li>`;
  if (!members || !membersLabel) return;
  membersLabel.hidden = !membershipNotices.length;
  members.innerHTML = membershipNotices.map((item) => {
    const when = new Date(item.until).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
    const line = item.until > now ? `Vence el ${when}` : `Venció el ${when}`;
    return `<li class="notify-row"><span class="notify-main"><strong>${escapeHtml(item.username || item.email || "Usuario")}</strong><small>${line}</small></span></li>`;
  }).join("");
}

let membershipNotices = [];

function pingMemberships() {
  const soon = membershipNotices.filter((item) => item.until > Date.now());
  if (!soon.length) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = `bloc-vence-dia:${day}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  const body = soon.length === 1
    ? `${soon[0].username || "Un usuario"} vence el ${new Date(soon[0].until).toLocaleDateString("es", { day: "numeric", month: "long" })}`
    : `${soon.length} usuarios vencen pronto`;
  if (window.BlocNative?.startRing) {
    window.BlocNative.startRing(JSON.stringify({
      text: body,
      title: "Membresía por vencer",
      continuous: false,
      vibrate: true,
      kind: "expiry",
    }));
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    const notice = new Notification("Bloc — membresía", { body, tag: key });
    notice.onclick = () => window.focus();
  }
}

window.setMembershipNotices = function setMembershipNotices(items) {
  membershipNotices = Array.isArray(items) ? items : [];
  const bell = document.getElementById("btn-notify");
  if (bell) bell.classList.toggle("has-alert", membershipNotices.length > 0);
  renderNotifyPanel();
  pingMemberships();
};

function renderNotify() {
  const panel = document.getElementById("notify-panel");
  els.notify.setAttribute("aria-expanded", String(panel && !panel.hidden));
  els.notify.setAttribute("aria-label", "Notificaciones");
  renderNotifyPanel();
}

function purgeOldNotices() {
  const limit = Date.now() - TRASH_MS;
  const old = state.alarms.filter((alarm) => alarm.id !== ringingId && alarm.at < limit);
  if (!old.length) return;
  old.forEach((alarm) => {
    state.files.forEach((file) => {
      file.title = stripHtml(file.title, alarm.id);
      file.body = stripHtml(file.body, alarm.id);
    });
  });
  const ids = new Set(old.map((alarm) => alarm.id));
  state.alarms = state.alarms.filter((alarm) => !ids.has(alarm.id));
  const file = currentFile();
  const touched = file && old.some((alarm) => alarm.fileId === file.id);
  if (touched && document.activeElement !== els.title && document.activeElement !== els.body) {
    els.title.innerHTML = file.title || "";
    els.body.innerHTML = file.body || "";
  }
  save();
}

function rememberFile() {
  const file = currentFile();
  if (!file) return;
  file.title = serialize(els.title);
  file.body = serialize(els.body);
  file.updatedAt = Date.now();
  const alive = new Set([
    ...els.title.querySelectorAll("mark[data-alarm]"),
    ...els.body.querySelectorAll("mark[data-alarm]"),
  ].map((mark) => mark.dataset.alarm));
  state.alarms = state.alarms.filter((alarm) => alarm.fileId !== file.id || alive.has(alarm.id) || (alarm.linkedTo && alive.has(alarm.linkedTo)));
  save();
}

function createFile() {
  const file = {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    archived: false,
    deletedAt: null,
    archivedAt: null,
    pinned: false,
    sound: true,
    color: state.noTemplates ? CARD_COLORS[state.files.length % CARD_COLORS.length] : (state.templates[state.activeTemplate]?.color || CARD_COLORS[state.files.length % CARD_COLORS.length]),
    colorOwn: false,
    templateId: state.noTemplates ? null : state.activeTemplate,
    loose: state.noTemplates === true,
    createdAt: Date.now(),
    order: state.files.filter((item) => !item.archived && !item.deletedAt).length + 1,
    updatedAt: Date.now(),
  };
  state.files.push(file);
  state.openId = file.id;
  state.listView = "active";
  els.search.value = "";
  save();
  render();
  els.title.focus();
}

function openFile(id) {
  const file = state.files.find((item) => item.id === id);
  if (file && noteSealed(file)) {
    askMaster("open", id);
    return;
  }
  sealLeftNote(id);
  state.openId = id;
  save();
  render();
}

function restorePlace() {
  if (!state.focusOpen || !state.openId || !els.focusView.hidden) return;
  openFocus(state.openId);
}

function openFocus(id) {
  const file = state.files.find((item) => item.id === id);
  if (file && noteSealed(file)) {
    askMaster("open", id);
    return;
  }
  sealLeftNote(id);
  state.openId = id;
  state.focusOpen = true;
  save();
  render();
  els.focusSlot.appendChild(els.editorPage);
  document.getElementById("focus-title-slot")?.appendChild(els.title);
  els.focusView.hidden = false;
  document.body.classList.add("focus-open");
  els.focusSearch.value = "";
  renderEditor();
  applyFocusSearch();
}

function closeFocus() {
  if (els.focusView.hidden) return;
  clearHits(els.title);
  clearHits(els.body);
  els.focusSearch.value = "";
  document.querySelector("#editor .editor-top")?.appendChild(els.title);
  els.book.appendChild(els.editorPage);
  els.focusView.hidden = true;
  document.body.classList.remove("focus-open");
  if (state.askPasswordEvery && state.openId) unlockedNotes.delete(state.openId);
  state.focusOpen = false;
  save();
  window.setBlocReadOnly?.(false);
  renderEditor();
}

function clearHits(root) {
  root.querySelectorAll("mark.hit").forEach(unwrap);
}

function matchRanges(text, query) {
  const folded = fold(text);
  const needle = fold(query);
  if (!needle) return [];
  const map = [];
  for (let index = 0; index < text.length; index += 1) {
    const piece = fold(text[index]);
    for (let step = 0; step < piece.length; step += 1) map.push(index);
  }
  const ranges = [];
  let from = 0;
  while (from <= folded.length - needle.length) {
    const found = folded.indexOf(needle, from);
    if (found === -1) break;
    ranges.push([map[found], map[found + needle.length - 1] + 1]);
    from = found + needle.length;
  }
  return ranges;
}

function highlightIn(root, query) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  nodes.forEach((node) => {
    if (node.parentElement?.closest("mark.hit")) return;
    const ranges = matchRanges(node.textContent, query);
    if (!ranges.length) return;
    const fragment = document.createDocumentFragment();
    let last = 0;
    ranges.forEach(([start, end]) => {
      if (start > last) fragment.append(document.createTextNode(node.textContent.slice(last, start)));
      const mark = document.createElement("mark");
      mark.className = "hit";
      mark.textContent = node.textContent.slice(start, end);
      fragment.append(mark);
      last = end;
    });
    if (last < node.textContent.length) fragment.append(document.createTextNode(node.textContent.slice(last)));
    node.parentNode.replaceChild(fragment, node);
  });
}

function applyFocusSearch() {
  clearHits(els.title);
  clearHits(els.body);
  const query = els.focusSearch.value.trim();
  if (!query || els.focusView.hidden) return;
  highlightIn(els.title, query);
  highlightIn(els.body, query);
}

function setColorPair(colorId, hexId, value) {
  const hex = colorHex(value);
  const color = document.getElementById(colorId);
  const field = document.getElementById(hexId);
  if (color) color.value = hex;
  if (field) field.value = hex;
}

function readColorPair(colorId, hexId) {
  const field = document.getElementById(hexId);
  const typed = field?.value.trim() || "";
  if (isHexColor(typed)) return typed.toLowerCase();
  return document.getElementById(colorId)?.value || NAMED_HEX.sand;
}

function bindColorPair(colorId, hexId) {
  const color = document.getElementById(colorId);
  const field = document.getElementById(hexId);
  if (!color || !field || color.dataset.bound) return;
  color.dataset.bound = "1";
  color.addEventListener("input", () => { field.value = color.value; });
  field.addEventListener("input", () => {
    if (isHexColor(field.value.trim())) color.value = field.value.trim();
  });
}

function openColorModal(fileId) {
  if (state.toolColor === false) return;
  const file = state.files.find((item) => item.id === fileId);
  if (!file) return;
  colorFileId = fileId;
  closeMenu();
  const modal = document.getElementById("color-modal");
  if (!modal) return;
  setColorPair("note-color", "note-hex", file.color);
  modal.hidden = false;
}

function closeColorModal() {
  const modal = document.getElementById("color-modal");
  if (modal) modal.hidden = true;
  colorFileId = null;
  const heading = document.getElementById("color-heading");
  if (heading) heading.textContent = "Color de la nota";
}

function openAppColor() {
  colorFileId = "app";
  const heading = document.getElementById("color-heading");
  if (heading) heading.textContent = "Color de la aplicación";
  setColorPair("note-color", "note-hex", state.appColor || "#3e4a5a");
  const modal = document.getElementById("color-modal");
  if (modal) modal.hidden = false;
}

function openMenu(id, x, y, opts = {}) {
  menuFileId = id;
  const file = state.files.find((item) => item.id === id);
  const inNote = opts.inNote === true;
  const calendarBtn = els.menu.querySelector("[data-action='calendar']");
  const colorBtn = els.menu.querySelector("[data-action='color']");
  const pinBtn = els.menu.querySelector("[data-action='pin']");
  const soundBtn = els.menu.querySelector("[data-action='sound']");
  const deleteBtn = els.menu.querySelector("[data-action='delete']");
  const archiveBtn = els.menu.querySelector("[data-action='archive']");
  const restoreBtn = els.menu.querySelector("[data-action='restore']");
  const lockBtn = els.menu.querySelector("[data-action='lock']");
  const quickBtn = els.menu.querySelector("[data-action='quick-menu']");
  if (quickBtn) quickBtn.hidden = false;
  const restoreNotes = els.menu.querySelector("[data-action='restore-notes']");
  const restoreTemplates = els.menu.querySelector("[data-action='restore-templates']");
  const inTrash = state.listView === "trash";
  if (restoreNotes) restoreNotes.hidden = !inTrash;
  if (restoreTemplates) restoreTemplates.hidden = !inTrash;
  if (file?.deletedAt) {
    calendarBtn.hidden = false;
    colorBtn.hidden = true;
    pinBtn.hidden = true;
    soundBtn.hidden = true;
    deleteBtn.hidden = false;
    deleteBtn.textContent = "Eliminar del todo";
    lockBtn.hidden = true;
    archiveBtn.hidden = true;
    restoreBtn.hidden = false;
  } else if (file?.archived) {
    calendarBtn.hidden = false;
    colorBtn.hidden = false;
    pinBtn.hidden = false;
    pinBtn.textContent = file.pinned ? "Quitar fijado" : "Fijar";
    soundBtn.hidden = false;
    soundBtn.textContent = file.sound === false ? "Activar sonido" : "Silenciar";
    lockBtn.hidden = false;
    lockBtn.textContent = file.locked ? "Quitar contraseña" : "Poner contraseña";
    deleteBtn.hidden = false;
    deleteBtn.textContent = "Eliminar";
    archiveBtn.hidden = false;
    archiveBtn.textContent = "Recuperar";
    restoreBtn.hidden = true;
  } else {
    calendarBtn.hidden = false;
    colorBtn.hidden = false;
    pinBtn.hidden = false;
    pinBtn.textContent = file.pinned ? "Quitar fijado" : "Fijar";
    soundBtn.hidden = false;
    soundBtn.textContent = file.sound === false ? "Activar sonido" : "Silenciar";
    lockBtn.hidden = false;
    lockBtn.textContent = file.locked ? "Quitar contraseña" : "Poner contraseña";
    deleteBtn.hidden = false;
    deleteBtn.textContent = "Eliminar";
    archiveBtn.hidden = false;
    archiveBtn.textContent = "Archivar";
    restoreBtn.hidden = true;
  }
  const moveBtn = els.menu.querySelector("[data-action='move-template']");
  const orderBtn = els.menu.querySelector("[data-action='order']");
  if (orderBtn) orderBtn.hidden = inNote;
  if (state.toolColor === false && colorBtn) colorBtn.hidden = true;
  if (state.toolDelete === false && deleteBtn) deleteBtn.hidden = true;
  if (moveBtn) moveBtn.hidden = inNote || state.noTemplates === true || Boolean(file?.deletedAt) || liveTemplateIds().length < 2;
  const underlineBtn = els.menu.querySelector("[data-action='underline']");
  if (underlineBtn) {
    underlineBtn.hidden = !underlineRange;
    const node = underlineRange?.commonAncestorContainer;
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    underlineBtn.textContent = el?.closest("u") ? "Quitar subrayado" : "Subrayar";
  }
  const partBtn = els.menu.querySelector("[data-action='alarm-part']");
  if (partBtn) partBtn.hidden = !alarmRange;
  els.menu.hidden = false;
  const quick = document.getElementById("quick-menu");
  if (quick) {
    quick.hidden = true;
    els.menu.querySelector("[data-action='quick-menu']")?.setAttribute("aria-expanded", "false");
  }
  els.menu.style.left = `${x}px`;
  els.menu.style.top = `${y}px`;
  const rect = els.menu.getBoundingClientRect();
  if (rect.right > window.innerWidth - 8) els.menu.style.left = `${window.innerWidth - rect.width - 8}px`;
  if (rect.bottom > window.innerHeight - 8) els.menu.style.top = `${window.innerHeight - rect.height - 8}px`;
}

function closeMenu() {
  els.menu.hidden = true;
  menuFileId = null;
  const quick = document.getElementById("quick-modal");
  if (quick) quick.hidden = true;
}

function removeFile(file) {
  const id = file.id;
  const ringing = state.alarms.find((alarm) => alarm.id === ringingId);
  state.files = state.files.filter((item) => item.id !== id);
  state.alarms = state.alarms.filter((alarm) => alarm.fileId !== id);
  if (state.openId === id) state.openId = null;
  if (ringing && ringing.fileId === id) closeAlarm();
}

function stripAlarm(id) {
  state.files.forEach((file) => {
    file.title = stripHtml(file.title, id);
    file.body = stripHtml(file.body, id);
  });
  if (currentFile()) {
    els.title.querySelectorAll(`mark[data-alarm="${CSS.escape(id)}"]`).forEach(unwrap);
    els.body.querySelectorAll(`mark[data-alarm="${CSS.escape(id)}"]`).forEach(unwrap);
    rememberFile();
  }
  state.alarms = state.alarms.filter((alarm) => alarm.id !== id);
  save();
  render();
}

function stripHtml(html, id) {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  holder.querySelectorAll(`mark[data-alarm="${CSS.escape(id)}"]`).forEach(unwrap);
  return serialize(holder);
}

function editorOf(node) {
  if (!node) return null;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el) return null;
  if (els.title.contains(el)) return els.title;
  if (els.body.contains(el)) return els.body;
  return null;
}

function hideSelectionAction() {
  els.sel.hidden = true;
}

function placeSelectionAction() {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount || !els.calendar.hidden) {
    hideSelectionAction();
    return;
  }
  const start = editorOf(selection.anchorNode);
  const end = editorOf(selection.focusNode);
  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (!start || start !== end || !text) {
    hideSelectionAction();
    return;
  }
  const mark = (selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement)?.closest("mark.aviso");
  const inside = mark && start.contains(mark) && mark.contains(selection.focusNode);
  els.sel.textContent = inside ? "Quitar aviso" : "Programar aviso";
  els.sel.dataset.mode = inside ? "remove" : "add";
  els.sel.dataset.alarm = inside ? mark.dataset.alarm : "";
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  els.sel.hidden = false;
  const width = els.sel.offsetWidth || 150;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  const top = Math.max(8, rect.top - 44);
  els.sel.style.left = `${left}px`;
  els.sel.style.top = `${top}px`;
}

function pinSelection() {
  const selection = document.getSelection();
  if (!selection || !selection.rangeCount) return "";
  const range = selection.getRangeAt(0);
  const pin = document.createElement("span");
  pin.id = "selection-pin";
  const fragment = range.extractContents();
  pin.append(fragment);
  range.insertNode(pin);
  selection.removeAllRanges();
  return pin.textContent.replace(/\s+/g, " ").trim();
}

function clearPin() {
  const pin = document.getElementById("selection-pin");
  if (pin) unwrap(pin);
}

function openCalendar(mode) {
  calView.mode = mode;
  const seed = new Date();
  seed.setDate(seed.getDate() + 1);
  seed.setHours(0, 0, 0, 0);
  calView.year = seed.getFullYear();
  calView.month = seed.getMonth();
  calView.date = keyFromDate(seed);
  setClock("cal", seed);
  const scheduling = mode === "schedule";
  els.calHeading.textContent = scheduling ? "Programar aviso" : "Calendario";
  els.calHeading.classList.toggle("is-schedule", scheduling);
  const quickWrap = document.getElementById("cal-quick-wrap");
  if (quickWrap) quickWrap.hidden = !scheduling;
  const quick = document.getElementById("cal-quick");
  if (quick) quick.value = "";
  els.calChips.hidden = true;
  els.calTimeWrap.hidden = !scheduling;
  els.calPreview.hidden = !scheduling;
  els.calConfirm.hidden = !scheduling;
  els.calDayList.hidden = scheduling;
  const schedOpts = document.getElementById("cal-schedule-options");
  if (schedOpts) schedOpts.hidden = !scheduling;
  const conflict = document.getElementById("cal-conflict");
  if (conflict) conflict.hidden = true;
  clearQuick(els.calChips);
  els.calendar.hidden = false;
  renderCalendar();
}

function closeCalendar() {
  els.calendar.hidden = true;
  scheduleTarget = null;
  clearPin();
  const file = currentFile();
  if (file) {
    file.title = serialize(els.title);
    file.body = serialize(els.body);
    save();
  }
}

function noteScheduleText(file) {
  const title = plain(file.title).replace(/\s+/g, " ").trim();
  const body = plain(file.body).replace(/\s+/g, " ").trim();
  if (title && body) return `${title} — ${body}`;
  return title || body;
}

function markWholeNote(file, alarmId) {
  els.title.innerHTML = file.title || "";
  els.body.innerHTML = file.body || "";
  const target = plain(file.body).trim() ? els.body : els.title;
  if (!target.textContent.trim()) return false;
  const mark = document.createElement("mark");
  mark.className = "aviso";
  mark.dataset.alarm = alarmId;
  while (target.firstChild) mark.appendChild(target.firstChild);
  target.appendChild(mark);
  file.title = serialize(els.title);
  file.body = serialize(els.body);
  return true;
}

function monthKeys() {
  const keys = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(calView.year, calView.month + 1, 0).getDate();
  for (let day = 1; day <= last; day += 1) {
    const date = new Date(calView.year, calView.month, day);
    if (date >= today) keys.push(keyFromDate(date));
  }
  return keys;
}

function runQuickAlarm(file, kind) {
  if (!file) return;
  const now = new Date();
  let when;
  if (kind === "today18") when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
  else if (kind === "today20") when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0, 0);
  else when = new Date(Date.now() + Number(kind) * 60000);
  when.setSeconds(0, 0);
  if (when.getTime() <= Date.now()) return;
  state.openId = file.id;
  const text = noteScheduleText(file);
  if (!text) return;
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
  if (!markWholeNote(file, alarm.id)) return;
  state.alarms.push(alarm);
  save();
  render();
  els.status.textContent = `Programado para ${formatLong(when)}.`;
}

function openScheduleFromList(fileId) {
  const file = state.files.find((item) => item.id === fileId);
  if (!file) return;
  const text = noteScheduleText(file);
  if (!text) {
    closeMenu();
    return;
  }
  scheduleTarget = { fileId, text };
  clearPin();
  state.openId = fileId;
  save();
  closeMenu();
  render();
  openCalendar("schedule");
}

function chosenMoment() {
  const clock = readClock("cal");
  if (!clock || !calView.date) return null;
  const day = dateFromKey(calView.date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.hour, clock.minute, 0, 0);
}

function renderCalendar() {
  els.calMonth.textContent = `${MONTHS[calView.month]} ${calView.year}`;
  const todayKey = keyFromDate(new Date());
  const start = startOfGrid(calView.year, calView.month);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = keyFromDate(date);
    const classes = ["day"];
    if (date.getMonth() !== calView.month) classes.push("outside");
    if (key === todayKey) classes.push("today");
    const span = document.getElementById("cal-span")?.value || "one";
    const chosen = span === "picked" ? pickedDates.has(key) : span === "month" ? monthKeys().includes(key) : key === calView.date;
    if (chosen) classes.push("selected");
    const marked = pendingAlarms().some((alarm) => keyFromDate(new Date(alarm.at)) === key);
    cells.push(`<button type="button" class="${classes.join(" ")}" data-date="${key}" aria-label="${date.getDate()} de ${MONTHS[date.getMonth()]}">
      <span class="num">${date.getDate()}</span><span class="marks">${marked ? "<i></i>" : ""}</span>
    </button>`);
  }
  els.calGrid.innerHTML = cells.join("");
  const upcoming = document.getElementById("cal-upcoming");
  if (upcoming) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    const slice = pendingAlarms().filter((a) => a.at >= start.getTime() && a.at < end.getTime());
    if (!slice.length) upcoming.innerHTML = "<p class=\"empty\">Nada hoy ni mañana.</p>";
    else {
      upcoming.innerHTML = `<h3 class="upcoming-title">Hoy y mañana</h3><ul class="day-list">${slice.map((alarm) => {
        const file = state.files.find((f) => f.id === alarm.fileId);
        const title = plain(file?.title || "") || "Sin título";
        return `<li><button type="button" data-open="${alarm.fileId}"><strong>${formatHour(new Date(alarm.at))} · ${escapeHtml(alarm.text)}</strong><small>${escapeHtml(title)}</small></button></li>`;
      }).join("")}</ul>`;
    }
    upcoming.hidden = calView.mode === "schedule";
  }
  if (calView.mode === "schedule") {
    els.calLead.hidden = true;
    els.calLead.textContent = "";
    const at = chosenMoment();
    els.calPreview.textContent = !at ? "Elige hora." : at.getTime() <= Date.now() ? "Esa hora ya pasó." : `Saldrá ${formatLong(at)}.`;
    const conflict = document.getElementById("cal-conflict");
    if (conflict && at) {
      const clash = state.alarms.some((a) => a.status !== "done" && Math.abs(a.at - at.getTime()) < 60000);
      conflict.hidden = !clash;
      conflict.textContent = clash ? "Ya hay otro aviso a esa misma hora." : "";
    }
    return;
  }
  els.calLead.hidden = false;
  const monthCount = pendingAlarms().filter((alarm) => {
    const date = new Date(alarm.at);
    return date.getFullYear() === calView.year && date.getMonth() === calView.month;
  }).length;
  els.calLead.textContent = `${monthCount} ${monthCount === 1 ? "aviso" : "avisos"} en este mes`;
  const dayAlarms = pendingAlarms().filter((alarm) => keyFromDate(new Date(alarm.at)) === calView.date);
  if (!dayAlarms.length) {
    els.calDayList.innerHTML = `<li class="empty">Este día no tiene avisos.</li>`;
    return;
  }
  els.calDayList.innerHTML = dayAlarms.map((alarm) => {
    const file = state.files.find((item) => item.id === alarm.fileId);
    const title = plain(file?.title || "") || "Sin título";
    return `<li><button type="button" data-open="${alarm.fileId}"><strong>${formatHour(new Date(alarm.at))} · ${escapeHtml(alarm.text)}</strong><small>${escapeHtml(title)}</small></button></li>`;
  }).join("");
}

function clearQuick(container) {
  container.querySelectorAll("[data-quick]").forEach((chip) => chip.classList.remove("active"));
}

function shiftMonth(target, step) {
  target.month += step;
  if (target.month < 0) {
    target.month = 11;
    target.year -= 1;
  }
  if (target.month > 11) {
    target.month = 0;
    target.year += 1;
  }
}

function applyQuick(container, value, view) {
  let next;
  if (value === "today18" || value === "today20") {
    const now = new Date();
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), value === "today18" ? 18 : 20, 0, 0, 0);
  } else if (value === "tomorrow") {
    const base = new Date();
    next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, base.getHours(), base.getMinutes(), 0, 0);
  } else {
    next = new Date(Date.now() + Number(value) * 60000);
    next.setSeconds(0, 0);
  }
  view.year = next.getFullYear();
  view.month = next.getMonth();
  view.date = keyFromDate(next);
  return next;
}

document.getElementById("add-note")?.addEventListener("click", createFile);
els.search.addEventListener("input", renderList);
document.querySelectorAll(".search-wrap").forEach((wrap) => {
  const input = wrap.querySelector("input");
  const clear = wrap.querySelector(".search-clear");
  if (!input || !clear) return;
  const paint = () => { clear.hidden = !input.value; };
  input.addEventListener("input", paint);
  clear.addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });
  paint();
});

els.toggleArchived.addEventListener("click", () => {
  state.listView = state.listView === "archived" ? "active" : "archived";
  syncListView();
  render();
});

els.toggleTrash.addEventListener("click", () => {
  state.listView = state.listView === "trash" ? "active" : "trash";
  syncListView();
  render();
});

els.list.addEventListener("click", (event) => {
  const row = event.target.closest("[data-file]");
  if (!row) return;
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (state.showDetail === false) {
    openFocus(row.dataset.file);
    return;
  }
  openFile(row.dataset.file);
});

els.list.addEventListener("dblclick", (event) => {
  const row = event.target.closest("[data-file]");
  if (!row) return;
  event.preventDefault();
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 500);
  openFocus(row.dataset.file);
});

function holdClick() {
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 700);
}

els.list.addEventListener("contextmenu", (event) => {
  const row = event.target.closest("[data-file]");
  if (!row) return;
  event.preventDefault();
  underlineRange = null;
  alarmRange = null;
  holdClick();
  openMenu(row.dataset.file, event.clientX, event.clientY);
});

function selectedNoteRange() {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const start = editorOf(selection.anchorNode);
  const end = editorOf(selection.focusNode);
  if (!start || start !== end || !selection.toString().trim()) return null;
  return selection.getRangeAt(0).cloneRange();
}

function applyUnderline() {
  if (!underlineRange) return;
  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(underlineRange);
  document.execCommand("underline");
  underlineRange = null;
  onEdit();
}

els.editorPage?.addEventListener("contextmenu", (event) => {
  const file = currentFile();
  if (!file) return;
  if (!event.target.closest("#editor") || els.editor.hidden) return;
  event.preventDefault();
  underlineRange = selectedNoteRange();
  alarmRange = underlineRange;
  openMenu(file.id, event.clientX, event.clientY, { inNote: true });
});
els.editor?.addEventListener("dblclick", (event) => {
  if (window.matchMedia("(pointer: fine)").matches) return;
  const file = currentFile();
  if (!file) return;
  event.preventDefault();
  openMenu(file.id, event.clientX, event.clientY, { inNote: true });
});

els.list.addEventListener("pointerdown", (event) => {
  const row = event.target.closest("[data-file]");
  if (!row || event.pointerType === "mouse") return;
  const id = row.dataset.file;
  const x = event.clientX;
  const y = event.clientY;
  press = {
    x,
    y,
    timer: setTimeout(() => {
      holdClick();
      if (navigator.vibrate) navigator.vibrate(18);
      openMenu(id, x, y);
    }, 560),
  };
});

function cancelPress() {
  if (!press) return;
  clearTimeout(press.timer);
  press = null;
}

els.list.addEventListener("pointerup", cancelPress);
els.list.addEventListener("pointercancel", cancelPress);
els.list.addEventListener("pointermove", (event) => {
  if (!press) return;
  if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12) cancelPress();
});

document.getElementById("quick-close")?.addEventListener("click", () => {
  document.getElementById("quick-modal").hidden = true;
});
document.getElementById("quick-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id === "quick-modal") event.currentTarget.hidden = true;
});
document.getElementById("quick-modal")?.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const file = state.files.find((item) => item.id === menuFileId);
  if (!action || !file) return;
  if (action === "custom") {
    openScheduleFromList(file.id);
    return;
  }
  if (action === "quick") {
    const kind = event.target.closest("[data-quick]")?.dataset.quick;
    closeMenu();
    if (kind) runQuickAlarm(file, kind);
  }
});

els.menu.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const file = state.files.find((item) => item.id === menuFileId);
  if (!action || !file) return;
  if (action === "underline") {
    closeMenu();
    applyUnderline();
    return;
  }
  if (action === "custom" || action === "calendar") {
    openScheduleFromList(file.id);
    return;
  }
  if (action === "quick-menu") {
    els.menu.hidden = true;
    const modal = document.getElementById("quick-modal");
    if (modal) modal.hidden = false;
    return;
  }
  if (action === "restore-notes") {
    closeMenu();
    restoreAllNotes();
    save();
    render();
    return;
  }
  if (action === "restore-templates") {
    closeMenu();
    restoreAllTemplates();
    save();
    render();
    return;
  }
  if (action === "quick") {
    const kind = event.target.closest("[data-quick]")?.dataset.quick;
    closeMenu();
    if (kind) runQuickAlarm(file, kind);
    return;
  }
  if (action === "alarm-part") {
    closeMenu();
    if (alarmRange) {
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(alarmRange);
      pinSelection();
      alarmRange = null;
      openCalendar("schedule");
    }
    return;
  }
  if (action === "color") {
    closeMenu();
    openColorModal(file.id);
    return;
  }
  if (action === "lock") {
    closeMenu();
    askMaster(file.locked ? "unlock" : "lock", file.id);
    return;
  }
  if (action === "order") {
    closeMenu();
    openOrderDialog(file);
    return;
  }
  if (action === "move-template") {
    closeMenu();
    openMoveTemplate(file);
    return;
  }
  if (action === "pin") {
    file.pinned = !file.pinned;
    file.updatedAt = Date.now();
  } else if (action === "sound") {
    file.sound = file.sound === false;
    file.updatedAt = Date.now();
    const ringing = state.alarms.find((alarm) => alarm.id === ringingId);
    if (ringing && ringing.fileId === file.id && file.sound === false) stopChime();
  } else if (action === "delete") {
    if (state.toolDelete === false) return;
    const name = plain(file.title) || "esta nota";
    const gone = Boolean(file.deletedAt);
    if (!confirmDelete(
      gone ? `¿Eliminar del todo «${name}»?` : `¿Eliminar «${name}»?`,
      "Segunda confirmación. Si aceptas, el borrado sigue."
    )) return;
    if (gone) removeFile(file);
    else {
      file.deletedAt = Date.now();
      file.archived = false;
      if (state.openId === file.id) state.openId = null;
    }
    if (!gone) placeAtEnd(file);
  } else if (action === "restore") {
    closeMenu();
    if (needsTemplatePick(file)) {
      openRestorePick([file]);
      return;
    }
    finishRestore(file, file.templateId);
  } else if (action === "archive" && file.archived && needsTemplatePick(file)) {
    closeMenu();
    openRestorePick([file]);
    return;
  } else {
    file.archived = !file.archived;
    file.archivedAt = file.archived ? Date.now() : null;
    file.updatedAt = Date.now();
    placeAtEnd(file);
    if (file.archived && state.listView !== "archived" && state.openId === file.id) state.openId = null;
    if (!file.archived && state.listView === "archived" && state.openId === file.id) state.openId = null;
  }
  save();
  closeMenu();
  render();
});

document.addEventListener("pointerdown", (event) => {
  if (!els.menu.hidden && !els.menu.contains(event.target)) closeMenu();
});

document.getElementById("color-close")?.addEventListener("click", closeColorModal);
document.getElementById("note-color-save")?.addEventListener("click", () => {
  if (colorFileId === "app") {
    state.appColor = readColorPair("note-color", "note-hex");
    state.toolColor = true;
    save();
    closeColorModal();
    window.syncBlocChrome?.();
    return;
  }
  if (state.toolColor === false) return;
  const file = state.files.find((item) => item.id === colorFileId);
  if (!file) return;
  file.color = readColorPair("note-color", "note-hex");
  file.colorOwn = true;
  file.updatedAt = Date.now();
  save();
  closeColorModal();
  render();
});
document.getElementById("color-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id === "color-modal") closeColorModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeMenu();
  hideSelectionAction();
  const colorModal = document.getElementById("color-modal");
  if (colorModal && !colorModal.hidden) closeColorModal();
  else if (!els.calendar.hidden) closeCalendar();
  else closeFocus();
});

document.getElementById("focus-back").addEventListener("click", closeFocus);
document.getElementById("focus-undo")?.addEventListener("click", undoNote);
document.getElementById("focus-redo")?.addEventListener("click", redoNote);
document.addEventListener("keydown", (event) => {
  const inNote = event.target === els.title || event.target === els.body;
  if (!inNote || !(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  const undo = key === "z" && !event.shiftKey;
  const redo = key === "y" || (key === "z" && event.shiftKey);
  if (!undo && !redo) return;
  event.preventDefault();
  if (undo) undoNote();
  else redoNote();
});
els.focusSearch.addEventListener("input", applyFocusSearch);

els.title.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    els.body.focus();
  }
});

let history = [];
let historyAt = -1;
let historyFile = null;
let historyLock = false;

function syncHistoryFile() {
  const file = currentFile();
  const id = file?.id || null;
  if (id === historyFile) return;
  historyFile = id;
  history = file ? [{ title: file.title || "", body: file.body || "" }] : [];
  historyAt = history.length - 1;
  paintHistoryButtons();
}

function paintHistoryButtons() {
  const undo = document.getElementById("focus-undo");
  const redo = document.getElementById("focus-redo");
  if (undo) {
    undo.hidden = state.barTools?.undo === false;
    undo.disabled = historyAt <= 0;
  }
  if (redo) {
    redo.hidden = state.barTools?.redo === false;
    redo.disabled = historyAt < 0 || historyAt >= history.length - 1;
  }
}

function recordHistory() {
  if (historyLock) return;
  syncHistoryFile();
  const snap = { title: serialize(els.title), body: serialize(els.body) };
  const current = history[historyAt];
  if (current && current.title === snap.title && current.body === snap.body) return;
  history = history.slice(0, historyAt + 1);
  history.push(snap);
  if (history.length > 100) history.shift();
  historyAt = history.length - 1;
  paintHistoryButtons();
}

function applyHistory() {
  const snap = history[historyAt];
  const file = currentFile();
  if (!snap || !file) return;
  historyLock = true;
  els.title.innerHTML = snap.title;
  els.body.innerHTML = snap.body;
  rememberFile();
  paintMarks(els.title);
  paintMarks(els.body);
  markEmpty(els.title);
  markEmpty(els.body);
  renderList();
  renderFileAlarms(file);
  applyFocusSearch();
  historyLock = false;
  paintHistoryButtons();
  els.status.textContent = "";
}

function undoNote() {
  syncHistoryFile();
  if (historyAt <= 0) return;
  historyAt -= 1;
  applyHistory();
}

function redoNote() {
  syncHistoryFile();
  if (historyAt >= history.length - 1) return;
  historyAt += 1;
  applyHistory();
}

function onEdit() {
  rememberFile();
  recordHistory();
  renderList();
  const file = currentFile();
  if (file) renderFileAlarms(file);
  if (file) paintMathTotal(file);
  markEmpty(els.title);
  markEmpty(els.body);
  els.status.textContent = "";
}

els.title.addEventListener("input", onEdit);
els.body.addEventListener("input", onEdit);

function insertPlain(event) {
  event.preventDefault();
  const text = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
  const clean = event.currentTarget === els.title ? text.replace(/\n+/g, " ") : text;
  const selection = document.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(clean);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  onEdit();
}

els.title.addEventListener("paste", insertPlain);
els.body.addEventListener("paste", insertPlain);

document.addEventListener("selectionchange", placeSelectionAction);
document.addEventListener("scroll", hideSelectionAction, true);

els.sel.addEventListener("mousedown", (event) => event.preventDefault());
els.sel.addEventListener("click", () => {
  if (els.sel.dataset.mode === "remove") {
    scheduleTarget = null;
    stripAlarm(els.sel.dataset.alarm);
    hideSelectionAction();
    els.status.textContent = "Aviso quitado";
    return;
  }
  const quote = pinSelection();
  hideSelectionAction();
  if (!quote) {
    clearPin();
    return;
  }
  scheduleTarget = null;
  openCalendar("schedule");
});

document.getElementById("cal-close").addEventListener("click", closeCalendar);
els.calendar.addEventListener("click", (event) => {
  if (event.target === els.calendar) closeCalendar();
});

document.getElementById("cal-prev").addEventListener("click", () => {
  shiftMonth(calView, -1);
  renderCalendar();
});
document.getElementById("cal-next").addEventListener("click", () => {
  shiftMonth(calView, 1);
  renderCalendar();
});
document.getElementById("cal-today").addEventListener("click", () => {
  const today = new Date();
  calView.year = today.getFullYear();
  calView.month = today.getMonth();
  calView.date = keyFromDate(today);
  renderCalendar();
});

els.calGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  const key = button.dataset.date;
  if ((document.getElementById("cal-span")?.value || "one") === "picked") {
    if (pickedDates.has(key)) pickedDates.delete(key);
    else pickedDates.add(key);
  }
  calView.date = key;
  const picked = dateFromKey(key);
  calView.year = picked.getFullYear();
  calView.month = picked.getMonth();
  clearQuick(els.calChips);
  renderCalendar();
});
document.getElementById("cal-span")?.addEventListener("change", () => {
  if (document.getElementById("cal-span").value === "picked" && calView.date) pickedDates.add(calView.date);
  renderCalendar();
});

els.calTime.addEventListener("change", () => {
  clearQuick(els.calChips);
  renderCalendar();
});

document.getElementById("cal-quick")?.addEventListener("change", (event) => {
  const value = event.target.value;
  if (!value) return;
  setClock("cal", applyQuick(els.calChips, value, calView));
  renderCalendar();
});
document.getElementById("cal-span")?.addEventListener("change", () => {
  const wrap = document.getElementById("cal-interval-wrap");
  if (wrap) wrap.hidden = document.getElementById("cal-span").value !== "interval";
});

els.calDayList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open]");
  if (!button) return;
  const file = state.files.find((item) => item.id === button.dataset.open);
  if (!file) return;
  state.listView = viewForFile(file);
  state.openId = file.id;
  save();
  closeCalendar();
  render();
});

els.calConfirm.addEventListener("click", () => {
  const at = chosenMoment();
  const pin = document.getElementById("selection-pin");
  if (!pin && !scheduleTarget) return;
  let text = (pin ? pin.textContent : scheduleTarget?.text || "").replace(/\s+/g, " ").trim();
  if (!at) {
    els.calPreview.textContent = "Elige la hora.";
    return;
  }
  const file = scheduleTarget
    ? state.files.find((item) => item.id === scheduleTarget.fileId)
    : currentFile();
  if (!text && state.toolRepeat === true && file) text = plain(file.body).trim();
  if (!file || !text) return;
  const span = document.getElementById("cal-span")?.value || "one";
  const intervalDays = Number(document.getElementById("cal-interval")?.value) || 7;
  const preAlert = Number(document.getElementById("cal-prealert")?.value) || 0;
  const clock = readClock("cal");
  const dates = span === "picked" ? [...pickedDates] : span === "month" ? monthKeys() : (calView.date ? [calView.date] : []);
  if (!clock || !dates.length) {
    els.calPreview.textContent = "Elige al menos un día.";
    return;
  }
  let repeat = span === "daily" ? "daily" : span === "weekdays" ? "weekdays" : span === "monthly" ? "monthly" : span === "interval" ? "interval" : "none";
  if (state.toolRepeat !== true) repeat = "none";
  const useDates = repeat === "none" ? dates : dates.slice(0, 1);
  const firstId = crypto.randomUUID();
  const alarms = [];
  useDates.forEach((key, index) => {
    const day = dateFromKey(key);
    const moment = new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.hour, clock.minute, 0, 0);
    if (repeat === "none" && moment.getTime() <= Date.now()) return;
    alarms.push({
      id: index === 0 ? firstId : crypto.randomUUID(),
      linkedTo: index === 0 ? "" : firstId,
      fileId: file.id,
      text: text.slice(0, 180),
      at: moment.getTime(),
      status: "pending",
      repeat,
      intervalDays,
      monthDay: dateFromKey(key).getDate(),
      preAlert,
      preSent: false,
    });
  });
  if (!alarms.length) {
    els.calPreview.textContent = "Esas horas ya pasaron. Elige otras.";
    return;
  }
  if (pin) {
    const mark = document.createElement("mark");
    mark.className = "aviso";
    mark.dataset.alarm = firstId;
    mark.textContent = pin.textContent;
    pin.replaceWith(mark);
  } else {
    state.openId = file.id;
    if (!markWholeNote(file, firstId)) return;
  }
  state.alarms.push(...alarms);
  pickedDates.clear();
  scheduleTarget = null;
  els.calendar.hidden = true;
  rememberFile();
  const selection = document.getSelection();
  if (selection) selection.removeAllRanges();
  hideSelectionAction();
  render();
  els.status.textContent = alarms.length > 1 ? `Programado en ${alarms.length} fechas.` : `Programado para ${formatLong(new Date(alarms[0].at))}.`;
});

els.fileAlarms.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  stripAlarm(button.dataset.remove);
  els.status.textContent = "Aviso quitado";
});

function emptyTrashNow() {
  if (!confirm("¿Seguro que quieres vaciar los eliminados? Es irreversible.")) return;
  const removed = new Set(state.files.filter((file) => file.deletedAt).map((file) => file.id));
  state.files = state.files.filter((file) => !file.deletedAt);
  Object.values(state.templates).forEach((tpl) => {
    if (tpl.deletedAt) tpl.purged = true;
  });
  state.alarms = state.alarms.filter((alarm) => !removed.has(alarm.fileId));
  if (state.openId && removed.has(state.openId)) state.openId = null;
  save();
  render();
}

document.getElementById("btn-empty-trash")?.addEventListener("click", emptyTrashNow);
document.getElementById("btn-empty-trash-top")?.addEventListener("click", emptyTrashNow);

els.eye.addEventListener("click", () => {
  state.showDetail = state.showDetail === false;
  save();
  renderEye();
});

els.notify.addEventListener("click", async (event) => {
  event.stopPropagation();
  const panel = document.getElementById("notify-panel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
  renderNotify();
  if (!panel.hidden && "Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
});

document.getElementById("notify-panel")?.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-notify-delete]");
  if (remove) {
    if (!confirmTwice("¿Eliminar esta notificación?", "Segunda confirmación. Si aceptas, se elimina.")) return;
    stripAlarm(remove.dataset.notifyDelete);
    return;
  }
  const open = event.target.closest("[data-notify-open]");
  if (!open) return;
  document.getElementById("notify-panel").hidden = true;
  renderNotify();
  if (state.showDetail === false) openFocus(open.dataset.notifyOpen);
  else openFile(open.dataset.notifyOpen);
});

document.addEventListener("pointerdown", (event) => {
  const panel = document.getElementById("notify-panel");
  if (!panel || panel.hidden) return;
  if (event.target.closest("#notify-panel") || event.target.closest("#btn-notify")) return;
  panel.hidden = true;
  renderNotify();
});

function tick() {
  purgeOldTrash();
  purgeOldNotices();
  if (!ringingId) {
    const nowMs = Date.now();
    pendingAlarms().forEach((alarm) => {
      if (!alarm.preAlert || alarm.preSent || alarm.at <= nowMs) return;
      const preAt = alarm.at - alarm.preAlert * 60000;
      if (preAt <= nowMs) {
        alarm.preSent = true;
        save();
        if ("Notification" in window && Notification.permission === "granted") {
          const file = state.files.find((f) => f.id === alarm.fileId);
          const n = new Notification("Bloc — preaviso", {
            body: `${alarm.text} · en ${alarm.preAlert} min`,
            tag: `pre-${alarm.id}`,
            requireInteraction: false,
          });
          n.onclick = () => window.focus();
        }
      }
    });
  }
  if (ringingId) return;
  const due = pendingAlarms().find((alarm) => alarm.at <= Date.now());
  if (!due) return;
  if (!els.calendar.hidden) closeCalendar();
  openAlarm(due.id);
}

function openAlarm(id) {
  const alarm = state.alarms.find((item) => item.id === id);
  if (!alarm || alarm.status === "done") return;
  ringingId = id;
  alarm.status = "ringing";
  save();
  const file = state.files.find((item) => item.id === alarm.fileId);
  els.heading.textContent = alarm.text || "Aviso";
  els.alarmClock.textContent = formatLong(new Date(alarm.at));
  els.alarmBody.textContent = plain(file?.title || "") || "Nota sin título";
  closePostpone();
  els.modal.hidden = false;
  document.title = "Suena · Bloc";
  startChime();
  if (file) {
    state.openId = file.id;
    state.listView = viewForFile(file);
  }
  render();
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    const notice = new Notification("Bloc", {
      body: `${alarm.text || "Tu aviso está sonando"} — toca para abrir`,
      tag: `ring-${alarm.id}`,
      requireInteraction: true,
    });
    notice.onclick = () => {
      window.focus();
      if (ringingId === alarm.id) {
        alarm.status = "done";
        rescheduleRepeat(alarm);
        save();
        closeAlarm();
        render();
        queueMicrotask(tick);
      }
    };
  }
  if (navigator.vibrate) navigator.vibrate([180, 90, 180, 90, 320]);
}

function closeAlarm() {
  ringingId = null;
  els.modal.hidden = true;
  document.title = baseTitle;
  stopChime();
  closePostpone();
}

function rescheduleRepeat(alarm) {
  if (!alarm || alarm.repeat === "none" || !alarm.repeat) return;
  const nextAt = nextFutureRepeat(alarm);
  if (!nextAt) return;
  state.alarms.push({
    ...alarm,
    id: crypto.randomUUID(),
    at: nextAt,
    status: "pending",
    preSent: false,
  });
}

document.getElementById("btn-done").addEventListener("click", () => {
  const alarm = state.alarms.find((item) => item.id === ringingId);
  if (alarm) {
    alarm.status = "done";
    rescheduleRepeat(alarm);
  }
  save();
  closeAlarm();
  render();
  queueMicrotask(tick);
});

els.btnSnooze.addEventListener("click", () => {
  const seed = new Date(Date.now() + 10 * 60000);
  seed.setSeconds(0, 0);
  postView.year = seed.getFullYear();
  postView.month = seed.getMonth();
  postView.date = keyFromDate(seed);
  setClock("post", seed);
  els.postpone.hidden = false;
  els.btnSnooze.hidden = true;
  els.btnConfirm.hidden = false;
  renderPostpone();
});

document.getElementById("post-prev").addEventListener("click", () => {
  shiftMonth(postView, -1);
  renderPostpone();
});
document.getElementById("post-next").addEventListener("click", () => {
  shiftMonth(postView, 1);
  renderPostpone();
});

els.postGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  postView.date = button.dataset.date;
  clearQuick(els.postpone);
  renderPostpone();
});

els.postTime.addEventListener("change", () => {
  clearQuick(els.postpone);
  updatePostponePreview();
});

els.postpone.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quick]");
  if (!button) return;
  state.lastSnoozeQuick = button.dataset.quick;
  save();
  setClock("post", applyQuick(els.postpone, button.dataset.quick, postView));
  clearQuick(els.postpone);
  button.classList.add("active");
  renderPostpone();
});

function postponeMoment() {
  const clock = readClock("post");
  if (!clock || !postView.date) return null;
  const day = dateFromKey(postView.date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.hour, clock.minute, 0, 0);
}

function renderPostpone() {
  els.postMonth.textContent = `${MONTHS[postView.month]} ${postView.year}`;
  const todayKey = keyFromDate(new Date());
  const start = startOfGrid(postView.year, postView.month);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = keyFromDate(date);
    const classes = ["day"];
    if (date.getMonth() !== postView.month) classes.push("outside");
    if (key === todayKey) classes.push("today");
    if (key === postView.date) classes.push("selected");
    cells.push(`<button type="button" class="${classes.join(" ")}" data-date="${key}"><span class="num">${date.getDate()}</span></button>`);
  }
  els.postGrid.innerHTML = cells.join("");
  updatePostponePreview();
}

function updatePostponePreview() {
  const at = postponeMoment();
  els.postPreview.textContent = !at ? "Elige hora." : at.getTime() <= Date.now() ? "Esa hora ya pasó." : `Quedará para ${formatLong(at)}.`;
}

function closePostpone() {
  els.postpone.hidden = true;
  els.btnSnooze.hidden = false;
  els.btnConfirm.hidden = true;
  clearQuick(els.postpone);
}

els.btnConfirm.addEventListener("click", () => {
  const at = postponeMoment();
  if (!at || at.getTime() <= Date.now()) {
    els.postPreview.textContent = "Esa hora ya pasó. Elige otra.";
    return;
  }
  const alarm = state.alarms.find((item) => item.id === ringingId);
  if (!alarm) return;
  alarm.at = at.getTime();
  alarm.status = "pending";
  alarm.preSent = false;
  save();
  closeAlarm();
  render();
  els.status.textContent = `Pospuesto para ${formatLong(at)}.`;
});

document.getElementById("btn-mute").addEventListener("click", () => {
  const alarm = state.alarms.find((item) => item.id === ringingId);
  const file = alarm && state.files.find((item) => item.id === alarm.fileId);
  if (file) file.sound = false;
  save();
  stopChime();
});

let audioReady = false;

function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || audioReady) return;
  try {
    if (!audioCtx) audioCtx = new AudioContextClass();
  } catch (error) {
    return;
  }
  const mark = () => {
    if (audioCtx && audioCtx.state === "running") {
      audioReady = true;
      document.removeEventListener("click", unlockAudio, true);
    }
  };
  if (audioCtx.state === "suspended") {
    audioCtx.resume().then(mark).catch(() => {});
    return;
  }
  mark();
}

document.addEventListener("click", unlockAudio, true);

function startChime() {
  stopChime();
  const alarm = state.alarms.find((item) => item.id === ringingId);
  const file = alarm && state.files.find((item) => item.id === alarm.fileId);
  if (!fileSoundOn(file)) return;
  if (window.BlocNative?.startRing) {
    window.BlocNative.startRing(JSON.stringify({
      text: alarm?.text || "Aviso",
      title: plain(file?.title || "") || "Nota",
      continuous: state.alarmContinuous === true,
      vibrate: state.alarmVibrate === true,
    }));
    return;
  }
  const hint = document.getElementById("alarm-touch-hint");
  if (hint) hint.hidden = !(state.alarmContinuous && state.alarmUntilTouch);
  const ring = () => {
    const current = state.alarms.find((item) => item.id === ringingId);
    const note = current && state.files.find((item) => item.id === current.fileId);
    if (!current || !fileSoundOn(note)) return;
    playChime();
    if (state.alarmContinuous && state.alarmVibrate && navigator.vibrate) navigator.vibrate(state.alarmUntilTouch ? [180, 80, 180] : 120);
  };
  ring();
  const followed = state.alarmContinuous === true;
  chimeTimer = setInterval(ring, followed && state.alarmUntilTouch ? 1000 : followed ? 1400 : 2800);
}

function stopChime() {
  if (chimeTimer) clearInterval(chimeTimer);
  chimeTimer = null;
  if (navigator.vibrate) navigator.vibrate(0);
  window.BlocNative?.stopRing?.();
}

document.addEventListener("pointerdown", () => {
  if (ringingId && state.alarmContinuous && state.alarmUntilTouch) stopChime();
}, true);

function syncAlarmSoundOptions() {
  const until = document.getElementById("alarm-until-touch");
  const vibe = document.getElementById("alarm-vibrate");
  const continuous = document.getElementById("alarm-continuous");
  const extra = document.getElementById("alarm-continuous-opts");
  if (until) until.checked = state.alarmUntilTouch === true;
  if (vibe) vibe.checked = state.alarmVibrate === true;
  if (continuous) continuous.checked = state.alarmContinuous === true;
  if (extra) extra.hidden = state.alarmContinuous !== true;
}

document.getElementById("alarm-until-touch")?.addEventListener("change", (event) => {
  state.alarmUntilTouch = event.target.checked;
  save();
});
document.getElementById("alarm-vibrate")?.addEventListener("change", (event) => {
  state.alarmVibrate = event.target.checked;
  save();
});
syncAlarmSoundOptions();

function playChime() {
  if (!audioReady || !audioCtx || audioCtx.state !== "running") return;
  const startAt = audioCtx.currentTime;
  [880, 1175, 880].forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = startAt + index * 0.22;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

const MASTER_KEY = "bloc-master";
const unlockedNotes = new Set();
let appUnlocked = true;
let masterIntent = null;
let masterMode = "enter";

function noteSealed(file) {
  return Boolean(file?.locked) && !unlockedNotes.has(file?.id);
}

function sealLeftNote(nextId) {
  if (!state.askPasswordEvery || !state.openId || state.openId === nextId) return;
  unlockedNotes.delete(state.openId);
}

function masterStored() {
  return localStorage.getItem(MASTER_KEY) || "";
}

function accountSession() {
  try {
    return JSON.parse(localStorage.getItem("bloc-cuenta") || "null");
  } catch {
    return null;
  }
}

async function deriveMaster(password, salt) {
  const encoded = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoded.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: encoded.encode(salt),
    iterations: 150000,
    hash: "SHA-256",
  }, key, 256);
  const hex = [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${salt}$${hex}`;
}

async function createMasterHash(password) {
  const salt = crypto.randomUUID().replace(/-/g, "");
  return deriveMaster(password, salt);
}

async function masterMatches(password) {
  const stored = masterStored();
  const salt = stored.split("$")[0];
  if (!salt || !password) return false;
  return (await deriveMaster(password, salt)) === stored;
}

function masterError(message) {
  const el = document.getElementById("master-error");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function showMaster(mode) {
  masterMode = mode;
  const modal = document.getElementById("master-modal");
  const pass2 = document.getElementById("master-pass2-field");
  const code = document.getElementById("master-code-field");
  const forgot = document.getElementById("master-forgot");
  const lead = document.getElementById("master-lead");
  const ok = document.getElementById("master-ok");
  if (pass2) pass2.hidden = mode !== "create" && mode !== "recover";
  if (code) code.hidden = mode !== "recover";
  if (forgot) forgot.hidden = mode === "recover" || mode === "create";
  if (ok) ok.textContent = mode === "recover" ? "Guardar contraseña" : "Continuar";
  if (lead) {
    const texts = {
      create: "Esta será la contraseña maestra de las notas protegidas.",
      enter: "Escribe la contraseña maestra.",
      recover: "Escribe el código que llegó al correo y la contraseña nueva.",
    };
    lead.textContent = texts[mode] || texts.enter;
  }
  masterError("");
  if (modal) modal.hidden = false;
  document.getElementById(mode === "recover" ? "master-code" : "master-pass")?.focus();
}

function askMaster(type, id) {
  masterIntent = { type, id };
  const has = Boolean(masterStored());
  if ((type === "lock" || type === "open") && !has) showMaster("create");
  else showMaster("enter");
}

function askMasterForAppLock(nextValue) {
  masterIntent = { type: "app-lock", on: nextValue === true };
  const has = Boolean(masterStored());
  showMaster(has ? "enter" : "create");
  const lead = document.getElementById("master-lead");
  if (lead) {
    lead.textContent = has
      ? "Escribe la contraseña maestra para cambiar esta opción."
      : "Aún no hay contraseña maestra. Créala una vez. Después abre la aplicación.";
  }
}

function askMasterForSetting(nextValue) {
  masterIntent = { type: "setting", askPasswordEvery: nextValue === true };
  const has = Boolean(masterStored());
  showMaster(has ? "enter" : "create");
  const lead = document.getElementById("master-lead");
  if (lead) {
    lead.textContent = has
      ? "Escribe la contraseña maestra para cambiar esta opción."
      : "Aún no hay contraseña maestra. Créala una vez. Después sirve para activar o quitar esta opción.";
  }
}

function paintMasterAccount() {
  const has = Boolean(masterStored());
  const create = document.getElementById("master-create-account");
  const change = document.getElementById("master-change-account");
  if (create) create.hidden = has;
  if (change) change.hidden = !has;
}

function masterChangeError(message) {
  const el = document.getElementById("master-change-error");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function finishMaster(id) {
  const intent = masterIntent;
  masterIntent = null;
  document.getElementById("master-modal").hidden = true;
  document.getElementById("master-pass").value = "";
  document.getElementById("master-pass2").value = "";
  document.getElementById("master-code").value = "";
  if (!intent) return;
  const file = state.files.find((item) => item.id === (id || intent.id));
  if (intent.type === "lock" && file) {
    file.locked = true;
    unlockedNotes.delete(file.id);
    file.updatedAt = Date.now();
    if (state.openId === file.id) state.openId = null;
    save();
  } else if (intent.type === "unlock" && file) {
    file.locked = false;
    unlockedNotes.delete(file.id);
    file.updatedAt = Date.now();
    save();
  } else if (intent.type === "open" && file) {
    unlockedNotes.add(file.id);
    state.openId = file.id;
    save();
  } else if (intent.type === "setting") {
    state.askPasswordEvery = intent.askPasswordEvery === true;
    save();
  } else if (intent.type === "app-gate") {
    appUnlocked = true;
  } else if (intent.type === "app-lock") {
    state.appLock = intent.on === true;
    appUnlocked = true;
    save();
  }
  render();
  paintMasterAccount();
}

document.getElementById("move-template-close")?.addEventListener("click", () => {
  document.getElementById("move-template-modal").hidden = true;
});
document.getElementById("move-template-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id === "move-template-modal") event.currentTarget.hidden = true;
});
document.getElementById("move-template-save")?.addEventListener("click", () => {
  const modal = document.getElementById("move-template-modal");
  const file = state.files.find((item) => item.id === modal.dataset.fileId);
  const templateId = document.getElementById("move-template-select")?.value;
  if (file && templateId) moveNoteToTemplate(file, templateId);
  modal.hidden = true;
  save();
  render();
});
document.getElementById("restore-template-close")?.addEventListener("click", () => {
  restoreQueue = [];
  document.getElementById("restore-template-modal").hidden = true;
});
document.getElementById("restore-template-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id !== "restore-template-modal") return;
  restoreQueue = [];
  event.currentTarget.hidden = true;
});
document.getElementById("restore-template-save")?.addEventListener("click", () => {
  const modal = document.getElementById("restore-template-modal");
  const templateId = document.getElementById("restore-template-select")?.value;
  if (templateId) restoreQueue.forEach((file) => finishRestore(file, templateId));
  restoreQueue = [];
  if (modal) modal.hidden = true;
  if (templateIsLive(templateId)) {
    state.activeTemplate = templateId;
    state.listView = "active";
  }
  save();
  render();
});
document.getElementById("order-close")?.addEventListener("click", () => {
  document.getElementById("order-modal").hidden = true;
});
document.getElementById("order-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id === "order-modal") document.getElementById("order-modal").hidden = true;
});
document.getElementById("order-save")?.addEventListener("click", () => {
  const modal = document.getElementById("order-modal");
  const file = state.files.find((item) => item.id === modal.dataset.fileId);
  const number = Number(document.getElementById("order-input").value);
  if (!file || !Number.isFinite(number)) return;
  moveFileTo(file, number);
  modal.hidden = true;
  save();
  render();
});

document.getElementById("master-close")?.addEventListener("click", () => {
  if (masterIntent?.type === "app-gate") {
    showMaster("enter");
    const lead = document.getElementById("master-lead");
    if (lead) lead.textContent = "Escribe la contraseña para abrir la aplicación.";
    return;
  }
  document.getElementById("master-modal").hidden = true;
  masterIntent = null;
  render();
});
document.getElementById("master-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id !== "master-modal") return;
  if (masterIntent?.type === "app-gate") return;
  document.getElementById("master-modal").hidden = true;
  masterIntent = null;
  render();
});
document.getElementById("master-forgot")?.addEventListener("click", async () => {
  const session = accountSession();
  if (!session?.token || !session.email) {
    masterError("Entra en una cuenta con correo. El código solo se envía por SMTP.");
    return;
  }
  try {
    const response = await fetch("/api/master/code", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo enviar el código.");
    showMaster("recover");
    masterError("");
    document.getElementById("master-lead").textContent = data.code
      ? `Tu código es ${data.code}.`
      : `Enviamos un código a ${session.email}.`;
  } catch (error) {
    masterError(error.message);
  }
});
document.getElementById("master-ok")?.addEventListener("click", async () => {
  const password = document.getElementById("master-pass").value;
  const again = document.getElementById("master-pass2").value;
  if (password.length < 6) {
    masterError("La contraseña necesita al menos 6 caracteres.");
    return;
  }
  if (masterMode === "create" || masterMode === "recover") {
    if (password !== again) {
      masterError("Las contraseñas no coinciden.");
      return;
    }
  }
  try {
    if (masterMode === "recover") {
      const session = accountSession();
      const hash = await createMasterHash(password);
      const response = await fetch("/api/master/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.token || ""}`,
        },
        body: JSON.stringify({ code: document.getElementById("master-code").value.trim(), masterHash: hash }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "El código no es válido.");
      localStorage.setItem(MASTER_KEY, hash);
      finishMaster();
      return;
    }
    if (masterMode === "create") {
      localStorage.setItem(MASTER_KEY, await createMasterHash(password));
      finishMaster();
      return;
    }
    if (!(await masterMatches(password))) {
      masterError("La contraseña no es correcta.");
      return;
    }
    finishMaster();
  } catch (error) {
    masterError(error.message);
  }
});

document.getElementById("master-create-account")?.addEventListener("click", () => {
  if (masterStored()) {
    paintMasterAccount();
    return;
  }
  masterIntent = { type: "account-create" };
  showMaster("create");
});
document.getElementById("master-change-account")?.addEventListener("click", () => {
  ["master-old", "master-new", "master-new2"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.value = "";
  });
  masterChangeError("");
  const modal = document.getElementById("master-change-modal");
  if (modal) modal.hidden = false;
  document.getElementById("master-old")?.focus();
});
document.getElementById("master-change-close")?.addEventListener("click", () => {
  document.getElementById("master-change-modal").hidden = true;
});
document.getElementById("master-change-modal")?.addEventListener("pointerdown", (event) => {
  if (event.target.id === "master-change-modal") event.currentTarget.hidden = true;
});
document.getElementById("master-change-save")?.addEventListener("click", async () => {
  const oldPassword = document.getElementById("master-old").value;
  const nextPassword = document.getElementById("master-new").value;
  const again = document.getElementById("master-new2").value;
  if (!(await masterMatches(oldPassword))) {
    masterChangeError("La contraseña antigua no es correcta.");
    return;
  }
  if (nextPassword.length < 6) {
    masterChangeError("La contraseña nueva necesita al menos 6 caracteres.");
    return;
  }
  if (nextPassword !== again) {
    masterChangeError("Las contraseñas nuevas no coinciden.");
    return;
  }
  localStorage.setItem(MASTER_KEY, await createMasterHash(nextPassword));
  document.getElementById("master-change-modal").hidden = true;
  paintMasterAccount();
});
window.paintMasterAccount = paintMasterAccount;
window.askMasterForSetting = askMasterForSetting;
paintMasterAccount();

prepareClocks();
bindColorPair("note-color", "note-hex");

function applyNoteColorLive() {
  const file = state.files.find((item) => item.id === colorFileId);
  if (!file) return;
  file.color = readColorPair("note-color", "note-hex");
  file.colorOwn = true;
  file.updatedAt = Date.now();
  save();
  renderList();
}
document.addEventListener("bloc-spend", () => {
  const file = currentFile();
  if (file) paintMathTotal(file);
});
document.getElementById("note-hex")?.addEventListener("input", applyNoteColorLive);

const NOTE_FONTS = ["Georgia", "Arial", "Courier New", "Verdana"];
let noteFontStep = 0;

function noteEditor() {
  if (state.lockEdit === true) return null;
  const sel = document.getSelection();
  const node = sel?.anchorNode;
  const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
  if (el && (els.body.contains(el) || els.title.contains(el))) return el;
  if (!currentFile()) return null;
  els.body.focus();
  return els.body;
}

let toolRange = null;

function rememberToolRange() {
  const sel = document.getSelection();
  if (!sel?.rangeCount || !els?.body) return;
  const node = sel.anchorNode;
  const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
  if (!el || (!els.body.contains(el) && !els.title?.contains(el))) return;
  toolRange = sel.getRangeAt(0).cloneRange();
}

function restoreToolRange() {
  if (!toolRange || !els?.body) return;
  const start = toolRange.startContainer;
  if (!els.body.contains(start) && !els.title?.contains(start)) return;
  const sel = document.getSelection();
  const node = sel?.anchorNode;
  const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
  if (el && (els.body.contains(el) || els.title.contains(el))) return;
  sel.removeAllRanges();
  sel.addRange(toolRange);
}

document.addEventListener("selectionchange", rememberToolRange);

function editCommand(command, value) {
  restoreToolRange();
  if (!noteEditor()) return;
  document.execCommand(command, false, value ?? null);
  onEdit();
  rememberToolRange();
}

function cycleAlign() {
  restoreToolRange();
  if (!noteEditor()) return;
  const node = document.getSelection()?.anchorNode;
  const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
  const block = el?.closest("div,p");
  const current = block?.style?.textAlign || "left";
  const next = current === "center" ? "right" : current === "right" ? "left" : "center";
  document.execCommand(next === "center" ? "justifyCenter" : next === "right" ? "justifyRight" : "justifyLeft");
  onEdit();
}

function cycleFont() {
  restoreToolRange();
  if (!noteEditor()) return;
  noteFontStep = (noteFontStep + 1) % NOTE_FONTS.length;
  document.execCommand("fontName", false, NOTE_FONTS[noteFontStep]);
  onEdit();
}

function insertNoteFile(file, asImage) {
  if (!file || state.lockEdit === true || !currentFile()) return;
  restoreToolRange();
  if (asImage || file.type.startsWith("image/")) {
    if (file.size > 450000) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!noteEditor()) return;
      document.execCommand("insertHTML", false, `<img src="${reader.result}" alt="">`);
      onEdit();
    };
    reader.readAsDataURL(file);
    return;
  }
  if (!noteEditor()) return;
  document.execCommand("insertText", false, ` ${file.name || "archivo"} `);
  onEdit();
}

window.Bloc = {
  state, save, render, createFile, selectTemplate, deleteTemplate, confirmTwice, confirmDelete, openScheduleFromList, noteScheduleText, markWholeNote,
  openCalendar, rememberFile, formatLong, plain, pendingAlarms, openFile, closeFocus,
  escapeHtml, DEFAULT_TEMPLATES, CARD_COLORS, noteCardClass, colorHex, isHexColor, setColorPair, readColorPair, bindColorPair, snapshot, applyRemoteState,
  askMasterForSetting, askMasterForAppLock, openAppColor, editCommand, cycleAlign, cycleFont, insertNoteFile, paintMasterAccount, setNoTemplates, parkLooseNotes,
};
render();
restorePlace();
if (state.appLock && masterStored()) {
  appUnlocked = false;
  masterIntent = { type: "app-gate" };
  showMaster("enter");
  const lead = document.getElementById("master-lead");
  if (lead) lead.textContent = "Escribe la contraseña para abrir la aplicación.";
}
setInterval(tick, 1000);
syncNativeAlarms();
tick();

function blocGoBack() {
  if (!window.matchMedia("(max-width: 700px)").matches) return false;
  if (state.focusOpen) {
    closeFocus();
    return true;
  }
  if (state.openId) {
    state.openId = null;
    save();
    render();
    return true;
  }
  return false;
}
window.blocGoBack = blocGoBack;
