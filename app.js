/**
 * RTM - Main Application Controller (English Only)
 * Handles Onboarding Wizard, Macronutrients progress/goal tracking,
 * Smart Watch pairing, settings, and plan generation.
 */

const PlanEngine = window.PlanEngine || {};

class RtmApp {
  constructor() {
    this.currentTab = 'overview';
    this.wizardStep = 1;

    // Load or default user profile
    this.profile = JSON.parse(localStorage.getItem('rtm_profile')) || {
      heightCm: 175,
      weightKg: 78,
      age: 25,
      gender: 'male',
      freeDays: 4,
      budgetTier: 'budget',
      goal: 'lose_weight'
    };

    // Load progress history
    this.progressHistory = JSON.parse(localStorage.getItem('rtm_history')) || [
      { date: '2026-10-01', weight: 79.5, notes: 'Day 1: Started RTM journey' },
      { date: '2026-10-08', weight: 78.8, notes: 'Feeling stronger, hit protein target' },
      { date: '2026-10-13', weight: 78.0, notes: 'Hit all 4 workout days, meals on budget' }
    ];

    // Paired smartwatch device
    this.pairedWatch = localStorage.getItem('rtm_paired_watch') || null;
    this.selectedWatchDevice = 'Apple Watch';

    this.init();
  }

  init() {
    this.bindEvents();
    this.syncProfileToInputs();
    this.renderAll();
    this.syncWatchUI();

    // Check if onboarding was completed before; if not, open wizard automatically
    const onboarded = localStorage.getItem('rtm_onboarded');
    if (!onboarded) {
      this.openWizard();
    }
  }

  // Daily intake tracker (stored per date)
  getTodayKey() {
    return 'rtm_intake_' + new Date().toISOString().split('T')[0];
  }

  getDailyIntake() {
    const saved = localStorage.getItem(this.getTodayKey());
    return saved ? JSON.parse(saved) : { protein: 0, carbs: 0, fats: 0, calories: 0 };
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

    // Quick Workout Generator (Workout Tab)
    const btnQuickGen = document.getElementById('btnQuickGenerateWorkout');
    if (btnQuickGen) {
      btnQuickGen.addEventListener('click', () => this.quickGenerateWorkout());
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

        // Instant live feedback in Step 2: routine generated as soon as free days selected
        const h = parseFloat(document.getElementById('wizHeight').value) || this.profile.heightCm;
        const w = parseFloat(document.getElementById('wizWeight').value) || this.profile.weightKg;
        const notice = document.getElementById('wizWorkoutGeneratedNotice');
        const noticeText = document.getElementById('wizWorkoutGeneratedText');
        if (notice && noticeText) {
          noticeText.textContent = `⚡ Workout Generated: ${this.wizardFreeDays}-Day routine customized for ${h} cm & ${w} kg!`;
          notice.classList.remove('hidden');
        }
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
        statusBox.textContent = `✓ Successfully Paired with ${this.pairedWatch}!`;
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

      // Update live generation notice for step 2
      const notice = document.getElementById('wizWorkoutGeneratedNotice');
      const noticeText = document.getElementById('wizWorkoutGeneratedText');
      if (notice && noticeText) {
        noticeText.textContent = `⚡ Custom ${this.wizardFreeDays || 4}-Day routine ready for ${h} cm & ${w} kg. Select your schedule below:`;
        notice.classList.remove('hidden');
      }
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

    if (!hInput || !wInput || !dInput || !gInput) return;

    const h = parseFloat(hInput.value) || this.profile.heightCm;
    const w = parseFloat(wInput.value) || this.profile.weightKg;
    const days = parseInt(dInput.value, 10) || this.profile.freeDays;
    const goal = gInput.value || this.profile.goal;

    this.profile.heightCm = h;
    this.profile.weightKg = w;
    this.profile.freeDays = days;
    this.profile.goal = goal;

    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    this.syncProfileToInputs();
    this.renderAll();

    const toast = document.getElementById('quickWorkoutToast');
    const toastMsg = document.getElementById('quickWorkoutToastMsg');
    if (toast) {
      if (toastMsg) {
        toastMsg.textContent = `✓ Generated ${days}-Day routine for ${h} cm & ${w} kg!`;
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
    this.renderAll();

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
        strength: 'Strength',
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

    // 2. Workout Tab Render: Dynamic Profile & Biomechanics Banner
    const profileBanner = document.getElementById('workoutProfileBanner');
    if (profileBanner) {
      const goalsMap = {
        lose_weight: 'Burn Fat & Shred',
        gain_muscle: 'Build Lean Muscle (Hypertrophy)',
        strength: 'Maximize Strength & Power',
        maintain: 'Healthy Athletic Maintenance'
      };

      profileBanner.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ACTIVE SPLIT
              </span>
              <span class="text-xs text-slate-400 font-mono">${workoutPlan.schedule.length} Training Days / Week</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              ${workoutPlan.splitName}
            </h3>
            <p class="text-xs sm:text-sm text-slate-300 mt-1">
              Personalized for your <strong class="text-white">${this.profile.heightCm} cm</strong> height, <strong class="text-white">${this.profile.weightKg} kg</strong> weight, and <strong class="text-emerald-400">${this.profile.freeDays}-day</strong> weekly schedule.
            </p>
          </div>

          <!-- Parameter Summary Badges -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-semibold text-slate-200">
              🎯 ${goalsMap[this.profile.goal] || this.profile.goal}
            </span>
            <span class="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs font-semibold text-emerald-400 font-mono">
              BMI: ${workoutPlan.bmi} (${workoutPlan.bmiCategory})
            </span>
          </div>
        </div>

        <!-- Biomechanical & Training Protocol Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <!-- Leverage & Joint Physics -->
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🦴</span> <span>Biomechanical Leverage</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              ${workoutPlan.leverageNote}
            </p>
          </div>

          <!-- Reps & Rest Strategy -->
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⏱️</span> <span>Sets & Rest Intervals</span>
            </div>
            <div class="text-xs text-slate-200 font-semibold">
              ${workoutPlan.defaultSets} sets • ${workoutPlan.repScheme}
            </div>
            <div class="text-[11px] text-slate-400">
              Rest: <span class="text-cyan-400 font-mono font-medium">${workoutPlan.restTime}</span>
            </div>
          </div>

          <!-- Pacing & Execution Tempo -->
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span> <span>Tempo & Execution</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              ${workoutPlan.pacingStrategy}
            </p>
          </div>
        </div>
      `;
    }

    // Schedule Cards Render
    const workoutContainer = document.getElementById('workoutScheduleContainer');
    if (workoutContainer) {
      workoutContainer.innerHTML = '';
      workoutPlan.schedule.forEach((daySchedule) => {
        const card = document.createElement('div');
        card.className = 'glass-card p-5 sm:p-6 mb-5 border border-white/10 shadow-xl';
        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/10 gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  ${daySchedule.day}
                </span>
                <span class="text-xs text-slate-400 font-mono">⏱️ ${daySchedule.duration || '55 min'}</span>
              </div>
              <h4 class="text-lg sm:text-xl font-black text-white mt-2">${daySchedule.focus}</h4>
            </div>
            <span class="text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/5">
              ${daySchedule.exercises.length} Exercises + Finisher
            </span>
          </div>

          <!-- Exercises Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            ${daySchedule.exercises.map(ex => `
              <div class="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 hover:border-emerald-500/30 transition flex flex-col justify-between">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-bold text-slate-100 text-sm leading-snug">${ex.name}</div>
                    <span class="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                      ${ex.sets} sets
                    </span>
                  </div>
                  <div class="text-[11px] text-cyan-400 font-medium mt-0.5">${ex.target || ''}</div>
                  ${ex.formCue ? `<p class="text-[11px] text-slate-400 mt-2 bg-slate-950/60 p-2 rounded-lg border border-white/5 leading-relaxed">💡 <strong class="text-slate-300">Cue:</strong> ${ex.formCue}</p>` : ''}
                </div>
                <div class="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/5 text-[11px] text-slate-400 font-mono">
                  <span>Target: <strong class="text-slate-200">${ex.reps}</strong></span>
                  <span>Rest: <strong class="text-emerald-400">${ex.rest || '60s'}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- End-of-Session Finisher / Recovery Card -->
          ${daySchedule.finisher ? `
            <div class="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm">🏁</span>
                  <span class="text-xs font-bold text-emerald-300 uppercase tracking-wider">${daySchedule.finisher.title}</span>
                  <span class="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">${daySchedule.finisher.duration}</span>
                </div>
                <p class="text-xs text-slate-300 mt-1 leading-relaxed">${daySchedule.finisher.description}</p>
              </div>
              <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap self-end sm:self-auto">
                Goal Focused
              </span>
            </div>
          ` : ''}
        `;
        workoutContainer.appendChild(card);
      });
    }

    // 3. Nutrition Tab Render
    const groceryContainer = document.getElementById('groceryListContainer');
    if (groceryContainer) {
      groceryContainer.innerHTML = mealPlan.groceryList.map(item => `
        <div class="flex items-start justify-between p-3.5 rounded-lg bg-slate-900/60 border border-white/5">
          <div>
            <div class="font-semibold text-white text-sm">🥗 ${item.item}</div>
            <div class="text-xs text-slate-400 mt-0.5">${item.reason}</div>
          </div>
          <span class="badge-pill bg-emerald-500/10 text-emerald-400 text-xs">High Value</span>
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
