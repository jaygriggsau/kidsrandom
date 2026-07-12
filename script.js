// ============================================================
//  Spin the Wheel!  — a kid-friendly name & reward picker
//  Everything is self-contained: no external files or network.
//  Sound effects are synthesized with the Web Audio API.
// ============================================================

(() => {
  "use strict";

  // ---------- Two wheels: names and rewards ----------
  const WHEELS = {
    names: {
      storageKey: "spinwheel.names",
      defaults: ["Mum", "Dad", "Alex", "Sam", "Charlie", "Jamie"],
      panelTitle: "Names",
      placeholder: "Type a name…",
      winnerLabel: "The winner is…",
      removeLabel: "Remove the winner after each spin",
    },
    rewards: {
      storageKey: "spinwheel.rewards",
      defaults: [
        "Extra screen time", "Choose dinner", "Stay up 15 min",
        "Ice cream 🍦", "Pick a movie 🎬", "No chores today",
        "Choose the music", "Small treat 🍬",
      ],
      panelTitle: "Rewards",
      placeholder: "Type a reward…",
      winnerLabel: "You won…",
      removeLabel: "Remove the reward once it's won",
    },
  };

  let mode = "names";            // active wheel
  let spinning = false;
  let soundOn = true;

  // Per-wheel data: items + current rotation angle.
  const state = {
    names: { items: loadItems("names"), rotation: 0 },
    rewards: { items: loadItems("rewards"), rotation: 0 },
  };

  // Convenience accessors for the active wheel.
  const cur = () => state[mode];
  const cfg = () => WHEELS[mode];

  // Bright, kid-friendly palette (repeats if there are many items)
  const COLORS = [
    "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#B983FF", "#FF9F45",
    "#FF6FB5", "#00C2CB", "#F97C7C", "#A8E063", "#5C7CFA", "#FDA085",
  ];

  // ---------- DOM ----------
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spinBtn");
  const soundBtn = document.getElementById("soundBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const nameInput = document.getElementById("nameInput");
  const addForm = document.getElementById("addForm");
  const nameList = document.getElementById("nameList");
  const nameCount = document.getElementById("nameCount");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const removeWinnerChk = document.getElementById("removeWinner");
  const winnerModal = document.getElementById("winnerModal");
  const winnerTitle = document.getElementById("winnerTitle");
  const winnerLabel = document.getElementById("winnerLabel");
  const closeModal = document.getElementById("closeModal");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const tabNames = document.getElementById("tabNames");
  const tabRewards = document.getElementById("tabRewards");
  const panelTitle = document.getElementById("panelTitle");
  const removeLabel = document.getElementById("removeLabel");

  // ============================================================
  //  Sound — synthesized with Web Audio API
  // ============================================================
  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  // A short "tick" as the pointer passes a peg.
  function playTick() {
    if (!soundOn) return;
    const ac = getAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(900, ac.currentTime);
    gain.gain.setValueAtTime(0.09, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.05);
  }

  // A happy little fanfare when a winner is chosen.
  function playFanfare() {
    if (!soundOn) return;
    const ac = getAudio();
    if (!ac) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((freq, i) => {
      const t = ac.currentTime + i * 0.12;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  // Soft click when adding an item.
  function playBlip() {
    if (!soundOn) return;
    const ac = getAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.14, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.12);
  }

  // ============================================================
  //  Storage
  // ============================================================
  function loadItems(which) {
    try {
      const saved = JSON.parse(localStorage.getItem(WHEELS[which].storageKey));
      if (Array.isArray(saved)) return saved;
    } catch (e) { /* ignore */ }
    return [...WHEELS[which].defaults];
  }

  function saveItems() {
    try {
      localStorage.setItem(cfg().storageKey, JSON.stringify(cur().items));
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  //  Wheel drawing
  // ============================================================
  function colorFor(i) { return COLORS[i % COLORS.length]; }

  function drawWheel() {
    const items = cur().items;
    const rotation = cur().rotation;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;
    ctx.clearRect(0, 0, size, size);

    if (items.length === 0) {
      ctx.fillStyle = "#e9e9f2";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9a9ab0";
      ctx.font = "bold 22px 'Baloo 2', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add some " + cfg().panelTitle.toLowerCase() + "!", cx, cy);
      return;
    }

    const n = items.length;
    const seg = (Math.PI * 2) / n;

    for (let i = 0; i < n; i++) {
      const start = rotation + i * seg;
      const end = start + seg;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colorFor(i);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + seg / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 3;
      const fontSize = Math.max(11, Math.min(28, 240 / n + 9));
      ctx.font = `bold ${fontSize}px 'Baloo 2', sans-serif`;
      let label = items[i];
      const maxLen = n > 12 ? 9 : 16;
      if (label.length > maxLen) label = label.slice(0, maxLen - 1) + "…";
      ctx.fillText(label, r - 16, 0);
      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  // ============================================================
  //  Spin logic
  // ============================================================
  function spin() {
    if (spinning) return;
    const items = cur().items;
    if (items.length === 0) {
      nameInput.focus();
      return;
    }
    if (items.length === 1) {
      announceWinner(0);
      return;
    }

    getAudio(); // unlock audio on user gesture
    spinning = true;
    spinBtn.disabled = true;

    const n = items.length;
    const seg = (Math.PI * 2) / n;

    // Pick a random target segment, land its center under the pointer (right, angle 0).
    const winnerIndex = Math.floor(Math.random() * n);
    const extraTurns = 5 + Math.floor(Math.random() * 4); // 5–8 full turns
    const targetCenter = -(winnerIndex * seg + seg / 2);
    const startRotation = cur().rotation;
    const totalDelta =
      extraTurns * Math.PI * 2 +
      targetCenter -
      (startRotation % (Math.PI * 2));

    const duration = 4200 + Math.random() * 800;
    const startTime = performance.now();
    let lastTickSeg = -1;

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      cur().rotation = startRotation + totalDelta * eased;

      // Tick sound as each boundary crosses the pointer.
      const rot = cur().rotation;
      const currentSeg = Math.floor(((-rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / seg);
      if (currentSeg !== lastTickSeg) {
        lastTickSeg = currentSeg;
        playTick();
      }

      drawWheel();

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        spinBtn.disabled = false;
        announceWinner(winnerIndex);
      }
    }
    requestAnimationFrame(frame);
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function announceWinner(index) {
    const items = cur().items;
    const winner = items[index];
    winnerLabel.textContent = cfg().winnerLabel;
    winnerTitle.textContent = winner;
    winnerModal.classList.remove("hidden");
    playFanfare();
    launchConfetti();

    if (removeWinnerChk.checked && items.length > 1) {
      items.splice(index, 1);
      saveItems();
      renderItems();
      cur().rotation = 0;
      drawWheel();
    }
  }

  // ============================================================
  //  Items UI
  // ============================================================
  function renderItems() {
    const items = cur().items;
    nameList.innerHTML = "";
    nameCount.textContent = items.length;

    if (items.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-hint";
      li.textContent = "Nothing yet — add some above! 👆";
      li.style.background = "transparent";
      nameList.appendChild(li);
    } else {
      items.forEach((name, i) => {
        const li = document.createElement("li");

        const swatch = document.createElement("span");
        swatch.className = "swatch";
        swatch.style.background = colorFor(i);

        const text = document.createElement("span");
        text.className = "name-text";
        text.textContent = name;

        const x = document.createElement("button");
        x.className = "remove-x";
        x.textContent = "✕";
        x.title = "Remove";
        x.setAttribute("aria-label", "Remove " + name);
        x.addEventListener("click", () => {
          items.splice(i, 1);
          saveItems();
          renderItems();
          drawWheel();
        });

        li.append(swatch, text, x);
        nameList.appendChild(li);
      });
    }
    drawWheel();
  }

  function addItem(raw) {
    const name = raw.trim();
    if (!name) return;
    cur().items.push(name);
    saveItems();
    renderItems();
    playBlip();
  }

  // ============================================================
  //  Switch between the two wheels
  // ============================================================
  function switchMode(next) {
    if (spinning || mode === next) return;
    mode = next;
    const isNames = mode === "names";
    tabNames.classList.toggle("active", isNames);
    tabRewards.classList.toggle("active", !isNames);
    tabNames.setAttribute("aria-selected", String(isNames));
    tabRewards.setAttribute("aria-selected", String(!isNames));

    panelTitle.textContent = cfg().panelTitle;
    nameInput.placeholder = cfg().placeholder;
    removeLabel.textContent = cfg().removeLabel;
    renderItems();
  }

  // ============================================================
  //  Confetti
  // ============================================================
  let confettiPieces = [];
  let confettiRunning = false;

  function launchConfetti() {
    const cc = confettiCanvas;
    cc.width = window.innerWidth;
    cc.height = window.innerHeight;
    const cctx = cc.getContext("2d");
    const colors = COLORS;
    confettiPieces = [];
    for (let i = 0; i < 140; i++) {
      confettiPieces.push({
        x: Math.random() * cc.width,
        y: -20 - Math.random() * cc.height * 0.5,
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + Math.random() * 4,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
      });
    }
    if (!confettiRunning) {
      confettiRunning = true;
      requestAnimationFrame(() => tickConfetti(cctx, cc, performance.now(), performance.now()));
    }
  }

  function tickConfetti(cctx, cc, start, now) {
    cctx.clearRect(0, 0, cc.width, cc.height);
    let alive = false;
    confettiPieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rot += p.vr;
      if (p.y < cc.height + 20) alive = true;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      cctx.restore();
    });
    if (alive && now - start < 5000) {
      requestAnimationFrame((n) => tickConfetti(cctx, cc, start, n));
    } else {
      cctx.clearRect(0, 0, cc.width, cc.height);
      confettiRunning = false;
    }
  }

  // ============================================================
  //  Events
  // ============================================================
  spinBtn.addEventListener("click", spin);
  canvas.addEventListener("click", spin);
  tabNames.addEventListener("click", () => switchMode("names"));
  tabRewards.addEventListener("click", () => switchMode("rewards"));

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addItem(nameInput.value);
    nameInput.value = "";
    nameInput.focus();
  });

  shuffleBtn.addEventListener("click", () => {
    const items = cur().items;
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    saveItems();
    renderItems();
    playBlip();
  });

  clearBtn.addEventListener("click", () => {
    if (cur().items.length === 0) return;
    if (confirm("Remove all " + cfg().panelTitle.toLowerCase() + "?")) {
      cur().items = [];
      saveItems();
      cur().rotation = 0;
      renderItems();
    }
  });

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) playBlip();
  });

  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  function hideModal() { winnerModal.classList.add("hidden"); }
  closeModal.addEventListener("click", hideModal);
  winnerModal.addEventListener("click", (e) => {
    if (e.target === winnerModal) hideModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
    if (e.code === "Space" && document.activeElement !== nameInput) {
      e.preventDefault();
      if (!winnerModal.classList.contains("hidden")) hideModal();
      spin();
    }
  });

  window.addEventListener("resize", () => {
    if (confettiRunning) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  });

  // ---------- Init ----------
  renderItems();
  drawWheel();
})();
