const form = document.getElementById("topic-form");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");
const topicsList = document.getElementById("topics-list");
const saveBtn = document.getElementById("save-btn");
const newBtn = document.getElementById("new-btn");
const exportBtn = document.getElementById("export-btn");
const currentReportName = document.getElementById("current-report-name");
const reportsList = document.getElementById("reports-list");
const reportsStatus = document.getElementById("reports-status");
const newReportNameInput = document.getElementById("new-report-name");
const createReportBtn = document.getElementById("create-report-btn");
const brandLogoBtn = document.getElementById("brand-logo-btn");
const brandLogoInput = document.getElementById("brand-logo-input");
const brandLogoPreview = document.getElementById("brand-logo-preview");
const appTitle = document.getElementById("app-title");
const appSubtitle = document.getElementById("app-subtitle");
const coverModal = document.getElementById("cover-modal");
const coverModalOpenBtn = document.getElementById("cover-modal-open-btn");
const coverModalCloseBtn = document.getElementById("cover-modal-close-btn");
const coverEnabledInput = document.getElementById("cover-enabled");
const coverEnabledLabel = document.getElementById("cover-enabled-label");
const coverTitleInput = document.getElementById("cover-title");
const coverSubtitleInput = document.getElementById("cover-subtitle");
const coverTextInput = document.getElementById("cover-text");
const coverNoteInput = document.getElementById("cover-note");
const coverFooterInput = document.getElementById("cover-footer");
const saveCoverBtn = document.getElementById("save-cover-btn");
const resetCoverBtn = document.getElementById("reset-cover-btn");
const configModal = document.getElementById("config-modal");
const configModalOpenBtn = document.getElementById("config-modal-open-btn");
const configModalCloseBtn = document.getElementById("config-modal-close-btn");
const configSaveBtn = document.getElementById("config-save-btn");
const configResetBtn = document.getElementById("config-reset-btn");
const cfgUiPrimary = document.getElementById("cfg-ui-primary");
const cfgUiAccent = document.getElementById("cfg-ui-accent");
const cfgUiDanger = document.getElementById("cfg-ui-danger");
const cfgUiInk = document.getElementById("cfg-ui-ink");
const cfgUiMuted = document.getElementById("cfg-ui-muted");
const cfgUiLine = document.getElementById("cfg-ui-line");
const cfgUiCard = document.getElementById("cfg-ui-card");
const cfgUiBgStart = document.getElementById("cfg-ui-bg-start");
const cfgUiBgEnd = document.getElementById("cfg-ui-bg-end");
const cfgUiHeroStart = document.getElementById("cfg-ui-hero-start");
const cfgUiHeroEnd = document.getElementById("cfg-ui-hero-end");
const cfgPdfPrimary = document.getElementById("cfg-pdf-primary");
const cfgPdfDark = document.getElementById("cfg-pdf-dark");
const cfgPdfSoft = document.getElementById("cfg-pdf-soft");
const cfgPdfText = document.getElementById("cfg-pdf-text");
const cfgPdfFooterText = document.getElementById("cfg-pdf-footer-text");
const cfgAppTitle = document.getElementById("cfg-app-title");
const cfgAppSubtitle = document.getElementById("cfg-app-subtitle");
const cfgPdfPrefix = document.getElementById("cfg-pdf-prefix");
const cfgShowLogo = document.getElementById("cfg-show-logo");
const cfgShowLogoLabel = document.getElementById("cfg-show-logo-label");
const uiModal = document.getElementById("ui-modal");
const uiModalTitle = document.getElementById("ui-modal-title");
const uiModalMessage = document.getElementById("ui-modal-message");
const uiModalInput = document.getElementById("ui-modal-input");
const uiModalCancel = document.getElementById("ui-modal-cancel");
const uiModalConfirm = document.getElementById("ui-modal-confirm");
const securityModal = document.getElementById("security-modal");
const securityModalTitle = document.getElementById("security-modal-title");
const securityModalMessage = document.getElementById("security-modal-message");
const securityModalInput = document.getElementById("security-modal-input");
const securityModalConfirm = document.getElementById("security-modal-confirm");
const securityModalCancel = document.getElementById("security-modal-cancel");
const securityModalCopy = document.getElementById("security-modal-copy");
const securityKeyBox = document.getElementById("security-key-box");
const dropzone = document.getElementById("dropzone");
const imageInput = document.getElementById("image-input");
const queuedImagesContainer = document.getElementById("queued-images");
const existingImagesContainer = document.getElementById("existing-images");

let reports = [];
let selectedReportId = null;
let topics = [];
let editingId = null;
let queuedImages = [];
let uiModalMode = "alert";
let uiModalResolver = null;
let securityModalMode = "ask_key";
let securityModalResolver = null;
let securityModalCurrentKey = "";
let appSettings = null;
let configSettingsBackup = null;
const reportKeys = {};

const DEFAULT_COVER_SETTINGS = {
  cover_enabled: true,
  cover_title: "Relatorio Tecnico",
  cover_subtitle: "Resumo executivo",
  cover_text: "Descreva aqui o contexto e os objetivos deste relatorio.",
  cover_note: "DOCUMENTO CONFIDENCIAL",
  cover_footer: "Sua Organizacao | www.seusite.com",
};

const DEFAULT_APP_SETTINGS = {
  app_title: "Sistema de Relatorios",
  app_subtitle: "Monte topicos, anexe imagens e exporte PDF.",
  show_logo: true,
  pdf_filename_prefix: "relatorio",
  ui_theme: {
    bg_start: "#EFF2F9",
    bg_end: "#ECF4FF",
    card: "#FFFFFF",
    ink: "#10233D",
    muted: "#4F6077",
    line: "#D4DCE8",
    primary: "#145DA0",
    accent: "#00A58E",
    danger: "#C73E1D",
    hero_start: "#D9EBFF",
    hero_end: "#FFFFFF",
  },
  pdf_theme: {
    primary: "#2B6670",
    dark: "#1F4A52",
    soft: "#E5F2F0",
    text: "#1F3442",
    footer_text: "#5A7180",
  },
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeHex(value, fallback) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toUpperCase();
  }
  return fallback;
}

function sanitizeAppSettings(input) {
  const raw = typeof input === "object" && input !== null ? input : {};
  const uiTheme = typeof raw.ui_theme === "object" && raw.ui_theme !== null ? raw.ui_theme : {};
  const pdfTheme = typeof raw.pdf_theme === "object" && raw.pdf_theme !== null ? raw.pdf_theme : {};
  const defaults = DEFAULT_APP_SETTINGS;
  const merged = {
    app_title: String(raw.app_title || defaults.app_title).trim() || defaults.app_title,
    app_subtitle: String(raw.app_subtitle || defaults.app_subtitle).trim() || defaults.app_subtitle,
    show_logo: raw.show_logo === undefined ? defaults.show_logo : Boolean(raw.show_logo),
    pdf_filename_prefix: String(raw.pdf_filename_prefix || defaults.pdf_filename_prefix).trim().toLowerCase(),
    ui_theme: {
      bg_start: normalizeHex(uiTheme.bg_start, defaults.ui_theme.bg_start),
      bg_end: normalizeHex(uiTheme.bg_end, defaults.ui_theme.bg_end),
      card: normalizeHex(uiTheme.card, defaults.ui_theme.card),
      ink: normalizeHex(uiTheme.ink, defaults.ui_theme.ink),
      muted: normalizeHex(uiTheme.muted, defaults.ui_theme.muted),
      line: normalizeHex(uiTheme.line, defaults.ui_theme.line),
      primary: normalizeHex(uiTheme.primary, defaults.ui_theme.primary),
      accent: normalizeHex(uiTheme.accent, defaults.ui_theme.accent),
      danger: normalizeHex(uiTheme.danger, defaults.ui_theme.danger),
      hero_start: normalizeHex(uiTheme.hero_start, defaults.ui_theme.hero_start),
      hero_end: normalizeHex(uiTheme.hero_end, defaults.ui_theme.hero_end),
    },
    pdf_theme: {
      primary: normalizeHex(pdfTheme.primary, defaults.pdf_theme.primary),
      dark: normalizeHex(pdfTheme.dark, defaults.pdf_theme.dark),
      soft: normalizeHex(pdfTheme.soft, defaults.pdf_theme.soft),
      text: normalizeHex(pdfTheme.text, defaults.pdf_theme.text),
      footer_text: normalizeHex(pdfTheme.footer_text, defaults.pdf_theme.footer_text),
    },
  };

  merged.pdf_filename_prefix = merged.pdf_filename_prefix.replace(/[^a-z0-9_-]/g, "").slice(0, 50) || defaults.pdf_filename_prefix;
  return merged;
}

function applySystemTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--bg-start", theme.bg_start);
  root.style.setProperty("--bg-end", theme.bg_end);
  root.style.setProperty("--card", theme.card);
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--line", theme.line);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--danger", theme.danger);
  root.style.setProperty("--hero-start", theme.hero_start);
  root.style.setProperty("--hero-end", theme.hero_end);
}

function applyAppSettings(settings) {
  const normalized = sanitizeAppSettings(settings);
  appSettings = normalized;
  applySystemTheme(normalized.ui_theme);
  appTitle.textContent = normalized.app_title;
  appSubtitle.textContent = normalized.app_subtitle;
  cfgShowLogoLabel.textContent = normalized.show_logo ? "Mostrar logo na interface" : "Ocultar logo na interface";
  if (!normalized.show_logo) {
    brandLogoPreview.style.display = "none";
  }
}

function fillConfigModal(settings) {
  cfgUiPrimary.value = settings.ui_theme.primary;
  cfgUiAccent.value = settings.ui_theme.accent;
  cfgUiDanger.value = settings.ui_theme.danger;
  cfgUiInk.value = settings.ui_theme.ink;
  cfgUiMuted.value = settings.ui_theme.muted;
  cfgUiLine.value = settings.ui_theme.line;
  cfgUiCard.value = settings.ui_theme.card;
  cfgUiBgStart.value = settings.ui_theme.bg_start;
  cfgUiBgEnd.value = settings.ui_theme.bg_end;
  cfgUiHeroStart.value = settings.ui_theme.hero_start;
  cfgUiHeroEnd.value = settings.ui_theme.hero_end;
  cfgPdfPrimary.value = settings.pdf_theme.primary;
  cfgPdfDark.value = settings.pdf_theme.dark;
  cfgPdfSoft.value = settings.pdf_theme.soft;
  cfgPdfText.value = settings.pdf_theme.text;
  cfgPdfFooterText.value = settings.pdf_theme.footer_text;
  cfgAppTitle.value = settings.app_title;
  cfgAppSubtitle.value = settings.app_subtitle;
  cfgPdfPrefix.value = settings.pdf_filename_prefix;
  cfgShowLogo.checked = Boolean(settings.show_logo);
}

function collectConfigModalSettings() {
  return sanitizeAppSettings({
    app_title: cfgAppTitle.value,
    app_subtitle: cfgAppSubtitle.value,
    show_logo: cfgShowLogo.checked,
    pdf_filename_prefix: cfgPdfPrefix.value,
    ui_theme: {
      primary: cfgUiPrimary.value,
      accent: cfgUiAccent.value,
      danger: cfgUiDanger.value,
      ink: cfgUiInk.value,
      muted: cfgUiMuted.value,
      line: cfgUiLine.value,
      card: cfgUiCard.value,
      bg_start: cfgUiBgStart.value,
      bg_end: cfgUiBgEnd.value,
      hero_start: cfgUiHeroStart.value,
      hero_end: cfgUiHeroEnd.value,
    },
    pdf_theme: {
      primary: cfgPdfPrimary.value,
      dark: cfgPdfDark.value,
      soft: cfgPdfSoft.value,
      text: cfgPdfText.value,
      footer_text: cfgPdfFooterText.value,
    },
  });
}

function openConfigModal() {
  const active = appSettings || cloneData(DEFAULT_APP_SETTINGS);
  configSettingsBackup = cloneData(active);
  fillConfigModal(active);
  configModal.classList.remove("hidden");
  configModal.setAttribute("aria-hidden", "false");
}

function closeConfigModal(restore = true) {
  configModal.classList.add("hidden");
  configModal.setAttribute("aria-hidden", "true");
  if (restore && configSettingsBackup) {
    applyAppSettings(configSettingsBackup);
    refreshBrandLogo();
  }
  configSettingsBackup = null;
}

async function loadAppSettings() {
  try {
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (!response.ok) {
      applyAppSettings(DEFAULT_APP_SETTINGS);
      return;
    }
    const payload = await response.json();
    applyAppSettings(payload);
  } catch (error) {
    applyAppSettings(DEFAULT_APP_SETTINGS);
  }
}

async function saveAppSettings(payload) {
  const response = await fetch("/api/settings", {
    method: "PUT",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}
function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  return ok;
}

function closeUIModal(result = null) {
  uiModal.classList.add("hidden");
  uiModal.setAttribute("aria-hidden", "true");
  if (uiModalResolver) {
    uiModalResolver(result);
    uiModalResolver = null;
  }
}

function openUIModal({ mode, title, message, confirmLabel, cancelLabel, value }) {
  uiModalMode = mode;
  uiModalTitle.textContent = title || "Aviso";
  uiModalMessage.textContent = message || "";
  uiModalConfirm.textContent = confirmLabel || "Confirmar";
  uiModalCancel.textContent = cancelLabel || "Cancelar";

  if (mode === "alert") {
    uiModalCancel.classList.add("hidden");
    uiModalInput.classList.add("hidden");
  } else if (mode === "confirm") {
    uiModalCancel.classList.remove("hidden");
    uiModalInput.classList.add("hidden");
  } else {
    uiModalCancel.classList.remove("hidden");
    uiModalInput.classList.remove("hidden");
    uiModalInput.value = value || "";
  }

  uiModal.classList.remove("hidden");
  uiModal.setAttribute("aria-hidden", "false");
  if (mode === "prompt") {
    setTimeout(() => uiModalInput.focus(), 0);
  }

  return new Promise((resolve) => {
    uiModalResolver = resolve;
  });
}

function uiAlert(message, title = "Aviso") {
  return openUIModal({
    mode: "alert",
    title,
    message,
    confirmLabel: "OK",
  });
}

function uiConfirm(message, title = "Confirmacao") {
  return openUIModal({
    mode: "confirm",
    title,
    message,
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
  });
}

function uiPrompt(message, initialValue = "", title = "Editar") {
  return openUIModal({
    mode: "prompt",
    title,
    message,
    confirmLabel: "Salvar",
    cancelLabel: "Cancelar",
    value: initialValue,
  });
}

function closeSecurityModal(result = null) {
  securityModal.classList.add("hidden");
  securityModal.setAttribute("aria-hidden", "true");
  if (securityModalResolver) {
    securityModalResolver(result);
    securityModalResolver = null;
  }
}

function openSecurityModal({ mode, reportName, message = "", key = "" }) {
  securityModalMode = mode;
  securityModalCurrentKey = key;
  securityModalTitle.textContent = mode === "show_key" ? "Chave do relatorio criada" : "Abrir relatorio com chave";
  securityModalMessage.textContent =
    message || (mode === "show_key"
      ? `Guarde esta chave com seguranca para o relatorio "${reportName}".`
      : `Informe a chave de 13 digitos para abrir "${reportName}".`);

  if (mode === "show_key") {
    securityModalInput.classList.add("hidden");
    securityModalCopy.classList.remove("hidden");
    securityModalCancel.classList.add("hidden");
    securityModalConfirm.textContent = "Continuar";
    securityKeyBox.classList.remove("hidden");
    securityKeyBox.textContent = key;
  } else {
    securityModalInput.classList.remove("hidden");
    securityModalCopy.classList.add("hidden");
    securityModalCancel.classList.remove("hidden");
    securityModalConfirm.textContent = "Abrir";
    securityKeyBox.classList.add("hidden");
    securityModalInput.value = "";
    setTimeout(() => securityModalInput.focus(), 0);
  }

  securityModal.classList.remove("hidden");
  securityModal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    securityModalResolver = resolve;
  });
}

async function askReportKey(reportName) {
  return openSecurityModal({ mode: "ask_key", reportName });
}

async function showGeneratedReportKey(reportName, key) {
  return openSecurityModal({ mode: "show_key", reportName, key });
}

function openCoverModal() {
  coverModal.classList.remove("hidden");
  coverModal.setAttribute("aria-hidden", "false");
}

function closeCoverModal() {
  coverModal.classList.add("hidden");
  coverModal.setAttribute("aria-hidden", "true");
}

function getSelectedReport() {
  return reports.find((report) => report.id === selectedReportId) || null;
}

function getReportKey(reportId) {
  return (reportKeys[reportId] || "").trim();
}

function authHeaders(reportId, extraHeaders = {}) {
  const key = getReportKey(reportId);
  if (!key) return extraHeaders;
  return { ...extraHeaders, "X-Report-Key": key };
}

async function ensureReportAccess(reportId, forcePrompt = false) {
  const report = reports.find((item) => item.id === reportId);
  if (!report) return false;

  if (forcePrompt || !getReportKey(reportId)) {
    const accessKey = await askReportKey(report.name);
    if (!accessKey) return false;
    if (!/^\d{13}$/.test(accessKey.trim())) {
      await uiAlert("A chave deve conter exatamente 13 digitos.");
      return false;
    }
    const response = await fetch(`/api/reports/${reportId}/unlock`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_key: accessKey.trim() }),
    });
    if (!response.ok) {
      await uiAlert("Chave invalida para este relatorio.");
      return false;
    }
    reportKeys[reportId] = accessKey.trim();
  }
  return true;
}

async function fetchWithReportAuth(url, options = {}, reportId = selectedReportId, retry = true) {
  if (!reportId) return null;
  if (!getReportKey(reportId)) {
    const ok = await ensureReportAccess(reportId, false);
    if (!ok) return null;
  }

  const headers = authHeaders(reportId, options.headers || {});
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers,
  });

  if ((response.status === 401 || response.status === 403) && retry) {
    delete reportKeys[reportId];
    const reAuth = await ensureReportAccess(reportId, true);
    if (!reAuth) return null;
    return fetchWithReportAuth(url, options, reportId, false);
  }
  return response;
}

function setReportContextUI() {
  const hasReport = Boolean(selectedReportId);
  coverModalOpenBtn.style.display = hasReport ? "inline-flex" : "none";
  exportBtn.disabled = !hasReport;
  titleInput.disabled = !hasReport;
  contentInput.disabled = !hasReport;
  imageInput.disabled = !hasReport;
  saveBtn.disabled = !hasReport;
  newBtn.disabled = !hasReport;
  dropzone.style.opacity = hasReport ? "1" : "0.55";
  dropzone.style.pointerEvents = hasReport ? "auto" : "none";
}

function requireSelectedReport() {
  if (!selectedReportId) {
    uiAlert("Selecione um relatorio.");
    return false;
  }
  return true;
}

function updateCurrentReportName() {
  const report = getSelectedReport();
  if (!report) {
    currentReportName.textContent = "Relatorio selecionado: nenhum";
    setReportContextUI();
    return;
  }
  currentReportName.textContent = `Relatorio selecionado: ${report.name}`;
  setReportContextUI();
}

function renderReports() {
  reportsList.innerHTML = "";
  reports.forEach((report) => {
    const card = document.createElement("div");
    card.className = `report-card${report.id === selectedReportId ? " active" : ""}`;
    card.innerHTML = `
      <h3>${escapeHtml(report.name)}</h3>
      <p>${report.topics_count} topico(s)</p>
      <div class="actions">
        <button class="btn btn-primary" data-open-report="${report.id}">Abrir</button>
        <button class="btn" data-rename-report="${report.id}">Renomear</button>
        <button class="btn btn-danger" data-delete-report="${report.id}">Excluir</button>
      </div>
    `;
    reportsList.appendChild(card);
  });
}

function updateCoverSwitchLabel() {
  coverEnabledLabel.textContent = coverEnabledInput.checked ? "Capa ligada" : "Capa desligada";
}

function collectCoverSettings() {
  return {
    cover_enabled: coverEnabledInput.checked,
    cover_title: coverTitleInput.value.trim(),
    cover_subtitle: coverSubtitleInput.value.trim(),
    cover_text: coverTextInput.value.trim(),
    cover_note: coverNoteInput.value.trim(),
    cover_footer: coverFooterInput.value.trim(),
  };
}

function applyCoverSettings(settings) {
  const merged = { ...DEFAULT_COVER_SETTINGS, ...(settings || {}) };
  coverEnabledInput.checked = Boolean(merged.cover_enabled);
  coverTitleInput.value = merged.cover_title || "";
  coverSubtitleInput.value = merged.cover_subtitle || "";
  coverTextInput.value = merged.cover_text || "";
  coverNoteInput.value = merged.cover_note || "";
  coverFooterInput.value = merged.cover_footer || "";
  updateCoverSwitchLabel();
}

async function refreshBrandLogo() {
  if (!appSettings?.show_logo) {
    brandLogoPreview.style.display = "none";
    return;
  }
  const response = await fetch("/api/branding/logo", { cache: "no-store" });
  if (!response.ok) {
    brandLogoPreview.style.display = "none";
    return;
  }
  brandLogoPreview.style.display = "block";
  brandLogoPreview.src = `/api/branding/logo?ts=${Date.now()}`;
}
async function fetchTopics() {
  if (!selectedReportId) {
    topics = [];
    renderTopics();
    renderExistingImages();
    return;
  }
  const response = await fetchWithReportAuth(`/api/reports/${selectedReportId}/topics`);
  if (!response || !response.ok) {
    topics = [];
    renderTopics();
    return;
  }
  topics = await response.json();
  renderTopics();
  renderExistingImages();
}

async function fetchCoverSettings() {
  if (!selectedReportId) {
    applyCoverSettings(DEFAULT_COVER_SETTINGS);
    return;
  }
  const response = await fetchWithReportAuth(`/api/reports/${selectedReportId}/settings`);
  if (!response || !response.ok) {
    applyCoverSettings(DEFAULT_COVER_SETTINGS);
    return;
  }
  const settings = await response.json();
  applyCoverSettings(settings);
}

async function saveCoverSettings(customSettings = null) {
  if (!requireSelectedReport()) return null;
  const payload = customSettings || collectCoverSettings();
  const response = await fetchWithReportAuth(
    `/api/reports/${selectedReportId}/settings`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response || !response.ok) {
    await uiAlert("Nao foi possivel salvar as configuracoes da capa.");
    return null;
  }
  return response.json();
}

async function fetchReports(preferredReportId = null) {
  reportsStatus.textContent = "Carregando relatorios...";
  let response;
  try {
    response = await fetch("/api/reports", { cache: "no-store" });
  } catch (error) {
    reports = [];
    reportsStatus.textContent = "Falha de conexao com o servidor.";
    selectedReportId = null;
    renderReports();
    updateCurrentReportName();
    await fetchTopics();
    return;
  }
  if (!response.ok) {
    reports = [];
    reportsStatus.textContent = `Erro ao carregar relatorios (HTTP ${response.status}).`;
    selectedReportId = null;
    renderReports();
    updateCurrentReportName();
    await fetchTopics();
    return;
  }
  reports = await response.json();
  if (!reports.length) {
    reportsStatus.textContent = "Nenhum relatorio criado ainda.";
    selectedReportId = null;
    renderReports();
    updateCurrentReportName();
    await fetchTopics();
    return;
  }
  reportsStatus.textContent = "";

  const keepCurrent = reports.some((report) => report.id === selectedReportId) ? selectedReportId : null;
  const keepPreferred = reports.some((report) => report.id === preferredReportId) ? preferredReportId : null;
  selectedReportId = keepPreferred || keepCurrent || null;

  renderReports();
  updateCurrentReportName();
  await fetchTopics();
  if (selectedReportId) {
    await fetchCoverSettings();
  } else {
    applyCoverSettings(DEFAULT_COVER_SETTINGS);
  }
}

function renderTopics() {
  topicsList.innerHTML = "";
  topics.forEach((topic) => {
    const li = document.createElement("li");
    li.className = "topic-item";
    li.innerHTML = `
      <h3>${escapeHtml(topic.title)}</h3>
      <p>${escapeHtml((topic.content || "").slice(0, 150) || "Sem descricao.")}</p>
      <div class="topic-actions">
        <button class="btn btn-primary" data-edit="${topic.id}">Editar</button>
        <button class="btn btn-danger" data-remove="${topic.id}">Remover</button>
      </div>
    `;
    topicsList.appendChild(li);
  });
}

function resetForm() {
  editingId = null;
  queuedImages = [];
  form.reset();
  saveBtn.textContent = "Adicionar";
  renderQueuedImages();
  renderExistingImages();
}

function selectTopic(topicId) {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) return;

  editingId = topic.id;
  titleInput.value = topic.title || "";
  contentInput.value = topic.content || "";
  queuedImages = [];
  saveBtn.textContent = "Salvar edicao";
  renderQueuedImages();
  renderExistingImages();
}

function renderQueuedImages() {
  queuedImagesContainer.innerHTML = "";
  queuedImages.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "thumb";
    const src = URL.createObjectURL(file);
    card.innerHTML = `
      <img src="${src}" alt="Nova imagem">
      <button type="button" data-remove-queued="${index}">Remover</button>
    `;
    queuedImagesContainer.appendChild(card);
  });
}

function renderExistingImages() {
  existingImagesContainer.innerHTML = "";
  if (!editingId) return;

  const topic = topics.find((item) => item.id === editingId);
  if (!topic) return;

  topic.images.forEach((image) => {
    const card = document.createElement("div");
    card.className = "thumb";
    card.innerHTML = `
      <img src="/api/images/${encodeURIComponent(image.stored_name)}" alt="${escapeHtml(image.original_name)}">
      <button type="button" data-remove-image="${image.id}">Excluir</button>
    `;
    existingImagesContainer.appendChild(card);
  });
}

function pushImages(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  queuedImages.push(...files);
  renderQueuedImages();
}

async function uploadQueuedImages(topicId) {
  if (!queuedImages.length || !requireSelectedReport()) return;
  const formData = new FormData();
  queuedImages.forEach((file) => formData.append("images", file));

  await fetchWithReportAuth(`/api/reports/${selectedReportId}/topics/${topicId}/images`, {
    method: "POST",
    body: formData,
  });
  queuedImages = [];
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireSelectedReport()) return;

  const payload = {
    title: titleInput.value.trim(),
    content: contentInput.value.trim(),
  };

  if (!payload.title) {
    await uiAlert("Informe um titulo.");
    return;
  }

  if (editingId) {
    await fetchWithReportAuth(`/api/reports/${selectedReportId}/topics/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await uploadQueuedImages(editingId);
  } else {
    const response = await fetchWithReportAuth(`/api/reports/${selectedReportId}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response || !response.ok) return;
    const created = await response.json();
    await uploadQueuedImages(created.id);
  }

  await fetchReports(selectedReportId);
  resetForm();
});

topicsList.addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const removeId = event.target.dataset.remove;
  if (editId) {
    selectTopic(editId);
  }
  if (removeId) {
    const accepted = await uiConfirm("Deseja remover este topico?");
    if (!accepted) return;
    await fetchWithReportAuth(`/api/reports/${selectedReportId}/topics/${removeId}`, { method: "DELETE" });
    await fetchReports(selectedReportId);
    if (editingId === removeId) resetForm();
  }
});
reportsList.addEventListener("click", async (event) => {
  const openId = event.target.dataset.openReport;
  const renameId = event.target.dataset.renameReport;
  const deleteId = event.target.dataset.deleteReport;

  if (openId) {
    const ok = await ensureReportAccess(openId, true);
    if (!ok) return;
    selectedReportId = openId;
    resetForm();
    renderReports();
    updateCurrentReportName();
    await fetchTopics();
    await fetchCoverSettings();
    return;
  }

  if (renameId) {
    const report = reports.find((item) => item.id === renameId);
    if (!report) return;
    const ok = await ensureReportAccess(renameId, false);
    if (!ok) return;
    const newName = await uiPrompt("Novo nome do relatorio:", report.name, "Renomear relatorio");
    if (!newName || !newName.trim()) return;
    await fetchWithReportAuth(
      `/api/reports/${renameId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      },
      renameId
    );
    await fetchReports(renameId);
    return;
  }

  if (deleteId) {
    const ok = await ensureReportAccess(deleteId, false);
    if (!ok) return;
    const accepted = await uiConfirm("Deseja excluir este relatorio e todos os topicos dele?");
    if (!accepted) return;
    await fetchWithReportAuth(`/api/reports/${deleteId}`, { method: "DELETE" }, deleteId);
    if (selectedReportId === deleteId) {
      selectedReportId = null;
      resetForm();
    }
    delete reportKeys[deleteId];
    await fetchReports();
  }
});

createReportBtn.addEventListener("click", async () => {
  const name = newReportNameInput.value.trim();
  if (!name) {
    await uiAlert("Informe o nome do relatorio.");
    return;
  }
  const response = await fetch("/api/reports", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    await uiAlert("Nao foi possivel criar o relatorio.");
    return;
  }
  const created = await response.json();
  reportKeys[created.id] = String(created.access_key || "").trim();
  await showGeneratedReportKey(created.name, reportKeys[created.id]);
  newReportNameInput.value = "";
  selectedReportId = created.id;
  resetForm();
  await fetchReports(created.id);
  await fetchTopics();
  await fetchCoverSettings();
});

queuedImagesContainer.addEventListener("click", (event) => {
  const index = event.target.dataset.removeQueued;
  if (index === undefined) return;
  queuedImages.splice(Number(index), 1);
  renderQueuedImages();
});

existingImagesContainer.addEventListener("click", async (event) => {
  const imageId = event.target.dataset.removeImage;
  if (!imageId || !editingId || !requireSelectedReport()) return;
  await fetchWithReportAuth(`/api/reports/${selectedReportId}/topics/${editingId}/images/${imageId}`, { method: "DELETE" });
  await fetchTopics();
  selectTopic(editingId);
});

newBtn.addEventListener("click", resetForm);

exportBtn.addEventListener("click", async () => {
  if (!requireSelectedReport()) return;
  const coverSettings = collectCoverSettings();
  const response = await fetchWithReportAuth(`/api/reports/${selectedReportId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report_title: coverSettings.cover_title || getSelectedReport()?.name || "Relatorio Tecnico",
      cover_settings: coverSettings,
    }),
  });
  if (!response || !response.ok) {
    await uiAlert("Nao foi possivel exportar este relatorio.");
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "relatorio.pdf";
  link.click();
  URL.revokeObjectURL(url);
});

coverEnabledInput.addEventListener("change", updateCoverSwitchLabel);

saveCoverBtn.addEventListener("click", async () => {
  const saved = await saveCoverSettings();
  if (saved) {
    await uiAlert("Configuracoes da capa salvas.");
    applyCoverSettings(saved);
  }
});

resetCoverBtn.addEventListener("click", async () => {
  applyCoverSettings(DEFAULT_COVER_SETTINGS);
  const saved = await saveCoverSettings(DEFAULT_COVER_SETTINGS);
  if (saved) {
    await uiAlert("Padrao da capa restaurado.");
    applyCoverSettings(saved);
  }
});

configModalOpenBtn.addEventListener("click", openConfigModal);
configModalCloseBtn.addEventListener("click", () => closeConfigModal(true));

configModal.addEventListener("input", (event) => {
  if (!event.target.id.startsWith("cfg-")) return;
  const draft = collectConfigModalSettings();
  applyAppSettings(draft);
  if (cfgShowLogo.checked) {
    refreshBrandLogo();
  }
});

configSaveBtn.addEventListener("click", async () => {
  const payload = collectConfigModalSettings();
  const saved = await saveAppSettings(payload);
  if (!saved) {
    await uiAlert("Nao foi possivel salvar as configuracoes.");
    return;
  }
  applyAppSettings(saved);
  await refreshBrandLogo();
  configSettingsBackup = cloneData(appSettings);
  await uiAlert("Configuracoes salvas com sucesso.");
  closeConfigModal(false);
});

configResetBtn.addEventListener("click", async () => {
  fillConfigModal(DEFAULT_APP_SETTINGS);
  const payload = collectConfigModalSettings();
  applyAppSettings(payload);
  const saved = await saveAppSettings(payload);
  if (!saved) {
    await uiAlert("Nao foi possivel restaurar o padrao.");
    return;
  }
  applyAppSettings(saved);
  await refreshBrandLogo();
  configSettingsBackup = cloneData(appSettings);
  await uiAlert("Padrao restaurado.");
});

brandLogoBtn.addEventListener("click", () => brandLogoInput.click());
coverModalOpenBtn.addEventListener("click", openCoverModal);
coverModalCloseBtn.addEventListener("click", closeCoverModal);

coverModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeCoverModal();
  }
});

configModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeConfigModal === "true") {
    closeConfigModal(true);
  }
});
uiModalConfirm.addEventListener("click", () => {
  if (uiModalMode === "prompt") {
    closeUIModal(uiModalInput.value);
    return;
  }
  if (uiModalMode === "confirm") {
    closeUIModal(true);
    return;
  }
  closeUIModal(true);
});

uiModalCancel.addEventListener("click", () => {
  if (uiModalMode === "prompt") {
    closeUIModal(null);
    return;
  }
  closeUIModal(false);
});

uiModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeUiModal === "true") {
    if (uiModalMode === "alert") {
      closeUIModal(true);
    } else if (uiModalMode === "prompt") {
      closeUIModal(null);
    } else {
      closeUIModal(false);
    }
  }
});

uiModalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    closeUIModal(uiModalInput.value);
  }
});

securityModalConfirm.addEventListener("click", () => {
  if (securityModalMode === "show_key") {
    closeSecurityModal(true);
    return;
  }
  closeSecurityModal((securityModalInput.value || "").trim());
});

securityModalCancel.addEventListener("click", () => {
  if (securityModalMode === "show_key") {
    closeSecurityModal(true);
    return;
  }
  closeSecurityModal(null);
});

securityModalCopy.addEventListener("click", async () => {
  if (!securityModalCurrentKey) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(securityModalCurrentKey);
      await uiAlert("Chave copiada para a area de transferencia.");
      return;
    }
    const ok = fallbackCopyText(securityModalCurrentKey);
    if (!ok) throw new Error("fallback copy failed");
    await uiAlert("Chave copiada para a area de transferencia.");
  } catch (error) {
    await uiAlert("Nao foi possivel copiar automaticamente. Copie manualmente.");
  }
});

securityModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeSecurityModal === "true") {
    if (securityModalMode === "show_key") {
      closeSecurityModal(true);
    } else {
      closeSecurityModal(null);
    }
  }
});

securityModalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    closeSecurityModal((securityModalInput.value || "").trim());
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !securityModal.classList.contains("hidden")) {
    if (securityModalMode === "show_key") {
      closeSecurityModal(true);
    } else {
      closeSecurityModal(null);
    }
    return;
  }
  if (event.key === "Escape" && !uiModal.classList.contains("hidden")) {
    if (uiModalMode === "alert") {
      closeUIModal(true);
    } else if (uiModalMode === "prompt") {
      closeUIModal(null);
    } else {
      closeUIModal(false);
    }
    return;
  }
  if (event.key === "Escape" && !configModal.classList.contains("hidden")) {
    closeConfigModal(true);
    return;
  }
  if (event.key === "Escape" && !coverModal.classList.contains("hidden")) {
    closeCoverModal();
  }
});

brandLogoInput.addEventListener("change", async () => {
  const file = brandLogoInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("logo", file);
  const response = await fetch("/api/branding/logo", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    await uiAlert("Nao foi possivel atualizar a logo.");
    return;
  }
  await refreshBrandLogo();
});

dropzone.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => pushImages(imageInput.files));

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("drag");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag");
  pushImages(event.dataTransfer.files);
});

dropzone.addEventListener("paste", (event) => {
  pushImages(event.clipboardData.files);
});

document.addEventListener("paste", (event) => {
  if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    return;
  }
  pushImages(event.clipboardData.files);
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function bootstrap() {
  await loadAppSettings();
  await refreshBrandLogo();
  await fetchReports();
}

bootstrap();

