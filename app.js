const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STORAGE_KEY = "meuControleFigmaWebV41";

const defaultState = {
  hideValues: false,
  themeMode: "system",
  user: {
    name: "Danilo",
    initials: "D"
  },
  budget: 1200,
  categories: ["Alimentação", "Transporte", "Salário", "Lazer", "Casa", "Saúde"],
  transactions: [
    { id: crypto.randomUUID(), type: "Receita", description: "Salário", amount: 2200, category: "Salário", date: "2026-04-15", status: "realizado" },
    { id: crypto.randomUUID(), type: "Receita", description: "Vale", amount: 1022, category: "Salário", date: "2026-04-10", status: "realizado" },
    { id: crypto.randomUUID(), type: "Despesa", description: "Mercado", amount: 220.5, category: "Alimentação", date: "2026-04-17", status: "realizado" },
    { id: crypto.randomUUID(), type: "Despesa", description: "Combustível", amount: 150, category: "Transporte", date: "2026-04-16", status: "realizado" },
    { id: crypto.randomUUID(), type: "Despesa", description: "Internet", amount: 99.9, category: "Casa", date: "2026-04-20", status: "previsto" }
  ]
};

let state = loadState();
let currentFilter = "Todos";
let currentMonth = getInitialMonth();
let currentType = "Despesa";
let summaryMode = "realized";
let selectedTransactionId = null;
let lockedScrollY = 0;

function cloneDefault(){
  return JSON.parse(JSON.stringify(defaultState));
}

function normalizeTransaction(transaction = {}){
  return {
    id: transaction.id || crypto.randomUUID(),
    type: transaction.type === "Receita" ? "Receita" : "Despesa",
    description: String(transaction.description || "").trim() || "Sem descrição",
    amount: Number(transaction.amount || 0),
    category: transaction.category || "Sem categoria",
    date: String(transaction.date || todayISO()),
    status: transaction.status === "previsto" ? "previsto" : "realizado"
  };
}

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved){
      const base = cloneDefault();
      return {
        ...base,
        ...saved,
        user: { ...base.user, ...(saved.user || {}) },
        categories: Array.isArray(saved.categories) && saved.categories.length ? saved.categories : base.categories,
        transactions: Array.isArray(saved.transactions) && saved.transactions.length
          ? saved.transactions.map(normalizeTransaction)
          : base.transactions.map(normalizeTransaction)
      };
    }
  }catch{}
  return { ...cloneDefault(), transactions: cloneDefault().transactions.map(normalizeTransaction) };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayISO(){
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getInitialMonth(){
  const months = (state?.transactions || []).map(t => String(t.date || "").slice(0, 7)).filter(Boolean).sort();
  return months.at(-1) || todayISO().slice(0, 7);
}

function brl(value){
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function maybe(value){
  return state.hideValues ? "R$ ••••" : brl(value);
}

function initialsFromName(name){
  return String(name || "U").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "U";
}

function greetingPeriod(){
  const hour = new Date().getHours();
  if(hour < 12) return "Bom dia,";
  if(hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

function getActiveTheme(){
  if(state.themeMode === "dark") return "dark";
  if(state.themeMode === "light") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(){
  document.documentElement.dataset.theme = getActiveTheme();
  document.documentElement.dataset.themeMode = state.themeMode || "system";
  $$('[data-theme-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.themeMode === (state.themeMode || 'system')));
}

function getMonthTransactions(month = currentMonth){
  return state.transactions.filter(t => String(t.date || '').slice(0, 7) === month);
}

function shiftMonth(month, delta){
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

function monthLabel(month){
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
}

function monthShortLabel(month){
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
}

function formatDateLabel(isoDate){
  if(!isoDate) return 'Selecionar data';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateMeta(isoDate){
  if(!isoDate) return '';
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR');
}

function setDateDisplay(value){
  const display = $('#transactionDateDisplay');
  if(display) display.textContent = formatDateLabel(value || todayISO());
}

function totalsFor(transactions){
  const income = transactions.filter(t => t.type === 'Receita').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + Number(t.amount), 0);
  return { income, expense, balance: income - expense };
}

function monthlyStats(month = currentMonth){
  const monthTransactions = getMonthTransactions(month);
  const realized = monthTransactions.filter(t => t.status !== 'previsto');
  const projected = monthTransactions;
  const pending = monthTransactions.filter(t => t.status === 'previsto');
  return {
    monthTransactions,
    realized: totalsFor(realized),
    projected: totalsFor(projected),
    pendingExpense: pending.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + Number(t.amount), 0),
    pendingIncome: pending.filter(t => t.type === 'Receita').reduce((sum, t) => sum + Number(t.amount), 0)
  };
}

function populateCategorySelect(){
  const select = $('#transactionCategory');
  if(!select) return;
  select.innerHTML = state.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderMonthStrip(){
  const track = $('#monthStripTrack');
  if(!track) return;
  const months = [-2, -1, 0, 1, 2].map(offset => shiftMonth(currentMonth, offset));
  track.innerHTML = months.map(month => `<button class="month-chip ${month === currentMonth ? 'active' : ''}" data-month="${month}">${monthShortLabel(month)}</button>`).join('');
  $$('.month-chip', track).forEach(btn => btn.addEventListener('click', () => { currentMonth = btn.dataset.month; render(); }));
}

function renderUser(){
  const user = state.user || { name: 'Danilo', initials: 'D' };
  const initials = user.initials || initialsFromName(user.name);
  $('#welcomePeriod') && ($('#welcomePeriod').textContent = greetingPeriod());
  $('#welcomeUserName') && ($('#welcomeUserName').textContent = user.name || 'Usuário');
  $('#userAvatar') && ($('#userAvatar').textContent = initials);
  $('#settingsUserAvatar') && ($('#settingsUserAvatar').textContent = initials);
  $('#settingsUserName') && ($('#settingsUserName').textContent = user.name || 'Usuário');
  $('#profileEditorAvatar') && ($('#profileEditorAvatar').textContent = initials);
}

function renderDashboard(stats){
  $('#balanceValue').textContent = maybe(stats.realized.balance);
  $('#incomeValue').textContent = maybe(stats.realized.income);
  $('#expenseValue').textContent = maybe(stats.realized.expense);
  $('#balanceSubtitle').textContent = `${stats.monthTransactions.length} lançamento${stats.monthTransactions.length === 1 ? '' : 's'} em ${monthLabel(currentMonth).toLowerCase()}`;
  $('#forecastBalanceValue') && ($('#forecastBalanceValue').textContent = maybe(stats.projected.balance));
  $('#forecastExpenseValue') && ($('#forecastExpenseValue').textContent = maybe(stats.pendingExpense));

  const budgetLimit = Number(state.budget || 0);
  const used = stats.realized.expense;
  const percent = budgetLimit ? Math.min(100, Math.round((used / budgetLimit) * 100)) : 0;
  document.documentElement.style.setProperty('--budget-angle', `${percent * 3.6}deg`);
  $('#budgetPercent').textContent = `${percent}%`;
  $('#budgetText').textContent = `${maybe(used)} usados de ${maybe(budgetLimit)}`;
  $('#budgetStatusValue').textContent = maybe(used);
  $('#budgetStatusText').textContent = `usado de ${maybe(budgetLimit)}`;
  $('#budgetProgress').style.width = `${percent}%`;
  $('#budgetInput').value = state.budget || '';
}

function iconFor(category){
  if(category === 'Alimentação') return 'basket(1).svg';
  if(category === 'Salário') return 'gift(1).svg';
  if(category === 'Transporte') return 'briefcase(1).svg';
  if(category === 'Casa') return 'home-3(1).svg';
  return 'tag(1).svg';
}

function transactionTemplate(t){
  const sign = t.type === 'Receita' ? '+' : '-';
  const valueClass = t.type === 'Receita' ? 'income' : 'expense';
  const statusText = t.status === 'previsto' ? 'Previsto' : 'Realizado';
  const statusClass = t.status === 'previsto' ? 'previsto' : 'realizado';
  return `
    <div class="transaction-item" data-transaction-id="${t.id}">
      <div class="transaction-left">
        <div class="transaction-icon"><img src="assets/icons/${iconFor(t.category)}" alt=""></div>
        <div>
          <div class="transaction-title">${t.description}</div>
          <div class="transaction-meta">${t.category} • ${formatDateMeta(t.date)} • <span class="status-pill ${statusClass}">${statusText}</span></div>
        </div>
      </div>
      <div class="transaction-value ${valueClass}">${state.hideValues ? 'R$ ••••' : `${sign} ${brl(t.amount)}`}</div>
      <button data-delete="${t.id}" class="delete-btn" title="Excluir"><img src="assets/icons/trash-2(1).svg" alt=""></button>
    </div>`;
}

function emptyTemplate(text){
  return `<div class="muted">${text}</div>`;
}

function renderTransactions(){
  const stats = monthlyStats(currentMonth);
  const monthTransactions = stats.monthTransactions;
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const monthSorted = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = currentFilter === 'Todos' ? monthSorted : monthSorted.filter(t => t.type === currentFilter);

  renderMonthStrip();

  if($('#monthSummaryLabel')) {
    $('#monthSummaryLabel').textContent = `${monthLabel(currentMonth)} • ${monthTransactions.length} lançamento${monthTransactions.length === 1 ? '' : 's'} no mês`;
  }

  const [year, monthNumber] = currentMonth.split('-').map(Number);
  const monthDate = new Date(year, monthNumber - 1, 1);
  const shortMonth = monthDate.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
  const budgetLimit = Number(state.budget || 0);
  const budgetUsed = stats.realized.expense;
  const budgetAvailable = budgetLimit - budgetUsed;
  const budgetPercent = budgetLimit ? Math.min(100, Math.round((budgetUsed / budgetLimit) * 100)) : 0;

  if($('#monthBudgetLabel')) $('#monthBudgetLabel').textContent = shortMonth;
  const budgetHeadSmall = $('.month-budget-head small');
  if(budgetHeadSmall) budgetHeadSmall.textContent = `/ ${year}`;
  if($('#monthBudgetAvailable')) $('#monthBudgetAvailable').textContent = maybe(budgetAvailable);
  if($('#monthBudgetUsed')) $('#monthBudgetUsed').textContent = maybe(budgetUsed);
  if($('#monthBudgetLimit')) $('#monthBudgetLimit').textContent = maybe(budgetLimit);
  if($('#monthBudgetProgress')) $('#monthBudgetProgress').style.width = `${budgetPercent}%`;

  const selectedStats = summaryMode === 'projected' ? stats.projected : stats.realized;
  const labelSuffix = summaryMode === 'projected' ? ' previstas' : '';

  if($('#monthIncomeLabel')) $('#monthIncomeLabel').textContent = `Entradas${labelSuffix}`;
  if($('#monthExpenseLabel')) $('#monthExpenseLabel').textContent = `Saídas${labelSuffix}`;
  if($('#monthBalanceLabel')) $('#monthBalanceLabel').textContent = summaryMode === 'projected' ? 'Saldo previsto' : 'Saldo';

  if($('#monthIncomeValue')) $('#monthIncomeValue').textContent = maybe(selectedStats.income);
  if($('#monthExpenseValue')) $('#monthExpenseValue').textContent = maybe(selectedStats.expense);
  if($('#monthBalanceValue')) $('#monthBalanceValue').textContent = maybe(selectedStats.balance);

  $('#detailToggleStatus')?.addEventListener('click', toggleSelectedTransactionStatus);
  $('#detailDuplicate')?.addEventListener('click', duplicateSelectedTransaction);
  $('#detailDelete')?.addEventListener('click', deleteSelectedTransaction);
  $('#detailEdit')?.addEventListener('click', () => {
    closeModal($('#transactionDetailDialog'));
    openDialog('Despesa');
  });

  $$('[data-summary-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.summaryMode === summaryMode);
  });

  $('#recentTransactions').innerHTML = recent.slice(0, 5).map(transactionTemplate).join('') || emptyTemplate('Nenhum lançamento ainda.');
  $('#allTransactions').innerHTML = filtered.map(transactionTemplate).join('') || emptyTemplate('Nenhum lançamento encontrado neste mês.');

  $$('[data-delete]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      state.transactions = state.transactions.filter(t => t.id !== btn.dataset.delete);
      saveState();
      render();
    });
  });

  $$('[data-transaction-id]').forEach(item => {
    item.addEventListener('click', () => openTransactionDetail(item.dataset.transactionId));
  });
}

function renderCategorySummary(){
  const expenses = getMonthTransactions(currentMonth).filter(t => t.type === 'Despesa');
  const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0) || 1;
  const grouped = {};
  expenses.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + Number(t.amount); });
  $('#categorySummary').innerHTML = Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([category, value]) => {
    const pct = Math.round((value / total) * 100);
    return `<div><div class="category-row"><strong>${category}</strong><span>${maybe(value)}</span></div><div class="category-bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('') || emptyTemplate('Sem despesas cadastradas.');
}

function renderCategories(){
  $('#categoryList').innerHTML = state.categories.map(cat => `
    <div class="transaction-item" data-transaction-id="${t.id}">
      <div class="transaction-left">
        <div class="transaction-icon"><img src="assets/icons/${iconFor(cat)}" alt=""></div>
        <div class="transaction-title">${cat}</div>
      </div>
      <span class="muted">${state.transactions.filter(t => t.category === cat).length} lanç.</span>
    </div>`).join('');
}

function updateHideButtons(){
  $('#settingsHideValues')?.classList.toggle('on', state.hideValues);
  const icon = state.hideValues ? 'eye-closed(1).svg' : 'eye(1).svg';
  $('#toggleValues img') && ($('#toggleValues img').src = `assets/icons/${icon}`);
  $('#toggleValuesHero img') && ($('#toggleValuesHero img').src = `assets/icons/${icon}`);
}

function openScreen(id){
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id));
  $$('[data-screen]').forEach(btn => btn.classList.toggle('active', btn.dataset.screen === id));
  const titles = { dashboard: 'Início', transactions: 'Lançamentos', budget: 'Orçamento', categories: 'Categorias', settings: 'Configurações' };
  $('#pageTitle') && ($('#pageTitle').textContent = titles[id] || 'Meu Controle');
}

function lockBodyScroll(){
  lockedScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.classList.add('modal-open');
  document.body.style.top = `-${lockedScrollY}px`;
}

function unlockBodyScroll(){
  document.body.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, lockedScrollY);
}

function openModal(dialog){
  if(!dialog) return;
  lockBodyScroll();
  dialog.showModal();
}

function closeModal(dialog){
  if(!dialog) return;
  dialog.close();
  unlockBodyScroll();
}

function openDialog(type = 'Despesa'){
  currentType = type;
  const form = $('#transactionForm');
  form.reset();
  populateCategorySelect();
  $('#transactionType').value = type;
  $('#transactionStatus') && ($('#transactionStatus').value = 'realizado');
  $('#transactionDate').value = todayISO();
  setDateDisplay($('#transactionDate').value);
  $$('[data-type]').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
  if(type === 'Receita' && state.categories.includes('Salário')) $('#transactionCategory').value = 'Salário';
  openModal($('#transactionDialog'));
}

function setupDatePicker(){
  const wrapper = $('#datePickerField');
  const input = $('#transactionDate');
  if(!wrapper || !input) return;
  const openNativePicker = () => {
    if(typeof input.showPicker === 'function') input.showPicker();
    else { input.focus(); input.click(); }
  };
  wrapper.addEventListener('click', openNativePicker);
  wrapper.addEventListener('keydown', event => {
    if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); openNativePicker(); }
  });
  input.addEventListener('input', () => setDateDisplay(input.value));
  input.addEventListener('change', () => setDateDisplay(input.value));
}


function transactionStatusText(t){
  const done = t.status !== 'previsto';
  if(t.type === 'Receita') return done ? 'Recebido' : 'Não recebido';
  return done ? 'Pago' : 'Não pago';
}

function transactionStatusButtonText(t){
  const done = t.status !== 'previsto';
  if(t.type === 'Receita') return done ? 'Marcar não recebido' : 'Marcar recebido';
  return done ? 'Marcar não pago' : 'Marcar pago';
}

function openTransactionDetail(id){
  const transaction = state.transactions.find(t => t.id === id);
  if(!transaction) return;

  selectedTransactionId = id;

  const sign = transaction.type === 'Receita' ? '+' : '-';
  const detailIconImg = $('#detailIcon img');
  if(detailIconImg) detailIconImg.src = `assets/icons/${iconFor(transaction.category)}`;

  $('#detailTitle').textContent = transaction.description || 'Lançamento';
  $('#detailValue').textContent = state.hideValues ? 'R$ ••••' : `${sign} ${brl(transaction.amount)}`;
  $('#detailValue').classList.toggle('income', transaction.type === 'Receita');
  $('#detailValue').classList.toggle('expense', transaction.type === 'Despesa');

  const statusText = transactionStatusText(transaction);
  $('#detailStatusPill').textContent = statusText;
  $('#detailStatusPill').classList.toggle('done', transaction.status !== 'previsto');
  $('#detailStatusPill').classList.toggle('pending', transaction.status === 'previsto');

  $('#detailDate').textContent = formatDateMeta(transaction.date);
  $('#detailSituation').textContent = statusText;
  $('#detailCategory').textContent = transaction.category || 'Sem categoria';
  $('#detailToggleStatusLabel').textContent = transactionStatusButtonText(transaction);

  const toggleIcon = $('#detailToggleStatus img');
  if(toggleIcon) {
    toggleIcon.src = transaction.status !== 'previsto'
      ? 'assets/icons/thumbs-down(1).svg'
      : 'assets/icons/thumbs-up(1).svg';
  }

  openModal($('#transactionDetailDialog'));
}

function toggleSelectedTransactionStatus(){
  const transaction = state.transactions.find(t => t.id === selectedTransactionId);
  if(!transaction) return;

  transaction.status = transaction.status === 'previsto' ? 'realizado' : 'previsto';
  saveState();
  render();
  openTransactionDetail(transaction.id);
}

function duplicateSelectedTransaction(){
  const transaction = state.transactions.find(t => t.id === selectedTransactionId);
  if(!transaction) return;

  const duplicate = {
    ...transaction,
    id: crypto.randomUUID(),
    description: `${transaction.description} cópia`
  };

  state.transactions.push(duplicate);
  saveState();
  closeModal($('#transactionDetailDialog'));
  render();
}

function deleteSelectedTransaction(){
  if(!selectedTransactionId) return;
  state.transactions = state.transactions.filter(t => t.id !== selectedTransactionId);
  saveState();
  selectedTransactionId = null;
  closeModal($('#transactionDetailDialog'));
  render();
}


function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meu-controle-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function bindEvents(){
  $$('[data-screen]').forEach(btn => btn.addEventListener('click', () => openScreen(btn.dataset.screen)));
  $('#openTransaction')?.addEventListener('click', () => openDialog('Despesa'));
  $('#openTransaction2')?.addEventListener('click', () => openDialog('Despesa'));
  $('#mobileAdd')?.addEventListener('click', () => openDialog('Despesa'));
  $$('[data-quick]').forEach(btn => btn.addEventListener('click', () => openDialog(btn.dataset.quick)));

  $$('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.close))));
  ['transactionDialog', 'profileDialog', 'transactionDetailDialog'].forEach(id => {
    const dialog = document.getElementById(id);
    if(!dialog) return;
    dialog.addEventListener('click', event => {
      const rect = dialog.querySelector('.dialog-card')?.getBoundingClientRect();
      if(!rect) return;
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if(!inside) closeModal(dialog);
    });
    dialog.addEventListener('close', () => { if(document.body.classList.contains('modal-open')) unlockBodyScroll(); });
  });

  $$('[data-type]').forEach(btn => btn.addEventListener('click', () => {
    currentType = btn.dataset.type;
    $('#transactionType').value = currentType;
    $$('[data-type]').forEach(item => item.classList.toggle('active', item === btn));
  }));

  $('#transactionForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const fd = new FormData(event.target);
    const payload = normalizeTransaction({
      id: crypto.randomUUID(),
      type: fd.get('type'),
      description: fd.get('description'),
      amount: fd.get('amount'),
      category: fd.get('category'),
      date: fd.get('date'),
      status: fd.get('status')
    });
    state.transactions.push(payload);
    currentMonth = String(payload.date).slice(0, 7);
    saveState();
    closeModal($('#transactionDialog'));
    openScreen('transactions');
    render();
  });

  $('#budgetForm')?.addEventListener('submit', event => {
    event.preventDefault();
    state.budget = Number($('#budgetInput').value || 0);
    saveState();
    render();
  });

  $('#addCategoryBtn')?.addEventListener('click', () => {
    const name = prompt('Nome da categoria:');
    if(!name) return;
    const normalized = name.trim();
    if(normalized && !state.categories.includes(normalized)){
      state.categories.push(normalized);
      saveState();
      render();
    }
  });

  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    $$('.filter').forEach(item => item.classList.toggle('active', item === btn));
    renderTransactions();
  }));

  ['toggleValues', 'toggleValuesHero', 'settingsHideValues'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      state.hideValues = !state.hideValues;
      saveState();
      render();
    });
  });

  $('#prevMonthBtn')?.addEventListener('click', () => { currentMonth = shiftMonth(currentMonth, -1); render(); });
  $('#nextMonthBtn')?.addEventListener('click', () => { currentMonth = shiftMonth(currentMonth, 1); render(); });
  $('#exportData')?.addEventListener('click', exportData);

  $('#openProfileDialog')?.addEventListener('click', () => {
    const user = state.user || { name: 'Danilo', initials: 'D' };
    $('#profileNameInput').value = user.name || '';
    $('#profileInitialsInput').value = user.initials || initialsFromName(user.name);
    $('#profileEditorAvatar').textContent = user.initials || initialsFromName(user.name);
    openModal($('#profileDialog'));
  });
  $('#openProfileDialog2')?.addEventListener('click', () => $('#openProfileDialog')?.click());
  $('#profileNameInput')?.addEventListener('input', event => { $('#profileEditorAvatar').textContent = initialsFromName(event.target.value); });
  $('#profileForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const fd = new FormData(event.target);
    const name = String(fd.get('userName') || '').trim() || 'Usuário';
    const initials = String(fd.get('userInitials') || '').trim().toUpperCase() || initialsFromName(name);
    state.user = { name, initials };
    saveState();
    closeModal($('#profileDialog'));
    render();
  });

  $$('[data-theme-mode]').forEach(btn => btn.addEventListener('click', () => {
    state.themeMode = btn.dataset.themeMode;
    saveState();
    applyTheme();
  }));
  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if((state.themeMode || 'system') === 'system') applyTheme();
    });
  }
  $('#detailToggleStatus')?.addEventListener('click', toggleSelectedTransactionStatus);
  $('#detailDuplicate')?.addEventListener('click', duplicateSelectedTransaction);
  $('#detailDelete')?.addEventListener('click', deleteSelectedTransaction);
  $('#detailEdit')?.addEventListener('click', () => {
    closeModal($('#transactionDetailDialog'));
    openDialog('Despesa');
  });

  $$('[data-summary-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      summaryMode = btn.dataset.summaryMode || 'realized';
      renderTransactions();
    });
  });

  setupDatePicker();
}

function render(){
  applyTheme();
  renderUser();
  const stats = monthlyStats(currentMonth);
  renderDashboard(stats);
  renderTransactions();
  renderCategories();
  renderCategorySummary();
  populateCategorySelect();
  updateHideButtons();
}

bindEvents();
setDateDisplay(todayISO());
render();
