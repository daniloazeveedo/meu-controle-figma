
const FRAME = { w: 390, h: 844 };

const screens = {
  splash: "assets/screens/splash.svg",
  login: "assets/screens/login.svg",
  homeEmpty: "assets/screens/homeEmpty.svg",
  home: "assets/screens/home.svg",
  newTransaction: "assets/screens/newTransaction.svg",
  budget: "assets/screens/budget.svg",
};

let currentScreen = "splash";
let hasTransactions = localStorage.getItem("mc_figma_has_transactions") === "1";

const image = document.getElementById("screenImage");
const hotspotLayer = document.getElementById("hotspots");
const stage = document.getElementById("screenStage");

function toPct(value, axis){
  return `${(value / axis) * 100}%`;
}

function makeHotspot({ x, y, w, h, label, action, debug = false }){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `hotspot ${debug ? "debug" : ""}`;
  btn.setAttribute("aria-label", label || "Ação");
  btn.style.left = toPct(x, FRAME.w);
  btn.style.top = toPct(y, FRAME.h);
  btn.style.width = toPct(w, FRAME.w);
  btn.style.height = toPct(h, FRAME.h);
  btn.addEventListener("click", action);
  hotspotLayer.appendChild(btn);
}

function clearHotspots(){
  hotspotLayer.innerHTML = "";
}

function showToast(message){
  let toast = document.querySelector(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    stage.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function openScreen(name){
  currentScreen = name;
  image.src = screens[name];
  image.alt = `Tela ${name}`;
  renderHotspots();
}

function renderHotspots(){
  clearHotspots();

  if(currentScreen === "splash"){
    makeHotspot({
      x: 0, y: 0, w: 390, h: 844,
      label: "Ir para login",
      action: () => openScreen("login")
    });
  }

  if(currentScreen === "login"){
    // Botão Entrar
    makeHotspot({
      x: 44, y: 652, w: 302, h: 47,
      label: "Entrar",
      action: () => openScreen(hasTransactions ? "home" : "homeEmpty")
    });
  }

  if(currentScreen === "homeEmpty"){
    // Logout
    makeHotspot({
      x: 338, y: 65, w: 36, h: 36,
      label: "Sair",
      action: () => openScreen("login")
    });

    // Setas mês
    makeHotspot({
      x: 20, y: 154, w: 42, h: 42,
      label: "Mês anterior",
      action: () => showToast("Mês anterior")
    });

    makeHotspot({
      x: 330, y: 154, w: 42, h: 42,
      label: "Próximo mês",
      action: () => showToast("Próximo mês")
    });

    // Configuração do orçamento
    makeHotspot({
      x: 332, y: 257, w: 38, h: 38,
      label: "Orçamento mensal",
      action: () => openScreen("budget")
    });

    // Definir orçamento
    makeHotspot({
      x: 64, y: 332, w: 260, h: 38,
      label: "Definir orçamento",
      action: () => openScreen("budget")
    });

    // Botão flutuante +
    makeHotspot({
      x: 168, y: 743, w: 56, h: 56,
      label: "Novo lançamento",
      action: () => openScreen("newTransaction")
    });
  }

  if(currentScreen === "home"){
    // Logout
    makeHotspot({
      x: 338, y: 65, w: 36, h: 36,
      label: "Sair",
      action: () => openScreen("login")
    });

    // Setas mês
    makeHotspot({
      x: 20, y: 154, w: 42, h: 42,
      label: "Mês anterior",
      action: () => showToast("Mês anterior")
    });

    makeHotspot({
      x: 330, y: 154, w: 42, h: 42,
      label: "Próximo mês",
      action: () => showToast("Próximo mês")
    });

    // Configuração do orçamento
    makeHotspot({
      x: 332, y: 257, w: 38, h: 38,
      label: "Orçamento mensal",
      action: () => openScreen("budget")
    });

    // Item de lançamento
    makeHotspot({
      x: 24, y: 407, w: 342, h: 44,
      label: "Detalhes do lançamento",
      action: () => showToast("Lançamento selecionado")
    });

    // Botão flutuante +
    makeHotspot({
      x: 168, y: 743, w: 56, h: 56,
      label: "Novo lançamento",
      action: () => openScreen("newTransaction")
    });
  }

  if(currentScreen === "newTransaction"){
    // Fechar modal
    makeHotspot({
      x: 333, y: 332, w: 36, h: 36,
      label: "Fechar",
      action: () => openScreen(hasTransactions ? "home" : "homeEmpty")
    });

    // Entrada
    makeHotspot({
      x: 56, y: 587, w: 120, h: 32,
      label: "Entrada",
      action: () => showToast("Entrada selecionada")
    });

    // Saída
    makeHotspot({
      x: 203, y: 587, w: 120, h: 32,
      label: "Saída",
      action: () => showToast("Saída selecionada")
    });

    // Salvar
    makeHotspot({
      x: 46, y: 713, w: 300, h: 47,
      label: "Salvar lançamento",
      action: () => {
        hasTransactions = true;
        localStorage.setItem("mc_figma_has_transactions", "1");
        openScreen("home");
      }
    });
  }

  if(currentScreen === "budget"){
    // Voltar
    makeHotspot({
      x: 20, y: 78, w: 42, h: 42,
      label: "Voltar",
      action: () => openScreen(hasTransactions ? "home" : "homeEmpty")
    });

    // Adicionar orçamento
    makeHotspot({
      x: 46, y: 292, w: 300, h: 47,
      label: "Adicionar orçamento",
      action: () => showToast("Orçamento adicionado")
    });

    // Remover item
    makeHotspot({
      x: 329, y: 401, w: 30, h: 30,
      label: "Remover orçamento",
      action: () => showToast("Orçamento removido")
    });
  }
}

document.addEventListener("keydown", (event) => {
  if(event.key === "Escape"){
    if(currentScreen === "login") return;
    openScreen(hasTransactions ? "home" : "homeEmpty");
  }

  if(event.key.toLowerCase() === "d"){
    document.querySelectorAll(".hotspot").forEach(el => el.classList.toggle("debug"));
  }
});

setTimeout(() => {
  if(currentScreen === "splash"){
    openScreen("login");
  }
}, 1400);

renderHotspots();
