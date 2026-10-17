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
      selectedDays: Array.isArray(saved.selectedDays) && saved.selectedDays.length >= 2 ? saved.selectedDays : ['Mon', 'Tue', 'Thu', 'Fri'],
      freeDays: Math.min(6, Math.max(2, (saved.selectedDays ? saved.selectedDays.length : Number(saved.freeDays)) || 4)),
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
        { id: 'entry_3', timestamp: new Date('2026-10-13T12:00:00').getTime(), date: '2026-10-13', weight: 78.0, notes: 'Hit all 4 workout days, meals on budget' },
        { id: 'entry_2', timestamp: new Date('2026-10-08T12:00:00').getTime(), date: '2026-10-08', weight: 78.8, notes: 'Feeling stronger, hit protein target' },
        { id: 'entry_1', timestamp: new Date('2026-10-01T12:00:00').getTime(), date: '2026-10-01', weight: 79.5, notes: 'Day 1: Started RTM journey' }
      ];
    }
    this.sortProgressHistory();

    // Paired smartwatch device
    this.pairedWatch = localStorage.getItem('rtm_paired_watch') || null;
    this.selectedWatchDevice = 'Apple Watch';

    // Active day view in Workout tab (defaults to today's day of week)
    this.activeWorkoutDay = null;

    // Workout tab training days selection (synced with profile)
    this.workoutTabSelectedDays = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.length >= 2
      ? [...this.profile.selectedDays]
      : ['Mon', 'Tue', 'Thu', 'Fri'];

    // Weekly meal staples show/hide preference (defaults to false so meals are primary)
    this.showWeeklyStaples = localStorage.getItem('rtm_show_weekly_staples') === 'true';

    this.init();
  }

  init() {
    this.initTheme();
    this.checkDailyReset();
    this.bindEvents();
    this.initFoodMacroTracker();
    this.syncProfileToInputs();
    this.renderAll();
    this.syncWatchUI();
    this.initWeighInReminder();

    // Check for 24-hour daily rollover and reminders whenever app becomes active or visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkDailyReset();
        this.checkWeighInReminder();
      }
    });
    window.addEventListener('focus', () => {
      this.checkDailyReset();
      this.checkWeighInReminder();
    });
    setInterval(() => {
      this.checkDailyReset();
      this.checkWeighInReminder();
    }, 60000);

    // Always launch the onboarding wizard on every page load / refresh
    this.openWizard();
  }

  // Local day of week code ('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')
  getTodayDayCode() {
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return daysMap[new Date().getDay()];
  }

  getDayFullName(code) {
    const fullNames = {
      Mon: 'Monday',
      Tue: 'Tuesday',
      Wed: 'Wednesday',
      Thu: 'Thursday',
      Fri: 'Friday',
      Sat: 'Saturday',
      Sun: 'Sunday'
    };
    return fullNames[code] || code;
  }

  setWorkoutDay(dayCode) {
    this.activeWorkoutDay = dayCode;
    this.renderAll();
  }

  toggleWorkoutDay(dayCode) {
    if (!Array.isArray(this.profile.selectedDays)) {
      this.profile.selectedDays = ['Mon', 'Tue', 'Thu', 'Fri'];
    }
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (this.profile.selectedDays.includes(dayCode)) {
      if (this.profile.selectedDays.length <= 2) {
        alert('You must have at least 2 training days in your weekly plan.');
        return;
      }
      this.profile.selectedDays = this.profile.selectedDays.filter(d => d !== dayCode);
    } else {
      if (this.profile.selectedDays.length >= 6) {
        alert('Maximum 6 training days per week allowed for adequate recovery.');
        return;
      }
      this.profile.selectedDays.push(dayCode);
    }

    this.profile.selectedDays.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
    this.profile.freeDays = Math.min(6, Math.max(2, this.profile.selectedDays.length));

    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    this.syncProfileToInputs();
    this.renderAll();
  }

  openWizardAtDays() {
    this.openChangeStats();
  }

  // Local date helper (YYYY-MM-DD in user's local timezone)
  getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Automatically reset overview macros every 24 hours / midnight rollover
  checkDailyReset() {
    const today = this.getTodayDateString();
    const lastActive = localStorage.getItem('rtm_last_active_date');
    if (!lastActive) {
      localStorage.setItem('rtm_last_active_date', today);
    } else if (lastActive !== today) {
      localStorage.setItem('rtm_last_active_date', today);
      // New day: refresh UI so daily overview totals start fresh at 0
      this.renderAll();
      this.renderFoodLog();
    }
  }

  // Daily intake tracker (stored per local date)
  getTodayKey() {
    return 'rtm_intake_' + this.getTodayDateString();
  }

  getFoodLogKey() {
    return 'rtm_food_log_' + this.getTodayDateString();
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

  // Done Meals Tracking (tied to local date)
  getDoneMealsKey() {
    return 'rtm_meals_done_' + this.getTodayDateString();
  }

  getDoneMealsList() {
    try {
      const saved = localStorage.getItem(this.getDoneMealsKey());
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  isMealDoneToday(index) {
    const list = this.getDoneMealsList();
    return list.includes(index);
  }

  toggleMealDone(index) {
    const mealPlan = this.currentMealPlan;
    if (!mealPlan || !mealPlan.dailyMeals || !mealPlan.dailyMeals[index]) return;
    const meal = mealPlan.dailyMeals[index];

    let list = this.getDoneMealsList();
    const mealLogId = `meallog_${index}_${this.getTodayDateString()}`;

    if (list.includes(index)) {
      // Toggle off / undo: remove from done list and deduct macros
      list = list.filter(i => i !== index);
      localStorage.setItem(this.getDoneMealsKey(), JSON.stringify(list));
      this.removeFoodLogItem(mealLogId);
    } else {
      // Mark as done
      list.push(index);
      localStorage.setItem(this.getDoneMealsKey(), JSON.stringify(list));

      // 1. Update intake totals
      const intake = this.getDailyIntake();
      intake.protein = Math.max(0, Math.round(intake.protein + (meal.protein || 0)));
      intake.carbs = Math.max(0, Math.round(intake.carbs + (meal.carbs || 0)));
      intake.fats = Math.max(0, Math.round(intake.fats + (meal.fats || 0)));
      intake.calories = Math.max(0, Math.round(intake.calories + (meal.calories || 0)));
      localStorage.setItem(this.getTodayKey(), JSON.stringify(intake));

      // 2. Append to daily food log (Displayed as Meal x)
      const log = this.getDailyFoodLog();
      const filteredLog = log.filter(item => item.id !== mealLogId);
      filteredLog.unshift({
        id: mealLogId,
        mealIndex: index,
        type: 'meal',
        name: `Meal ${index + 1}`,
        grams: null,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fats: meal.fats || 0,
        calories: meal.calories || 0,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.saveDailyFoodLog(filteredLog);

      // 3. Re-render UI
      this.renderAll();
      this.renderFoodLog();
    }
  }

  // Toggle Weekly Meal Staples show/hide state
  toggleWeeklyStaples(forceState) {
    if (typeof forceState === 'boolean') {
      this.showWeeklyStaples = forceState;
    } else {
      this.showWeeklyStaples = !this.showWeeklyStaples;
    }
    localStorage.setItem('rtm_show_weekly_staples', this.showWeeklyStaples ? 'true' : 'false');
    this.updateWeeklyStaplesVisibility();
  }

  // Synchronize Weekly Meal Staples show/hide UI state
  updateWeeklyStaplesVisibility() {
    const body = document.getElementById('weeklyStaplesBody');
    const btn = document.getElementById('toggleWeeklyStaplesBtn');
    const btnText = document.getElementById('toggleWeeklyStaplesBtnText');
    const btnIcon = document.getElementById('toggleWeeklyStaplesIcon');
    const quickBtnText = document.getElementById('quickToggleStaplesText');
    const quickBtnIcon = document.getElementById('quickToggleStaplesIcon');

    if (body) {
      body.classList.toggle('hidden', !this.showWeeklyStaples);
    }
    if (btn) {
      btn.setAttribute('aria-expanded', this.showWeeklyStaples ? 'true' : 'false');
    }
    if (btnText) {
      btnText.textContent = this.showWeeklyStaples ? 'Hide Staples' : 'Show Staples';
    }
    if (btnIcon) {
      if (this.showWeeklyStaples) {
        btnIcon.classList.add('rotate-180');
      } else {
        btnIcon.classList.remove('rotate-180');
      }
    }
    if (quickBtnText) {
      quickBtnText.textContent = this.showWeeklyStaples ? 'Hide Staples' : 'Weekly Staples';
    }
    if (quickBtnIcon) {
      if (this.showWeeklyStaples) {
        quickBtnIcon.classList.add('rotate-180');
      } else {
        quickBtnIcon.classList.remove('rotate-180');
      }
    }
  }

  initFoodMacroTracker() {
    const foodSelect = document.getElementById('macroFoodSelect');
    const searchInput = document.getElementById('macroFoodSearch');
    const searchCount = document.getElementById('foodSearchCount');
    const gramsInput = document.getElementById('macroFoodGrams');
    const toggleBtn = document.getElementById('toggleAddMacroBtn');
    const closeBtn = document.getElementById('closeAddMacroBtn');
    const addBtn = document.getElementById('btnAddFoodToMacros');
    const resetBtn = document.getElementById('resetDailyMacrosBtn');
    const resetOverviewBtn = document.getElementById('btnResetOverviewMacros');
    const addSection = document.getElementById('addMacroSection');

    // Populate food select with grouped categories and optional search query
    const populateFoodSelect = (query = '') => {
      if (!foodSelect || !window.PlanEngine || !window.PlanEngine.foodDatabase) return;
      foodSelect.innerHTML = '';
      const cleanQ = String(query || '').trim().toLowerCase();

      const matchedFoods = cleanQ
        ? window.PlanEngine.foodDatabase.filter(item =>
            item.name.toLowerCase().includes(cleanQ) || item.category.toLowerCase().includes(cleanQ)
          )
        : window.PlanEngine.foodDatabase;

      if (searchCount) {
        searchCount.textContent = cleanQ
          ? `${matchedFoods.length} ${matchedFoods.length === 1 ? 'match' : 'matches'}`
          : '';
      }

      if (matchedFoods.length === 0) {
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.disabled = true;
        emptyOpt.selected = true;
        emptyOpt.textContent = `No foods matching "${query}"`;
        foodSelect.appendChild(emptyOpt);
        return;
      }

      const categories = {};
      matchedFoods.forEach(item => {
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

      if (foodSelect.options.length > 0) {
        foodSelect.selectedIndex = 0;
        this.updateFoodMacroPreview();
      }
    };

    // Initial population
    populateFoodSelect('');

    // Search input listener
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        populateFoodSelect(e.target.value);
      });
    }

    // Toggle panel
    if (toggleBtn && addSection) {
      toggleBtn.addEventListener('click', () => {
        addSection.classList.toggle('hidden');
        if (!addSection.classList.contains('hidden')) {
          if (searchInput) {
            searchInput.value = '';
            populateFoodSelect('');
            searchInput.focus();
          } else {
            this.updateFoodMacroPreview();
            if (gramsInput) gramsInput.focus();
          }
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

    // Add button: adds food to daily totals and automatically closes menu
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const foodId = foodSelect ? foodSelect.value : 'beef';
        if (!foodId) return;
        const grams = parseFloat(gramsInput ? gramsInput.value : 100) || 100;
        this.addFoodToDailyMacros(foodId, grams);

        // Automatically close the menu after adding
        if (addSection) {
          addSection.classList.add('hidden');
        }
      });
    }

    // Reset buttons (Header Reset button + In-log Reset link)
    const handleMacroReset = () => {
      this.resetDailyMacros();
    };
    if (resetBtn) {
      resetBtn.addEventListener('click', handleMacroReset);
    }
    if (resetOverviewBtn) {
      resetOverviewBtn.addEventListener('click', handleMacroReset);
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

    // 2. Append to daily food log (Added from macros as the food it is)
    const log = this.getDailyFoodLog();
    log.unshift({
      id: 'log_' + Date.now(),
      type: 'food',
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
    if (index === -1) {
      this.renderAll();
      return;
    }

    const [removed] = log.splice(index, 1);
    this.saveDailyFoodLog(log);

    // Deduct from intake
    const intake = this.getDailyIntake();
    intake.protein = Math.max(0, Math.round(intake.protein - (removed.protein || 0)));
    intake.carbs = Math.max(0, Math.round(intake.carbs - (removed.carbs || 0)));
    intake.fats = Math.max(0, Math.round(intake.fats - (removed.fats || 0)));
    intake.calories = Math.max(0, Math.round(intake.calories - (removed.calories || 0)));
    localStorage.setItem(this.getTodayKey(), JSON.stringify(intake));

    // If this entry was a logged meal, unmark it in done list
    const mealIdx = (removed && removed.mealIndex !== undefined && !isNaN(removed.mealIndex))
      ? removed.mealIndex
      : (String(logId).startsWith('meallog_') ? parseInt(logId.split('_')[1], 10) : null);

    if (mealIdx !== null && !isNaN(mealIdx)) {
      let list = this.getDoneMealsList();
      if (list.includes(mealIdx)) {
        list = list.filter(i => i !== mealIdx);
        localStorage.setItem(this.getDoneMealsKey(), JSON.stringify(list));
      }
    }

    this.renderAll();
    this.renderFoodLog();
  }

  resetDailyMacros() {
    localStorage.setItem(this.getTodayKey(), JSON.stringify({ protein: 0, carbs: 0, fats: 0, calories: 0 }));
    this.saveDailyFoodLog([]);
    localStorage.setItem(this.getDoneMealsKey(), JSON.stringify([]));
    this.renderAll();
    this.renderFoodLog();
  }

  renderFoodLog() {
    const container = document.getElementById('todayFoodLogList');
    const countEl = document.getElementById('todayFoodLogCount');
    const badgeEl = document.getElementById('overviewFoodLogCountBadge');
    if (!container) return;

    const log = this.getDailyFoodLog();
    const countText = log.length > 0 ? `${log.length} ${log.length === 1 ? 'item' : 'items'}` : '0 items';
    if (countEl) countEl.textContent = countText;
    if (badgeEl) badgeEl.textContent = `${log.length}`;

    if (log.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 space-y-2">
          <svg class="w-8 h-8 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <p class="text-xs font-semibold text-slate-300">No foods logged today yet</p>
          <p class="text-[11px] text-slate-500 max-w-xs mx-auto">Use <span class="text-emerald-400 font-bold">+ Add to Macros</span> or mark meals <span class="text-emerald-400 font-bold">Done</span> to track your daily intake.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = log.map(item => {
      // Determine if item is a Meal (from meal plan done) or a single Food item (from macros)
      const isMeal = (item.type === 'meal') || String(item.id).startsWith('meallog_');
      let displayName = item.name;
      if (isMeal) {
        if (item.mealIndex !== undefined && !isNaN(item.mealIndex)) {
          displayName = `Meal ${item.mealIndex + 1}`;
        } else if (String(item.id).startsWith('meallog_')) {
          const parts = String(item.id).split('_');
          const idx = parseInt(parts[1], 10);
          displayName = isNaN(idx) ? (item.name && item.name.startsWith('Meal ') ? item.name : 'Meal') : `Meal ${idx + 1}`;
        } else if (!displayName || !displayName.toLowerCase().startsWith('meal ')) {
          displayName = 'Meal';
        }
      }

      return `
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-white/5 hover:border-white/15 transition text-xs gap-3">
        <div class="space-y-0.5 flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-white text-xs sm:text-sm truncate">${displayName}</span>
            ${isMeal
              ? `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Meal Plan</span>`
              : (item.grams ? `<span class="text-[11px] font-mono text-emerald-400 font-semibold">${item.grams}g</span>` : '')
            }
            <span class="text-[10px] text-slate-500 font-mono">${item.time || ''}</span>
          </div>
          <div class="text-[11px] text-slate-400 font-mono flex items-center gap-2 flex-wrap">
            <span class="text-emerald-400 font-semibold">+${item.protein}g P</span> · 
            <span class="text-cyan-400 font-semibold">+${item.carbs}g C</span> · 
            <span class="text-amber-400 font-semibold">+${item.fats}g F</span> · 
            <span class="text-slate-200 font-semibold">+${item.calories} kcal</span>
          </div>
        </div>
        <button onclick="window.rtmApp && window.rtmApp.removeFoodLogItem('${item.id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0" title="Delete this food item">
          <span>Delete</span>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
    }).join('');
  }

  openFoodLogModal() {
    this.renderFoodLog();
    const modal = document.getElementById('foodLogModal');
    if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeFoodLogModal() {
    const modal = document.getElementById('foodLogModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
  }

  // Event bindings
  bindEvents() {
    // Food Log Modal (On-demand view of today's logged foods)
    const btnOpenFoodLog = document.getElementById('btnOpenFoodLog');
    if (btnOpenFoodLog) {
      btnOpenFoodLog.addEventListener('click', () => this.openFoodLogModal());
    }

    const closeFoodLogModalBtn = document.getElementById('closeFoodLogModalBtn');
    if (closeFoodLogModalBtn) {
      closeFoodLogModalBtn.addEventListener('click', () => this.closeFoodLogModal());
    }

    const closeFoodLogModalBottomBtn = document.getElementById('closeFoodLogModalBottomBtn');
    if (closeFoodLogModalBottomBtn) {
      closeFoodLogModalBottomBtn.addEventListener('click', () => this.closeFoodLogModal());
    }

    const foodLogModal = document.getElementById('foodLogModal');
    if (foodLogModal) {
      foodLogModal.addEventListener('click', (e) => {
        if (e.target === foodLogModal) this.closeFoodLogModal();
      });
    }

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

    // Weekly Meal Staples show/hide toggle option (Meals Tab)
    const toggleWeeklyStaplesBtn = document.getElementById('toggleWeeklyStaplesBtn');
    if (toggleWeeklyStaplesBtn) {
      toggleWeeklyStaplesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleWeeklyStaples();
      });
    }

    const weeklyStaplesHeader = document.getElementById('weeklyStaplesHeader');
    if (weeklyStaplesHeader) {
      weeklyStaplesHeader.addEventListener('click', () => {
        this.toggleWeeklyStaples();
      });
    }

    const quickToggleStaplesBtn = document.getElementById('quickToggleStaplesBtn');
    if (quickToggleStaplesBtn) {
      quickToggleStaplesBtn.addEventListener('click', () => {
        const willOpen = !this.showWeeklyStaples;
        this.toggleWeeklyStaples();
        if (willOpen) {
          document.getElementById('weeklyStaplesCard')?.scrollIntoView({ behavior: 'smooth' });
        }
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

    // Theme Options in Settings Modal
    const themeDarkBtn = document.getElementById('themeDarkBtn');
    if (themeDarkBtn) {
      themeDarkBtn.addEventListener('click', () => this.setTheme('dark'));
    }

    const themeLightBtn = document.getElementById('themeLightBtn');
    if (themeLightBtn) {
      themeLightBtn.addEventListener('click', () => this.setTheme('light'));
    }

    // Weigh-In Reminder Frequency Buttons
    document.querySelectorAll('.reminder-freq-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const freq = btn.getAttribute('data-freq');
        if (freq) this.setWeighInReminder(freq);
      });
    });

    // Smart Watch Options Button in Settings
    const btnSettingsSmartwatch = document.getElementById('btnSettingsSmartwatch');
    if (btnSettingsSmartwatch) {
      btnSettingsSmartwatch.addEventListener('click', () => {
        this.closeSettings();
        this.openSmartwatchModal();
      });
    }

    // Change Stats Button in Settings Menu (opens Change Stats modal, NOT the wizard)
    const btnChangeStats = document.getElementById('btnChangeStats');
    if (btnChangeStats) {
      btnChangeStats.addEventListener('click', () => {
        this.closeSettings();
        this.openChangeStats();
      });
    }

    // Change Stats Modal Close & Backdrop
    const closeChangeStatsBtn = document.getElementById('closeChangeStatsBtn');
    if (closeChangeStatsBtn) {
      closeChangeStatsBtn.addEventListener('click', () => this.closeChangeStats());
    }

    const changeStatsModal = document.getElementById('changeStatsModal');
    if (changeStatsModal) {
      changeStatsModal.addEventListener('click', (e) => {
        if (e.target === changeStatsModal) this.closeChangeStats();
      });
    }

    // Save Change Stats & Generate Workout
    const btnSaveChangeStats = document.getElementById('btnSaveChangeStats');
    if (btnSaveChangeStats) {
      btnSaveChangeStats.addEventListener('click', () => this.saveChangeStats());
    }

    // Change Stats Day Checkboxes
    document.querySelectorAll('.cs-day-checkbox').forEach(card => {
      card.addEventListener('click', () => {
        const day = card.getAttribute('data-day');
        if (!Array.isArray(this.csSelectedDays)) {
          this.csSelectedDays = ['Mon', 'Tue', 'Thu', 'Fri'];
        }

        if (this.csSelectedDays.includes(day)) {
          if (this.csSelectedDays.length <= 2) {
            const toast = document.getElementById('csScheduleToast');
            if (toast) {
              toast.textContent = 'Please select at least 2 training days!';
              toast.classList.remove('hidden');
              setTimeout(() => toast.classList.add('hidden'), 2000);
            }
            return;
          }
          this.csSelectedDays = this.csSelectedDays.filter(d => d !== day);
        } else {
          if (this.csSelectedDays.length >= 6) {
            const toast = document.getElementById('csScheduleToast');
            if (toast) {
              toast.textContent = 'Maximum 6 training days recommended (at least 1 rest day)!';
              toast.classList.remove('hidden');
              setTimeout(() => toast.classList.add('hidden'), 2000);
            }
            return;
          }
          this.csSelectedDays.push(day);
        }
        this.updateChangeStatsDaysUI();
      });
    });

    // Change Stats Goal Cards
    document.querySelectorAll('.cs-goal-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.cs-goal-card').forEach(c => c.classList.remove('selected-card'));
        card.classList.add('selected-card');
        this.csGoal = card.getAttribute('data-goal');
      });
    });

    // Change Stats Budget Cards
    document.querySelectorAll('.cs-budget-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.cs-budget-card').forEach(c => c.classList.remove('selected-card'));
        card.classList.add('selected-card');
        this.csBudgetTier = card.getAttribute('data-budget');
      });
    });

    // Profile Settings Form (legacy fallback)
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

    // Workout Split Tab Day Checkboxes (Choose Free Days like the wizard)
    document.querySelectorAll('.workout-tab-day-btn').forEach(card => {
      card.addEventListener('click', () => {
        const day = card.getAttribute('data-day');
        if (!Array.isArray(this.workoutTabSelectedDays)) {
          this.workoutTabSelectedDays = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.length >= 2
            ? [...this.profile.selectedDays]
            : ['Mon', 'Tue', 'Thu', 'Fri'];
        }

        if (this.workoutTabSelectedDays.includes(day)) {
          if (this.workoutTabSelectedDays.length <= 2) {
            const toast = document.getElementById('quickWorkoutToast');
            const toastMsg = document.getElementById('quickWorkoutToastMsg');
            if (toast && toastMsg) {
              toastMsg.textContent = 'Please select at least 2 training days!';
              toast.classList.remove('hidden');
              setTimeout(() => toast.classList.add('hidden'), 2000);
            }
            return;
          }
          this.workoutTabSelectedDays = this.workoutTabSelectedDays.filter(d => d !== day);
        } else {
          if (this.workoutTabSelectedDays.length >= 6) {
            const toast = document.getElementById('quickWorkoutToast');
            const toastMsg = document.getElementById('quickWorkoutToastMsg');
            if (toast && toastMsg) {
              toastMsg.textContent = 'Maximum 6 training days per week!';
              toast.classList.remove('hidden');
              setTimeout(() => toast.classList.add('hidden'), 2000);
            }
            return;
          }
          this.workoutTabSelectedDays.push(day);
        }
        this.updateWorkoutTabDayUI();
      });
    });

    // Wizard Day-of-Week Checkboxes (Choose Free Days)
    document.querySelectorAll('.wizard-day-checkbox').forEach(card => {
      card.addEventListener('click', () => {
        const day = card.getAttribute('data-day');
        if (!Array.isArray(this.wizardSelectedDays)) {
          this.wizardSelectedDays = ['Mon', 'Tue', 'Thu', 'Fri'];
        }

        if (this.wizardSelectedDays.includes(day)) {
          if (this.wizardSelectedDays.length <= 2) {
            const toast = document.getElementById('wizScheduleToast');
            if (toast) {
              toast.classList.remove('opacity-0', 'pointer-events-none');
              setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2000);
            }
            return;
          }
          this.wizardSelectedDays = this.wizardSelectedDays.filter(d => d !== day);
        } else {
          if (this.wizardSelectedDays.length >= 6) {
            const toastMax = document.getElementById('wizScheduleToastMax');
            if (toastMax) {
              toastMax.classList.remove('opacity-0', 'pointer-events-none');
              setTimeout(() => toastMax.classList.add('opacity-0', 'pointer-events-none'), 2000);
            }
            return;
          }
          this.wizardSelectedDays.push(day);
        }
        this.updateWizardDayUI();
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

    const settingsWatchSub = document.getElementById('settingsWatchSubtitle');
    if (this.pairedWatch) {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (text) text.textContent = `Connected: ${this.pairedWatch} (Streaming)`;
      if (btnText) btnText.textContent = `Change Watch`;
      if (settingsWatchSub) settingsWatchSub.textContent = `Connected: ${this.pairedWatch} (Streaming biometrics)`;
    } else {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-600';
      if (text) text.textContent = 'No wearable connected';
      if (btnText) btnText.textContent = 'Add Smart Watch';
      if (settingsWatchSub) settingsWatchSub.textContent = 'Pair Apple Watch, Garmin, Galaxy, or sync biometrics';
    }
  }

  // ============================================
  // Onboarding Wizard Logic
  // ============================================
  openWizard() {
    this.wizardStep = 1;
    this.wizardSelectedDays = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.length >= 2
      ? [...this.profile.selectedDays]
      : ['Mon', 'Tue', 'Thu', 'Fri'];
    this.wizardFreeDays = Math.min(6, Math.max(2, this.wizardSelectedDays.length));
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

    // Select matching days and cards in steps 2, 3, 4
    this.updateWizardDayUI();

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

  updateWizardDayUI() {
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!Array.isArray(this.wizardSelectedDays)) {
      this.wizardSelectedDays = ['Mon', 'Tue', 'Thu', 'Fri'];
    }
    this.wizardSelectedDays.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));

    document.querySelectorAll('.wizard-day-checkbox').forEach(card => {
      const day = card.getAttribute('data-day');
      const isSelected = this.wizardSelectedDays.includes(day);
      card.classList.toggle('selected-card', isSelected);
      const statusEl = card.querySelector('.day-status');
      if (statusEl) {
        statusEl.textContent = isSelected ? 'Free' : 'Rest';
        statusEl.className = isSelected
          ? 'text-[10px] text-emerald-400 font-semibold mt-1 day-status'
          : 'text-[10px] text-slate-500 font-medium mt-1 day-status';
      }
    });

    const count = this.wizardSelectedDays.length;
    this.wizardFreeDays = Math.min(6, Math.max(2, count));

    const countLabel = document.getElementById('wizardSelectedDaysCount');
    if (countLabel) {
      countLabel.textContent = `${count} ${count === 1 ? 'Day' : 'Days'} (${this.wizardSelectedDays.join(', ')})`;
    }

    const badge = document.getElementById('wizardSplitBadge');
    const detail = document.getElementById('wizardSplitDetail');

    const splitInfo = {
      2: { name: 'Full Body A/B (2-Day)', detail: 'High-efficiency compound strength with maximum recovery.' },
      3: { name: 'Push / Pull / Legs (3-Day)', detail: 'Classic athletic balance targeting all muscle groups.' },
      4: { name: 'Upper / Lower Split (4-Day)', detail: 'Optimal muscle building frequency & recovery balance.' },
      5: { name: 'Upper / Lower + PPL (5-Day)', detail: 'High volume athletic conditioning for advanced progression.' },
      6: { name: 'Push / Pull / Legs x 2 (6-Day)', detail: 'Maximum volume dedicated bodybuilding routine.' }
    };

    if (count < 2) {
      if (badge) {
        badge.textContent = 'Select at least 2 days';
        badge.className = 'badge-pill bg-amber-500/15 text-amber-400 text-xs px-3 py-1 font-semibold border border-amber-500/30 whitespace-nowrap self-start sm:self-center';
      }
      if (detail) detail.textContent = 'Please select at least 2 free days to build a complete routine.';
    } else {
      const info = splitInfo[Math.min(6, count)] || splitInfo[4];
      if (badge) {
        badge.textContent = info.name;
        badge.className = 'badge-pill bg-emerald-500/15 text-emerald-400 text-xs px-3 py-1 font-semibold border border-emerald-500/30 whitespace-nowrap self-start sm:self-center';
      }
      if (detail) detail.textContent = info.detail;
    }
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

    if (this.wizardStep === 2) {
      if (!this.wizardSelectedDays || this.wizardSelectedDays.length < 2) {
        const toast = document.getElementById('wizScheduleToast');
        if (toast) {
          toast.classList.remove('opacity-0', 'pointer-events-none');
          setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2000);
        }
        return;
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

    const count = this.wizardSelectedDays ? this.wizardSelectedDays.length : 4;
    const days = Math.min(6, Math.max(2, count));

    this.profile = {
      heightCm: h,
      weightKg: w,
      age: a,
      gender: g,
      selectedDays: this.wizardSelectedDays || ['Mon', 'Tue', 'Thu', 'Fri'],
      freeDays: days,
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
  // Theme Management (Dark Mode / Light Mode)
  // ============================================
  initTheme() {
    const savedTheme = localStorage.getItem('rtm_theme') || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('rtm_theme', theme);

    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }

    this.updateThemeUI();
  }

  updateThemeUI() {
    const isDark = (this.theme || localStorage.getItem('rtm_theme') || 'dark') === 'dark';
    const darkBtn = document.getElementById('themeDarkBtn');
    const lightBtn = document.getElementById('themeLightBtn');

    if (darkBtn) {
      const circle = darkBtn.querySelector('.theme-circle');
      const badge = darkBtn.querySelector('.theme-active-badge');
      const label = darkBtn.querySelector('.theme-label');
      if (circle) {
        circle.className = isDark
          ? 'theme-circle w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-emerald-400 bg-slate-900 shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center transition-all duration-200 ring-4 ring-emerald-500/20 relative'
          : 'theme-circle w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white/10 bg-slate-800/60 shadow-md flex flex-col items-center justify-center transition-all duration-200 relative';
      }
      if (badge) badge.classList.toggle('hidden', !isDark);
      if (label) {
        label.className = isDark
          ? 'theme-label text-xs font-bold text-emerald-400 transition'
          : 'theme-label text-xs font-semibold text-slate-400 transition';
      }
    }

    if (lightBtn) {
      const circle = lightBtn.querySelector('.theme-circle');
      const badge = lightBtn.querySelector('.theme-active-badge');
      const label = lightBtn.querySelector('.theme-label');
      if (circle) {
        circle.className = !isDark
          ? 'theme-circle w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-emerald-400 bg-white shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center transition-all duration-200 ring-4 ring-emerald-500/20 relative'
          : 'theme-circle w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white/10 bg-slate-800/60 shadow-md flex flex-col items-center justify-center transition-all duration-200 relative';
      }
      if (badge) badge.classList.toggle('hidden', isDark);
      if (label) {
        label.className = !isDark
          ? 'theme-label text-xs font-bold text-emerald-600 transition'
          : 'theme-label text-xs font-semibold text-slate-400 transition';
      }
    }
  }

  // ============================================
  // Settings & Tabs
  // ============================================
  openSettings() {
    this.updateThemeUI();
    this.updateWeighInReminderUI();
    this.syncWatchUI();
    this.syncProfileToInputs();
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
  }

  // ============================================
  // Weigh-In Reminder Logic
  // ============================================
  initWeighInReminder() {
    this.weighInReminderFreq = localStorage.getItem('rtm_weigh_in_reminder_freq') || 'daily';
    this.updateWeighInReminderUI();
    this.checkWeighInReminder();
  }

  setWeighInReminder(freq) {
    this.weighInReminderFreq = freq;
    localStorage.setItem('rtm_weigh_in_reminder_freq', freq);
    this.updateWeighInReminderUI();

    if (freq !== 'off' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {}
    }
  }

  updateWeighInReminderUI() {
    const badge = document.getElementById('weighInReminderBadge');
    const freqLabels = {
      daily: 'Daily',
      '2days': 'Every 2 Days',
      weekly: 'Weekly',
      off: 'Off'
    };
    if (badge) {
      badge.textContent = freqLabels[this.weighInReminderFreq] || 'Daily';
      if (this.weighInReminderFreq === 'off') {
        badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10 font-bold';
      } else {
        badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold';
      }
    }

    document.querySelectorAll('.reminder-freq-btn').forEach(btn => {
      const f = btn.getAttribute('data-freq');
      const isSelected = (f === this.weighInReminderFreq);
      if (isSelected) {
        btn.className = 'reminder-freq-btn px-2 py-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20';
      } else {
        btn.className = 'reminder-freq-btn px-2 py-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-white/10';
      }
    });
  }

  checkWeighInReminder() {
    if (this.weighInReminderFreq === 'off') {
      const banner = document.getElementById('weighInReminderBanner');
      if (banner) banner.classList.add('hidden');
      return;
    }

    const lastWeighInTime = localStorage.getItem('rtm_last_weigh_in_timestamp');
    const lastReminderShown = localStorage.getItem('rtm_last_reminder_shown_date');
    const today = this.getTodayDateString();

    if (lastReminderShown === today) return;

    let intervalHours = 24;
    if (this.weighInReminderFreq === '2days') intervalHours = 48;
    if (this.weighInReminderFreq === 'weekly') intervalHours = 168;

    const now = Date.now();
    const shouldRemind = !lastWeighInTime || (now - parseInt(lastWeighInTime, 10)) >= intervalHours * 3600 * 1000;

    if (shouldRemind) {
      localStorage.setItem('rtm_last_reminder_shown_date', today);
      this.showWeighInReminderNotification();
    }
  }

  showWeighInReminderNotification() {
    const banner = document.getElementById('weighInReminderBanner');
    if (banner) {
      banner.classList.remove('hidden');
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('RTM Weigh In Reminder', {
          body: 'Tip: Measure your weight right after waking up for accurate results.',
          icon: './icon.png'
        });
      } catch (e) {}
    }
  }

  // ============================================
  // Change Stats Modal Logic (Dynamic Workout Generator)
  // ============================================
  openChangeStats() {
    this.csSelectedDays = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.length >= 2
      ? [...this.profile.selectedDays]
      : ['Mon', 'Tue', 'Thu', 'Fri'];
    this.csBudgetTier = this.profile.budgetTier || 'budget';
    this.csGoal = this.profile.goal || 'gain_muscle';

    const h = document.getElementById('csHeight');
    const w = document.getElementById('csWeight');
    const a = document.getElementById('csAge');
    const g = document.getElementById('csGender');

    if (h) h.value = this.profile.heightCm;
    if (w) w.value = this.profile.weightKg;
    if (a) a.value = this.profile.age;
    if (g) g.value = this.profile.gender || 'male';

    this.updateChangeStatsDaysUI();

    document.querySelectorAll('.cs-budget-card').forEach(c => {
      c.classList.toggle('selected-card', c.getAttribute('data-budget') === this.csBudgetTier);
    });

    document.querySelectorAll('.cs-goal-card').forEach(c => {
      c.classList.toggle('selected-card', c.getAttribute('data-goal') === this.csGoal);
    });

    const modal = document.getElementById('changeStatsModal');
    if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
  }

  closeChangeStats() {
    const modal = document.getElementById('changeStatsModal');
    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
  }

  updateChangeStatsDaysUI() {
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!Array.isArray(this.csSelectedDays)) {
      this.csSelectedDays = ['Mon', 'Tue', 'Thu', 'Fri'];
    }
    this.csSelectedDays.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));

    document.querySelectorAll('.cs-day-checkbox').forEach(card => {
      const day = card.getAttribute('data-day');
      const isSelected = this.csSelectedDays.includes(day);
      card.classList.toggle('selected-card', isSelected);
      const statusEl = card.querySelector('.cs-day-status');
      if (statusEl) {
        statusEl.textContent = isSelected ? 'Free' : 'Rest';
        statusEl.className = isSelected
          ? 'text-[10px] text-emerald-400 font-semibold mt-1 cs-day-status'
          : 'text-[10px] text-slate-500 font-medium mt-1 cs-day-status';
      }
    });

    const count = this.csSelectedDays.length;
    const countLabel = document.getElementById('csSelectedDaysCount');
    if (countLabel) {
      countLabel.textContent = `${count} ${count === 1 ? 'Day' : 'Days'} (${this.csSelectedDays.join(', ')})`;
    }

    const badge = document.getElementById('csSplitBadge');
    const splitInfo = {
      2: 'Full Body A/B (2-Day)',
      3: 'Push / Pull / Legs (3-Day)',
      4: 'Upper / Lower Split (4-Day)',
      5: 'Upper / Lower + PPL (5-Day)',
      6: 'Push / Pull / Legs x 2 (6-Day)'
    };
    if (badge) {
      badge.textContent = splitInfo[Math.min(6, Math.max(2, count))] || 'Upper / Lower Split (4-Day)';
    }
  }

  saveChangeStats() {
    const hInput = document.getElementById('csHeight');
    const wInput = document.getElementById('csWeight');
    const aInput = document.getElementById('csAge');
    const gInput = document.getElementById('csGender');

    const h = parseFloat(hInput ? hInput.value : this.profile.heightCm) || 175;
    const w = parseFloat(wInput ? wInput.value : this.profile.weightKg) || 78;
    const a = parseInt(aInput ? aInput.value : this.profile.age, 10) || 25;
    const g = gInput ? gInput.value : (this.profile.gender || 'male');

    if (!Array.isArray(this.csSelectedDays) || this.csSelectedDays.length < 2) {
      alert('Please select at least 2 training days!');
      return;
    }

    const count = this.csSelectedDays.length;
    const days = Math.min(6, Math.max(2, count));

    this.profile = {
      heightCm: h,
      weightKg: w,
      age: a,
      gender: g,
      selectedDays: [...this.csSelectedDays],
      freeDays: days,
      budgetTier: this.csBudgetTier || 'budget',
      goal: this.csGoal || 'gain_muscle'
    };

    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    localStorage.setItem('rtm_onboarded', 'true');

    this.closeChangeStats();
    this.syncProfileToInputs();
    this.renderAll();
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
    const qg = document.getElementById('quickWorkoutGoal');
    if (qh) qh.value = this.profile.heightCm;
    if (qw) qw.value = this.profile.weightKg;
    if (qg) qg.value = this.profile.goal;

    this.workoutTabSelectedDays = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.length >= 2
      ? [...this.profile.selectedDays]
      : ['Mon', 'Tue', 'Thu', 'Fri'];
    this.updateWorkoutTabDayUI();
  }

  updateWorkoutTabDayUI() {
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!Array.isArray(this.workoutTabSelectedDays)) {
      this.workoutTabSelectedDays = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.length >= 2
        ? [...this.profile.selectedDays]
        : ['Mon', 'Tue', 'Thu', 'Fri'];
    }
    this.workoutTabSelectedDays.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));

    document.querySelectorAll('.workout-tab-day-btn').forEach(card => {
      const day = card.getAttribute('data-day');
      const isSelected = this.workoutTabSelectedDays.includes(day);
      card.classList.toggle('selected-card', isSelected);
      const statusEl = card.querySelector('.tab-day-status');
      if (statusEl) {
        statusEl.textContent = isSelected ? 'Free' : 'Rest';
        statusEl.className = isSelected
          ? 'text-[10px] text-emerald-400 font-semibold mt-1 tab-day-status'
          : 'text-[10px] text-slate-500 font-medium mt-1 tab-day-status';
      }
    });

    const count = this.workoutTabSelectedDays.length;
    const countLabel = document.getElementById('tabSelectedDaysCount');
    if (countLabel) {
      countLabel.textContent = `${count} ${count === 1 ? 'Day' : 'Days'} (${this.workoutTabSelectedDays.join(', ')})`;
    }

    const badge = document.getElementById('tabSplitBadge');
    const splitInfo = {
      2: 'Full Body A/B (2-Day)',
      3: 'Push / Pull / Legs (3-Day)',
      4: 'Upper / Lower Split (4-Day)',
      5: 'Upper / Lower + PPL (5-Day)',
      6: 'Push / Pull / Legs x 2 (6-Day)'
    };
    if (badge) {
      badge.textContent = splitInfo[Math.min(6, Math.max(2, count))] || 'Upper / Lower Split (4-Day)';
    }
  }

  quickGenerateWorkout() {
    const hInput = document.getElementById('quickWorkoutHeight');
    const wInput = document.getElementById('quickWorkoutWeight');
    const gInput = document.getElementById('quickWorkoutGoal');

    const h = parseFloat(hInput ? hInput.value : this.profile.heightCm) || 175;
    const w = parseFloat(wInput ? wInput.value : this.profile.weightKg) || 78;
    const goal = (gInput ? gInput.value : this.profile.goal) || 'gain_muscle';

    if (!Array.isArray(this.workoutTabSelectedDays) || this.workoutTabSelectedDays.length < 2) {
      this.workoutTabSelectedDays = ['Mon', 'Tue', 'Thu', 'Fri'];
    }
    const selectedDays = [...this.workoutTabSelectedDays];
    const days = Math.min(6, Math.max(2, selectedDays.length));

    this.profile.heightCm = h;
    this.profile.weightKg = w;
    this.profile.selectedDays = selectedDays;
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
        toastMsg.textContent = `Generated ${days}-Day split (${selectedDays.join(', ')}) for ${h} cm & ${w} kg!`;
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

  sortProgressHistory() {
    if (!Array.isArray(this.progressHistory)) {
      this.progressHistory = [];
      return;
    }
    this.progressHistory.sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA; // Descending: Most recent first at the top
    });
  }

  addProgressLog() {
    const weightVal = parseFloat(document.getElementById('logWeight').value);
    const notesVal = document.getElementById('logNotes').value.trim();
    if (!weightVal) return;

    const now = new Date();
    const newEntry = {
      id: 'entry_' + Date.now(),
      timestamp: Date.now(),
      date: now.toISOString().split('T')[0],
      weight: weightVal,
      notes: notesVal || '-'
    };

    // Ensure new entry is placed at the top
    this.progressHistory.unshift(newEntry);
    this.sortProgressHistory();
    localStorage.setItem('rtm_history', JSON.stringify(this.progressHistory));

    this.profile.weightKg = weightVal;
    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    this.syncProfileToInputs();

    document.getElementById('logWeight').value = '';
    document.getElementById('logNotes').value = '';

    // Record last weigh in timestamp and dismiss reminder banner
    localStorage.setItem('rtm_last_weigh_in_timestamp', Date.now().toString());
    const reminderBanner = document.getElementById('weighInReminderBanner');
    if (reminderBanner) reminderBanner.classList.add('hidden');

    this.renderAll();
  }

  deleteProgressLog(identifier) {
    this.progressHistory = this.progressHistory.filter(e => (e.id ? e.id !== identifier : e.date !== identifier));
    this.sortProgressHistory();
    localStorage.setItem('rtm_history', JSON.stringify(this.progressHistory));
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

    // 1. Overview Render: Day of Week, Date & Training Day Display
    const now = new Date();
    const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = daysFull[now.getDay()];
    const dateFormatted = `${monthsShort[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    const dayTextEl = document.getElementById('overviewDayText');
    if (dayTextEl) dayTextEl.textContent = dayName;
    const dateTextEl = document.getElementById('overviewDateText');
    if (dateTextEl) dateTextEl.textContent = dateFormatted;

    // Show what training day it is in Overview
    const todayCode = this.getTodayDayCode(); // e.g. "Thu"
    const isFreeDay = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.includes(todayCode);

    const trainingBadge = document.getElementById('overviewTrainingDayBadge');
    const trainingDot = document.getElementById('overviewTrainingDot');
    const trainingText = document.getElementById('overviewTrainingDayText');
    const trainingFocus = document.getElementById('overviewTrainingDayFocus');

    if (isFreeDay) {
      const dayIdx = this.profile.selectedDays.indexOf(todayCode);
      const daySchedule = (workoutPlan && workoutPlan.schedule && workoutPlan.schedule[dayIdx])
        ? workoutPlan.schedule[dayIdx]
        : (workoutPlan && workoutPlan.schedule && workoutPlan.schedule[0]) || { day: 'Workout', focus: 'Training Session' };

      if (trainingBadge) {
        trainingBadge.className = 'px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300';
      }
      if (trainingDot) {
        trainingDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse';
      }
      if (trainingText) {
        trainingText.textContent = `${daySchedule.day}: ${daySchedule.focus}`;
      }
      if (trainingFocus) {
        trainingFocus.textContent = `· Training: ${daySchedule.focus}`;
      }
    } else {
      if (trainingBadge) {
        trainingBadge.className = 'px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 bg-slate-800/80 border border-white/10 text-slate-400';
      }
      if (trainingDot) {
        trainingDot.className = 'w-1.5 h-1.5 rounded-full bg-slate-500';
      }
      if (trainingText) {
        trainingText.textContent = 'Rest Day';
      }
      if (trainingFocus) {
        trainingFocus.textContent = '· Rest Day (Muscle Recovery)';
      }
    }

    // Overview Calories: progress / goal with a "/" in between
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

    // 2. Workout Tab Render: Clean & Focused on Today / Active Day
    const workoutContainer = document.getElementById('workoutScheduleContainer');
    if (workoutContainer) {
      workoutContainer.innerHTML = '';
      const cleanVal = (val) => String(val || '').replace(/\s*\(.*?\)/g, '').replace(/\s*reps?/i, '').replace(/\s*sets?/i, '').trim();

      const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const todayCode = this.getTodayDayCode(); // e.g. "Wed"
      const activeDay = this.activeWorkoutDay || todayCode;
      const dayFullName = this.getDayFullName(activeDay);
      const isToday = (activeDay === todayCode);
      const isFreeDay = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.includes(activeDay);

      // Clean 7-day pill strip (choose/view training vs rest days like the wizard)
      const stripHtml = `
        <div class="glass-card p-3 sm:p-4 border border-white/10 shadow-lg">
          <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white uppercase tracking-wider">Weekly Training Days</span>
              <span class="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                ${this.profile.selectedDays ? this.profile.selectedDays.length : 0} Free Days
              </span>
            </div>
            <button onclick="window.rtmApp && window.rtmApp.openWizardAtDays()" class="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition cursor-pointer flex items-center gap-1">
              <span>Change Days</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>

          <!-- 7-Day Selector Bar -->
          <div class="grid grid-cols-7 gap-1.5 sm:gap-2">
            ${daysOrder.map(dayCode => {
              const isSelected = (dayCode === activeDay);
              const isFree = Array.isArray(this.profile.selectedDays) && this.profile.selectedDays.includes(dayCode);
              const isCurrentDay = (dayCode === todayCode);
              return `
                <button onclick="window.rtmApp && window.rtmApp.setWorkoutDay('${dayCode}')" type="button" class="p-2 sm:p-2.5 rounded-xl transition text-center select-none flex flex-col items-center justify-center min-h-[58px] cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                    : isFree
                      ? 'bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-slate-900/50 border border-white/5 hover:border-white/15 opacity-70 hover:opacity-100'
                }">
                  <div class="flex items-center gap-1">
                    <span class="font-extrabold text-xs sm:text-sm ${isSelected ? 'text-emerald-300' : 'text-white'}">${dayCode}</span>
                    ${isCurrentDay ? `<span class="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Today"></span>` : ''}
                  </div>
                  <span class="text-[10px] font-bold mt-1 ${isFree ? 'text-emerald-400' : 'text-slate-500'}">
                    ${isFree ? 'Free' : 'Rest'}
                  </span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

      let mainContentHtml = '';

      if (!isFreeDay) {
        // Active day is a REST DAY
        mainContentHtml = `
          <div class="glass-card p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-slate-500"></span>
                <div>
                  <h4 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>${dayFullName}</span>
                    ${isToday ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">Today</span>` : ''}
                  </h4>
                  <p class="text-xs text-slate-400">Scheduled Recovery & Muscle Rebuilding</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="window.rtmApp && window.rtmApp.toggleWorkoutDay('${activeDay}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  <span>+ Set as Training Day</span>
                </button>
              </div>
            </div>

            <!-- Big Rest Day Hero Card -->
            <div class="p-6 sm:p-8 rounded-2xl bg-slate-950/70 border border-white/10 text-center space-y-4">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-400">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              </div>
              
              <div>
                <span class="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Off-Day</span>
                <h3 class="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Rest Day</h3>
                <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                  No workout scheduled for ${dayFullName}. Recovery is when muscle growth and central nervous system repair happen.
                </p>
              </div>

              <!-- Recovery Pillars Checklist -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>01. Hydration</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">Drink 2.5 - 3.5 liters of clean water to flush lactic acid and support cellular recovery.</p>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <span>02. Protein Intake</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">Keep protein targets consistent on rest days to supply essential amino acids for tissue repair.</p>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>03. 7-9h Sleep</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">Deep sleep releases natural human growth hormone (HGH) essential for muscle recovery.</p>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Active day is a TRAINING DAY
        const dayIdx = this.profile.selectedDays.indexOf(activeDay);
        const daySchedule = (workoutPlan && workoutPlan.schedule && workoutPlan.schedule[dayIdx])
          ? workoutPlan.schedule[dayIdx]
          : (workoutPlan && workoutPlan.schedule && workoutPlan.schedule[0]) || { day: 'Workout', focus: 'Training Session', exercises: [] };

        mainContentHtml = `
          <div class="glass-card p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
            <!-- Day Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2.5">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="text-xs uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                  ${dayFullName} · ${daySchedule.day}
                </span>
                ${isToday ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">Today</span>` : ''}
                <h4 class="text-base sm:text-lg font-black text-white">${daySchedule.focus}</h4>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400 font-mono">
                  ${daySchedule.exercises.length} Movements
                </span>
                <button onclick="window.rtmApp && window.rtmApp.toggleWorkoutDay('${activeDay}')" class="text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 border border-white/10 transition cursor-pointer" title="Switch to Rest Day">
                  Set as Rest
                </button>
              </div>
            </div>

            <!-- Clean Movement Table: Movement, Sets, Reps, Rest -->
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

            <!-- Finisher note if available -->
            ${daySchedule.cardio ? `
              <div class="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs gap-2">
                <span class="text-slate-400 font-medium">Finisher / Conditioning:</span>
                <span class="font-bold text-emerald-400 font-mono">${daySchedule.cardio}</span>
              </div>
            ` : ''}
          </div>
        `;
      }

      workoutContainer.innerHTML = `${stripHtml}${mainContentHtml}`;
    }

    // 3. Nutrition Tab Render
    const groceryTitle = document.getElementById('groceryHeadingTitle');
    if (groceryTitle) {
      const cleanTierName = (mealPlan.tierName || 'Budget-Smart').split('(')[0].trim();
      groceryTitle.textContent = `Weekly Meal Staples (${cleanTierName})`;
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

    const weeklyCostBadge = document.getElementById('groceryWeeklyCostBadge');
    if (weeklyCostBadge) {
      weeklyCostBadge.textContent = mealPlan.estimatedCostPerWeek ? `~${mealPlan.estimatedCostPerWeek}` : `~${mealPlan.estimatedCostPerDay}`;
    }

    const costBadge = document.getElementById('groceryMonthlyCostBadge');
    if (costBadge) {
      costBadge.textContent = mealPlan.estimatedCostPerMonth ? `~${mealPlan.estimatedCostPerMonth}` : `~${mealPlan.estimatedCostPerDay}`;
    }

    const groceryContainer = document.getElementById('groceryListContainer');
    if (groceryContainer) {
      groceryContainer.innerHTML = mealPlan.groceryList.map(item => `
        <div class="p-3 sm:p-3.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div class="flex-1 space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-white text-sm">${item.item}</span>
              ${item.weeklyQty ? `<span class="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">${item.weeklyQty}</span>` : ''}
              <span class="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5">${item.category || 'Core Staple'}</span>
            </div>
            <div class="text-xs text-slate-400 leading-relaxed">${item.reason}</div>
          </div>
          <div class="flex items-center gap-3 shrink-0 text-right self-end sm:self-center">
            <div class="text-right">
              ${item.weeklyMacros ? `<div class="text-xs font-mono font-bold text-cyan-300">${item.weeklyMacros}</div>` : ''}
              ${item.weeklyCost ? `<div class="text-xs font-mono font-bold text-emerald-400">${item.weeklyCost} / wk</div>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }

    this.currentMealPlan = mealPlan;

    const dailyMealsContainer = document.getElementById('dailyMealsContainer');
    if (dailyMealsContainer) {
      dailyMealsContainer.innerHTML = mealPlan.dailyMeals.map((meal, index) => {
        const isDone = this.isMealDoneToday(index);
        const foods = Array.isArray(meal.foods) && meal.foods.length > 0
          ? meal.foods
          : [{ name: meal.description, qty: '1 serving' }];

        return `
          <div class="glass-card p-4 sm:p-4.5 mb-3 border ${isDone ? 'border-white/5 bg-slate-950/40 opacity-60 grayscale-[40%]' : 'border-white/10 bg-slate-900/60 opacity-100'} transition-all duration-300">
            <!-- Meal Header with Macro badge and Done button -->
            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h5 class="font-extrabold ${isDone ? 'text-slate-400 line-through' : 'text-white'} text-sm sm:text-base">Meal ${index + 1} <span class="text-xs font-medium ${isDone ? 'text-slate-500' : 'text-slate-400'}">(${meal.meal})</span></h5>
                  ${isDone ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">Logged to Overview</span>` : ''}
                </div>
                <div class="text-xs font-mono ${isDone ? 'text-slate-500' : 'text-cyan-400 font-semibold'} mt-0.5">${meal.macros}</div>
              </div>

              <!-- Done option button: check sign disappears when done, meal greys out -->
              <button onclick="window.rtmApp && window.rtmApp.toggleMealDone(${index})" class="shrink-0 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${isDone ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10' : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-white/10'}" title="${isDone ? 'Meal logged (click to undo)' : 'Log meal to macros'}">
                ${isDone ? '' : `
                  <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                  </svg>
                `}
                <span>Done</span>
              </button>
            </div>

            <!-- Given foods with quantity very simply put next to the food -->
            <div class="space-y-1.5">
              ${foods.map(f => `
                <div class="flex items-center justify-between py-1.5 px-3 rounded-lg ${isDone ? 'bg-slate-950/40 text-slate-400' : 'bg-slate-900/40 text-slate-200'} border border-white/5 text-xs">
                  <span class="${isDone ? 'text-slate-400 line-through' : 'text-slate-200'} font-medium">${f.name}</span>
                  <span class="font-mono font-bold ${isDone ? 'text-slate-500 bg-slate-800/40 border-white/5' : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25'} px-2 py-0.5 rounded border shrink-0 ml-2">${f.qty}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    // Synchronize weekly meal staples show/hide visibility
    this.updateWeeklyStaplesVisibility();

    // 4. Progress Tab Render (Swapped: number & weight on the left, note entry on the right)
    const historyContainer = document.getElementById('progressHistoryList');
    if (historyContainer) {
      this.sortProgressHistory();
      if (this.progressHistory.length === 0) {
        historyContainer.innerHTML = `<p class="text-slate-400 text-xs text-center py-4">No check-ins logged yet. Add your first entry above!</p>`;
      } else {
        historyContainer.innerHTML = this.progressHistory.map((entry, idx) => {
          const entryNum = this.progressHistory.length - idx;
          const noteText = entry.notes && entry.notes !== '-' ? `"${entry.notes}"` : '';
          return `
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/20 transition gap-3">
              <!-- Left: Number & Weight -->
              <div class="flex items-center gap-2.5 shrink-0">
                <span class="w-6 h-6 rounded-lg bg-slate-800 text-[10px] font-mono font-bold text-slate-400 flex items-center justify-center border border-white/5">
                  #${entryNum}
                </span>
                <span class="text-base sm:text-lg font-black text-emerald-400 font-mono tracking-tight">${entry.weight} kg</span>
              </div>

              <!-- Right: Note entry, Date, and Delete Button -->
              <div class="flex items-center gap-3 text-right min-w-0">
                <div class="min-w-0">
                  ${noteText ? `<div class="text-xs text-slate-200 truncate italic">${noteText}</div>` : ''}
                  <div class="text-[10px] text-slate-400 font-mono mt-0.5">${entry.date}</div>
                </div>
                <button onclick="window.rtmApp && window.rtmApp.deleteProgressLog('${entry.id || entry.date}')" class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 font-bold text-xs transition shrink-0 cursor-pointer" title="Delete entry">✕</button>
              </div>
            </div>
          `;
        }).join('');
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
