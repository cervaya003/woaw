// ====== Config API ======
const BASE_API = "https://woaw-backend-507962515113.us-central1.run.app/api";
const PRE_DELETE_URL = `${BASE_API}/account/pre-delete`; // POST -> { email }
const CONFIRM_DELETE_URL = `${BASE_API}/account/confirm-delete`; // POST -> { email, code }
// `  `
// ====== Selección de elementos ======
const emailInput = document.getElementById("email");
const confirmEmailInput = document.getElementById("confirmEmail");
const deleteBtn = document.getElementById("deleteBtn");
const messageDiv = document.getElementById("message");

// Logos para claro y oscuro
const logoLight = document.querySelector('img[src="./assets/logo1.png"]');
const logoDark = document.querySelector('img[src="./assets/logo5.png"]');

// ====== Validación ======
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ====== Helpers UI ======
function setStatus(msg, type = "info") {
  // type: info | success | error
  messageDiv.textContent = msg;
  messageDiv.style.color =
    type === "success"
      ? "var(--success)"
      : type === "error"
      ? "var(--red)"
      : "var(--muted)";
}

function sanitizeCode(v) {
  return (v || "").replace(/\D/g, "").slice(0, 6); // solo 4 dígitos
}

async function fetchPostJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },

    body: JSON.stringify(payload),
  });

  // Intentar parsear JSON de forma segura
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* respuesta no-json */
    }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ====== Lógica de validación de emails ======
function validateEmails() {
  const email = emailInput.value.trim();
  const confirm = confirmEmailInput.value.trim();

  const isValidEmail = emailRegex.test(email);
  const isValidConfirm = emailRegex.test(confirm);
  const match = email === confirm;

  deleteBtn.disabled = !(isValidEmail && isValidConfirm && match);

  emailInput.style.borderColor =
    email && !isValidEmail ? "var(--red)" : "var(--border)";
  confirmEmailInput.style.borderColor =
    confirm && !isValidConfirm ? "var(--red)" : "var(--border)";
}

emailInput.addEventListener("input", validateEmails);
confirmEmailInput.addEventListener("input", validateEmails);

// ====== Campo de código dinámico ======
let codeWrap = null;
let codeInput = null;
let confirmBtn = null;

function ensureCodeField() {
  if (codeWrap) return codeWrap;

  codeWrap = document.createElement("div");
  codeWrap.className = "code-wrap";
  codeWrap.style.display = "grid";
  codeWrap.style.gridTemplateColumns = "1fr auto";
  codeWrap.style.alignItems = "center";
  codeWrap.style.gap = "0.5rem";
  codeWrap.style.margin = "0.25rem auto 0";
  codeWrap.style.maxWidth = "96%";

  codeInput = document.createElement("input");
  codeInput.type = "text";
  codeInput.id = "codeInput";
  codeInput.placeholder = "Código de 6 dígitos";
  codeInput.inputMode = "numeric";
  codeInput.autocomplete = "one-time-code";
  codeInput.maxLength = 6;
  codeInput.style.padding = "0.6rem 0.8rem";
  codeInput.style.border = "1px solid var(--border)";
  codeInput.style.borderRadius = "10px";
  codeInput.style.fontSize = "0.95rem";
  codeInput.style.background = "var(--card-bg)";
  codeInput.style.color = "var(--text)";

  confirmBtn = document.createElement("button");
  confirmBtn.id = "confirmDeleteBtn";
  confirmBtn.textContent = "Confirmar eliminación";
  confirmBtn.style.padding = "0.62rem 0.9rem";
  confirmBtn.style.borderRadius = "10px";
  confirmBtn.style.fontSize = "0.95rem";
  confirmBtn.style.whiteSpace = "nowrap";
  confirmBtn.disabled = true; // se habilita solo con 4 dígitos

  codeInput.addEventListener("input", () => {
    codeInput.value = sanitizeCode(codeInput.value);
    confirmBtn.disabled = codeInput.value.length !== 6;
  });

  confirmBtn.addEventListener("click", onConfirmDelete);

  codeWrap.appendChild(codeInput);
  codeWrap.appendChild(confirmBtn);

  // Insertar justo después del botón principal
  deleteBtn.insertAdjacentElement("afterend", codeWrap);
  return codeWrap;
}

// ====== Paso 2: confirmar eliminación (POST /account/confirm-delete) ======
async function onConfirmDelete() {
  const email = emailInput.value.trim();
  const code = sanitizeCode(codeInput.value);

  if (!emailRegex.test(email)) {
    setStatus("Escribe un correo válido.", "error");
    return;
  }
  if (code.length !== 6) {
    setStatus("Ingresa el código de 6 dígitos.", "error");
    return;
  }

  try {
    confirmBtn.disabled = true;
    setStatus("Validando código y eliminando cuenta...", "info");

    const resp = await fetchPostJSON(CONFIRM_DELETE_URL, { email, code });

    setStatus(
      resp?.message ||
        "✅ Tu cuenta se eliminó de forma segura. Todos tus datos han sido eliminados.",
      "success"
    );

    // ✅ Ocultar todo excepto el logo y el mensaje verde
const titleEl = document.querySelector('h1');
const descEl  = document.querySelector('p');

if (titleEl) titleEl.style.display = 'none';
if (descEl)  descEl.style.display  = 'none';

emailInput.style.display = 'none';
confirmEmailInput.style.display = 'none';
deleteBtn.style.display = 'none';

if (codeWrap)   codeWrap.style.display   = 'none';
if (confirmBtn) confirmBtn.style.display = 'none';

// Asegura que el mensaje quede visible y en verde
messageDiv.style.display = 'block';
messageDiv.style.color = 'var(--success)';

// (Opcional) centra un poco el mensaje
messageDiv.style.marginTop = '0.75rem';


    // Limpieza UI
    emailInput.value = "";
    confirmEmailInput.value = "";
    if (codeInput) codeInput.value = "";
    deleteBtn.disabled = true;

    // (Opcional) Redirigir:
    // setTimeout(() => (window.location.href = "/"), 1500);
  } catch (err) {
    setStatus(err.message || "No se pudo confirmar la eliminación.", "error");
    confirmBtn.disabled = false;
  }
}

// ====== Estado del flujo ======
let step = 1; // 1 = pre-delete; 2 = código enviado (reenviar/confirmar)

// ====== Acción del botón principal ======
deleteBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const confirm = confirmEmailInput.value.trim();

  // STEP 1: enviar código (POST /account/pre-delete)
  if (step === 1) {
    if (!emailRegex.test(email) || email !== confirm) return;

    try {
      deleteBtn.disabled = true;
      setStatus("Enviando código de verificación a tu correo...", "info");

      const resp = await fetchPostJSON(PRE_DELETE_URL, { email });

      setStatus(
        resp?.message ||
          "Te enviamos un código de 4 dígitos a tu correo. Escríbelo para confirmar.",
        "success"
      );

      // Pasar a step 2: mostrar campo del código y permitir reenviar
      ensureCodeField();
      step = 2;

      emailInput.style.display = "none";
confirmEmailInput.style.display = "none";

      deleteBtn.textContent = "Reenviar código";
      deleteBtn.disabled = false; // permitir reenviar inmediatamente si lo desea
    } catch (err) {
      setStatus(
        err.message || "No se pudo enviar el código. Intenta de nuevo.",
        "error"
      );
      deleteBtn.disabled = false;
    }
    return;
  }

  // STEP 2: reenviar código (POST /account/pre-delete)
  if (step === 2) {
    if (!emailRegex.test(email)) {
      setStatus("Escribe un correo válido para reenviar el código.", "error");
      return;
    }
    try {
      deleteBtn.disabled = true;
      setStatus("Reenviando código a tu correo...", "info");

const resp = await fetchPostJSON(CONFIRM_DELETE_URL, { email, code });

      setStatus(
        resp?.message || "Código reenviado. Revisa tu correo.",
        "success"
      );
      deleteBtn.disabled = false;
    } catch (err) {
      setStatus(
        err.message || "No se pudo reenviar el código. Intenta de nuevo.",
        "error"
      );
      deleteBtn.disabled = false;
    }
  }
});

// ====== Cambio automático de logo según modo del sistema ======
function updateLogoByTheme(isDark) {
  if (isDark) {
    logoDark.style.display = "";
    logoLight.style.display = "none";
  } else {
    logoDark.style.display = "none";
    logoLight.style.display = "";
  }
}



// Detectar tema inicial
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
updateLogoByTheme(mediaQuery.matches);

// Escuchar cambios en el tema
if (typeof mediaQuery.addEventListener === "function") {
  mediaQuery.addEventListener("change", (e) => updateLogoByTheme(e.matches));
} else if (typeof mediaQuery.addListener === "function") {
  mediaQuery.addListener((e) => updateLogoByTheme(e.matches));
}

// Revalidar si cambia el tema (opcional)
try {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", validateEmails);
  }
} catch (_) {}
