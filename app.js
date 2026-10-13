/**
 * RTM (ريتم) - Main Application Controller
 * Handles UI interactions, state persistence, bilingual support, and plan generation.
 */

const PlanEngine = window.PlanEngine || {};

// Bilingual translations dictionary
const i18n = {
  en: {
    appTitle: 'RTM',
    appSub: 'Personalized Fitness & Budget-Smart Nutrition',
    tagline: 'Your Pace. Your Budget. Your Real Life.',
    tabOverview: 'Overview',
    tabWorkout: 'Workout Split',
    tabNutrition: 'Meal & Budget',
    tabProgress: 'Progress Log',
    settingsBtn: 'Settings ⚙️',

    // Settings Modal
    settingsTitle: 'Profile & Constraints',
    settingsSubtitle: 'Adjust your metrics. Your nutrition and training recalibrate automatically.',
    heightLabel: 'Height (cm)',
    weightLabel: 'Weight (kg)',
    ageLabel: 'Age',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    freeDaysLabel: 'Available Free Time (Days / Week):',
    daysValueSuffix: 'Days a week',
    budgetLabel: 'Grocery / Meal Budget Tier:',
    budgetLow: 'Smart Budget ($4 - $6 / day) - Eggs, Oats, Tuna, Rice',
    budgetMid: 'Standard Fresh ($8 - $12 / day) - Chicken, Berries, Greek Yogurt',
    budgetHigh: 'Performance ($15+ / day) - Salmon, Steaks, Whey Isolate',
    goalLabel: 'Primary Goal:',
    goalLose: 'Burn Fat & Shred',
    goalGain: 'Build Lean Muscle (Hypertrophy)',
    goalStrength: 'Maximize Strength & Power',
    goalMaintain: 'Healthy Athletic Maintenance',
    saveSettingsBtn: 'Save & Recalibrate Plan',
    closeSettings: 'Close',

    // Overview Tab - Macronutrients
    macroMenuTitle: 'Daily Macronutrient Targets',
    macroMenuSubtitle: 'Optimized fuel for your goal and current body composition.',
    targetCalLabel: 'Target Daily Calories',
    proteinLabel: 'Protein',
    carbsLabel: 'Carbohydrates',
    fatsLabel: 'Healthy Fats',
    proteinDesc: 'Muscle preservation & growth (4 kcal/g)',
    carbsDesc: 'High-energy training fuel (4 kcal/g)',
    fatsDesc: 'Hormonal support & vital functions (9 kcal/g)',
    adjustTargetsHint: 'Need to adjust your body stats or goals?',
    openSettingsLink: 'Open Settings ⚙️',

    // Workout Tab
    workoutHeader: 'Dynamic Weekly Routine',
    workoutSub: 'Optimized precisely for your schedule. High frequency, smart recovery.',
    exercisesTitle: 'Targeted Exercises',
    setsReps: 'Sets x Reps',

    // Nutrition Tab
    nutritionHeader: 'Budget-Smart Meal Strategy',
    nutritionSub: 'Hitting your protein targets without burning a hole in your wallet.',
    groceryListTitle: 'Core Grocery Staples (High-Value Protein & Carbs)',
    dailyMealSchedule: 'Daily Meal Breakdown',
    estCost: 'Estimated Daily Cost',

    // Progress Tab
    progressHeader: 'Progress & Weigh-Ins',
    progressSub: 'Track your body transformation over time.',
    logWeightLabel: 'Log New Weight (kg)',
    logNotesLabel: 'Notes (e.g. Energy level, workout notes)',
    addLogBtn: 'Add Entry',
    historyTitle: 'Check-In History',
    noLogsYet: 'No check-ins logged yet. Add your first entry above!'
  },
  ar: {
    appTitle: 'ريتم (RTM)',
    appSub: 'لياقتك وغذاؤك الذكي.. وفق ميزانيتك ووقتك الفعلي',
    tagline: 'تمرينك بريتمك.. وميزانيتك بيدك',
    tabOverview: 'نظرة عامة',
    tabWorkout: 'جدول التمارين',
    tabNutrition: 'الغذاء والميزانية',
    tabProgress: 'متابعة التقدم',
    settingsBtn: 'الإعدادات ⚙️',

    // Settings Modal
    settingsTitle: 'الإعدادات والمعطيات',
    settingsSubtitle: 'عدّل بياناتك وظروفك، وسيتم تفصيل الخطة تلقائياً لتناسبك.',
    heightLabel: 'الطول (سم)',
    weightLabel: 'الوزن (كجم)',
    ageLabel: 'العمر',
    genderLabel: 'الجنس',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    freeDaysLabel: 'الوقت المتاح للتمرين (أيام بالأسبوع):',
    daysValueSuffix: 'أيام أسبوعياً',
    budgetLabel: 'الميزانية المخصصة للوجبات:',
    budgetLow: 'اقتصادي ذكي (٤ - ٦ $ يومياً) - بيض، شوفان، تونة، أرز، قريش',
    budgetMid: 'متوسط ومتنوع (٨ - ١٢ $ يومياً) - صدور دجاج، زبادي يوناني، بطاطا',
    budgetHigh: 'أداء عالي وفاخر (١٥+ $ يومياً) - سلمون، ستيك، مكملات واي',
    goalLabel: 'الهدف الأساسي:',
    goalLose: 'حرق دهون وتنشيف',
    goalGain: 'بناء وتضخيم عضلات صافية',
    goalStrength: 'زيادة القوة البدنية والأداء',
    goalMaintain: 'حفاظ على الصحة واللياقة',
    saveSettingsBtn: 'حفظ وتحديث الخطة',
    closeSettings: 'إغلاق',

    // Overview Tab - Macronutrients
    macroMenuTitle: 'أهداف العناصر الغذائية اليومية (الماكروز)',
    macroMenuSubtitle: 'توزيع دقيق ومدروس للطاقة يناسب هدفك وجسمك الحالي.',
    targetCalLabel: 'السعرات الحرارية المستهدفة',
    proteinLabel: 'البروتين',
    carbsLabel: 'الكربوهيدرات',
    fatsLabel: 'الدهون الصحية',
    proteinDesc: 'للبناء العضلي والاستشفاء (٤ سعرة/جم)',
    carbsDesc: 'مصدر الطاقة للأداء والتمارين (٤ سعرة/جم)',
    fatsDesc: 'لتوازن الهرمونات وصحة المفاصل (٩ سعرة/جم)',
    adjustTargetsHint: 'هل ترغب في تعديل وزنك أو أهدافك؟',
    openSettingsLink: 'افتح الإعدادات ⚙️',

    // Workout Tab
    workoutHeader: 'جدول التمارين المخصص لك',
    workoutSub: 'مفصل بدقة حسب الأيام المتاحة لديك لتحقيق أفضل استشفاء وتطور.',
    exercisesTitle: 'التمارين المستهدفة',
    setsReps: 'الجولات والتكرارات',

    // Nutrition Tab
    nutritionHeader: 'خطة الوجبات الذكية والموفرة',
    nutritionSub: 'تغطية احتياجك من البروتين والطاقة بأعلى كفاءة وأفضل سعر.',
    groceryListTitle: 'قائمة التسوق الأساسية (بروتين عالي وتكلفة اقتصادية)',
    dailyMealSchedule: 'توزيع الوجبات اليومية',
    estCost: 'التكلفة اليومية التقديرية',

    // Progress Tab
    progressHeader: 'سجل الوزن والتقدم',
    progressSub: 'تابع تطور وزنك وملاحظاتك مع مرور الأسابيع.',
    logWeightLabel: 'تسجيل وزن جديد (كجم)',
    logNotesLabel: 'ملاحظات (مثل: مستوى الطاقة، الشعور بالتمرين)',
    addLogBtn: 'حفظ القياس',
    historyTitle: 'سجل القياسات السابقة',
    noLogsYet: 'لا توجد قياسات مسجلة بعد. أضف أول قياس بالأعلى!'
  }
};

class RtmApp {
  constructor() {
    this.currentLang = localStorage.getItem('rtm_lang') || 'en';
    this.currentTab = 'overview';

    // Default profile constraints
    this.profile = JSON.parse(localStorage.getItem('rtm_profile')) || {
      heightCm: 175,
      weightKg: 78,
      age: 25,
      gender: 'male',
      freeDays: 4,
      budgetTier: 'budget',
      goal: 'lose_weight'
    };

    this.progressHistory = JSON.parse(localStorage.getItem('rtm_history')) || [
      { date: '2026-10-01', weight: 79.5, notes: 'Day 1: Started RTM journey' },
      { date: '2026-10-08', weight: 78.8, notes: 'Feeling stronger, hit protein target' },
      { date: '2026-10-13', weight: 78.0, notes: 'Hit all 4 workout days, meals on budget' }
    ];

    this.init();
  }

  init() {
    this.applyLanguage();
    this.bindEvents();
    this.syncProfileToInputs();
    this.renderAll();
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('rtm_lang', lang);
    this.applyLanguage();
    this.renderAll();
  }

  applyLanguage() {
    const isAr = this.currentLang === 'ar';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'en';

    const t = i18n[this.currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
      langToggleBtn.textContent = isAr ? 'English 🌐' : 'العربية 🌐';
    }
  }

  bindEvents() {
    // Language toggle
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => {
        this.setLanguage(this.currentLang === 'en' ? 'ar' : 'en');
      });
    }

    // Settings Modal open/close
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
        if (e.target === settingsModal) {
          this.closeSettings();
        }
      });
    }

    // Tabs navigation
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (tab) {
        const target = tab.getAttribute('data-tab');
        if (target) {
          this.switchTab(target);
        }
      }
    });

    // Free days slider display
    const freeDaysInput = document.getElementById('inputFreeDays');
    const freeDaysDisplay = document.getElementById('freeDaysValue');
    if (freeDaysInput && freeDaysDisplay) {
      freeDaysInput.addEventListener('input', (e) => {
        const suffix = i18n[this.currentLang].daysValueSuffix;
        freeDaysDisplay.textContent = `${e.target.value} ${suffix}`;
      });
    }

    // Profile Settings Form submission
    const form = document.getElementById('profileForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfileFromInputs();
      });
    }

    // Progress Log Form submission
    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
      progressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addProgressLog();
      });
    }
  }

  openSettings() {
    this.syncProfileToInputs();
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('opacity-0', 'pointer-events-none');
    }
  }

  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.add('opacity-0', 'pointer-events-none');
    }
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
      const suffix = i18n[this.currentLang].daysValueSuffix;
      freeDaysDisplay.textContent = `${this.profile.freeDays} ${suffix}`;
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

    // Show temporary toast feedback and close modal after 600ms
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

    // Update profile weight if changed
    this.profile.weightKg = weightVal;
    localStorage.setItem('rtm_profile', JSON.stringify(this.profile));
    this.syncProfileToInputs();

    document.getElementById('logWeight').value = '';
    document.getElementById('logNotes').value = '';

    this.renderAll();
  }

  renderAll() {
    const isAr = this.currentLang === 'ar';
    const bmr = PlanEngine.calculateBMR(this.profile.weightKg, this.profile.heightCm, this.profile.age, this.profile.gender);
    const tdee = PlanEngine.calculateTDEE(bmr, this.profile.freeDays);
    const macros = PlanEngine.calculateMacros(tdee, this.profile.weightKg, this.profile.goal);
    const workoutPlan = PlanEngine.generateWorkoutSplit(this.profile.freeDays, this.profile.goal);
    const mealPlan = PlanEngine.generateBudgetMealPlan(this.profile.budgetTier, macros);

    // 1. Overview Render: Macronutrients Menu
    const targetCalEl = document.getElementById('macroTargetCal');
    if (targetCalEl) targetCalEl.textContent = `${macros.calories.toLocaleString()} kcal`;

    const goalBadgeEl = document.getElementById('macroGoalBadge');
    if (goalBadgeEl) {
      const goalsMap = {
        lose_weight: isAr ? 'حرق دهون' : 'Fat Loss',
        gain_muscle: isAr ? 'بناء عضلي' : 'Lean Bulk',
        strength: isAr ? 'قوة بدنية' : 'Strength',
        maintain: isAr ? 'حفاظ على الوزن' : 'Maintenance'
      };
      goalBadgeEl.textContent = goalsMap[this.profile.goal] || (isAr ? 'مخصص' : 'Custom');
    }

    const proteinEl = document.getElementById('macroProtein');
    if (proteinEl) proteinEl.textContent = `${macros.protein}g`;

    const carbsEl = document.getElementById('macroCarbs');
    if (carbsEl) carbsEl.textContent = `${macros.carbs}g`;

    const fatsEl = document.getElementById('macroFats');
    if (fatsEl) fatsEl.textContent = `${macros.fats}g`;

    // Visual percentage proportions bar
    const totalMacroCal = (macros.protein * 4) + (macros.carbs * 4) + (macros.fats * 9);
    const pPct = Math.round(((macros.protein * 4) / totalMacroCal) * 100);
    const cPct = Math.round(((macros.carbs * 4) / totalMacroCal) * 100);
    const fPct = Math.max(0, 100 - (pPct + cPct));

    const pBar = document.getElementById('barProtein');
    const cBar = document.getElementById('barCarbs');
    const fBar = document.getElementById('barFats');
    if (pBar) {
      pBar.style.width = `${pPct}%`;
      pBar.title = `Protein: ${pPct}%`;
    }
    if (cBar) {
      cBar.style.width = `${cPct}%`;
      cBar.title = `Carbs: ${cPct}%`;
    }
    if (fBar) {
      fBar.style.width = `${fPct}%`;
      fBar.title = `Fats: ${fPct}%`;
    }

    const pPctLabel = document.getElementById('pctProtein');
    const cPctLabel = document.getElementById('pctCarbs');
    const fPctLabel = document.getElementById('pctFats');
    if (pPctLabel) pPctLabel.textContent = `${pPct}%`;
    if (cPctLabel) cPctLabel.textContent = `${cPct}%`;
    if (fPctLabel) fPctLabel.textContent = `${fPct}%`;

    // 2. Workout Tab Render
    const workoutContainer = document.getElementById('workoutScheduleContainer');
    if (workoutContainer) {
      workoutContainer.innerHTML = '';
      workoutPlan.schedule.forEach((daySchedule) => {
        const card = document.createElement('div');
        card.className = 'glass-card p-5 mb-4 border border-white/5';
        card.innerHTML = `
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div>
              <span class="text-xs uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                ${isAr ? daySchedule.dayAr : daySchedule.day}
              </span>
              <h4 class="text-lg font-bold text-white mt-1">${isAr ? daySchedule.focusAr : daySchedule.focus}</h4>
            </div>
            <span class="text-xs text-gray-400">${daySchedule.exercises.length} ${isAr ? 'تمارين' : 'Exercises'}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${daySchedule.exercises.map(ex => `
              <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-white/5">
                <div>
                  <div class="font-medium text-slate-200 text-sm">${ex.name}</div>
                  <div class="text-xs text-slate-400">${ex.target || ''}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-mono font-bold text-emerald-400">${ex.sets} sets</div>
                  <div class="text-xs text-slate-400 font-mono">${ex.reps} reps</div>
                </div>
              </div>
            `).join('')}
          </div>
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
            <div class="font-semibold text-white text-sm">🥗 ${isAr ? item.itemAr : item.item}</div>
            <div class="text-xs text-slate-400 mt-0.5">${isAr ? item.reasonAr : item.reason}</div>
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
            <h5 class="font-bold text-white text-sm">${isAr ? meal.mealAr : meal.meal}</h5>
            <span class="text-xs font-mono text-cyan-400 font-semibold">${meal.macros}</span>
          </div>
          <p class="text-xs text-slate-300">${isAr ? meal.descriptionAr : meal.description}</p>
        </div>
      `).join('');
    }

    // 4. Progress Tab Render
    const historyContainer = document.getElementById('progressHistoryList');
    if (historyContainer) {
      if (this.progressHistory.length === 0) {
        historyContainer.innerHTML = `<p class="text-slate-400 text-xs text-center py-4">${i18n[this.currentLang].noLogsYet}</p>`;
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
