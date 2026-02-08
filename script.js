const state = {
  year: 1,
  money: 120,
  population: 50,
  happiness: 60,
  economy: 55,
  environment: 70,
  security: 65,
  education: 50,
  unemployment: 12,
  history: [],
  pending: [],
};

const statsConfig = [
  { key: "money", label: "財政 (億)", max: 200 },
  { key: "population", label: "人口 (万人)", max: 200 },
  { key: "happiness", label: "満足度", max: 100 },
  { key: "economy", label: "経済力", max: 100 },
  { key: "environment", label: "環境", max: 100 },
  { key: "security", label: "治安", max: 100 },
  { key: "education", label: "教育", max: 100 },
  { key: "unemployment", label: "失業率", max: 30, invert: true },
];

const policies = [
  {
    id: "industrial",
    title: "工業優先政策",
    desc: "製造業を誘致して雇用と税収を確保する。",
    effect: { economy: +8, unemployment: -2, money: +12, environment: -6 },
    delayed: { after: 3, effect: { environment: -8, happiness: -4 }, note: "公害が表面化" },
  },
  {
    id: "green",
    title: "環境投資政策",
    desc: "再生可能エネルギーと公園を増やす。",
    effect: { environment: +10, happiness: +4, money: -10 },
    delayed: { after: 2, effect: { economy: +3, unemployment: -1 }, note: "グリーン雇用が増加" },
  },
  {
    id: "education",
    title: "教育重点政策",
    desc: "学校と研究拠点に予算投入。",
    effect: { education: +8, money: -8, happiness: +2 },
    delayed: { after: 4, effect: { economy: +6, unemployment: -2 }, note: "高付加価値産業が成長" },
  },
  {
    id: "tax",
    title: "増税",
    desc: "短期の財政を改善するが反発が起きる。",
    effect: { money: +18, happiness: -6, economy: -3 },
    delayed: { after: 2, effect: { happiness: -3 }, note: "反発が継続" },
  },
  {
    id: "safety",
    title: "治安強化",
    desc: "警備を強めて犯罪を抑える。",
    effect: { security: +8, money: -6, happiness: -2 },
    delayed: { after: 3, effect: { happiness: -2 }, note: "監視への不満" },
  },
];

const events = [
  {
    id: "pollution",
    title: "公害デモ",
    desc: "環境悪化に住民が抗議。",
    condition: (s) => s.environment < 45,
    options: [
      {
        label: "環境規制を導入",
        effect: { environment: +8, economy: -4, money: -6 },
        log: "規制で環境が改善したが経済にブレーキ。",
      },
      {
        label: "補助金で沈静化",
        effect: { money: -8, happiness: +3 },
        log: "補助金で不満は収まった。",
      },
      {
        label: "強硬対応",
        effect: { security: +4, happiness: -6 },
        log: "強硬姿勢で治安は維持したが支持が低下。",
      },
    ],
  },
  {
    id: "crime",
    title: "犯罪増加",
    desc: "失業者が増え治安が悪化している。",
    condition: (s) => s.security < 45 || s.unemployment > 18,
    options: [
      {
        label: "職業訓練を実施",
        effect: { unemployment: -3, money: -6, education: +2 },
        log: "訓練で雇用が改善。",
      },
      {
        label: "警察予算を増やす",
        effect: { security: +6, money: -5 },
        log: "警察力の増強で治安が向上。",
      },
    ],
  },
  {
    id: "boom",
    title: "投資ブーム",
    desc: "外資が流入し都市が注目されている。",
    condition: (s) => s.economy > 70 && s.happiness > 55,
    options: [
      {
        label: "優遇策を出す",
        effect: { economy: +6, money: +10, environment: -4 },
        log: "投資が加速し税収も増えた。",
      },
      {
        label: "規制で抑制",
        effect: { economy: -4, environment: +3 },
        log: "環境を守ったが成長は鈍化。",
      },
    ],
  },
  {
    id: "festival",
    title: "都市祭り",
    desc: "市民が文化イベントを求めている。",
    condition: (s) => s.happiness < 55 && s.money > 60,
    options: [
      {
        label: "大型イベント開催",
        effect: { happiness: +6, money: -6, economy: +2 },
        log: "祭りで満足度が上昇。",
      },
      {
        label: "小規模イベント",
        effect: { happiness: +3, money: -3 },
        log: "小さな祭りで少し回復。",
      },
    ],
  },
];

const statsEl = document.getElementById("stats");
const turnEl = document.getElementById("turn");
const trendEl = document.getElementById("trend");
const logEl = document.getElementById("log");
const policiesEl = document.getElementById("policies");
const advanceBtn = document.getElementById("advance");
const eventBoxEl = document.getElementById("event-box");

const statTemplate = document.getElementById("stat-template");
const policyTemplate = document.getElementById("policy-template");
const eventTemplate = document.getElementById("event-template");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatStat(key, value) {
  if (key === "unemployment") {
    return `${value}%`;
  }
  if (key === "money") {
    return `${value.toFixed(0)}`;
  }
  return `${value}`;
}

function applyEffect(effect) {
  Object.entries(effect).forEach(([key, delta]) => {
    if (!(key in state)) return;
    state[key] += delta;
  });
}

function scheduleDelayed(policy) {
  if (!policy.delayed) return;
  state.pending.push({
    year: state.year + policy.delayed.after,
    effect: policy.delayed.effect,
    note: policy.delayed.note,
  });
}

function logMessage(message) {
  state.history.unshift(message);
  state.history = state.history.slice(0, 8);
  logEl.textContent = state.history.join("\n");
}

function updateStats() {
  statsEl.innerHTML = "";
  statsConfig.forEach((stat) => {
    const node = statTemplate.content.cloneNode(true);
    const value = Math.round(state[stat.key]);
    const labelEl = node.querySelector(".stat-label");
    const valueEl = node.querySelector(".stat-value");
    const fillEl = node.querySelector(".stat-fill");
    labelEl.textContent = stat.label;
    valueEl.textContent = formatStat(stat.key, value);
    const ratio = clamp(value / stat.max, 0, 1);
    const width = stat.invert ? 1 - ratio : ratio;
    fillEl.style.width = `${width * 100}%`;
    if (!stat.invert) {
      fillEl.style.background = ratio < 0.35 ? "var(--danger)" : ratio < 0.6 ? "var(--warning)" : "var(--success)";
    } else {
      fillEl.style.background = ratio > 0.55 ? "var(--danger)" : ratio > 0.35 ? "var(--warning)" : "var(--success)";
    }
    statsEl.appendChild(node);
  });

  trendEl.textContent = `前年のまとめ: 人口 ${state.population} 万人、財政 ${state.money.toFixed(0)} 億。`;
}

function renderPolicies() {
  policiesEl.innerHTML = "";
  policies.forEach((policy) => {
    const node = policyTemplate.content.cloneNode(true);
    const button = node.querySelector("button");
    button.querySelector(".policy-title").textContent = policy.title;
    button.querySelector(".policy-desc").textContent = policy.desc;
    const effectText = Object.entries(policy.effect)
      .map(([key, delta]) => `${labelFor(key)} ${delta > 0 ? "+" : ""}${delta}`)
      .join(" / ");
    button.querySelector(".policy-effect").textContent = effectText;
    button.addEventListener("click", () => {
      applyEffect(policy.effect);
      scheduleDelayed(policy);
      logMessage(`${policy.title}を実施。`);
      normalize();
      updateStats();
    });
    policiesEl.appendChild(node);
  });
}

function labelFor(key) {
  const config = statsConfig.find((stat) => stat.key === key);
  return config ? config.label.replace(/\s.*/, "") : key;
}

function resolvePending() {
  const due = state.pending.filter((item) => item.year === state.year);
  if (due.length === 0) return;
  due.forEach((item) => {
    applyEffect(item.effect);
    logMessage(`遅延効果: ${item.note}`);
  });
  state.pending = state.pending.filter((item) => item.year !== state.year);
}

function randomEvent() {
  const candidates = events.filter((event) => event.condition(state));
  if (candidates.length === 0) {
    eventBoxEl.classList.add("empty");
    eventBoxEl.innerHTML = "<p>いまは静かな一年です。</p>";
    return;
  }
  const event = candidates[Math.floor(Math.random() * candidates.length)];
  const node = eventTemplate.content.cloneNode(true);
  node.querySelector(".event-title").textContent = event.title;
  node.querySelector(".event-desc").textContent = event.desc;
  const optionsEl = node.querySelector(".event-options");
  event.options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option.label;
    button.addEventListener("click", () => {
      applyEffect(option.effect);
      logMessage(option.log);
      normalize();
      updateStats();
      randomEvent();
    });
    optionsEl.appendChild(button);
  });
  eventBoxEl.classList.remove("empty");
  eventBoxEl.innerHTML = "";
  eventBoxEl.appendChild(node);
}

function normalize() {
  state.money = clamp(state.money, 0, 240);
  state.population = clamp(state.population, 10, 200);
  state.happiness = clamp(state.happiness, 10, 100);
  state.economy = clamp(state.economy, 10, 100);
  state.environment = clamp(state.environment, 10, 100);
  state.security = clamp(state.security, 10, 100);
  state.education = clamp(state.education, 10, 100);
  state.unemployment = clamp(state.unemployment, 2, 30);
}

function yearTick() {
  state.year += 1;
  turnEl.textContent = `${state.year}年目`;

  const growth = (state.economy - state.unemployment + state.happiness) / 40;
  state.population = clamp(state.population + growth, 10, 200);
  state.money = clamp(state.money + (state.population * 0.4 + state.economy * 0.2 - 15), 0, 240);
  state.happiness = clamp(state.happiness + (state.environment - 60) / 20 - (state.unemployment - 10) / 10, 10, 100);
  state.security = clamp(state.security + (state.unemployment < 12 ? 2 : -2), 10, 100);

  resolvePending();
  logMessage(`${state.year - 1}年が経過。人口成長率は${growth.toFixed(1)}。`);
  normalize();
  updateStats();
  randomEvent();
}

advanceBtn.addEventListener("click", yearTick);

renderPolicies();
updateStats();
randomEvent();
logMessage("都市運営を開始しました。");
