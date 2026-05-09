const missions = [
  {
    title: "Trink Wasser",
    text: "Hol dir ein Glas Wasser. Deine Zukunftsversion wird kurz dankbar nicken.",
  },
  {
    title: "20 Sekunden aufräumen",
    text: "Stell einen Timer im Kopf und räum nur eine Sache weg. Wirklich nur eine reicht.",
  },
  {
    title: "Fenster auf",
    text: "Lass kurz frische Luft rein. Bonuspunkte, wenn du dramatisch in die Ferne schaust.",
  },
  {
    title: "Mini-Stretch",
    text: "Schultern kreisen, Hände ausschütteln, Nacken entspannen. Fertig ist die Wartung.",
  },
  {
    title: "Random Kompliment",
    text: "Schreib jemandem eine nette Nachricht oder sag dir selbst: Läuft eigentlich ganz stabil.",
  },
  {
    title: "Tab-Detox",
    text: "Schließ einen Browser-Tab, den du seit Ewigkeiten ignorierst. Befreiend, oder?",
  },
];

const decisions = ["Ja.", "Nein.", "Später.", "Nur mit Snack.", "Frag nochmal nach Kaffee.", "Absolut."];
const palettes = [
  ["#111827", "#1f2937", "#8b5cf6", "#06b6d4"],
  ["#2f1b45", "#172554", "#f97316", "#ec4899"],
  ["#052e16", "#064e3b", "#22c55e", "#84cc16"],
  ["#0f172a", "#312e81", "#38bdf8", "#a78bfa"],
  ["#3b0764", "#701a75", "#f0abfc", "#fb7185"],
];

const storageKey = "irgendwas-o-mat";
const savedState = JSON.parse(localStorage.getItem(storageKey) || "{}");

let done = Number(savedState.done || 0);
let streak = Number(savedState.streak || 0);

const elements = {
  ideaButton: document.querySelector("#ideaButton"),
  colorButton: document.querySelector("#colorButton"),
  doneButton: document.querySelector("#doneButton"),
  decisionButton: document.querySelector("#decisionButton"),
  missionTitle: document.querySelector("#missionTitle"),
  missionText: document.querySelector("#missionText"),
  doneCount: document.querySelector("#doneCount"),
  streakCount: document.querySelector("#streakCount"),
  statusText: document.querySelector("#statusText"),
  noteInput: document.querySelector("#noteInput"),
  decisionText: document.querySelector("#decisionText"),
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const save = () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      done,
      streak,
      note: elements.noteInput.value,
    }),
  );
};

const renderStats = () => {
  elements.doneCount.textContent = done;
  elements.streakCount.textContent = streak;
  elements.statusText.textContent = done
    ? `Stark. Du hast schon ${done} Mini-Mission${done === 1 ? "" : "en"} erledigt.`
    : "Heute noch nichts erledigt. Das kann sich ändern.";
};

const setMission = () => {
  const mission = randomItem(missions);
  elements.missionTitle.textContent = mission.title;
  elements.missionText.textContent = mission.text;
};

const changePalette = () => {
  const [bg, bgSoft, accent, accentTwo] = randomItem(palettes);
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--bg-soft", bgSoft);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-2", accentTwo);
};

const markDone = () => {
  done += 1;
  streak += 1;
  renderStats();
  save();
};

const decide = () => {
  elements.decisionText.textContent = randomItem(decisions);
};

elements.noteInput.value = savedState.note || "";
renderStats();

elements.ideaButton.addEventListener("click", setMission);
elements.colorButton.addEventListener("click", changePalette);
elements.doneButton.addEventListener("click", markDone);
elements.decisionButton.addEventListener("click", decide);
elements.noteInput.addEventListener("input", save);
