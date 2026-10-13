/**
 * RTM (ريتم) - Main Application Controller
 * Handles Onboarding Wizard, Macronutrients progress/goal tracking,
 * settings, bilingual support, and plan generation.
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

    // Onboarding Wizard
    wizardHeader: 'Welcome to RTM (ريتم)',
    wizardStepIndicator: 'Step {step} of 4',
    step1Title: 'Your Body Metrics',
    step1Subtitle: 'Used to calculate your precise Basal Metabolic Rate (BMR) & daily calorie burn.',
    step2Title: 'Your Available Schedule',
    step2Subtitle: 'We never force an unrealistic routine. RTM builds the optimal split around your free days.',
    step3Title: 'Your Grocery & Meal Budget',
    step3Subtitle: 'Fitness shouldn’t drain your wallet. We tailor meal staples to your budget tier.',
    step4Title: 'Your Primary Goal',
    step4Subtitle: 'Determines whether your body needs a deficit, surplus, or maintenance.',
    nextStepBtn: 'Next Step →',
    prevStepBtn: '← Back',
    finishWizardBtn: 'Calculate TDEE & Build My Plan 🚀',

    // Wizard Option Cards
    budgetLowTitle: 'Smart Budget ($4 - $6 / day)',
    budgetLowDesc: 'Eggs, oats, tuna, cottage cheese, rice, peanut butter',
    budgetMidTitle: 'Standard Fresh ($8 - $12 / day)',
    budgetMidDesc: 'Chicken breast, greek yogurt, sweet potatoes, berries, olive oil',
    budgetHighTitle: 'Performance ($15+ / day)',
    budgetHighDesc: 'Salmon fillets, sirloin steaks, avocados, whey isolate',

    goalLoseTitle: 'Burn Fat & Shred',
    goalLoseDesc: 'Moderate caloric deficit with high protein to protect lean muscle',
    goalGainTitle: 'Build Lean Muscle (Hypertrophy)',
    goalGainDesc: 'Lean caloric surplus optimized for muscle growth and recovery',
    goalStrengthTitle: 'Maximize Strength & Power',
    goalStrengthDesc: 'Performance-focused calories for heavy lifting and explosive power',
    goalMaintainTitle: 'Healthy Maintenance',
    goalMaintainDesc: 'Body recomposition and sustained lifestyle athletic energy',

    // Settings Modal
    settingsTitle: 'Profile & Constraints ⚙️',
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
    goalLabel: 'Primary Goal:',
    saveSettingsBtn: 'Save & Recalibrate Plan',
    restartWizardBtn: 'Run Setup Wizard Again 🔄',
    closeSettings: 'Close',

    // Overview Tab - Macronutrients
    macroMenuTitle: 'Daily Macronutrient Targets',
    macroMenuSubtitle: 'Track your daily intake progress against your TDEE-calculated goals.',
    targetCalLabel: 'Calories:',
    proteinLabel: 'Protein',
    carbsLabel: 'Carbohydrates',
    fatsLabel: 'Healthy Fats',
    proteinDesc: 'Muscle repair & growth (4 kcal/g)',
    carbsDesc: 'High-energy training fuel (4 kcal/g)',
    fatsDesc: 'Hormonal support & health (9 kcal/g)',
    adjustTargetsHint: 'Need to adjust your body metrics or goal?',
    openSettingsLink: 'Open Settings ⚙️',
    quickLog: 'Quick Log:',
    resetToday: 'Reset Today',

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

    // Onboarding Wizard
    wizardHeader: 'مرحباً بك في ريتم (RTM)',
    wizardStepIndicator: 'الخطوة {step} من 4',
    step1Title: 'بيانات جسمك الأساسية',
    step1Subtitle: 'لحساب معدل الأيض الأساسي (BMR) وحرق السعرات اليومي بدقة.',
    step2Title: 'جدول وقتك المتاح للتمرين',
    step2Subtitle: 'لا نلزمك بجدول خيالي، بل نبني الخطة المثالية وفق أيام فراغك الفعلية.',
    step3Title: 'ميزانية الوجبات والتسوق',
    step3Subtitle: 'اللياقة لا يجب أن تستنزف محفظتك؛ نوفر مصادر بروتين عالية تناسب ميزانيتك.',
    step4Title: 'هدفك الرياضي الأساسي',
    step4Subtitle: 'لتحديد ما إذا كان جسمك يحتاج عجزاً أو فائضاً في السعرات.',
    nextStepBtn: 'الخطوة التالية ←',
    prevStepBtn: '→ السابق',
    finishWizardBtn: 'احسب السعرات وأنشئ خطتي 🚀',

    // Wizard Option Cards
    budgetLowTitle: 'اقتصادي ذكي (٤ - ٦ $ يومياً)',
    budgetLowDesc: 'بيض، شوفان، تونة، جبن قريش، أرز، زبدة فول سوداني',
    budgetMidTitle: 'متوسط ومتنوع (٨ - ١٢ $ يومياً)',
    budgetMidDesc: 'صدور دجاج، زبادي يوناني، بطاطا حلوة، توت، زيت زيتون',
    budgetHighTitle: 'أداء عالي وفاخر (١٥+ $ يومياً)',
    budgetHighDesc: 'سلمون طازج، ستيك بقري، أفوكادو، مكملات واي آيزوليت',

    goalLoseTitle: 'حرق دهون وتنشيف',
    goalLoseDesc: 'عجز سعرات معتدل مع بروتين عالي للحفاظ على الكتلة العضلية',
    goalGainTitle: 'بناء وتضخيم عضلات صافية',
    goalGainDesc: 'فائض سعرات مدروس ومحسوب لدعم الاستشفاء والبناء العضلي',
    goalStrengthTitle: 'زيادة القوة البدنية والأداء',
    goalStrengthDesc: 'سعرات تغذي أداء الأوزان العالية والطاقة الانفجارية',
    goalMaintainTitle: 'حفاظ على الصحة واللياقة',
    goalMaintainDesc: 'إعادة تشكيل الجسم وثبات الوزن مع طاقة ونشاط يومي',

    // Settings Modal
    settingsTitle: 'الإعدادات والمعطيات ⚙️',
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
    goalLabel: 'الهدف الأساسي:',
    saveSettingsBtn: 'حفظ وتحديث الخطة',
    restartWizardBtn: 'إعادة تشغيل معالج الإعداد 🔄',
    closeSettings: 'إغلاق',

    // Overview Tab - Macronutrients
    macroMenuTitle: 'أهداف العناصر الغذائية اليومية (الماكروز)',
    macroMenuSubtitle: 'تابع استهلاكك اليومي (المتحقق / المستهدف) المحسوب عبر معادلة TDEE.',
    targetCalLabel: 'السعرات:',
    proteinLabel: 'البروتين',
    carbsLabel: 'الكربوهيدرات',
    fatsLabel: 'الدهون الصحية',
    proteinDesc: 'للبناء العضلي والاستشفاء (٤ سعرة/جم)',
    carbsDesc: 'مصدر الطاقة للأداء والتمارين (٤ سعرة/جم)',
    fatsDesc: 'لتوازن الهرمونات وصحة المفاصل (٩ سعرة/جم)',
    adjustTargetsHint: 'هل ترغب في تعديل وزنك أو أهدافك؟',
    openSettingsLink: 'افتح الإعدادات ⚙️',
    quickLog: 'تسجيل سريع:',
    resetToday: 'إعادة تعيين اليوم',

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

    this.init();
  }

  init() {
    this.applyLanguage();
    this.bindEvents();
    this.syncProfileToInputs();
    this.renderAll();

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

  saveDailyIntake(intake) {
    localStorage.setItem(this.getTodayKey(), JSON.stringify(intake));
    this.renderAll();
  }

  logMacro(macroType, amount) {
    const intake = this.getDailyIntake();
    intake[macroType] = Math.max(0, (intake[macroType] || 0) + amount);

    // Recompute total calories from macros
    intake.calories = (intake.protein * 4) + (intake.carbs * 4) + (intake.fats * 9);
    this.saveDailyIntake(intake);
  }

  resetDailyIntake() {
    this.saveDailyIntake({ protein: 0, carbs: 0, fats: 0, calories: 0 });
  }

  // Language management
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

  // Event bindings
  bindEvents() {
    // Language toggle
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => {
        this.setLanguage(this.currentLang === 'en' ? 'ar' : 'en');
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
        const suffix = i18n[this.currentLang].daysValueSuffix;
        freeDaysDisplay.textContent = `${e.target.value} ${suffix}`;
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

    // Reset daily intake button
    const resetBtn = document.getElementById('btnResetIntake');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm(this.currentLang === 'ar' ? 'هل أنت متأكد من إعادة تعيين تسجيل اليوم؟' : 'Reset today\'s logged intake to 0?')) {
          this.resetDailyIntake();
        }
      });
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
      // Validate inputs
      const h = parseFloat(document.getElementById('wizHeight').value);
      const w = parseFloat(document.getElementById('wizWeight').value);
      const a = parseInt(document.getElementById('wizAge').value, 10);
      if (!h || !w || !a) {
        alert(this.currentLang === 'ar' ? 'يرجى إدخال الطول والوزن والعمر للمتابعة' : 'Please enter height, weight, and age to proceed');
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
      const template = i18n[this.currentLang].wizardStepIndicator;
      stepLabel.textContent = template.replace('{step}', this.wizardStep);
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
    const isAr = this.currentLang === 'ar';
    const bmr = PlanEngine.calculateBMR(this.profile.weightKg, this.profile.heightCm, this.profile.age, this.profile.gender);
    const tdee = PlanEngine.calculateTDEE(bmr, this.profile.freeDays);
    const macros = PlanEngine.calculateMacros(tdee, this.profile.weightKg, this.profile.goal);
    const workoutPlan = PlanEngine.generateWorkoutSplit(this.profile.freeDays, this.profile.goal);
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
        lose_weight: isAr ? 'حرق دهون' : 'Fat Loss',
        gain_muscle: isAr ? 'بناء عضلي' : 'Lean Bulk',
        strength: isAr ? 'قوة بدنية' : 'Strength',
        maintain: isAr ? 'حفاظ على الوزن' : 'Maintenance'
      };
      goalBadgeEl.textContent = goalsMap[this.profile.goal] || (isAr ? 'مخصص' : 'Custom');
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
