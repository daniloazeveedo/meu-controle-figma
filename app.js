const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STORAGE_KEY = "meuControleFigmaWebV41";

const defaultState = {
  hideValues:false,
  themeMode:"system",
  user:{
    name:"Danilo",
    initials:"D"
  },
  budget:1200,
  categories:["Alimentação","Transporte","Salário","Lazer","Casa","Saúde"],
  transactions:[
    { id: crypto.randomUUID(), type:"Receita", description:"Salário", amount:2200, category:"Salário", date:"2026-04-15" },
    { id: crypto.randomUUID(), type:"Receita", description:"Vale", amount:1022, category:"Salário", date:"2026-04-10" },
    { id: crypto.randomUUID(), type:"Despesa", description:"Mercado", amount:220.5, category:"Alimentação", date:"2026-04-17" },
    { id: crypto.randomUUID(), type:"Despesa", description:"Combustível", amount:150, category:"Transporte", date:"2026-04-16" },
    { id: crypto.randomUUID(), type:"Despesa", description:"Internet", amount:99.9, category:"Casa", date:"2026-04-05" }
  ]
};

let state = loadState();
let currentFilter = "Todos";
let currentMonth = new Date().toISOString().slice(0,7);
let currentType = "Despesa";

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState, ...saved } : structuredClone(defaultState);
  }catch{
    return structuredClone(defaultState);
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function brl(value){
  return Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function maybe(value){
  return state.hideValues ? "R$ ••••" : brl(value);
}


function getActiveTheme(){
  if(state.themeMode === "dark") return "dark";
  if(state.themeMode === "light") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(){
  const active = getActiveTheme();
  document.documentElement.dataset.theme = active;
  document.documentElement.dataset.themeMode = state.themeMode || "system";
  $$("[data-theme-mode]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themeMode === (state.themeMode || "system"));
  });
}

function initialsFromName(name){
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0,2)
    .map(part => part[0] || "")
    .join("")
    .toUpperCase() || "U";
}

function greetingPeriod(){
  const hour = new Date().getHours();
  if(hour < 12) return "Bom dia,";
  if(hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

function renderUser(){
  const user = state.user || { name:"Danilo", initials:"D" };
  const initials = user.initials || initialsFromName(user.name);

  if($("#welcomePeriod")) $("#welcomePeriod").textContent = greetingPeriod();
  if($("#welcomeUserName")) $("#welcomeUserName").textContent = user.name || "Usuário";
  if($("#userAvatar")) $("#userAvatar").textContent = initials;
  if($("#settingsUserAvatar")) $("#settingsUserAvatar").textContent = initials;
  if($("#settingsUserName")) $("#settingsUserName").textContent = user.name || "Usuário";
  if($("#profileEditorAvatar")) $("#profileEditorAvatar").textContent = initials;
}

function getMonthTransactions(month = currentMonth){
  return state.transactions.filter(t => String(t.date || '').slice(0,7) === month);
}

function shiftMonth(month, delta){
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return date.toISOString().slice(0,7);
}

function monthLabel(month){
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return date.toLocaleDateString('pt-BR', { month:'long', year:'numeric' }).replace(/^./, c => c.toUpperCase());
}

function monthShortLabel(month){
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return date.toLocaleDateString('pt-BR', { month:'short' }).replace('.', '').toUpperCase();
}

function renderMonthStrip(){
  const track = $("#monthStripTrack");
  if(!track) return;

  const months = [-2, -1, 0, 1, 2].map(offset => shiftMonth(currentMonth, offset));

  track.innerHTML = months.map(month => `
    <button class="month-chip ${month === currentMonth ? 'active' : ''}" data-month="${month}">
      ${monthShortLabel(month)}
    </button>
  `).join("");

  $$(".month-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      currentMonth = btn.dataset.month;
      renderTransactions();
    });
  });
}

function totals(){
  const txs = getMonthTransactions();
  const income = txs.filter(t => t.type === "Receita").reduce((a,b) => a + Number(b.amount), 0);
  const expense = txs.filter(t => t.type === "Despesa").reduce((a,b) => a + Number(b.amount), 0);
  return { income, expense, balance: income - expense };
}

function iconFor(category){
  if(category === "Alimentação") return "basket(1).svg";
  if(category === "Salário") return "gift(1).svg";
  if(category === "Transporte") return "briefcase(1).svg";
  if(category === "Casa") return "home-3(1).svg";
  return "tag(1).svg";
}

function render(){
  applyTheme();
  renderUser();
  const t = totals();

  $("#balanceValue").textContent = maybe(t.balance);
  $("#incomeValue").textContent = maybe(t.income);
  $("#expenseValue").textContent = maybe(t.expense);
  $("#balanceSubtitle").textContent = `${state.transactions.length} lançamentos registrados`;

  const percent = state.budget ? Math.min(100, Math.round((t.expense / state.budget) * 100)) : 0;
  document.documentElement.style.setProperty("--budget-angle", `${percent * 3.6}deg`);
  $("#budgetPercent").textContent = `${percent}%`;
  $("#budgetText").textContent = `${maybe(t.expense)} usados de ${maybe(state.budget)}`;
  $("#budgetStatusValue").textContent = maybe(t.expense);
  $("#budgetStatusText").textContent = `usado de ${maybe(state.budget)}`;
  $("#budgetProgress").style.width = `${percent}%`;
  $("#budgetInput").value = state.budget || "";

  renderTransactions();
  renderCategories();
  renderCategorySummary();
  populateCategorySelect();
  updateHideButtons();
}

function renderTransactions(){
  const monthTransactions = getMonthTransactions();
  const recent = [...state.transactions].sort((a,b) => b.date.localeCompare(a.date));
  const monthSorted = [...monthTransactions].sort((a,b) => b.date.localeCompare(a.date));
  const filtered = currentFilter === "Todos" ? monthSorted : monthSorted.filter(t => t.type === currentFilter);

  const monthIncome = monthTransactions.filter(t => t.type === "Receita").reduce((a,b) => a + Number(b.amount), 0);
  const monthExpense = monthTransactions.filter(t => t.type === "Despesa").reduce((a,b) => a + Number(b.amount), 0);
  const monthBalance = monthIncome - monthExpense;

  renderMonthStrip();
  if($("#monthIncomeValue")) $("#monthIncomeValue").textContent = maybe(monthIncome);
  if($("#monthExpenseValue")) $("#monthExpenseValue").textContent = maybe(monthExpense);
  if($("#monthBalanceValue")) $("#monthBalanceValue").textContent = maybe(monthBalance);
  if($("#monthSummaryLabel")) $("#monthSummaryLabel").textContent = `${monthLabel(currentMonth)} • ${monthTransactions.length} lançamento${monthTransactions.length === 1 ? '' : 's'} no mês`;

  const [currentYear, currentMonthNumber] = currentMonth.split('-').map(Number);
  const monthDate = new Date(currentYear, currentMonthNumber - 1, 1);
  const shortMonth = monthDate.toLocaleDateString('pt-BR', { month:'long' }).toUpperCase();
  const budgetLimit = Number(state.budget || 0);
  const budgetUsed = monthExpense;
  const budgetAvailable = budgetLimit - budgetUsed;
  const budgetPercent = budgetLimit ? Math.min(100, Math.round((budgetUsed / budgetLimit) * 100)) : 0;

  if($("#monthBudgetLabel")) $("#monthBudgetLabel").textContent = shortMonth;
  if($(".month-budget-head small")) $(".month-budget-head small").textContent = `/ ${currentYear}`;
  if($("#monthBudgetAvailable")) $("#monthBudgetAvailable").textContent = maybe(budgetAvailable);
  if($("#monthBudgetUsed")) $("#monthBudgetUsed").textContent = maybe(budgetUsed);
  if($("#monthBudgetLimit")) $("#monthBudgetLimit").textContent = maybe(budgetLimit);
  if($("#monthBudgetProgress")) $("#monthBudgetProgress").style.width = `${budgetPercent}%`;

  $("#recentTransactions").innerHTML = recent.slice(0,5).map(transactionTemplate).join("") || emptyTemplate("Nenhum lançamento ainda.");
  $("#allTransactions").innerHTML = filtered.map(transactionTemplate).join("") || emptyTemplate("Nenhum lançamento encontrado neste mês.");

  $$("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.transactions = state.transactions.filter(t => t.id !== btn.dataset.delete);
      saveState();
      
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
    });
  });
}

function transactionTemplate(t){
  const sign = t.type === "Receita" ? "+" : "-";
  const valueClass = t.type === "Receita" ? "income" : "expense";

  return `
    <div class="transaction-item">
      <div class="transaction-left">
        <div class="transaction-icon"><img src="assets/icons/${iconFor(t.category)}" alt=""></div>
        <div>
          <div class="transaction-title">${t.description}</div>
          <div class="transaction-meta">${t.category} • ${new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
        </div>
      </div>
      <div class="transaction-value ${valueClass}">${state.hideValues ? "R$ ••••" : sign + " " + brl(t.amount)}</div>
      <button data-delete="${t.id}" class="delete-btn" title="Excluir"><img src="assets/icons/trash-2(1).svg" alt=""></button>
    </div>
  `;
}

function emptyTemplate(text){
  return `<div class="muted">${text}</div>`;
}

function renderCategorySummary(){
  const expenses = state.transactions.filter(t => t.type === "Despesa");
  const total = expenses.reduce((a,b) => a + Number(b.amount), 0) || 1;
  const grouped = {};

  expenses.forEach(t => grouped[t.category] = (grouped[t.category] || 0) + Number(t.amount));

  $("#categorySummary").innerHTML = Object.entries(grouped).map(([category, value]) => {
    const pct = Math.round((value / total) * 100);
    return `
      <div>
        <div class="category-row">
          <strong>${category}</strong>
          <span>${maybe(value)}</span>
        </div>
        <div class="category-bar"><i style="width:${pct}%"></i></div>
      </div>
    `;
  }).join("") || emptyTemplate("Sem despesas cadastradas.");
}

function renderCategories(){
  $("#categoryList").innerHTML = state.categories.map(cat => `
    <div class="transaction-item">
      <div class="transaction-left">
        <div class="transaction-icon"><img src="assets/icons/${iconFor(cat)}" alt=""></div>
        <div class="transaction-title">${cat}</div>
      </div>
      <span class="muted">${state.transactions.filter(t => t.category === cat).length} lanç.</span>
    </div>
  `).join("");
}

function populateCategorySelect(){
  $("#transactionCategory").innerHTML = state.categories.map(cat => `<option>${cat}</option>`).join("");
}

function openScreen(id){
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === id));
  $("[data-screen].active")?.classList.remove("active");
  $$(`[data-screen="${id}"]`).forEach(btn => btn.classList.add("active"));

  const titles = {
    dashboard:"Início",
    transactions:"Lançamentos",
    budget:"Orçamento",
    categories:"Categorias",
    settings:"Configurações"
  };
  $("#pageTitle").textContent = titles[id] || "Meu Controle";
}

function openDialog(type = "Despesa"){
  currentType = type;
  $("#transactionType").value = type;
  $$("[data-type]").forEach(btn => btn.classList.toggle("active", btn.dataset.type === type));
  const now = new Date();
const isoDate = now.toISOString().slice(0,10);

$("#transactionDate").value = isoDate;

if ($("#transactionDateDisplay")) {
  $("#transactionDateDisplay").value = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).replace(".", "");
}
  $("#transactionDialog").showModal();
}

function updateHideButtons(){
  $("#settingsHideValues").classList.toggle("on", state.hideValues);
  const icon = state.hideValues ? "eye-closed(1).svg" : "eye(1).svg";
  $("#toggleValues img").src = `assets/icons/${icon}`;
  $("#toggleValuesHero img").src = `assets/icons/${icon}`;
}

$$("[data-screen]").forEach(btn => btn.addEventListener("click", () => openScreen(btn.dataset.screen)));

$("#openTransaction").addEventListener("click", () => openDialog("Despesa"));
$("#openTransaction2").addEventListener("click", () => openDialog("Despesa"));
$("#mobileAdd").addEventListener("click", () => openDialog("Despesa"));

$$("[data-quick]").forEach(btn => btn.addEventListener("click", () => openDialog(btn.dataset.quick)));

$$("[data-close]").forEach(btn => btn.addEventListener("click", () => {
  document.getElementById(btn.dataset.close).close();
}));

$$("[data-type]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentType = btn.dataset.type;
    $("#transactionType").value = currentType;
    $$("[data-type]").forEach(b => b.classList.toggle("active", b === btn));
  });
});

$("#transactionForm").addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);

  state.transactions.push({
    id: crypto.randomUUID(),
    type: fd.get("type"),
    description: String(fd.get("description")).trim(),
    amount: Number(fd.get("amount")),
    category: fd.get("category"),
    date: fd.get("date")
  });

  saveState();
  event.target.reset();
  $("#transactionDialog").close();
  openScreen("transactions");
  
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
});

$("#budgetForm").addEventListener("submit", event => {
  event.preventDefault();
  state.budget = Number($("#budgetInput").value || 0);
  saveState();
  
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
});

$("#addCategoryBtn").addEventListener("click", () => {
  const name = prompt("Nome da categoria:");
  if(!name) return;
  if(!state.categories.includes(name)) state.categories.push(name);
  saveState();
  
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
});

$$(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    $$(".filter").forEach(f => f.classList.toggle("active", f === btn));
    renderTransactions();
  });
});

$("#toggleValues").addEventListener("click", () => {
  state.hideValues = !state.hideValues;
  saveState();
  
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
});

$("#toggleValuesHero").addEventListener("click", () => {
  state.hideValues = !state.hideValues;
  saveState();
  
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
});

$("#settingsHideValues").addEventListener("click", () => {
  state.hideValues = !state.hideValues;
  saveState();
  
$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
});

$("#prevMonthBtn")?.addEventListener("click", () => {
  currentMonth = shiftMonth(currentMonth, -1);
  renderTransactions();
});

$("#nextMonthBtn")?.addEventListener("click", () => {
  currentMonth = shiftMonth(currentMonth, 1);
  renderTransactions();
});

$("#exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meu-controle-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});


$("#openProfileDialog")?.addEventListener("click", () => {
  const user = state.user || { name:"Danilo", initials:"D" };
  $("#profileNameInput").value = user.name || "";
  $("#profileInitialsInput").value = user.initials || initialsFromName(user.name);
  $("#profileEditorAvatar").textContent = user.initials || initialsFromName(user.name);
  $("#profileDialog").showModal();
});

$("#openProfileDialog2")?.addEventListener("click", () => $("#openProfileDialog")?.click());

$("#profileForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const name = String(fd.get("userName") || "").trim() || "Usuário";
  const initials = String(fd.get("userInitials") || "").trim().toUpperCase() || initialsFromName(name);
  state.user = { name, initials };
  saveState();
  $("#profileDialog").close();
  render();
});

$$("[data-theme-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  });
});

if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if((state.themeMode || "system") === "system") applyTheme();
  });
}


render();
