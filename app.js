/**
 * RTM - Main Application Controller (English Only)
 * Handles Onboarding Wizard, Macronutrients progress/goal tracking,
 * Smart Watch pairing, settings, and plan generation.
 */

var PlanEngine = window.PlanEngine || (typeof PlanEngine !== 'undefined' ? PlanEngine : {});

class RtmApp {
  constructor() {
    this.currentTab = 'overview';
    this.wizardStep = 1;

    // Load or default user profile with fail-safe sanitization
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('rtm_profile'));
    } catch (e) {
      saved = null;
    }
    saved = (saved && typeof saved === 'object') ? saved : {};

    this.profile = {
      heightCm: Number(saved.heightCm) || 175,
      weightKg: Number(saved.weightKg) || 78,
      age: Number(saved.age) || 25,
      gender: saved.gender || 'male',
      freeDays: Math.min(6, Math.max(2, Number(saved.freeDays) || 4)),
      budgetTier: saved.budgetTier || 'budget',
      goal: (saved.goal === 'strength' ? 'gain_muscle' : (saved.goal || 'gain_muscle'))
    };

    // Load progress history safely
    try {
      this.progressHistory = JSON.parse(localStorage.getItem('rtm_history')) || [];
    } catch (e) {
      this.progressHistory = [];
    }
    if (!Array.isArray(this.progressHistory) || this.progressHistory.length === 0) {
      this.progressHistory = [
        { date: '2026-10-01', weight: 79.5, notes: 'Day 1: Started RTM journey' },
        { date: '2026-10-08', weight: 78.8, notes: 'Feeling stronger, hit protein target' },
        { date: '2026-10-13', weight: 78.0, notes: 'Hit all 4 workout days, meals on budget' }
      ];
    }

    // Paired smartwatch device
    this.pairedWatch = localStorage.getItem('rtm_paired_watch') || null;
    this.selectedWatchDevice = 'Apple Watch';

    this.init();
  }

  init() {
    this.bindEvents();
    this.initFoodMacroTracker();
    this.syncProfileToInputs();
    this.renderAll();
    this.syncWatchUI();

    // Always launch the onboarding wizard on every page load / refresh
    this.openWizard();
  }

  // Daily intake tracker (stored per date)
  getTodayKey() {
    return 'rtm_intake_' + new Date().toISOString().split('T')[0];
  }

  getFoodLogKey() {
    return 'rtm_food_log_' + new Date().toISOString().split('T')[0];
  }

  getDailyIntake() {
    const saved = localStorage.getItem(this.getTodayKey());
    return saved ? JSON.parse(saved) : { protein: 0, carbs: 0, fats: 0, calories: 0 };
  }

  getDailyFoodLog() {
    const saved = localStorage.getItem(this.getFoodLogKey());
    return saved ? JSON.parse(saved) : [];
  }

  saveDailyFoodLog(list) {
    localStorage.setItem(this.getFoodLogKey(), JSON.stringify(list));
  }

  initFoodMacroTracker() {
    const foodSelect = document.getElementById('macroFoodSelect');
    const gramsInput = document.getElementById('macroFoodGrams');
    const toggleBtn = document.getElementById('toggleAddMacroBtn');
    const closeBtn = document.getElementById('closeAddMacroBtn');
    const addBtn = document.getElementById('btnAddFoodToMacros');
    const resetBtn = document.getElementById('resetDailyMacrosBtn');
    const addSection = document.getElementById('addMacroSection');

    // Populate food select with grouped categories
    if (foodSelect && window.PlanEngine && window.PlanEngine.foodDatabase) {
      foodSelect.innerHTML = '';
      const categories = {};
      window.PlanEngine.foodDatabase.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
      });

      Object.keys(categories).forEach(cat => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = cat;
        categories[cat].forEach(food => {
          const opt = document.createElement('option');
          opt.value = food.id;
          opt.textContent = `${food.name} (${food.protein}g P / ${food.carbs}g C / ${food.fats}g F)`;
          optgroup.appendChild(opt);
        });
        foodSelect.appendChild(optgroup);
      });
    }

    // Toggle panel
    if (toggleBtn && addSection) {
      toggleBtn.addEventListener('click', () => {
        addSection.classList.toggle('hidden');
        if (!addSection.classList.contains('hidden')) {
          this.updateFoodMacroPreview();
          if (gramsInput) gramsInput.focus();
        }
      });
    }

    if (closeBtn && addSection) {
      closeBtn.addEventListener('click', () => {
        addSection.classList.add('hidden');
      });
    }

    // Live preview update
    if (foodSelect) {
      foodSelect.addEventListener('change', () => this.updateFoodMacroPreview());
    }
    if (gramsInput) {
      gramsInput.addEventListener('input', () => this.updateFoodMacroPreview());
    }

    // Add button
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const foodId = foodSelect ? foodSelect.value : 'beef';
        const grams = parseFloat(gramsInput ? gramsInput.value : 100) || 100;
        this.addFoodToDailyMacros(foodId, grams);
      });
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetDailyMacros();
      });
    }

    this.renderFoodLog();
    this.updateFoodMacroPreview();
  }

  updateFoodMacroPreview() {
    const foodSelect = document.getElementById('macroFoodSelect');
    const gramsInput = document.getElementById('macroFoodGrams');
    if (!foodSelect || !gramsInput || !window.PlanEngine || !window.PlanEngine.calculateFoodMacros) return;

    const foodId = foodSelect.value || 'beef';
    const grams = parseFloat(gramsInput.value) || 100;
    const macros = window.PlanEngine.calculateFoodMacros(foodId, grams);

    const prevGrams = document.getElementById('previewGramsLabel');
    const prevP = document.getElementById('prevProtein');
    const prevC = document.getElementById('prevCarbs');
    const prevF = document.getElementById('prevFats');
    const prevCal = document.getElementById('prevCalories');

    if (prevGrams) prevGrams.textContent = `${macros.grams}g`;
    if (prevP) prevP.textContent = `${macros.protein}`;
    if (prevC) prevC.textContent = `${macros.carbs}`;
    if (prevF) prevF.textContent = `${macros.fats}`;
    if (prevCal) prevCal.textContent = `${macros.calories}`;
  }

  addFoodToDailyMacros(foodId, grams) {
    if (!window.PlanEngine || !window.PlanEngine.calculateFoodMacros) return;
    const computed = window.PlanEngine.calculateFoodMacros(foodId, grams);

    // 1. Update intake totals
    const intake = this.getDailyIntake();
    intake.protein = Math.max(0, Math.round(intake.protein + computed.protein));
    intake.carbs = Math.max(0, Math.round(intake.carbs + computed.carbs));
    intake.fats = Math.max(0, Math.round(intake.fats + computed.fats));
    intake.calories = Math.max(0, Math.round(intake.calories + computed.calories));
    localStorage.setItem(this.getTodayKey(), JSON.stringify(intake));

    // 2. Append to daily food log
    const log = this.getDailyFoodLog();
    log.unshift({
      id: 'log_' + Date.now(),
      name: computed.name,
      grams: computed.grams,
      protein: computed.protein,
      carbs: computed.carbs,
      fats: computed.fats,
      calories: computed.calories,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveDailyFoodLog(log);

    // 3. Re-render UI
    this.renderAll();
    this.renderFoodLog();
  }

  removeFoodLogItem(logId) {
    const log = this.getDailyFoodLog();
    const index = log.findIndex(item => item.id === logId);
    if (index === -1) return;

    const [removed] = log.splice(index, 1);
    this.saveDailyFoodLog(log);

    // Deduct from intake
    const intake = this.getDailyIntake();
    intake.protein = Math.max(0, Math.round(intake.protein - removed.protein));
    intake.carbs = Math.max(0, Math.round(intake.carbs - removed.carbs));
    intake.fats = Math.max(0, Math.round(intake.fats - removed.fats));
    intake.calories = Math.max(0, Math.round(intake.calories - removed.calories));
    localStorage.setItem(this.getTodayKey(), JSON.stringify(intake));

    this.renderAll();
    this.renderFoodLog();
  }

  resetDailyMacros() {
    localStorage.setItem(this.getTodayKey(), JSON.stringify({ protein: 0, carbs: 0, fats: 0, calories: 0 }));
    this.saveDailyFoodLog([]);
    this.renderAll();
    this.renderFoodLog();
  }

  renderFoodLog() {
    const container = document.getElementById('todayFoodLogList');
    const section = document.getElementById('todayFoodLogSection');
    if (!container || !section) return;

    const log = this.getDailyFoodLog();
    if (log.length === 0) {
      section.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    section.classList.remove('hidden');
    container.innerHTML = log.map(item => `
      <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px]">
        <div class="flex-1 pr-2">
          <div class="font-bold text-white">${item.name} (${item.grams}g)</div>
          <div class="text-[10px] text-slate-400 font-mono">
            <span class="text-emerald-400 font-semibold">${item.protein}g P</span> • 
            <span class="text-cyan-400 font-semibold">${item.carbs}g C</span> • 
            <span class="text-amber-400 font-semibold">${item.fats}g F</span> • 
            <span class="text-slate-300 font-semibold">${item.calories} kcal</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-slate-500 font-mono">${item.time}</span>
          <button onclick="window.rtmApp && window.rtmApp.removeFoodLogItem('${item.id}')" class="text-slate-500 hover:text-red-400 p-1 font-bold text-xs transition">✕</button>
        </div>
      </div>
    `).join('');
  }

  // Event bindings
  bindEvents() {
    // Settings Modal
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => this.openSettings());
    }

    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    }

    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) this.closeSettings();
      });
    }

    const restartWizardBtn = document.getElementById('restartWizardBtn');
    if (restartWizardBtn) {
      restartWizardBtn.addEventListener('click', () => {
        this.closeSettings();
        this.openWizard();
      });
    }

    // Wizard Close Button & Modal Backdrop Click
    const closeWizardBtn = document.getElementById('closeWizardBtn');
    if (closeWizardBtn) {
      closeWizardBtn.addEventListener('click', () => this.closeWizard());
    }
    const wizardModal = document.getElementById('onboardingWizardModal');
    if (wizardModal) {
      wizardModal.addEventListener('click', (e) => {
        if (e.target === wizardModal) this.closeWizard();
      });
    }

    // Quick Workout Generator Button (Workout Tab)
    const btnQuickGen = document.getElementById('btnQuickGenerateWorkout');
    if (btnQuickGen) {
      btnQuickGen.addEventListener('click', () => this.quickGenerateWorkout());
    }

    // Navigation Tabs delegation
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (tab) {
        const target = tab.getAttribute('data-tab');
        if (target) this.switchTab(target);
      }
    });

    // Settings Free days slider display
    const freeDaysInput = document.getElementById('inputFreeDays');
    const freeDaysDisplay = document.getElementById('freeDaysValue');
    if (freeDaysInput && freeDaysDisplay) {
      freeDaysInput.addEventListener('input', (e) => {
        freeDaysDisplay.textContent = `${e.target.value} Days a week`;
      });
    }

    // Profile Settings Form
    const form = document.getElementById('profileForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfileFromInputs();
      });
    }

    // Progress Log Form
    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
      progressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addProgressLog();
      });
    }

    // Wizard Controls
    const wizardNextBtn = document.getElementById('wizardNextBtn');
    if (wizardNextBtn) {
      wizardNextBtn.addEventListener('click', () => this.nextWizardStep());
    }

    const wizardPrevBtn = document.getElementById('wizardPrevBtn');
    if (wizardPrevBtn) {
      wizardPrevBtn.addEventListener('click', () => this.prevWizardStep());
    }

    const wizardFinishBtn = document.getElementById('wizardFinishBtn');
    if (wizardFinishBtn) {
      wizardFinishBtn.addEventListener('click', () => this.finishWizard());
    }

    // Wizard Option Card Selectors (Days, Budget, Goal)
    document.querySelectorAll('.wizard-day-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.wizard-day-card').forEach(c => c.classList.remove('selected-card'));
        card.classList.add('selected-card');
        this.wizardFreeDays = parseInt(card.getAttribute('data-days'), 10);
      });
    });

    document.querySelectorAll('.wizard-budget-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.wizard-budget-card').forEach(c => c.classList.remove('selected-card'));
        card.classList.add('selected-card');
        this.wizardBudgetTier = card.getAttribute('data-budget');
      });
    });

    document.querySelectorAll('.wizard-goal-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.wizard-goal-card').forEach(c => c.classList.remove('selected-card'));
        card.classList.add('selected-card');
        this.wizardGoal = card.getAttribute('data-goal');
      });
    });

    // Smart Watch Device Selection
    document.querySelectorAll('.watch-device-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.watch-device-card').forEach(c => c.classList.remove('selected-card'));
        card.classList.add('selected-card');
        this.selectedWatchDevice = card.getAttribute('data-device');
      });
    });

    const smartwatchModal = document.getElementById('smartwatchModal');
    if (smartwatchModal) {
      smartwatchModal.addEventListener('click', (e) => {
        if (e.target === smartwatchModal) this.closeSmartwatchModal();
      });
    }
  }

  // ============================================
  // Smart Watch Pairing Logic
  // ============================================
  openSmartwatchModal() {
    const modal = document.getElementById('smartwatchModal');
    if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeSmartwatchModal() {
    const modal = document.getElementById('smartwatchModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
  }

  pairSelectedWatch() {
    const statusBox = document.getElementById('watchPairingStatus');
    const connectBtn = document.getElementById('btnConnectWatch');

    if (statusBox) {
      statusBox.textContent = `Pairing with ${this.selectedWatchDevice}...`;
      statusBox.classList.remove('hidden');
    }
    if (connectBtn) connectBtn.disabled = true;

    setTimeout(() => {
      this.pairedWatch = this.selectedWatchDevice;
      localStorage.setItem('rtm_paired_watch', this.pairedWatch);

      if (statusBox) {
        statusBox.textContent = `Successfully Paired with ${this.pairedWatch}!`;
      }

      setTimeout(() => {
        this.closeSmartwatchModal();
        this.syncWatchUI();
        if (statusBox) statusBox.classList.add('hidden');
        if (connectBtn) connectBtn.disabled = false;
      }, 700);
    }, 900);
  }

  syncWatchUI() {
    const dot = document.getElementById('watchStatusDot');
    const text = document.getElementById('watchStatusText');
    const btnText = document.getElementById('addSmartwatchBtnText');

    if (this.pairedWatch) {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (text) text.textContent = `Connected: ${this.pairedWatch} (Streaming)`;
      if (btnText) btnText.textContent = `Change Watch`;
    } else {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-600';
      if (text) text.textContent = 'No wearable connected';
      if (btnText) btnText.textContent = 'Add Smart Watch';
    }
  }

  // ============================================
  // Onboarding Wizard Logic
  // ============================================
  openWizard() {
    this.wizardStep = 1;
    this.wizardFreeDays = this.profile.freeDays || 4;
    this.wizardBudgetTier = this.profile.budgetTier || 'budget';
    this.wizardGoal = this.profile.goal || 'lose_weight';

    // Populate initial inputs in step 1
    const wHeight = document.getElementById('wizHeight');
    const wWeight = document.getElementById('wizWeight');
    const wAge = document.getElementById('wizAge');
    const wGender = document.getElementById('wizGender');

    if (wHeight) wHeight.value = this.profile.heightCm;
    if (wWeight) wWeight.value = this.profile.weightKg;
    if (wAge) wAge.value = this.profile.age;
    if (wGender) wGender.value = this.profile.gender;

    // Select matching cards in steps 2, 3, 4
    document.querySelectorAll('.wizard-day-card').forEach(c => {
      c.classList.toggle('selected-card', parseInt(c.getAttribute('data-days'), 10) === this.wizardFreeDays);
    });
    document.querySelectorAll('.wizard-budget-card').forEach(c => {
      c.classList.toggle('selected-card', c.getAttribute('data-budget') === this.wizardBudgetTier);
    });
    document.querySelectorAll('.wizard-goal-card').forEach(c => {
      c.classList.toggle('selected-card', c.getAttribute('data-goal') === this.wizardGoal);
    });

    this.renderWizardStep();
    const modal = document.getElementById('onboardingWizardModal');
    if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeWizard() {
    const modal = document.getElementById('onboardingWizardModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
  }

  nextWizardStep() {
    if (this.wizardStep === 1) {
      const h = parseFloat(document.getElementById('wizHeight').value);
      const w = parseFloat(document.getElementById('wizWeight').value);
      const a = parseInt(document.getElementById('wizAge').value, 10);
      if (!h || !w || !a) {
        alert('Please enter height, weight, and age to proceed');
        return;
      }
      this.profile.heightCm = h;
      this.profile.weightKg = w;
      this.profile.age = a;
      const gEl = document.getElementById('wizGender');
      if (gEl) this.profile.gender = gEl.value || 'male';
    }
    if (this.wizardStep < 4) {
      this.wizardStep++;
      this.renderWizardStep();
    }
  }

  prevWizardStep() {
    if (this.wizardStep > 1) {
      this.wizardStep--;
      this.renderWizardStep();
    }
  }

  renderWizardStep() {
    // Step indicators
    for (let i = 1; i <= 4; i++) {
      const stepIndicator = document.getElementById(`wizIndicator${i}`);
      if (stepIndicator) {
        stepIndicator.className = i === this.wizardStep
          ? 'h-2 flex-1 rounded-full bg-emerald-400 transition-all duration-300'
          : (i < this.wizardStep ? 'h-2 flex-1 rounded-full bg-emerald-500/40 transition-all duration-300' : 'h-2 flex-1 rounded-full bg-slate-800 transition-all duration-300');
      }

      const stepPane = document.getElementById(`wizStep${i}`);
      if (stepPane) {
        stepPane.classList.toggle('hidden', i !== this.wizardStep);
      }
    }

    const stepLabel = document.getElementById('wizStepIndicatorText');
    if (stepLabel) {
      stepLabel.textContent = `Step ${this.wizardStep} of 4`;
    }

    // Toggle Back & Next / Finish buttons
    const prevBtn = document.getElementById('wizardPrevBtn');
    if (prevBtn) {
      prevBtn.classList.toggle('hidden', this.wizardStep === 1);
    }

    const nextBtn = document.getElementById('wizardNextBtn');
    const finishBtn = document.getElementById('wizardFinishBtn');
    if (nextBtn) nextBtn.classList.toggle('hidden', this.wizardStep === 4);
    if (finishBtn) finishBtn.classList.toggle('hidden', this.wizardStep !== 4);
  }

  finishWizard() {
    const h = parseFloat(document.getElementById('wizHeight').value) || 175;
    const w = parseFloat(document.getElementById('wizWeight').value) || 78;
    const a = parseInt(document.getElementById('wizAge').value, 10) || 25;
    const g = document.getElementById('wizGender').value || 'male';

    this.profile = {
      heightCm: h,
      weightKg: w,
      age: a,
      gender: g,
      freeDays: this.wizardFreeDays || 4,
      budgetTier: this.wizardBudgetTier || 'budget',
      goal: this.wizardGoal || 'lose_weight'
    };

    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    localStorage.setItem('rtm_onboarded', 'true');

    this.closeWizard();
    this.syncProfileToInputs();
    this.renderAll();
  }

  // ============================================
  // Settings & Tabs
  // ============================================
  openSettings() {
    this.syncProfileToInputs();
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(pane => {
      pane.classList.toggle('hidden', pane.getAttribute('id') !== `pane-${tabName}`);
    });
  }

  syncProfileToInputs() {
    const h = document.getElementById('inputHeight');
    const w = document.getElementById('inputWeight');
    const a = document.getElementById('inputAge');
    const g = document.getElementById('inputGender');
    const fd = document.getElementById('inputFreeDays');
    const b = document.getElementById('inputBudget');
    const goal = document.getElementById('inputGoal');

    if (h) h.value = this.profile.heightCm;
    if (w) w.value = this.profile.weightKg;
    if (a) a.value = this.profile.age;
    if (g) g.value = this.profile.gender;
    if (fd) fd.value = this.profile.freeDays;
    if (b) b.value = this.profile.budgetTier;
    if (goal) goal.value = this.profile.goal;

    const freeDaysDisplay = document.getElementById('freeDaysValue');
    if (freeDaysDisplay) {
      freeDaysDisplay.textContent = `${this.profile.freeDays} Days a week`;
    }

    // Also sync the Quick Workout Generator inputs in the Workout tab
    const qh = document.getElementById('quickWorkoutHeight');
    const qw = document.getElementById('quickWorkoutWeight');
    const qd = document.getElementById('quickWorkoutDays');
    const qg = document.getElementById('quickWorkoutGoal');
    if (qh) qh.value = this.profile.heightCm;
    if (qw) qw.value = this.profile.weightKg;
    if (qd) qd.value = this.profile.freeDays;
    if (qg) qg.value = this.profile.goal;
  }

  quickGenerateWorkout() {
    const hInput = document.getElementById('quickWorkoutHeight');
    const wInput = document.getElementById('quickWorkoutWeight');
    const dInput = document.getElementById('quickWorkoutDays');
    const gInput = document.getElementById('quickWorkoutGoal');

    const h = parseFloat(hInput ? hInput.value : this.profile.heightCm) || 175;
    const w = parseFloat(wInput ? wInput.value : this.profile.weightKg) || 78;
    const days = parseInt(dInput ? dInput.value : this.profile.freeDays, 10) || 4;
    const goal = (gInput ? gInput.value : this.profile.goal) || 'gain_muscle';

    this.profile.heightCm = h;
    this.profile.weightKg = w;
    this.profile.freeDays = days;
    this.profile.goal = goal;

    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    localStorage.setItem('rtm_onboarded', 'true');

    this.syncProfileToInputs();
    this.renderAll();

    const toast = document.getElementById('quickWorkoutToast');
    const toastMsg = document.getElementById('quickWorkoutToastMsg');
    if (toast) {
      if (toastMsg) {
        toastMsg.textContent = `Generated ${days}-Day routine for ${h} cm & ${w} kg!`;
      }
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
  }

  saveProfileFromInputs() {
    this.profile = {
      heightCm: parseFloat(document.getElementById('inputHeight').value) || 175,
      weightKg: parseFloat(document.getElementById('inputWeight').value) || 75,
      age: parseInt(document.getElementById('inputAge').value, 10) || 25,
      gender: document.getElementById('inputGender').value,
      freeDays: parseInt(document.getElementById('inputFreeDays').value, 10) || 4,
      budgetTier: document.getElementById('inputBudget').value,
      goal: document.getElementById('inputGoal').value
    };

    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    localStorage.setItem('rtm_onboarded', 'true');
    this.syncProfileToInputs();
    this.renderAll();
    this.switchTab('workout');

    const toast = document.getElementById('saveToast');
    if (toast) {
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
        this.closeSettings();
      }, 700);
    } else {
      this.closeSettings();
    }
  }

  addProgressLog() {
    const weightVal = parseFloat(document.getElementById('logWeight').value);
    const notesVal = document.getElementById('logNotes').value.trim();
    if (!weightVal) return;

    const newEntry = {
      date: new Date().toISOString().split('T')[0],
      weight: weightVal,
      notes: notesVal || '-'
    };

    this.progressHistory.unshift(newEntry);
    localStorage.setItem('rtm_history', JSON.stringify(this.progressHistory));

    this.profile.weightKg = weightVal;
    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    this.syncProfileToInputs();

    document.getElementById('logWeight').value = '';
    document.getElementById('logNotes').value = '';
    this.renderAll();
  }

  // ============================================
  // Render Everything (Macros, Workout, Meals)
  // ============================================
  renderAll() {
    const bmr = PlanEngine.calculateBMR(this.profile.weightKg, this.profile.heightCm, this.profile.age, this.profile.gender);
    const tdee = PlanEngine.calculateTDEE(bmr, this.profile.freeDays);
    const macros = PlanEngine.calculateMacros(tdee, this.profile.weightKg, this.profile.goal);
    const workoutPlan = PlanEngine.generateWorkoutSplit(
      this.profile.freeDays,
      this.profile.goal,
      this.profile.heightCm,
      this.profile.weightKg
    );
    const mealPlan = PlanEngine.generateBudgetMealPlan(this.profile.budgetTier, macros);

    // Current daily intake progress
    const intake = this.getDailyIntake();

    // 1. Overview Render: progress / goal with a "/" in between
    const targetCalEl = document.getElementById('macroTargetCal');
    if (targetCalEl) {
      targetCalEl.innerHTML = `<span class="text-white">${intake.calories.toLocaleString()}</span> / <span class="text-emerald-400">${macros.calories.toLocaleString()} kcal</span>`;
    }

    const goalBadgeEl = document.getElementById('macroGoalBadge');
    if (goalBadgeEl) {
      const goalsMap = {
        lose_weight: 'Fat Loss',
        gain_muscle: 'Lean Bulk',
        maintain: 'Maintenance'
      };
      goalBadgeEl.textContent = goalsMap[this.profile.goal] || 'Custom';
    }

    // Protein: progress / goal
    const proteinEl = document.getElementById('macroProtein');
    if (proteinEl) {
      proteinEl.innerHTML = `<span class="text-emerald-400 font-mono">${intake.protein}g</span> / <span class="text-white font-mono">${macros.protein}g</span>`;
    }

    // Carbs: progress / goal
    const carbsEl = document.getElementById('macroCarbs');
    if (carbsEl) {
      carbsEl.innerHTML = `<span class="text-cyan-400 font-mono">${intake.carbs}g</span> / <span class="text-white font-mono">${macros.carbs}g</span>`;
    }

    // Fats: progress / goal
    const fatsEl = document.getElementById('macroFats');
    if (fatsEl) {
      fatsEl.innerHTML = `<span class="text-amber-400 font-mono">${intake.fats}g</span> / <span class="text-white font-mono">${macros.fats}g</span>`;
    }

    // Percentages of progress vs target
    const pProgressPct = Math.min(100, Math.round((intake.protein / Math.max(1, macros.protein)) * 100));
    const cProgressPct = Math.min(100, Math.round((intake.carbs / Math.max(1, macros.carbs)) * 100));
    const fProgressPct = Math.min(100, Math.round((intake.fats / Math.max(1, macros.fats)) * 100));

    const pPctLabel = document.getElementById('pctProtein');
    const cPctLabel = document.getElementById('pctCarbs');
    const fPctLabel = document.getElementById('pctFats');
    if (pPctLabel) pPctLabel.textContent = `${pProgressPct}%`;
    if (cPctLabel) cPctLabel.textContent = `${cProgressPct}%`;
    if (fPctLabel) fPctLabel.textContent = `${fProgressPct}%`;

    // Visual progress bars inside each card
    const pProgBar = document.getElementById('progBarProtein');
    const cProgBar = document.getElementById('progBarCarbs');
    const fProgBar = document.getElementById('progBarFats');
    if (pProgBar) pProgBar.style.width = `${pProgressPct}%`;
    if (cProgBar) cProgBar.style.width = `${cProgressPct}%`;
    if (fProgBar) fProgBar.style.width = `${fProgressPct}%`;

    // 2. Workout Tab Render: Clean and Simple
    const profileBanner = document.getElementById('workoutProfileBanner');
    if (profileBanner) {
      const goalsMap = {
        lose_weight: 'Burn Fat & Shred',
        gain_muscle: 'Build Lean Muscle',
        maintain: 'Healthy Athletic Maintenance'
      };

      profileBanner.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ACTIVE SPLIT
              </span>
              <span class="text-xs text-slate-400 font-mono">${workoutPlan && workoutPlan.schedule ? workoutPlan.schedule.length : 0} Days / Week</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
              ${workoutPlan ? workoutPlan.splitName : 'Custom Split'}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-semibold text-slate-200">
              ${goalsMap[this.profile.goal] || this.profile.goal}
            </span>
          </div>
        </div>
      `;
    }

    // Schedule Cards Render - Simple Movement, Sets, Reps, Rest list
    const workoutContainer = document.getElementById('workoutScheduleContainer');
    if (workoutContainer) {
      workoutContainer.innerHTML = '';
      const cleanVal = (val) => String(val || '').replace(/\s*\(.*?\)/g, '').replace(/\s*reps?/i, '').replace(/\s*sets?/i, '').trim();

      if (!workoutPlan || !workoutPlan.schedule || workoutPlan.schedule.length === 0) {
        workoutContainer.innerHTML = `
          <div class="glass-card p-8 text-center border border-white/10 space-y-3">
            <div class="w-12 h-12 mx-auto rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-emerald-400 font-bold text-sm tracking-wider">RTM</div>
            <h4 class="text-lg font-bold text-white">No Workout Generated Yet</h4>
            <p class="text-xs text-slate-400 max-w-md mx-auto">
              Enter your height, weight, and free time above, then tap <strong>Generate Workout</strong> to create your split.
            </p>
            <button onclick="window.rtmApp && window.rtmApp.quickGenerateWorkout()" class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition">
              Generate Now
            </button>
          </div>
        `;
      } else {
        workoutPlan.schedule.forEach((daySchedule) => {
        const card = document.createElement('div');
        card.className = 'glass-card p-5 sm:p-6 mb-5 border border-white/10 shadow-xl';
        card.innerHTML = `
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <span class="text-xs uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                ${daySchedule.day}
              </span>
              <h4 class="text-base sm:text-lg font-black text-white">${daySchedule.focus}</h4>
            </div>
            <span class="text-xs text-slate-400 font-mono">
              ${daySchedule.exercises.length} Movements
            </span>
          </div>

          <!-- Clean List Table: Movement, Sets, Reps, Rest -->
          <div class="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-950/70 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-white/10">
                  <th class="py-3 px-4">Movement</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap">Sets</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap">Reps</th>
                  <th class="py-3 px-4 text-right whitespace-nowrap">Rest</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-xs sm:text-sm">
                ${daySchedule.exercises.map(ex => `
                  <tr class="hover:bg-white/[0.02] transition">
                    <td class="py-3.5 px-4 font-bold text-white">${ex.name}</td>
                    <td class="py-3.5 px-3 text-center font-mono font-bold text-emerald-400 whitespace-nowrap">${cleanVal(ex.sets)}</td>
                    <td class="py-3.5 px-3 text-center font-mono font-bold text-slate-200 whitespace-nowrap">${cleanVal(ex.reps)}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-cyan-400 whitespace-nowrap">${cleanVal(ex.rest)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        workoutContainer.appendChild(card);
      });
      }
    }

    // 3. Nutrition Tab Render
    const groceryTitle = document.getElementById('groceryHeadingTitle');
    if (groceryTitle) {
      const cleanTierName = (mealPlan.tierName || 'Budget-Smart').split('(')[0].trim();
      groceryTitle.textContent = `Monthly Grocery Staples (${cleanTierName})`;
    }

    const tierBadge = document.getElementById('groceryTierBadge');
    if (tierBadge) {
      const tierMap = {
        budget: 'Smart Budget',
        moderate: 'Standard Fresh',
        premium: 'Performance'
      };
      tierBadge.textContent = tierMap[this.profile.budgetTier] || 'Smart Budget';
    }

    const costBadge = document.getElementById('groceryMonthlyCostBadge');
    if (costBadge) {
      costBadge.textContent = mealPlan.estimatedCostPerMonth ? `~${mealPlan.estimatedCostPerMonth}` : `~${mealPlan.estimatedCostPerDay}`;
    }

    const groceryContainer = document.getElementById('groceryListContainer');
    if (groceryContainer) {
      groceryContainer.innerHTML = mealPlan.groceryList.map(item => `
        <div class="flex items-start justify-between p-3.5 rounded-lg bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-white text-sm">${item.item}</span>
              ${item.monthlyQty ? `<span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">${item.monthlyQty}</span>` : ''}
            </div>
            <div class="text-xs text-slate-400 leading-relaxed">${item.reason}</div>
            ${item.monthlyTarget ? `
              <div class="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Monthly Target: <strong class="text-slate-300">${item.monthlyTarget}</strong></span>
              </div>
            ` : ''}
          </div>
          <span class="badge-pill bg-emerald-500/10 text-emerald-400 text-xs shrink-0 ml-2 font-medium">${item.category || 'High Value'}</span>
        </div>
      `).join('');
    }

    const dailyMealsContainer = document.getElementById('dailyMealsContainer');
    if (dailyMealsContainer) {
      dailyMealsContainer.innerHTML = mealPlan.dailyMeals.map(meal => `
        <div class="glass-card p-4 mb-3 border border-white/5">
          <div class="flex justify-between items-center mb-1">
            <h5 class="font-bold text-white text-sm">${meal.meal}</h5>
            <span class="text-xs font-mono text-cyan-400 font-semibold">${meal.macros}</span>
          </div>
          <p class="text-xs text-slate-300">${meal.description}</p>
        </div>
      `).join('');
    }

    // 4. Progress Tab Render
    const historyContainer = document.getElementById('progressHistoryList');
    if (historyContainer) {
      if (this.progressHistory.length === 0) {
        historyContainer.innerHTML = `<p class="text-slate-400 text-xs text-center py-4">No check-ins logged yet. Add your first entry above!</p>`;
      } else {
        historyContainer.innerHTML = this.progressHistory.map(entry => `
          <div class="flex items-center justify-between p-3.5 rounded-lg bg-slate-900/60 border border-white/5">
            <div>
              <div class="text-xs text-slate-400">${entry.date}</div>
              <div class="text-xs text-slate-300 mt-0.5 italic">"${entry.notes}"</div>
            </div>
            <div class="text-right">
              <span class="text-base font-bold text-white font-mono">${entry.weight} kg</span>
            </div>
          </div>
        `).join('');
      }
    }
  }
}

// Start application reliably whether DOM is still loading or already ready
function startRtmApp() {
  if (!window.rtmApp) {
    window.rtmApp = new RtmApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRtmApp);
} else {
  startRtmApp();
}
