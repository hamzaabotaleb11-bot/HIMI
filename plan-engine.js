/**
 * RTM (ريتم) - Plan Generator & Calculations Engine
 * Computes customized workout splits and budget-smart nutrition based on user constraints.
 */
const PlanEngine = {
  // Calculate BMR using Mifflin-St Jeor formula
  calculateBMR(weightKg, heightCm, age = 25, gender = 'male') {
    const s = gender === 'female' ? -161 : 5;
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + s);
  },

  // Calculate Total Daily Energy Expenditure (TDEE) based on training days
  calculateTDEE(bmr, workoutDaysPerWeek) {
    let multiplier = 1.2; // Sedentary baseline
    if (workoutDaysPerWeek <= 2) multiplier = 1.35;
    else if (workoutDaysPerWeek <= 4) multiplier = 1.5;
    else if (workoutDaysPerWeek <= 6) multiplier = 1.7;
    return Math.round(bmr * multiplier);
  },

  // Target calories and macro breakdown based on goal
  calculateMacros(tdee, weightKg, goal) {
    let targetCalories = tdee;
    let proteinPerKg = 2.0; // default for active individuals
    let fatRatio = 0.25;

    switch (goal) {
      case 'lose_weight':
        targetCalories = Math.round(tdee - 450); // Moderate deficit
        proteinPerKg = 2.2; // High protein to preserve lean muscle in deficit
        break;
      case 'gain_muscle':
        targetCalories = Math.round(tdee + 350); // Lean surplus
        proteinPerKg = 2.0;
        break;
      case 'strength':
        targetCalories = Math.round(tdee + 200);
        proteinPerKg = 2.0;
        break;
      case 'maintain':
      default:
        targetCalories = tdee;
        proteinPerKg = 1.8;
        break;
    }

    const proteinGrams = Math.round(weightKg * proteinPerKg);
    const proteinCalories = proteinGrams * 4;

    const fatCalories = targetCalories * fatRatio;
    const fatGrams = Math.round(fatCalories / 9);

    const remainingCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
    const carbGrams = Math.round(remainingCalories / 4);

    return {
      calories: targetCalories,
      protein: proteinGrams,
      carbs: carbGrams,
      fats: fatGrams,
      deficitOrSurplus: targetCalories - tdee
    };
  },

  // Generate a tailored training split matching exactly the user's free days (2 to 6 days)
  generateWorkoutSplit(daysPerWeek, goal) {
    const days = parseInt(daysPerWeek, 10);
    switch (days) {
      case 2:
        return {
          splitName: 'Full Body Split (2-Day)',
          splitNameAr: 'تقسيم الجسم الكامل (يومان)',
          schedule: [
            {
              day: 'Day 1',
              dayAr: 'اليوم الأول',
              focus: 'Full Body A (Strength & Core)',
              focusAr: 'جسم كامل أ (قوة وجذع)',
              exercises: [
                { name: 'Barbell/Goblet Squat', sets: '3-4', reps: '8-10', target: 'Quads & Glutes' },
                { name: 'Dumbbell Bench Press', sets: '3', reps: '8-12', target: 'Chest & Triceps' },
                { name: 'Bent-Over Dumbbell Row', sets: '3', reps: '10-12', target: 'Upper Back & Lats' },
                { name: 'Romanian Deadlift', sets: '3', reps: '10', target: 'Hamstrings' },
                { name: 'Plank Holds', sets: '3', reps: '45-60s', target: 'Core' }
              ]
            },
            {
              day: 'Day 2',
              dayAr: 'اليوم الثاني',
              focus: 'Full Body B (Hypertrophy & Endurance)',
              focusAr: 'جسم كامل ب (بناء عضلي وتحمل)',
              exercises: [
                { name: 'Leg Press or Lunges', sets: '3', reps: '12-15', target: 'Legs' },
                { name: 'Overhead Shoulder Press', sets: '3', reps: '8-10', target: 'Delts' },
                { name: 'Lat Pulldown / Pull-ups', sets: '3', reps: '10-12', target: 'Back & Biceps' },
                { name: 'Push-Ups to Failure', sets: '3', reps: 'Max', target: 'Chest/Triceps' },
                { name: 'Hanging Leg Raises', sets: '3', reps: '12-15', target: 'Abs' }
              ]
            }
          ]
        };

      case 3:
        return {
          splitName: 'Push / Pull / Legs (3-Day)',
          splitNameAr: 'دفع / سحب / أرجل (3 أيام)',
          schedule: [
            {
              day: 'Day 1',
              dayAr: 'اليوم الأول',
              focus: 'Push (Chest, Shoulders, Triceps)',
              focusAr: 'دفع (صدر، أكتاف، ترايسبس)',
              exercises: [
                { name: 'Incline Dumbbell Press', sets: '4', reps: '8-10', target: 'Upper Chest' },
                { name: 'Dips / Cable Flys', sets: '3', reps: '12', target: 'Chest' },
                { name: 'Dumbbell Lateral Raises', sets: '4', reps: '12-15', target: 'Side Delts' },
                { name: 'Triceps Rope Pushdown', sets: '3', reps: '12-15', target: 'Triceps' }
              ]
            },
            {
              day: 'Day 2',
              dayAr: 'اليوم الثاني',
              focus: 'Pull (Back, Rear Delts, Biceps)',
              focusAr: 'سحب (ظهر، أكتاف خلفية، بايسبس)',
              exercises: [
                { name: 'Seated Cable Row', sets: '4', reps: '10', target: 'Mid-Back' },
                { name: 'Lat Pulldown', sets: '3', reps: '10-12', target: 'Lats' },
                { name: 'Face Pulls', sets: '3', reps: '15', target: 'Rear Delts' },
                { name: 'Incline Dumbbell Curls', sets: '3', reps: '10-12', target: 'Biceps' }
              ]
            },
            {
              day: 'Day 3',
              dayAr: 'اليوم الثالث',
              focus: 'Legs & Core',
              focusAr: 'أرجل وجذع',
              exercises: [
                { name: 'Barbell or Dumbbell Squats', sets: '4', reps: '8-10', target: 'Quads' },
                { name: 'Romanian Deadlift', sets: '3', reps: '10-12', target: 'Hamstrings' },
                { name: 'Walking Lunges', sets: '3', reps: '12 each', target: 'Glutes & Legs' },
                { name: 'Calf Raises & Ab Crunches', sets: '3', reps: '15-20', target: 'Calves & Core' }
              ]
            }
          ]
        };

      case 4:
        return {
          splitName: 'Upper / Lower Split (4-Day)',
          splitNameAr: 'علوي / سفلي (4 أيام)',
          schedule: [
            {
              day: 'Day 1',
              dayAr: 'اليوم الأول',
              focus: 'Upper Body A (Strength)',
              focusAr: 'علوي أ (قوة)',
              exercises: [
                { name: 'Flat Bench Press', sets: '4', reps: '6-8', target: 'Chest' },
                { name: 'Barbell or Dumbbell Row', sets: '4', reps: '8-10', target: 'Back' },
                { name: 'Standing Overhead Press', sets: '3', reps: '8', target: 'Shoulders' },
                { name: 'Bicep & Tricep Supersets', sets: '3', reps: '12', target: 'Arms' }
              ]
            },
            {
              day: 'Day 2',
              dayAr: 'اليوم الثاني',
              focus: 'Lower Body A (Quad-Dominant)',
              focusAr: 'سفلي أ (تركيز عضلات الفخذ الأمامية)',
              exercises: [
                { name: 'Back Squat / Leg Press', sets: '4', reps: '8-10', target: 'Quads' },
                { name: 'Bulgarian Split Squat', sets: '3', reps: '10 each', target: 'Quads & Glutes' },
                { name: 'Leg Extensions', sets: '3', reps: '12-15', target: 'Quads' },
                { name: 'Hanging Knee Raises', sets: '3', reps: '15', target: 'Core' }
              ]
            },
            {
              day: 'Day 3',
              dayAr: 'اليوم الثالث',
              focus: 'Upper Body B (Hypertrophy)',
              focusAr: 'علوي ب (بناء عضلي وتحديد)',
              exercises: [
                { name: 'Incline Dumbbell Press', sets: '3', reps: '10-12', target: 'Chest' },
                { name: 'Lat Pulldowns', sets: '3', reps: '10-12', target: 'Lats' },
                { name: 'Lateral Cable Raises', sets: '4', reps: '15', target: 'Delts' },
                { name: 'Hammer Curls & Skullcrushers', sets: '3', reps: '12', target: 'Arms' }
              ]
            },
            {
              day: 'Day 4',
              dayAr: 'اليوم الرابع',
              focus: 'Lower Body B (Posterior Chain)',
              focusAr: 'سفلي ب (عضلات الفخذ الخلفية والظهر السفلي)',
              exercises: [
                { name: 'Deadlift or RDL', sets: '4', reps: '8', target: 'Hamstrings & Glutes' },
                { name: 'Hamstring Leg Curls', sets: '3', reps: '12', target: 'Hamstrings' },
                { name: 'Calf Raises', sets: '4', reps: '15', target: 'Calves' },
                { name: 'Cable Woodchoppers / Plank', sets: '3', reps: '12 each', target: 'Obliques' }
              ]
            }
          ]
        };

      case 5:
        return {
          splitName: 'Upper / Lower + Push / Pull / Legs (5-Day)',
          splitNameAr: 'علوي / سفلي + دفع / سحب / أرجل (5 أيام)',
          schedule: [
            { day: 'Day 1', dayAr: 'اليوم الأول', focus: 'Upper Strength', focusAr: 'قوة الجزء العلوي', exercises: [{ name: 'Heavy Bench Press', sets: '4', reps: '6' }, { name: 'Weighted Pull-ups', sets: '4', reps: '6-8' }, { name: 'OHP', sets: '3', reps: '8' }] },
            { day: 'Day 2', dayAr: 'اليوم الثاني', focus: 'Lower Strength', focusAr: 'قوة الجزء السفلي', exercises: [{ name: 'Barbell Squats', sets: '4', reps: '6-8' }, { name: 'RDLs', sets: '3', reps: '8' }, { name: 'Calves', sets: '4', reps: '12' }] },
            { day: 'Day 3', dayAr: 'اليوم الثالث', focus: 'Push Hypertrophy', focusAr: 'دفع وبناء عضلي', exercises: [{ name: 'Incline DB Press', sets: '3', reps: '10' }, { name: 'Dips', sets: '3', reps: '12' }, { name: 'Lateral Raises', sets: '4', reps: '15' }] },
            { day: 'Day 4', dayAr: 'اليوم الرابع', focus: 'Pull Hypertrophy', focusAr: 'سحب وبناء عضلي', exercises: [{ name: 'Chest-Supported Row', sets: '3', reps: '12' }, { name: 'Lat Pulldowns', sets: '3', reps: '10' }, { name: 'Rear Delt Flys', sets: '3', reps: '15' }] },
            { day: 'Day 5', dayAr: 'اليوم الخامس', focus: 'Legs & Abs Hypertrophy', focusAr: 'أرجل وجذع', exercises: [{ name: 'Leg Press', sets: '4', reps: '12' }, { name: 'Lying Leg Curls', sets: '3', reps: '12' }, { name: 'Abs Circuit', sets: '3', reps: '15' }] }
          ]
        };

      case 6:
      default:
        return {
          splitName: 'Push / Pull / Legs x 2 (6-Day)',
          splitNameAr: 'دفع / سحب / أرجل مرتين أسبوعياً (6 أيام)',
          schedule: [
            { day: 'Day 1', dayAr: 'اليوم الأول', focus: 'Push A', focusAr: 'دفع أ', exercises: [{ name: 'Flat Bench', sets: '4', reps: '8' }, { name: 'Incline DB', sets: '3', reps: '10' }, { name: 'Shoulder Press', sets: '3', reps: '10' }, { name: 'Lateral Raises', sets: '4', reps: '15' }, { name: 'Triceps', sets: '3', reps: '12' }] },
            { day: 'Day 2', dayAr: 'اليوم الثاني', focus: 'Pull A', focusAr: 'سحب أ', exercises: [{ name: 'Barbell Rows', sets: '4', reps: '8' }, { name: 'Lat Pulldown', sets: '3', reps: '10' }, { name: 'Face Pulls', sets: '3', reps: '15' }, { name: 'Bicep Curls', sets: '3', reps: '12' }] },
            { day: 'Day 3', dayAr: 'اليوم الثالث', focus: 'Legs A', focusAr: 'أرجل أ', exercises: [{ name: 'Squats', sets: '4', reps: '8' }, { name: 'RDLs', sets: '3', reps: '10' }, { name: 'Leg Extensions', sets: '3', reps: '12' }, { name: 'Calves', sets: '4', reps: '15' }] },
            { day: 'Day 4', dayAr: 'اليوم الرابع', focus: 'Push B', focusAr: 'دفع ب', exercises: [{ name: 'Overhead Press', sets: '4', reps: '8' }, { name: 'Incline Bench', sets: '3', reps: '10' }, { name: 'Chest Flys', sets: '3', reps: '12' }, { name: 'Lateral Raises', sets: '4', reps: '15' }] },
            { day: 'Day 5', dayAr: 'اليوم الخامس', focus: 'Pull B', focusAr: 'سحب ب', exercises: [{ name: 'Deadlifts or Heavy Rows', sets: '3', reps: '6-8' }, { name: 'Close-Grip Pulldown', sets: '3', reps: '12' }, { name: 'Hammer Curls', sets: '3', reps: '12' }] },
            { day: 'Day 6', dayAr: 'اليوم السادس', focus: 'Legs B', focusAr: 'أرجل ب', exercises: [{ name: 'Hack Squat / Leg Press', sets: '4', reps: '10' }, { name: 'Hamstring Curls', sets: '3', reps: '12' }, { name: 'Lunges', sets: '3', reps: '12' }, { name: 'Ab Crunches', sets: '3', reps: '15' }] }
          ]
        };
    }
  },

  // Generate budget-optimized nutrition & grocery plan
  generateBudgetMealPlan(budgetTier, macros) {
    const plans = {
      budget: {
        tierName: 'Budget-Smart (High Protein / Value)',
        tierNameAr: 'اقتصادي ذكي (بروتين عالي / تكلفة منخفضة)',
        estimatedCostPerDay: '$4.50 - $6.50 / day',
        estimatedCostPerDayAr: '٤.٥ - ٦.٥ دولار / يومياً',
        groceryList: [
          { item: 'Whole Eggs (30 pack)', itemAr: 'بيض بلدي / مائدة (كرتونة)', reason: 'Cheap complete protein & healthy fats', reasonAr: 'بروتين متكامل ودهون صحية بأقل سعر' },
          { item: 'Rolled Oats (1kg bag)', itemAr: 'شوفان حبة كاملة (١ كجم)', reason: 'Complex carbs and high fiber', reasonAr: 'كربوهيدرات معقدة وألياف عالية للشبع' },
          { item: 'Canned Tuna / Sardines', itemAr: 'تونا معلبة / سردين', reason: 'Lean protein on a budget', reasonAr: 'بروتين صافي أوميغا 3 ممتاز' },
          { item: 'Cottage Cheese / Labneh', itemAr: 'جبن قريش / لبنة', reason: 'High casein protein for overnight recovery', reasonAr: 'بروتين كازين بطيء الامتصاص للعضلات' },
          { item: 'White/Brown Rice & Lentils', itemAr: 'أرز أبيض/بني وعدس أصفر/أبو جبة', reason: 'Bulk, cheap clean energy', reasonAr: 'طاقة نظيفة وموفرة جداً' },
          { item: 'Peanut Butter & Bananas', itemAr: 'زبدة فول سوداني وموز', reason: 'High calorie density & potassium', reasonAr: 'سعرات صحية وبوتاسيوم للطاقة' }
        ],
        dailyMeals: [
          {
            meal: 'Breakfast',
            mealAr: 'الإفطار',
            description: '3 Boiled or Scrambled Eggs + 60g Oats with warm water/milk + 1 Banana',
            descriptionAr: '٣ بيضات مسلوقة أو مقلية بقليل من الزيت + ٦٠ جم شوفان + موزة',
            macros: 'P: 28g | C: 65g | F: 18g'
          },
          {
            meal: 'Lunch',
            mealAr: 'الغداء',
            description: '1 Can Tuna (drained) + 150g Rice (cooked) + Large Cucumber & Tomato salad',
            descriptionAr: 'علبة تونة مصفاة + ١٥٠ جم أرز مطبوخ + سلطة خيار وطماطم طازجة',
            macros: 'P: 35g | C: 45g | F: 6g'
          },
          {
            meal: 'Pre/Post Workout Snack',
            mealAr: 'وجبة خفيفة / قبل التمرين',
            description: '1 Slice Whole Wheat Bread + 1 Tbsp Peanut Butter + Black Coffee / Tea',
            descriptionAr: 'شريحة خبز حبة كاملة + ملعقة زبدة فول سوداني + شاي أو قهوة بدون سكر',
            macros: 'P: 8g | C: 20g | F: 9g'
          },
          {
            meal: 'Dinner',
            mealAr: 'العشاء',
            description: '150g Cottage Cheese (قريش) with olive oil & cumin + 1 boiled egg + pita bread',
            descriptionAr: '١٥٠ جم جبن قريش بزيت زيتون وكمون + بيضة مسلوقة + نصف رغيف خبز بلدي',
            macros: 'P: 28g | C: 25g | F: 10g'
          }
        ]
      },
      moderate: {
        tierName: 'Balanced Fresh (Standard Budget)',
        tierNameAr: 'متوازن ومتنوع (ميزانية متوسطة)',
        estimatedCostPerDay: '$8.00 - $12.00 / day',
        estimatedCostPerDayAr: '٨ - ١٢ دولار / يومياً',
        groceryList: [
          { item: 'Chicken Breast (fresh bulk)', itemAr: 'صدور دجاج طازجة (شراء كميات)', reason: 'Pure lean protein staple', reasonAr: 'المصدر الأساسي للبروتين الصافي' },
          { item: 'Greek Yogurt (plain)', itemAr: 'زبادي يوناني طبيعي', reason: 'High protein & gut health', reasonAr: 'بروتين عالي وخمائر صحية للأمعاء' },
          { item: 'Sweet Potatoes & Quinoa', itemAr: 'بطاطا حلوة وكينوا', reason: 'Low glycemic carbs & vitamins', reasonAr: 'كربوهيدرات بطيئة الهضم وفيتامينات' },
          { item: 'Frozen Mixed Berries', itemAr: 'توت مشكل مجمد', reason: 'Antioxidants & great flavor', reasonAr: 'مضادات أكسدة وسعرات قليلة' },
          { item: 'Olive Oil & Raw Almonds', itemAr: 'زيت زيتون بكر ولوز نيء', reason: 'Hormone balance & brain health', reasonAr: 'دهون غير مشبعة تدعم الهرمونات' }
        ],
        dailyMeals: [
          {
            meal: 'Breakfast',
            mealAr: 'الإفطار',
            description: 'Greek Yogurt (200g) with Honey, Berries, and 50g Rolled Oats + 2 Eggs',
            descriptionAr: '٢٠٠ جم زبادي يوناني مع ملعقة عسل وتوت وشوفان + بيضتان مسلوقتان',
            macros: 'P: 34g | C: 50g | F: 14g'
          },
          {
            meal: 'Lunch',
            mealAr: 'الغداء',
            description: '180g Grilled Chicken Breast + 200g Baked Sweet Potato + Steamed Broccoli with Olive Oil',
            descriptionAr: '١٨٠ جم صدور دجاج مشوية + ٢٠٠ جم بطاطا مشوية + بروكلي بزيت الزيتون',
            macros: 'P: 45g | C: 48g | F: 10g'
          },
          {
            meal: 'Pre/Post Workout Snack',
            mealAr: 'وجبة خفيفة / قبل التمرين',
            description: 'Whey Protein Shake or 1 Hard-boiled egg with an apple and handful of almonds',
            descriptionAr: 'سكوب بروتين أو بيضة مسلوقة مع تفاحة وحفنة لوز',
            macros: 'P: 20g | C: 22g | F: 11g'
          },
          {
            meal: 'Dinner',
            mealAr: 'العشاء',
            description: '150g Lean Minced Beef or Chicken + Mixed Green Salad + Olive Oil dressing',
            descriptionAr: '١٥٠ جم لحم مفروم قليل الدسم أو دجاج + سلطة خضراء غنية بزيت الزيتون',
            macros: 'P: 38g | C: 15g | F: 14g'
          }
        ]
      },
      premium: {
        tierName: 'Performance & Gourmet (High Budget)',
        tierNameAr: 'أداء عالي وفاخر (ميزانية مرنة)',
        estimatedCostPerDay: '$15.00+ / day',
        estimatedCostPerDayAr: '١٥+ دولار / يومياً',
        groceryList: [
          { item: 'Fresh Salmon Fillets', itemAr: 'فيليه سمك سلمون طازج', reason: 'Premium Omega-3s & high quality protein', reasonAr: 'أعلى جودة بروتين وأوميغا 3 نقية' },
          { item: 'Grass-fed Beef Steaks', itemAr: 'لحم بقري عضوي (ستيك)', reason: 'Natural creatine, iron & zinc', reasonAr: 'كرياتين وحديد طبيعي لبناء القوة' },
          { item: 'Organic Avocados & Nuts', itemAr: 'أفوكادو عضوي ومكسرات منوعة', reason: 'Quality healthy fats', reasonAr: 'دهون مفيدة ومضادات أكسدة' },
          { item: 'Whey Isolate Protein', itemAr: 'مكمل واي بروتين آيزوليت', reason: 'Ultra-fast absorption post-workout', reasonAr: 'سريع الامتصاص بعد التمرين' }
        ],
        dailyMeals: [
          {
            meal: 'Breakfast',
            mealAr: 'الإفطار',
            description: '3 Whole Organic Eggs + Smoked Salmon slices on Sourdough bread + 1/2 Avocado',
            descriptionAr: '٣ بيضات عضوية + شرائح سلمون مدخن على خبز الساوردو + نصف حبة أفوكادو',
            macros: 'P: 38g | C: 35g | F: 24g'
          },
          {
            meal: 'Lunch',
            mealAr: 'الغداء',
            description: '200g Sirloin Steak or Salmon Fillet + Jasmine Rice + Grilled Asparagus',
            descriptionAr: '٢٠٠ جم ستيك بقري أو سلمون + أرز ياسمين + هليون مشوي',
            macros: 'P: 48g | C: 50g | F: 18g'
          },
          {
            meal: 'Post-Workout',
            mealAr: 'بعد التمرين',
            description: 'Whey Isolate Shake with almond milk + Rice cakes with almond butter',
            descriptionAr: 'مشروب واي بروتين مع حليب لوز + كعك الأرز بزبدة اللوز',
            macros: 'P: 30g | C: 28g | F: 7g'
          },
          {
            meal: 'Dinner',
            mealAr: 'العشاء',
            description: '180g Grilled Chicken or White Fish + Roasted Vegetables & Quinoa Bowl',
            descriptionAr: '١٨٠ جم دجاج أو سمك أبيض مشوي + خضار مشوية وطبق كينوا',
            macros: 'P: 42g | C: 30g | F: 12g'
          }
        ]
      }
    };

    return plans[budgetTier] || plans.budget;
  }
};

if (typeof window !== 'undefined') {
  window.PlanEngine = PlanEngine;
}
