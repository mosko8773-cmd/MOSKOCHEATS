/* MOSKO — نسخة HTML/CSS/JS
 * الصفحة تتحقق من المفتاح عبر موقع MOSKO المنشور، وهو الذي يقدّم ملف config.json لتطبيق Happ
 * ويحوّل الإعداد تلقائياً إلى "Key expired" عند انتهاء المفتاح.
 */
const SITE = "https://moskowirez.lovable.app"; // عنوان موقع MOSKO المنشور
const STORAGE_KEY = "mosko_key";

const $ = (id) => document.getElementById(id);
const els = {
  subtitle: $("subtitle"), login: $("login"), key: $("key"), error: $("error"), submit: $("submit"),
  dashboard: $("dashboard"), dashKey: $("dash-key"), plan: $("plan"), remaining: $("remaining"),
  add: $("add"), refresh: $("refresh"), logout: $("logout"), toast: $("toast"),
};

let session = null; // { key, plan, expiresAt, link }
let timer = null;
let loading = false;

function normalizeKey(raw) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
function isValidKeyFormat(key) {
  return key.length >= 8 && key.length <= 64 && /^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(key);
}
function parseTimestamp(value) {
  if (!value) return null;
  const ms = Date.parse(String(value).replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(ms) ? null : ms;
}
function formatDate(iso) {
  const ms = parseTimestamp(iso);
  return ms === null ? iso : new Date(ms).toLocaleString("ar");
}
const pad = (n) => String(n).padStart(2, "0");

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (els.toast.hidden = true), 3000);
}

function showError(msg) {
  els.error.textContent = msg || "";
  els.error.hidden = !msg;
}

function setLoading(on) {
  loading = on;
  els.submit.disabled = on;
  els.refresh.disabled = on;
  els.submit.querySelector(".spinner").hidden = !on;
  els.submit.querySelector(".btn-text").textContent = on ? "جارٍ التحقق..." : "دخول";
}

async function activate(rawKey, silent) {
  const key = normalizeKey(rawKey);
  if (!isValidKeyFormat(key)) {
    logout();
    return showError("المفتاح غير صحيح. تأكد منه وحاول مرة أخرى.");
  }
  setLoading(true);
  showError("");
  try {
    const res = await fetch(`${SITE}/api/public/activate?key=${encodeURIComponent(key)}`, { cache: "no-store" });
    const data = await res.json();
    if (data.status === "active") {
      session = { key: data.key, plan: data.plan, expiresAt: data.expiresAt, link: data.happLink || data.configUrl };
      localStorage.setItem(STORAGE_KEY, data.key);
      showDashboard();
      if (!silent) toast("تم تفعيل المفتاح بنجاح");
    } else if (data.status === "expired") {
      logout();
      showError(`انتهت صلاحية هذا المفتاح${data.expiresAt ? ` في ${formatDate(data.expiresAt)}` : ""}. اشترِ مفتاحاً جديداً.`);
    } else if (data.status === "invalid") {
      logout();
      showError("المفتاح غير صحيح. تأكد منه وحاول مرة أخرى.");
    } else {
      throw new Error("bad response");
    }
  } catch (err) {
    console.error(err);
    showError("تعذّر الاتصال بالخادم، حاول بعد قليل.");
  } finally {
    setLoading(false);
  }
}

function showDashboard() {
  els.login.hidden = true;
  els.dashboard.hidden = false;
  els.subtitle.textContent = "اشتراكك جاهز — أضفه إلى تطبيق Happ";
  els.dashKey.textContent = session.key;
  els.plan.textContent = session.plan || "—";
  startCountdown(session.expiresAt);
}

function startCountdown(expiresAt) {
  clearInterval(timer);
  const exp = parseTimestamp(expiresAt);
  if (exp === null) return (els.remaining.textContent = "غير محدود");
  const tick = () => {
    const diff = exp - Date.now();
    if (diff <= 0) {
      els.remaining.textContent = "منتهي";
      return clearInterval(timer);
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const d = Math.floor(h / 24);
    els.remaining.textContent = d > 0 ? `${d}ي ${h % 24}س` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  tick();
  timer = setInterval(tick, 1000);
}

function logout() {
  clearInterval(timer);
  session = null;
  localStorage.removeItem(STORAGE_KEY);
  els.dashboard.hidden = true;
  els.login.hidden = false;
  els.subtitle.textContent = "سجّل دخولك بمفتاحك لتفعيل الاشتراك";
}

els.key.addEventListener("input", () => {
  els.key.value = els.key.value.toUpperCase();
});

els.login.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!els.key.value.trim()) return showError("أدخل مفتاحك أولاً.");
  activate(els.key.value, false);
});

// يُفتح الرابط من الكود فقط (بدون href) حتى لا يمكن نسخه بالضغط المطوّل.
els.add.addEventListener("click", () => {
  if (session && session.link) window.location.href = session.link;
});
els.add.addEventListener("contextmenu", (e) => e.preventDefault());

els.refresh.addEventListener("click", () => {
  if (session && !loading) activate(session.key, false);
});
els.logout.addEventListener("click", () => {
  logout();
  els.key.value = "";
  showError("");
});

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  els.key.value = saved;
  activate(saved, true);
}
