/* ==========================================================================
   TIME-SHARING OS SIMULATION SYSTEM - JAVASCRIPT ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- STATE MANAGEMENT ---
  const state = {
    isRunning: false,
    currentUserIndex: 0, // 0: U1, 1: U2, 2: U3, 3: U4
    quantumDuration: 0.8, // seconds
    speedMultiplier: 1.0,
    completedCycles: 0,
    soundEnabled: true,
    isProjectorMode: false,
    timerId: null,
    progressIntervalId: null,
    quantumStartTime: 0,
    totalContextSwitches: 0
  };

  // --- DOM ELEMENTS ---
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnStep = document.getElementById('btnStep');
  const btnReset = document.getElementById('btnReset');
  const quantumSlider = document.getElementById('quantumSlider');
  const quantumValBadge = document.getElementById('quantumValBadge');
  const speedOptions = document.querySelectorAll('.speed-option');
  const soundToggle = document.getElementById('soundToggle');
  const projectorToggle = document.getElementById('projectorToggle');

  const systemState = document.getElementById('systemState');
  const activeUserMetric = document.getElementById('activeUserMetric');
  const quantumMetric = document.getElementById('quantumMetric');
  const cyclesMetric = document.getElementById('cyclesMetric');

  const cpuNode = document.getElementById('cpuNode');
  const cpuServingBadge = document.getElementById('cpuServingBadge');
  const quantumCircleProgress = document.getElementById('quantumCircleProgress');
  const ganttTrack = document.getElementById('ganttTrack');
  const packetLayer = document.getElementById('packetLayer');

  const users = [
    {
      id: 1,
      name: 'Usuario 1',
      action: 'Subiendo una foto',
      card: document.getElementById('userCard1'),
      badge: document.getElementById('badgeU1'),
      toast: document.getElementById('toastU1'),
      color: 'var(--color-u1)',
      line: document.getElementById('line1'),
      packetIcon: '📷',
      toastMsg: '✓ Foto subida correctamente',
      type: 'upload'
    },
    {
      id: 2,
      name: 'Usuario 2',
      action: 'Solicitando una foto',
      card: document.getElementById('userCard2'),
      badge: document.getElementById('badgeU2'),
      toast: document.getElementById('toastU2'),
      color: 'var(--color-u2)',
      line: document.getElementById('line2'),
      packetIcon: '🔍',
      toastMsg: '✓ Foto encontrada',
      type: 'request'
    },
    {
      id: 3,
      name: 'Usuario 3',
      action: 'Descargando una foto',
      card: document.getElementById('userCard3'),
      badge: document.getElementById('badgeU3'),
      toast: document.getElementById('toastU3'),
      color: 'var(--color-u3)',
      line: document.getElementById('line3'),
      packetIcon: '📥',
      toastMsg: '✓ Descarga completada',
      type: 'download'
    },
    {
      id: 4,
      name: 'Usuario 4',
      action: 'Eliminando una foto',
      card: document.getElementById('userCard4'),
      badge: document.getElementById('badgeU4'),
      toast: document.getElementById('toastU4'),
      color: 'var(--color-u4)',
      line: document.getElementById('line4'),
      packetIcon: '🗑️',
      toastMsg: '✓ Foto eliminada',
      type: 'delete'
    }
  ];

  // --- WEB AUDIO API SYNTHESIZER ---
  let audioCtx = null;

  function playContextSwitchSound(freq = 580, type = 'sine') {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio not supported or blocked');
    }
  }

  // --- SVG CONNECTION LINES DRAWING ---
  function updateConnectionLines() {
    const cpuRect = cpuNode.getBoundingClientRect();
    const stageRect = document.getElementById('stageContainer').getBoundingClientRect();

    const cpuCenter = {
      x: cpuRect.left + cpuRect.width / 2 - stageRect.left,
      y: cpuRect.top + cpuRect.height / 2 - stageRect.top
    };

    users.forEach(u => {
      const userRect = u.card.getBoundingClientRect();
      const userCenter = {
        x: userRect.left + userRect.width / 2 - stageRect.left,
        y: userRect.top + userRect.height / 2 - stageRect.top
      };

      u.line.setAttribute('x1', userCenter.x);
      u.line.setAttribute('y1', userCenter.y);
      u.line.setAttribute('x2', cpuCenter.x);
      u.line.setAttribute('y2', cpuCenter.y);
    });
  }

  window.addEventListener('resize', updateConnectionLines);
  setTimeout(updateConnectionLines, 100);

  // --- ANIMATED PACKET TRAJECTORIES ---
  function createAndAnimatePacket(fromPos, toPos, icon, color, durationMs, callback) {
    const packet = document.createElement('div');
    packet.className = 'flying-packet';
    packet.innerHTML = icon;
    packet.style.borderColor = color;
    packet.style.color = color;
    packet.style.left = `${fromPos.x - 22}px`;
    packet.style.top = `${fromPos.y - 22}px`;

    packetLayer.appendChild(packet);

    const startTime = performance.now();

    function stepPacket(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);
      
      // Smooth Easing (cubic-bezier ease-in-out)
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentX = fromPos.x + (toPos.x - fromPos.x) * easeProgress;
      const currentY = fromPos.y + (toPos.y - fromPos.y) * easeProgress;

      packet.style.left = `${currentX - 22}px`;
      packet.style.top = `${currentY - 22}px`;

      if (progress < 1.0) {
        requestAnimationFrame(stepPacket);
      } else {
        packet.remove();
        if (callback) callback();
      }
    }

    requestAnimationFrame(stepPacket);
  }

  // --- TIME-SHARING CYCLE EXECUTION ---

  function executeCurrentTurn(isSingleStep = false) {
    const user = users[state.currentUserIndex];
    const actualQuantumMs = (state.quantumDuration / state.speedMultiplier) * 1000;

    // 1. Highlight UI for current user
    users.forEach((u, i) => {
      if (i === state.currentUserIndex) {
        u.card.classList.add('active-user');
        u.badge.textContent = 'EN CPU';
        u.line.classList.add('active');
        u.line.style.color = u.color;
      } else {
        u.card.classList.remove('active-user');
        u.badge.textContent = 'ESPERA';
        u.line.classList.remove('active');
        u.toast.classList.remove('show');
      }
    });

    // CPU Node State
    cpuNode.classList.add('active-processing');
    cpuServingBadge.innerHTML = `<span style="color: ${user.color}">● Atendiendo ${user.name}</span>`;
    activeUserMetric.textContent = `${user.name} (${user.action})`;
    activeUserMetric.style.color = user.color;

    playContextSwitchSound(520 + state.currentUserIndex * 80, 'sine');

    // 2. Coordinates calculation for packet animation
    const stageRect = document.getElementById('stageContainer').getBoundingClientRect();
    const userRect = user.card.getBoundingClientRect();
    const cpuRect = cpuNode.getBoundingClientRect();

    const userCenter = {
      x: userRect.left + userRect.width / 2 - stageRect.left,
      y: userRect.top + userRect.height / 2 - stageRect.top
    };
    const cpuCenter = {
      x: cpuRect.left + cpuRect.width / 2 - stageRect.left,
      y: cpuRect.top + cpuRect.height / 2 - stageRect.top
    };

    // 3. Trigger user-specific packet animation
    const animTime = Math.min(actualQuantumMs * 0.7, 600);

    if (user.type === 'upload' || user.type === 'delete') {
      // Packet travels from User -> CPU
      createAndAnimatePacket(userCenter, cpuCenter, user.packetIcon, user.color, animTime, () => {
        user.toast.textContent = user.toastMsg;
        user.toast.classList.add('show');
        playContextSwitchSound(800, 'triangle');
      });
    } else if (user.type === 'download') {
      // Packet travels from CPU -> User
      createAndAnimatePacket(cpuCenter, userCenter, user.packetIcon, user.color, animTime, () => {
        user.toast.textContent = user.toastMsg;
        user.toast.classList.add('show');
        playContextSwitchSound(750, 'triangle');
      });
    } else if (user.type === 'request') {
      // Packet travels User -> CPU, then Result CPU -> User
      createAndAnimatePacket(userCenter, cpuCenter, '🔍', user.color, animTime / 2, () => {
        createAndAnimatePacket(cpuCenter, userCenter, '🖼️', user.color, animTime / 2, () => {
          user.toast.textContent = user.toastMsg;
          user.toast.classList.add('show');
          playContextSwitchSound(850, 'triangle');
        });
      });
    }

    // 4. Animate Quantum Ring Circle (0 -> 728 circumference)
    animateQuantumRing(actualQuantumMs);

    // 5. Log Gantt Block
    appendGanttBlock(user);

    // 6. Schedule next turn
    state.timerId = setTimeout(() => {
      // Move to next user in Round-Robin sequence
      state.currentUserIndex = (state.currentUserIndex + 1) % users.length;
      state.totalContextSwitches++;

      if (state.currentUserIndex === 0) {
        state.completedCycles++;
        cyclesMetric.textContent = state.completedCycles;
      }

      if (state.isRunning && !isSingleStep) {
        executeCurrentTurn();
      } else {
        pauseSimulation();
      }
    }, actualQuantumMs);
  }

  function animateQuantumRing(durationMs) {
    const totalCircumference = 728; // 2 * PI * 116
    const startTime = performance.now();

    if (state.progressIntervalId) clearInterval(state.progressIntervalId);

    const user = users[state.currentUserIndex];
    quantumCircleProgress.style.stroke = user.color;

    state.progressIntervalId = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const fraction = Math.min(elapsed / durationMs, 1.0);
      const dashOffset = fraction * totalCircumference;
      quantumCircleProgress.style.strokeDashoffset = dashOffset;

      if (fraction >= 1.0) {
        clearInterval(state.progressIntervalId);
      }
    }, 20);
  }

  function appendGanttBlock(user) {
    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.setAttribute('data-user', user.id);
    block.textContent = `U${user.id} (${state.quantumDuration}s)`;
    block.title = `${user.name}: ${user.action} [Quantum: ${state.quantumDuration}s]`;

    ganttTrack.appendChild(block);
    
    // Limit Gantt history display to last 30 blocks for clean performance
    if (ganttTrack.children.length > 35) {
      ganttTrack.removeChild(ganttTrack.firstChild);
    }

    // Auto-scroll track to rightmost block
    ganttTrack.scrollLeft = ganttTrack.scrollWidth;
  }

  // --- CONTROL ACTIONS ---

  function startSimulation() {
    if (state.isRunning) return;
    state.isRunning = true;
    
    btnStart.disabled = true;
    btnPause.disabled = false;

    systemState.textContent = 'ACTIVO';
    systemState.className = 'metric-value status-active';

    executeCurrentTurn();
  }

  function pauseSimulation() {
    state.isRunning = false;
    if (state.timerId) clearTimeout(state.timerId);
    if (state.progressIntervalId) clearInterval(state.progressIntervalId);

    btnStart.disabled = false;
    btnPause.disabled = true;

    systemState.textContent = 'PAUSADO';
    systemState.className = 'metric-value status-paused';

    cpuNode.classList.remove('active-processing');
  }

  function resetSimulation() {
    pauseSimulation();
    state.currentUserIndex = 0;
    state.completedCycles = 0;
    state.totalContextSwitches = 0;

    cyclesMetric.textContent = '0';
    activeUserMetric.textContent = 'Esperando inicio...';
    activeUserMetric.style.color = 'var(--text-bright)';
    cpuServingBadge.innerHTML = '<span>En Espera</span>';

    users.forEach(u => {
      u.card.classList.remove('active-user');
      u.badge.textContent = 'ESPERA';
      u.line.classList.remove('active');
      u.toast.classList.remove('show');
    });

    quantumCircleProgress.style.strokeDashoffset = 0;
    ganttTrack.innerHTML = '';
    packetLayer.innerHTML = '';
  }

  function stepSimulation() {
    pauseSimulation();
    executeCurrentTurn(true);
  }

  // --- EVENT LISTENERS ---

  btnStart.addEventListener('click', startSimulation);
  btnPause.addEventListener('click', pauseSimulation);
  btnReset.addEventListener('click', resetSimulation);
  btnStep.addEventListener('click', stepSimulation);

  // Quantum Duration Slider
  quantumSlider.addEventListener('input', (e) => {
    state.quantumDuration = parseFloat(e.target.value);
    quantumValBadge.textContent = `${state.quantumDuration.toFixed(1)} s`;
    quantumMetric.textContent = `${state.quantumDuration.toFixed(1)} s`;
  });

  // Speed Selector Buttons
  speedOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      speedOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.speedMultiplier = parseFloat(btn.dataset.speed);
    });
  });

  // Sound Toggle
  soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundToggle.classList.toggle('active', state.soundEnabled);
    soundToggle.innerHTML = state.soundEnabled 
      ? '<span id="soundIcon">🔊</span> Audio: ON' 
      : '<span id="soundIcon">🔇</span> Audio: OFF';
  });

  // Projector High-Contrast Mode Toggle
  projectorToggle.addEventListener('click', () => {
    state.isProjectorMode = !state.isProjectorMode;
    document.body.classList.toggle('projector-mode', state.isProjectorMode);
    projectorToggle.classList.toggle('active', state.isProjectorMode);
    setTimeout(updateConnectionLines, 50);
  });

  // Initial setup
  updateConnectionLines();
});
