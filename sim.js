(() => {
  const STORAGE_KEY = 'sunshare_state_v1';

  const initialState = {
    roofSize: 300,
    sunHours: 5.5,
    donationRate: 60,
    priority: 'family',
    generatedKwh: 18,
    donatedKwh: 10.8,
    savedCost: 18,
    peopleHelped: 12,
    batteryLevel: 68,
    lastUpdated: Date.now()
  };

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return raw && typeof raw === 'object' ? { ...initialState, ...raw } : { ...initialState };
    } catch {
      return { ...initialState };
    }
  }

  function writeState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  function formatKwh(value) {
    return `${Number(value).toFixed(1)} kWh`;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }

  function calculateImpact(state) {
    const panelsPerSqft = 0.11;
    const efficiency = 0.82;
    const generated = state.roofSize * panelsPerSqft * state.sunHours * efficiency;
    const donated = generated * (state.donationRate / 100);
    const savedCost = generated * 0.95;
    const batteryLevel = Math.min(99, Math.max(22, Math.round((state.sunHours / 9) * 100)));
    const peopleHelped = Math.max(3, Math.round(donated / 1.8));

    return {
      generated,
      donated,
      savedCost,
      batteryLevel,
      peopleHelped
    };
  }

  function updatePriorityButtons(activePriority) {
    document.querySelectorAll('.toggle').forEach((button) => {
      const isActive = button.dataset.priority === activePriority;
      button.classList.toggle('active', isActive);
    });
  }

  function render() {
    const state = readState();
    const impact = calculateImpact(state);

    const roofSizeValue = document.getElementById('roofSizeValue');
    const sunHoursValue = document.getElementById('sunHoursValue');
    const donationRateValue = document.getElementById('donationRateValue');
    const shareLabel = document.getElementById('shareLabel');
    const shareBar = document.getElementById('shareBar');

    if (roofSizeValue) roofSizeValue.textContent = `${state.roofSize} sq ft`;
    if (sunHoursValue) sunHoursValue.textContent = `${Number(state.sunHours).toFixed(1)} hrs`;
    if (donationRateValue) donationRateValue.textContent = `${state.donationRate}%`;
    if (shareLabel) shareLabel.textContent = `${state.donationRate}%`;
    if (shareBar) shareBar.style.width = `${state.donationRate}%`;

    const generatedEl = document.getElementById('generatedValue');
    const donatedEl = document.getElementById('donatedValue');
    const savedEl = document.getElementById('savedValue');
    const helpedEl = document.getElementById('helpedValue');

    if (generatedEl) generatedEl.textContent = formatKwh(impact.generated);
    if (donatedEl) donatedEl.textContent = formatKwh(impact.donated);
    if (savedEl) savedEl.textContent = formatCurrency(impact.savedCost);
    if (helpedEl) helpedEl.textContent = String(impact.peopleHelped);

    const heroPower = document.getElementById('heroPower');
    const heroDonation = document.getElementById('heroDonation');
    const heroHomes = document.getElementById('heroHomes');
    const cardOutput = document.getElementById('cardOutput');
    const cardBattery = document.getElementById('cardBattery');
    const cardDonate = document.getElementById('cardDonate');

    if (heroPower) heroPower.textContent = formatKwh(impact.generated);
    if (heroDonation) heroDonation.textContent = formatKwh(impact.donated);
    if (heroHomes) heroHomes.textContent = String(impact.peopleHelped);
    if (cardOutput) cardOutput.textContent = Number(impact.generated).toFixed(1);
    if (cardBattery) cardBattery.textContent = `${impact.batteryLevel}%`;
    if (cardDonate) cardDonate.textContent = `${state.donationRate}%`;

    const pantry = impact.donated * 0.4;
    const school = impact.donated * 0.35;
    const clinic = impact.donated * 0.25;

    const pantryLabel = document.getElementById('pantryLabel');
    const schoolLabel = document.getElementById('schoolLabel');
    const clinicLabel = document.getElementById('clinicLabel');

    if (pantryLabel) pantryLabel.textContent = formatKwh(pantry);
    if (schoolLabel) schoolLabel.textContent = formatKwh(school);
    if (clinicLabel) clinicLabel.textContent = formatKwh(clinic);

    updatePriorityButtons(state.priority);
  }

  function syncState() {
    const state = readState();
    const roof = document.getElementById('roofSize');
    const sun = document.getElementById('sunHours');
    const donation = document.getElementById('donationRate');

    if (roof) roof.value = String(state.roofSize);
    if (sun) sun.value = String(state.sunHours);
    if (donation) donation.value = String(state.donationRate);

    render();
  }

  function bindControls() {
    const roof = document.getElementById('roofSize');
    const sun = document.getElementById('sunHours');
    const donation = document.getElementById('donationRate');

    if (roof) {
      roof.addEventListener('input', (event) => {
        const nextState = readState();
        nextState.roofSize = Number(event.target.value);
        nextState.lastUpdated = Date.now();
        writeState(nextState);
        render();
      });
    }

    if (sun) {
      sun.addEventListener('input', (event) => {
        const nextState = readState();
        nextState.sunHours = Number(event.target.value);
        nextState.lastUpdated = Date.now();
        writeState(nextState);
        render();
      });
    }

    if (donation) {
      donation.addEventListener('input', (event) => {
        const nextState = readState();
        nextState.donationRate = Number(event.target.value);
        nextState.lastUpdated = Date.now();
        writeState(nextState);
        render();
      });
    }

    document.querySelectorAll('.toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const nextState = readState();
        nextState.priority = button.dataset.priority;
        nextState.lastUpdated = Date.now();
        writeState(nextState);
        render();
      });
    });

    const simulateDay = document.getElementById('simulateDay');
    if (simulateDay) {
      simulateDay.addEventListener('click', () => {
        const nextState = readState();
        const impact = calculateImpact(nextState);
        nextState.generatedKwh = impact.generated;
        nextState.donatedKwh = impact.donated;
        nextState.savedCost = impact.savedCost;
        nextState.peopleHelped = impact.peopleHelped;
        nextState.batteryLevel = impact.batteryLevel;
        nextState.lastUpdated = Date.now();
        writeState(nextState);
        render();
      });
    }

    const donateNow = document.getElementById('donateNow');
    if (donateNow) {
      donateNow.addEventListener('click', () => {
        const nextState = readState();
        const impact = calculateImpact(nextState);
        nextState.generatedKwh = impact.generated;
        nextState.donatedKwh = impact.donated;
        nextState.savedCost = impact.savedCost;
        nextState.peopleHelped = impact.peopleHelped;
        nextState.lastUpdated = Date.now();
        writeState(nextState);
        render();
      });
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  function init() {
    syncState();
    bindControls();
    registerServiceWorker();
  }

  init();
})();
