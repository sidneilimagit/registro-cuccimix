// Registro Cuccimix — app estático com Supabase (auth + banco).
(function () {
  const cfg = window.CUCCIMIX_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const views = ["configView", "loginView", "passwordView", "appView"];
  const FIELDS = ["data", "cliente", "modelo", "chef", "receita_evento", "metodo_coccao", "tempo"];
  const LABELS = ["Data", "Cliente", "Modelo", "Chef", "Receita/Evento", "Método de Cocção", "Tempo", "Registrado por"];

  function show(view) {
    views.forEach((v) => ($(v).hidden = v !== view));
  }

  function toast(msg, isError) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (isError ? " error" : "");
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 3500);
  }

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    show("configView");
    return;
  }

  // Links de convite/recuperação chegam com #type=invite|recovery; lemos antes do supabase-js limpar a URL.
  const hashType = new URLSearchParams(location.hash.slice(1)).get("type");
  let mustSetPassword = hashType === "invite" || hashType === "recovery";

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let user = null;
  let records = [];
  let editingId = null;

  // ---------- Auth ----------
  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") mustSetPassword = true;
    user = session ? session.user : null;
    // Evita chamar o Supabase de dentro do callback (recomendação da lib).
    setTimeout(route, 0);
  });

  function route() {
    $("userBox").hidden = !user;
    if (!user) return show("loginView");
    $("userEmail").textContent = user.email;
    if (mustSetPassword) return show("passwordView");
    show("appView");
    loadRecords();
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button");
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(),
      password: f.password.value,
    });
    btn.disabled = false;
    if (error) toast("E-mail ou senha inválidos.", true);
    else f.reset();
  });

  $("forgotBtn").addEventListener("click", async () => {
    const email = $("loginForm").email.value.trim();
    if (!email) return toast("Digite seu e-mail no campo acima.", true);
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname,
    });
    if (error) toast("Não foi possível enviar: " + error.message, true);
    else toast("Se o e-mail existir, você receberá um link para redefinir a senha.");
  });

  $("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.password.value !== f.confirm.value) return toast("As senhas não coincidem.", true);
    const { error } = await sb.auth.updateUser({ password: f.password.value });
    if (error) return toast(error.message, true);
    f.reset();
    mustSetPassword = false;
    toast("Senha salva.");
    route();
  });

  $("logoutBtn").addEventListener("click", () => sb.auth.signOut());

  // ---------- Registros ----------
  async function loadRecords() {
    const { data, error } = await sb
      .from("registros")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return toast("Erro ao carregar: " + error.message, true);
    records = data;
    fillSuggestions();
    render();
  }

  function filtered() {
    const q = $("search").value.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      FIELDS.concat("created_by_email").some((k) => String(r[k] || "").toLowerCase().includes(q))
    );
  }

  function fmtDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function td(text, cls) {
    const el = document.createElement("td");
    el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }

  function render() {
    const list = filtered();
    const tbody = $("rows");
    tbody.replaceChildren();
    list.forEach((r) => {
      const tr = document.createElement("tr");
      tr.append(
        td(fmtDate(r.data)), td(r.cliente), td(r.modelo), td(r.chef),
        td(r.receita_evento), td(r.metodo_coccao), td(r.tempo), td(r.created_by_email || "", "by")
      );
      const act = td("", "act");
      if (r.created_by === user.id) {
        const edit = document.createElement("button");
        edit.textContent = "Editar";
        edit.onclick = () => openDialog(r);
        const del = document.createElement("button");
        del.textContent = "Excluir";
        del.onclick = () => removeRecord(r);
        act.append(edit, del);
      }
      tr.append(act);
      tbody.append(tr);
    });
    $("empty").hidden = list.length > 0;
    $("count").textContent = `${list.length} de ${records.length} registro(s)`;
  }

  function fillSuggestions() {
    ["cliente", "modelo", "chef", "metodo_coccao"].forEach((k) => {
      const values = [...new Set(records.map((r) => r[k]).filter(Boolean))].sort();
      $("dl-" + k).replaceChildren(...values.map((v) => Object.assign(document.createElement("option"), { value: v })));
    });
  }

  function openDialog(rec) {
    const f = $("recordForm");
    f.reset();
    editingId = rec ? rec.id : null;
    $("dialogTitle").textContent = rec ? "Editar registro" : "Novo registro";
    if (rec) FIELDS.forEach((k) => (f[k].value = rec[k]));
    else f.data.value = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD local
    $("recordDialog").showModal();
  }

  $("newBtn").addEventListener("click", () => openDialog(null));
  $("cancelBtn").addEventListener("click", () => $("recordDialog").close());
  $("search").addEventListener("input", render);

  $("recordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const payload = {};
    FIELDS.forEach((k) => (payload[k] = f[k].value.trim()));
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    const q = editingId
      ? sb.from("registros").update(payload).eq("id", editingId)
      : sb.from("registros").insert(payload);
    const { error } = await q;
    btn.disabled = false;
    if (error) return toast("Erro ao salvar: " + error.message, true);
    $("recordDialog").close();
    toast(editingId ? "Registro atualizado." : "Registro salvo.");
    loadRecords();
  });

  async function removeRecord(r) {
    if (!confirm(`Excluir o registro de ${r.cliente} (${fmtDate(r.data)})?`)) return;
    const { error } = await sb.from("registros").delete().eq("id", r.id);
    if (error) return toast("Erro ao excluir: " + error.message, true);
    toast("Registro excluído.");
    loadRecords();
  }

  $("exportBtn").addEventListener("click", () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [LABELS.map(esc).join(";")].concat(
      filtered().map((r) => FIELDS.concat("created_by_email").map((k) => esc(k === "data" ? fmtDate(r[k]) : r[k])).join(";"))
    );
    // BOM para o Excel abrir acentos corretamente.
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registro-cuccimix-${new Date().toLocaleDateString("sv-SE")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
})();
