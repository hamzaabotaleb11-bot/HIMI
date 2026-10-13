/**
 * RTM (ريتم) - Main Application Controller
 * Handles UI interactions, state persistence, bilingual support, and telemetry updates.
 */

import { PlanEngine } from './plan-engine.js';
import { WearablesSimulator } from './wearables.js';

// Bilingual translations dictionary
const i18n = {
  en: {
    appTitle: 'RTM',
    appSub: 'Personalized Fitness & Budget-Smart Nutrition',
    tagline: 'Your Pace. Your Budget. Your Real Life.',
    tabOverview: 'Overview',
    tabWorkout: 'Workout Split',
    tabNutrition: 'Meal & Budget',
    tabWearables: 'Wearables',
    tabProgress: 'Progress Log',

    // Profile form
    profileTitle: 'Your Real-World Constraints',
    profileSubtitle: 'Customize your inputs. Your plan adapts automatically.',
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
    updatePlanBtn: 'Recalibrate Plan',

    // Overview Cards
    tdeeLabel: 'Maintenance Burn (TDEE)',
    targetCalLabel: 'Target Daily Calories',
    splitLabel: 'Training Routine',
    budgetEstimateLabel: 'Est. Meal Cost',
    wearableStatus: 'Smartwatch Sync',
    connected: 'Connected',
    disconnected: 'Not Connected',
    connectPrompt: 'Pair Device',
    disconnectPrompt: 'Disconnect',

    // Workout tab
    workoutHeader: 'Dynamic Weekly Routine',
    workoutSub: 'Optimized precisely for your schedule. High frequency, smart recovery.',
    exercisesTitle: 'Targeted Exercises',
    setsReps: 'Sets x Reps',

    // Nutrition tab
    nutritionHeader: 'Budget-Smart Meal Strategy',
    nutritionSub: 'Hitting your protein targets without burning a hole in your wallet.',
    groceryListTitle: 'Core Grocery Staples (High-Value Protein & Carbs)',
    dailyMealSchedule: 'Daily Meal Breakdown',
    estCost: 'Estimated Daily Cost',

    // Wearables tab
    wearableHeader: 'Smartwatch Telemetry',
    wearableSub: 'Simulate live biometric data feed from Apple Watch, Garmin, or WearOS.',
    heartRateLabel: 'Heart Rate',
    stepsLabel: 'Daily Steps',
    activeBurnLabel: 'Active Calorie Burn',
    batteryLabel: 'Battery Level',
    lastSyncLabel: 'Last Synced',

    // Progress tab
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
    tabWearables: 'الساعة الذكية',
    tabProgress: 'متابعة التقدم',

    // Profile form
    profileTitle: 'معطياتك وظروفك الحقيقية',
    profileSubtitle: 'أدخل بياناتك، وسيتم تفصيل الخطة تلقائياً لتناسب ظروفك.',
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
    updatePlanBtn: 'تحديث الخطة الآن',

    // Overview Cards
    tdeeLabel: 'الحرق الطبيعي (TDEE)',
    targetCalLabel: 'السعرات المستهدفة يومياً',
    splitLabel: 'نظام التمرين',
    budgetEstimateLabel: 'تكلفة الوجبات التقريبية',
    wearableStatus: 'مزامنة الساعة الذكية',
    connected: 'متصل',
    disconnected: 'غير متصل',
    connectPrompt: 'ربط الساعة',
    disconnectPrompt: 'فصل الاتصال',

    // Workout tab
    workoutHeader: 'جدول التمارين المخصص لك',
    workoutSub: 'مفصل بدقة حسب الأيام المتاحة لديك لتحقيق أفضل استشفاء وتطور.',
    exercisesTitle: 'التمارين المستهدفة',
    setsReps: 'الجولات والتكرارات',

    // Nutrition tab
    nutritionHeader: 'خطة الوجبات الذكية والموفرة',
    nutritionSub: 'تغطية احتياجك من البروتين والطاقة بأعلى كفاءة وأفضل سعر.',
    groceryListTitle: 'قائمة التسوق الأساسية (بروتين عالي وتكلفة اقتصادية)',
    dailyMealSchedule: 'توزيع الوجبات اليومية',
    estCost: 'التكلفة اليومية التقديرية',

    // Wearables tab
    wearableHeader: 'بيانات الساعة الذكية الحية',
    wearableSub: 'محاكاة البث المباشر للقياسات الحيوية من Apple Watch أو Garmin أو WearOS.',
    heartRateLabel: 'نبضات القلب',
    stepsLabel: 'الخطوات اليومية',
    activeBurnLabel: 'الحرق النشط',
    batteryLabel: 'نسبة البطارية',
    lastSyncLabel: 'آخر مزامنة',

    // Progress tab
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

    // Default profile
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

    this.wearables = new WearablesSimulator(this.onWearableTelemetry.bind(this));

    this.init();
  }

  init() {
    this.applyLanguage();
    this.bindEvents();
    this.syncProfileToInputs();
    this.renderAll();

    // Auto-connect wearable for interactive feel
    this.wearables.connect();
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.getItem('rtm_lang', lang);
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

    // Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab');
        this.switchTab(target);
      });
    });

    // Free days slider live label
    const freeDaysInput = document.getElementById('inputFreeDays');
    const freeDaysDisplay = document.getElementById('freeDaysValue');
    if (freeDaysInput && freeDaysDisplay) {
      freeDaysInput.addEventListener('input', (e) => {
        const suffix = i18n[this.currentLang].daysValueSuffix;
        freeDaysDisplay.textContent = `${e.target.value} ${suffix}`;
      });
    }

    // Recalibrate button
    const form = document.getElementById('profileForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfileFromInputs();
      });
    }

    // Wearable toggle
    const wearToggleBtn = document.getElementById('wearableToggleBtn');
    if (wearToggleBtn) {
      wearToggleBtn.addEventListener('click', () => {
        this.wearables.toggleConnection();
      });
    }

    // Add progress log
    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
      progressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addProgressLog();
      });
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
    document.getElementById('inputHeight').value = this.profile.heightCm;
    document.getElementById('inputWeight').value = this.profile.weightKg;
    document.getElementById('inputAge').value = this.profile.age;
    document.getElementById('inputGender').value = this.profile.gender;
    document.getElementById('inputFreeDays').value = this.profile.freeDays;
    document.getElementById('inputBudget').value = this.profile.budgetTier;
    document.getElementById('inputGoal').value = this.profile.goal;

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

    // Show temporary toast or feedback
    const toast = document.getElementById('saveToast');
    if (toast) {
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 2200);
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

    // 1. Overview Render
    document.getElementById('statTDEE').textContent = `${tdee} kcal`;
    document.getElementById('statTargetCal').textContent = `${macros.calories} kcal`;
    document.getElementById('statSplitName').textContent = isAr ? workoutPlan.splitNameAr : workoutPlan.splitName;
    document.getElementById('statBudgetCost').textContent = isAr ? mealPlan.estimatedCostPerDayAr : mealPlan.estimatedCostPerDay;

    // Macro pills in overview
    document.getElementById('macroProtein').textContent = `${macros.protein}g`;
    document.getElementById('macroCarbs').textContent = `${macros.carbs}g`;
    document.getElementById('macroFats').textContent = `${macros.fats}g`;

    // 2. Workout Tab Render
    const workoutContainer = document.getElementById('workoutScheduleContainer');
    if (workoutContainer) {
      workoutContainer.innerHTML = '';
      workoutPlan.schedule.forEach((daySchedule, idx) => {
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

  onWearableTelemetry(data) {
    const isAr = this.currentLang === 'ar';
    const statusText = data.isConnected ? (isAr ? 'متصل' : 'Connected') : (isAr ? 'غير متصل' : 'Disconnected');
    const btnText = data.isConnected ? (isAr ? 'فصل الاتصال' : 'Disconnect') : (isAr ? 'ربط الساعة' : 'Pair Device');

    // Update Overview mini badge
    const badge = document.getElementById('overviewWearableBadge');
    if (badge) {
      badge.textContent = statusText;
      badge.className = `badge-pill text-xs ${data.isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`;
    }

    // Update Wearables Tab
    const toggleBtn = document.getElementById('wearableToggleBtn');
    if (toggleBtn) {
      toggleBtn.textContent = btnText;
      toggleBtn.className = `px-4 py-2 rounded-xl text-xs font-bold transition-all ${data.isConnected ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`;
    }

    const heartRateEl = document.getElementById('telemetryHeartRate');
    if (heartRateEl) heartRateEl.textContent = data.isConnected ? `${data.heartRate} BPM` : '-- BPM';

    const stepsEl = document.getElementById('telemetrySteps');
    if (stepsEl) stepsEl.textContent = data.isConnected ? data.steps.toLocaleString() : '--';

    const caloriesEl = document.getElementById('telemetryCalories');
    if (caloriesEl) caloriesEl.textContent = data.isConnected ? `${data.activeCalories} kcal` : '-- kcal';

    const batteryEl = document.getElementById('telemetryBattery');
    if (batteryEl) batteryEl.textContent = data.isConnected ? `${data.battery}%` : '--%';

    const lastSyncEl = document.getElementById('telemetryLastSync');
    if (lastSyncEl) lastSyncEl.textContent = data.isConnected ? data.lastSync : '--';
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.rtmApp = new RtmApp();
});
