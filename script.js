(() => {
  const CONFIG = {
    rounds: [30, 60, 90],
    sizes: {
      small: 44,
      medium: 58,
      large: 72,
    },
    difficulties: {
      easy: { lifespan: 1300, spawnGap: 780, scoreBase: 90, penalty: 25 },
      normal: { lifespan: 980, spawnGap: 650, scoreBase: 120, penalty: 35 },
      hard: { lifespan: 720, spawnGap: 520, scoreBase: 160, penalty: 50 },
    },
    targetTypes: [
      { type: "normal", chance: 0.78, scoreMultiplier: 1 },
      { type: "golden", chance: 0.14, scoreMultiplier: 1.6 },
      { type: "fake", chance: 0.08, scoreMultiplier: -0.8 },
    ],
    shapes: ["circle", "triangle", "square"],
    colors: ["red", "blue", "yellow"],
    comboLimit: 6,
    bonusWindow: 450,
    missTimePenalty: 2,
    highscoreLimit: 8,
  };

  const state = {
    screen: "start",
    round: 60,
    difficulty: "normal",
    size: "medium",
    targetShape: "circle",
    sound: true,
    dark: true,
    zen: false,
    debug: false,
    running: false,
    paused: false,
    score: 0,
    combo: 1,
    comboMax: 1,
    hits: 0,
    misses: 0,
    reactionTimes: [],
    bestReaction: null,
    lastReaction: null,
    timeLeft: 60,
    activeTarget: null,
    spawnTimeout: null,
    roundInterval: null,
    roundStartedAt: null,
  };

  const elements = {
    body: document.body,
    screenStart: document.getElementById("screenStart"),
    screenCountdown: document.getElementById("screenCountdown"),
    screenGame: document.getElementById("screenGame"),
    screenSettings: document.getElementById("screenSettings"),
    screenHighscores: document.getElementById("screenHighscores"),
    screenResults: document.getElementById("screenResults"),
    screenPause: document.getElementById("screenPause"),
    startButton: document.getElementById("startButton"),
    settingsButton: document.getElementById("settingsButton"),
    highscoreButton: document.getElementById("highscoreButton"),
    settingsBack: document.getElementById("settingsBack"),
    settingsSave: document.getElementById("settingsSave"),
    highscoreBack: document.getElementById("highscoreBack"),
    resultsMenu: document.getElementById("resultsMenu"),
    resultsRestart: document.getElementById("resultsRestart"),
    pauseMenu: document.getElementById("pauseMenu"),
    pauseResume: document.getElementById("pauseResume"),
    countdown: document.getElementById("countdown"),
    playArea: document.getElementById("playArea"),
    playAreaOverlay: document.getElementById("playAreaOverlay"),
    score: document.getElementById("score"),
    combo: document.getElementById("combo"),
    timeLeft: document.getElementById("timeLeft"),
    avgReaction: document.getElementById("avgReaction"),
    lastReaction: document.getElementById("lastReaction"),
    hits: document.getElementById("hits"),
    misses: document.getElementById("misses"),
    bestReaction: document.getElementById("bestReaction"),
    modeLabel: document.getElementById("modeLabel"),
    finalScore: document.getElementById("finalScore"),
    finalHits: document.getElementById("finalHits"),
    finalMisses: document.getElementById("finalMisses"),
    finalAverage: document.getElementById("finalAverage"),
    finalBest: document.getElementById("finalBest"),
    finalCombo: document.getElementById("finalCombo"),
    highscoreList: document.getElementById("highscoreList"),
    soundToggle: document.getElementById("soundToggle"),
    themeToggle: document.getElementById("themeToggle"),
    debugToggle: document.getElementById("debugToggle"),
    soundSetting: document.getElementById("soundSetting"),
    darkSetting: document.getElementById("darkSetting"),
    zenSetting: document.getElementById("zenSetting"),
    debugSetting: document.getElementById("debugSetting"),
  };

  const audio = (() => {
    let ctx;
    const ensure = () => {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return ctx;
    };
    const beep = (type, pitch, duration = 0.08, volume = 0.2) => {
      if (!state.sound) return;
      const context = ensure();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = pitch;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + duration);
    };
    return {
      hit: () => beep("triangle", 640),
      miss: () => beep("sawtooth", 200, 0.12, 0.18),
      start: () => beep("sine", 880, 0.12, 0.22),
      ready: () => beep("sine", 520, 0.1, 0.18),
    };
  })();

  const formatTime = (ms) => `${Math.round(ms)}ms`;
  const formatAverage = (times) => (times.length ? formatTime(times.reduce((a, b) => a + b, 0) / times.length) : "–");

  const updateTheme = () => {
    elements.body.classList.toggle("dark", state.dark);
    elements.themeToggle.setAttribute("aria-pressed", String(state.dark));
    elements.darkSetting.checked = state.dark;
  };

  const updateSound = () => {
    elements.soundToggle.textContent = state.sound ? "🔊" : "🔇";
    elements.soundToggle.setAttribute("aria-pressed", String(state.sound));
    elements.soundSetting.checked = state.sound;
  };

  const updateDebug = () => {
    elements.debugToggle.setAttribute("aria-pressed", String(state.debug));
    elements.debugSetting.checked = state.debug;
    elements.playArea.classList.toggle("debug", state.debug);
  };

  const updateHud = () => {
    elements.score.textContent = state.zen ? "Zen" : Math.max(0, state.score);
    elements.combo.textContent = `x${state.combo}`;
    elements.timeLeft.textContent = state.timeLeft;
    elements.avgReaction.textContent = formatAverage(state.reactionTimes);
    elements.lastReaction.textContent = state.lastReaction ? formatTime(state.lastReaction) : "–";
    elements.hits.textContent = state.hits;
    elements.misses.textContent = state.misses;
    elements.bestReaction.textContent = state.bestReaction ? formatTime(state.bestReaction) : "–";
    elements.modeLabel.textContent = getModeLabel();
  };

  const updateResults = () => {
    elements.finalScore.textContent = state.zen ? "Zen" : Math.max(0, state.score);
    elements.finalHits.textContent = state.hits;
    elements.finalMisses.textContent = state.misses;
    elements.finalAverage.textContent = formatAverage(state.reactionTimes);
    elements.finalBest.textContent = state.bestReaction ? formatTime(state.bestReaction) : "–";
    elements.finalCombo.textContent = `x${state.comboMax}`;
  };

  const switchScreen = (target) => {
    Object.values(elements)
      .filter((item) => item instanceof HTMLElement && item.classList.contains("screen"))
      .forEach((screen) => screen.classList.remove("active"));
    const screenElement = elements[`screen${capitalize(target)}`];
    if (screenElement) {
      screenElement.classList.add("active");
      state.screen = target;
    }
  };

  const clearTarget = (triggerMiss = true) => {
    if (state.activeTarget) {
      state.activeTarget.element.remove();
      if (triggerMiss && state.running && !state.paused) {
        registerMiss();
      }
      state.activeTarget = null;
    }
  };

  const registerHit = (target) => {
    const reaction = performance.now() - target.spawnedAt;
    state.lastReaction = reaction;
    state.reactionTimes.push(reaction);
    state.bestReaction = state.bestReaction ? Math.min(state.bestReaction, reaction) : reaction;
    state.hits += 1;
    state.combo = Math.min(state.combo + 1, CONFIG.comboLimit);
    state.comboMax = Math.max(state.comboMax, state.combo);

    if (!state.zen) {
      const difficultyConfig = CONFIG.difficulties[state.difficulty];
      const speedBonus = Math.max(0, (CONFIG.bonusWindow - reaction) / CONFIG.bonusWindow);
      const baseScore = difficultyConfig.scoreBase * target.scoreMultiplier;
      const comboScore = baseScore * state.combo;
      state.score += Math.round(comboScore + comboScore * speedBonus * 0.35);
    }

    audio.hit();
    spawnBurst(target.x, target.y, target.size);
    updateHud();
  };

  const registerMiss = () => {
    if (!state.running || state.paused) return;
    if (state.targetShape === "circle") {
      endGame();
      return;
    }
    state.misses += 1;
    state.combo = 1;
    if (!state.zen) {
      state.score = Math.max(0, state.score - CONFIG.difficulties[state.difficulty].penalty);
    }
    state.timeLeft = Math.max(0, state.timeLeft - CONFIG.missTimePenalty);
    elements.screenGame.classList.add("shake");
    setTimeout(() => elements.screenGame.classList.remove("shake"), 260);
    audio.miss();
    updateHud();
  };

  const spawnBurst = (x, y, size) => {
    const burst = document.createElement("div");
    burst.className = "hit-burst";
    burst.style.width = `${size}px`;
    burst.style.height = `${size}px`;
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    elements.playArea.appendChild(burst);
    setTimeout(() => burst.remove(), 420);
  };

  const pickTargetType = () => {
    const rand = Math.random();
    let threshold = 0;
    const typeData = CONFIG.targetTypes.find((entry) => {
      threshold += entry.chance;
      return rand <= threshold;
    }) || CONFIG.targetTypes[0];
    const availableShapes = getAvailableShapes();
    const shape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    return { ...typeData, shape, color };
  };

  const spawnTarget = () => {
    clearTarget(false);
    const playRect = elements.playArea.getBoundingClientRect();
    const size = CONFIG.sizes[state.size];
    const maxX = playRect.width - size;
    const maxY = playRect.height - size;
    const x = Math.random() * Math.max(0, maxX);
    const y = Math.random() * Math.max(0, maxY);
    const typeData = pickTargetType();
    const shapeLabel = getShapeLabel(typeData.shape);
    const colorLabel = getColorLabel(typeData.color);

    const target = document.createElement("button");
    target.type = "button";
    target.className = `target ${typeData.type} shape-${typeData.shape} color-${typeData.color}`;
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    target.setAttribute("aria-label", `Ziel ${shapeLabel} ${colorLabel}`);

    const spawnTime = performance.now();

    target.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!state.running || state.paused) return;
      clearTimeout(state.activeTarget?.timeoutId);
      target.remove();
      state.activeTarget = null;
      if (typeData.shape !== state.targetShape) {
        registerMiss();
      } else if (typeData.type === "fake") {
        registerMiss();
      } else {
        registerHit({
          spawnedAt: spawnTime,
          scoreMultiplier: typeData.scoreMultiplier,
          x,
          y,
          size,
        });
      }
      scheduleNextSpawn();
    });

    elements.playArea.appendChild(target);

    const difficultyConfig = CONFIG.difficulties[state.difficulty];
    const lifespan = getTargetLifespan(difficultyConfig.lifespan);
    const timeoutId = setTimeout(() => {
      if (target.isConnected) {
        target.remove();
        state.activeTarget = null;
        if (typeData.shape === state.targetShape && typeData.type !== "fake") {
          registerMiss();
        }
        scheduleNextSpawn();
      }
    }, lifespan);

    state.activeTarget = {
      element: target,
      timeoutId,
      spawnedAt: spawnTime,
      type: typeData.type,
    };
  };

  const scheduleNextSpawn = () => {
    if (!state.running || state.paused) return;
    clearTimeout(state.spawnTimeout);
    const gap = getSpawnGap(CONFIG.difficulties[state.difficulty].spawnGap);
    const jitter = Math.random() * 140;
    state.spawnTimeout = setTimeout(spawnTarget, gap + jitter);
  };

  const startRoundTimer = () => {
    clearInterval(state.roundInterval);
    state.roundInterval = setInterval(() => {
      if (!state.running || state.paused) return;
      state.timeLeft -= 1;
      updateHud();
      if (state.timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  };

  const resetRoundState = () => {
    clearTimeout(state.spawnTimeout);
    clearInterval(state.roundInterval);
    clearTarget(false);
    state.running = false;
    state.paused = false;
    state.score = 0;
    state.combo = 1;
    state.comboMax = 1;
    state.hits = 0;
    state.misses = 0;
    state.reactionTimes = [];
    state.bestReaction = null;
    state.lastReaction = null;
    state.timeLeft = state.round;
    state.roundStartedAt = null;
    updateHud();
  };

  const startGame = () => {
    resetRoundState();
    switchScreen("countdown");
    let count = 3;
    elements.countdown.textContent = count;
    audio.ready();
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        elements.countdown.textContent = count;
        audio.ready();
      } else {
        clearInterval(interval);
        elements.countdown.textContent = "GO";
        audio.start();
        setTimeout(() => {
          switchScreen("game");
          state.running = true;
          state.paused = false;
          state.roundStartedAt = performance.now();
          updateHud();
          startRoundTimer();
          spawnTarget();
        }, 400);
      }
    }, 800);
  };

  const pauseGame = () => {
    if (!state.running) return;
    state.paused = true;
    elements.playAreaOverlay.classList.add("active");
    switchScreen("pause");
  };

  const resumeGame = () => {
    if (!state.running) return;
    state.paused = false;
    elements.playAreaOverlay.classList.remove("active");
    switchScreen("game");
    scheduleNextSpawn();
  };

  const endGame = () => {
    state.running = false;
    state.paused = false;
    clearTimeout(state.spawnTimeout);
    clearInterval(state.roundInterval);
    clearTarget(false);
    saveHighscore();
    updateResults();
    switchScreen("results");
  };

  const saveHighscore = () => {
    const list = loadHighscores();
    const entry = {
      score: state.zen ? 0 : state.score,
      hits: state.hits,
      misses: state.misses,
      avgReaction: formatAverage(state.reactionTimes),
      bestReaction: state.bestReaction ? formatTime(state.bestReaction) : "–",
      mode: getModeLabel(),
      date: new Date().toLocaleDateString("de-DE"),
    };
    list.unshift(entry);
    const sorted = list.sort((a, b) => b.score - a.score).slice(0, CONFIG.highscoreLimit);
    localStorage.setItem("reaktion.highscores", JSON.stringify(sorted));
  };

  const loadHighscores = () => {
    const raw = localStorage.getItem("reaktion.highscores");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const renderHighscores = () => {
    const list = loadHighscores();
    elements.highscoreList.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("p");
      empty.textContent = "Noch keine Einträge. Spiele eine Runde!";
      elements.highscoreList.appendChild(empty);
      return;
    }
    list.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "highscore-item";
      row.innerHTML = `
        <span>#${index + 1} · ${entry.mode}</span>
        <span>${entry.score} pts · ${entry.date}</span>
      `;
      elements.highscoreList.appendChild(row);
    });
  };

  const applySettings = () => {
    updateTheme();
    updateSound();
    updateDebug();
  };

  const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

  const getShapeLabel = (shape) => {
    const labels = {
      circle: "Kreis",
      triangle: "Dreieck",
      square: "Quadrat",
    };
    return labels[shape] || capitalize(shape);
  };

  const getColorLabel = (color) => {
    const labels = {
      red: "Rot",
      blue: "Blau",
      yellow: "Gelb",
    };
    return labels[color] || capitalize(color);
  };

  const getModeLabel = () => {
    const shapeLabel = getShapeLabel(state.targetShape);
    return `${capitalize(state.difficulty)} · ${state.round}s · Ziel: ${shapeLabel}${state.zen ? " · Zen" : ""}`;
  };

  const getProgress = () => {
    if (!state.roundStartedAt) return 0;
    const elapsed = performance.now() - state.roundStartedAt;
    const total = state.round * 1000;
    return Math.min(1, Math.max(0, elapsed / total));
  };

  const getAvailableShapes = () => {
    const progress = getProgress();
    let shapes = CONFIG.shapes;
    if (progress < 0.35) {
      shapes = ["circle"];
    } else if (progress < 0.7) {
      shapes = ["circle", "square"];
    }
    return Array.from(new Set([...shapes, state.targetShape]));
  };

  const getSpawnGap = (baseGap) => {
    const progress = getProgress();
    const minGap = Math.max(260, baseGap * 0.55);
    return baseGap - (baseGap - minGap) * progress;
  };

  const getTargetLifespan = (baseLifespan) => {
    const progress = getProgress();
    const minLifespan = Math.max(360, baseLifespan * 0.65);
    return baseLifespan - (baseLifespan - minLifespan) * progress;
  };

  const bindSettingsControls = () => {
    document.querySelectorAll("[data-round]").forEach((button) => {
      button.addEventListener("click", () => {
        state.round = Number(button.dataset.round);
        document.querySelectorAll("[data-round]").forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });

    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => {
        state.difficulty = button.dataset.difficulty;
        document.querySelectorAll("[data-difficulty]").forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });

    document.querySelectorAll("[data-size]").forEach((button) => {
      button.addEventListener("click", () => {
        state.size = button.dataset.size;
        document.querySelectorAll("[data-size]").forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });

    document.querySelectorAll("[data-shape]").forEach((button) => {
      button.addEventListener("click", () => {
        state.targetShape = button.dataset.shape;
        document.querySelectorAll("[data-shape]").forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });

    elements.soundSetting.addEventListener("change", (event) => {
      state.sound = event.target.checked;
      updateSound();
    });

    elements.darkSetting.addEventListener("change", (event) => {
      state.dark = event.target.checked;
      updateTheme();
    });

    elements.zenSetting.addEventListener("change", (event) => {
      state.zen = event.target.checked;
      updateHud();
    });

    elements.debugSetting.addEventListener("change", (event) => {
      state.debug = event.target.checked;
      updateDebug();
    });
  };

  const bindEvents = () => {
    elements.startButton.addEventListener("click", startGame);
    elements.settingsButton.addEventListener("click", () => switchScreen("settings"));
    elements.highscoreButton.addEventListener("click", () => {
      renderHighscores();
      switchScreen("highscores");
    });
    elements.settingsBack.addEventListener("click", () => switchScreen("start"));
    elements.settingsSave.addEventListener("click", () => {
      applySettings();
      updateHud();
      switchScreen("start");
    });
    elements.highscoreBack.addEventListener("click", () => switchScreen("start"));
    elements.resultsMenu.addEventListener("click", () => switchScreen("start"));
    elements.resultsRestart.addEventListener("click", startGame);
    elements.pauseMenu.addEventListener("click", () => {
      resetRoundState();
      switchScreen("start");
    });
    elements.pauseResume.addEventListener("click", resumeGame);

    elements.soundToggle.addEventListener("click", () => {
      state.sound = !state.sound;
      updateSound();
    });
    elements.themeToggle.addEventListener("click", () => {
      state.dark = !state.dark;
      updateTheme();
    });
    elements.debugToggle.addEventListener("click", () => {
      state.debug = !state.debug;
      updateDebug();
    });

    elements.playArea.addEventListener("click", () => {
      if (!state.running || state.paused) return;
      registerMiss();
    });

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        if (state.screen === "start") {
          startGame();
          return;
        }
        if (!state.running) return;
        if (state.paused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
      if (event.key.toLowerCase() === "r") {
        if (state.screen === "game" || state.screen === "pause" || state.screen === "results") {
          startGame();
        }
      }
      if (event.key === "Escape") {
        if (state.screen === "game") {
          pauseGame();
        }
      }
    });
  };

  bindSettingsControls();
  bindEvents();
  applySettings();
  updateHud();
})();
