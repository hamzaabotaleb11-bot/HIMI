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

  // Generate a tailored training split depending on schedule (free days), goal, height and weight
  generateWorkoutSplit(daysPerWeek, goal = 'lose_weight', heightCm = 175, weightKg = 78) {
    const days = Math.min(6, Math.max(2, parseInt(daysPerWeek, 10) || 4));
    const userGoal = goal || 'lose_weight';
    const height = parseFloat(heightCm) || 175;
    const weight = parseFloat(weightKg) || 78;

    // Body Mass Index & Anthropometrics
    const heightM = height / 100;
    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));

    let bmiCategory = 'Normal / Athletic';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Normal / Athletic';
    else if (bmi < 30) bmiCategory = 'Overweight (Cut Focus)';
    else bmiCategory = 'High Mass (Joint-Friendly Focus)';

    // Biomechanical leverage assessment based on height
    const isTall = height >= 182;
    const isCompact = height <= 168;
    let leverageNote = '';
    if (isTall) {
      leverageNote = 'Longer limb levers detected: routine emphasizes hip-hinge mechanics and angled presses to reduce spinal/joint shear.';
    } else if (isCompact) {
      leverageNote = 'Compact limb levers detected: natural mechanical advantage for deep compound squats and high-torque bench press power.';
    } else {
      leverageNote = 'Balanced biomechanical proportions: ideal structural leverage for progressive overload across full-body compound lifts.';
    }

    // Weight and Goal-specific intensity, rep scheme, rest interval & tempo
    let repScheme = '8-12 reps';
    let defaultSets = '3-4';
    let restTime = '75-90s';
    let pacingStrategy = 'Controlled 2-second eccentric tempo';
    let cardioProtocol = null;

    if (userGoal === 'lose_weight') {
      repScheme = bmi >= 26 ? '12-15 reps (Metabolic joint-friendly)' : '10-14 reps (Hypertrophic fat-burn)';
      defaultSets = '3-4';
      restTime = '45-60s (Shorter rest for elevated calorie burn)';
      pacingStrategy = 'High-density supersets with continuous muscular tension';
      cardioProtocol = {
        title: 'Post-Workout Fat Oxidation Finisher',
        duration: '12-15 mins',
        description: bmi >= 27
          ? 'Low-impact steep incline treadmill walk (10-12% incline @ 4.2-4.8 km/h) to accelerate fat oxidation while protecting knees and joints.'
          : 'High-intensity interval rowing or stair sprints (40s work / 20s recovery) to maximize post-exercise oxygen consumption.'
      };
    } else if (userGoal === 'gain_muscle') {
      repScheme = '8-12 reps (Hypertrophy volume)';
      defaultSets = '3-4';
      restTime = '75-90s (Adequate ATP replenishment for volume)';
      pacingStrategy = 'Strict 3-second eccentric descent for maximum micro-trauma';
      cardioProtocol = {
        title: 'Active Recovery & Flexibility',
        duration: '5-8 mins',
        description: 'Light incline walk cool-down followed by loaded thoracic spine and hip flexor stretches to optimize nutrient delivery.'
      };
    } else if (userGoal === 'strength') {
      repScheme = '4-6 reps (Heavy compound) / 8-10 reps (Accessories)';
      defaultSets = '4-5';
      restTime = '120-180s (Full central nervous system recovery)';
      pacingStrategy = 'Maximum explosive concentric drive with strict isometric brace';
      cardioProtocol = {
        title: 'CNS Decompression & Core Stability',
        duration: '5 mins',
        description: 'Dead hangs from pull-up bar (3 sets of 45s) for spinal decompression and diaphragmatic box breathing.'
      };
    } else { // maintain
      repScheme = '10-12 reps (Athletic conditioning)';
      defaultSets = '3';
      restTime = '60-75s';
      pacingStrategy = 'Smooth continuous rhythm through full joint range of motion';
      cardioProtocol = {
        title: 'Aerobic Base Conditioning',
        duration: '10 mins',
        description: 'Zone 2 steady-state jogging or stationary bike at a smooth conversational pace.'
      };
    }

    // Exercise tailoring helpers based on height & weight
    const squatEx = isTall ? 'Barbell Box Squat or Leg Press' : (isCompact ? 'Full-Depth Olympic Back Squat' : 'Barbell Back Squat / Goblet Squat');
    const squatCue = isTall ? 'Widen stance slightly and hinge hips back to minimize lower back rounding' : 'Maintain an upright torso and drive hard through mid-foot';

    const deadliftEx = isTall ? 'Trap-Bar or Romanian Deadlift' : 'Conventional Barbell Deadlift';
    const deadliftCue = isTall ? 'Keeps center of mass closer to hips to reduce tall lever torque' : 'Drive heels through the floor, keeping bar pinned to shins';

    const benchEx = (bmi >= 28) ? 'Incline Dumbbell Press / Neutral Grip Press' : 'Flat Barbell Bench Press';
    const benchCue = 'Tuck elbows at 45 degrees to preserve rotator cuffs under loading';

    const rowEx = (weight >= 90) ? 'Chest-Supported Row or Cable Row' : 'Bent-Over Barbell Row';
    const rowCue = (weight >= 90) ? 'Chest pad eliminates lower back fatigue for heavier bodyweights' : 'Brace core, pull elbows back toward hips';

    let splitName = '';
    let schedule = [];

    switch (days) {
      case 2:
        splitName = 'Full Body Split (2-Day)';
        schedule = [
          {
            day: 'Day 1',
            focus: 'Full Body A (Strength & Posture)',
            duration: '50-60 min',
            exercises: [
              { name: squatEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Quads & Glutes', formCue: squatCue },
              { name: benchEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Chest & Front Delts', formCue: benchCue },
              { name: rowEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Upper Back & Lats', formCue: rowCue },
              { name: 'Romanian Deadlift (RDL)', sets: '3', reps: '10-12', rest: restTime, target: 'Hamstrings & Posterior Chain', formCue: 'Soft knees, push hips directly back to stretch hamstrings' },
              { name: 'Plank Holds or Deadbugs', sets: '3', reps: '45-60s', rest: '45s', target: 'Deep Core & Stability', formCue: 'Squeeze glutes and brace abdominal wall tight' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 2',
            focus: 'Full Body B (Hypertrophy & Conditioning)',
            duration: '50-60 min',
            exercises: [
              { name: 'Leg Press or Walking Lunges', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Legs', formCue: 'Maintain even knee alignment over second toe' },
              { name: 'Overhead Dumbbell Press', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Shoulders & Triceps', formCue: 'Press in natural scapular plane, do not arch lower back' },
              { name: 'Lat Pulldown or Assisted Pull-ups', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Back & Biceps', formCue: 'Drive elbows down to waist, squeeze shoulder blades' },
              { name: 'Push-Ups or Dips', sets: '3', reps: '12-15', rest: '60s', target: 'Chest & Triceps', formCue: 'Lock core in a straight plank line' },
              { name: 'Hanging Knee Raises', sets: '3', reps: '12-15', rest: '45s', target: 'Abs & Core', formCue: 'Curl pelvis upward without swinging momentum' }
            ],
            finisher: cardioProtocol
          }
        ];
        break;

      case 3:
        splitName = 'Push / Pull / Legs (3-Day)';
        schedule = [
          {
            day: 'Day 1',
            focus: 'Push (Chest, Shoulders, Triceps)',
            duration: '55-65 min',
            exercises: [
              { name: benchEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Upper/Mid Chest', formCue: benchCue },
              { name: 'Incline Dumbbell Press', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Clavicular Chest Head', formCue: '30-degree incline maximizes upper pec activation' },
              { name: 'Standing DB Lateral Raises', sets: '4', reps: '12-15', rest: '45s', target: 'Lateral Deltoids (Shoulder Width)', formCue: 'Lead with elbows, pause 1s at top of movement' },
              { name: 'Triceps Rope Pushdown', sets: '3', reps: '12-15', rest: '45s', target: 'Triceps Lateral/Long Head', formCue: 'Flare rope outward at bottom for full contraction' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 2',
            focus: 'Pull (Lats, Upper Back, Biceps)',
            duration: '55-65 min',
            exercises: [
              { name: rowEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Rhomboids & Mid-Back Thickness', formCue: rowCue },
              { name: 'Lat Pulldown (Neutral Grip)', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Latissimus Dorsi (V-Taper)', formCue: 'Pull through elbows down towards your back pockets' },
              { name: 'Face Pulls with External Rotation', sets: '3', reps: '15', rest: '45s', target: 'Rear Delts & Rotator Cuff', formCue: 'Pull rope toward eye level, externally rotate wrists' },
              { name: 'Incline Dumbbell Curls', sets: '3', reps: '10-12', rest: '60s', target: 'Biceps Long Head', formCue: 'Full stretch at bottom, curl without swinging shoulders' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 3',
            focus: 'Legs & Core (Quads, Hamstrings, Abs)',
            duration: '55-65 min',
            exercises: [
              { name: squatEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Quads & Core', formCue: squatCue },
              { name: deadliftEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Hamstrings & Glutes', formCue: deadliftCue },
              { name: 'Walking DB Lunges', sets: '3', reps: '10-12 each leg', rest: '60s', target: 'Single-Leg Balance & Glutes', formCue: 'Keep front shin vertical, drive off front heel' },
              { name: 'Standing Calf Raises & Core Circuit', sets: '4', reps: '15-20', rest: '45s', target: 'Calves & Rectus Abdominis', formCue: 'Hold 2s peak contraction at top on calves' }
            ],
            finisher: cardioProtocol
          }
        ];
        break;

      case 4:
        splitName = 'Upper / Lower Split (4-Day)';
        schedule = [
          {
            day: 'Day 1',
            focus: 'Upper Body A (Power & Heavy Compounds)',
            duration: '50-60 min',
            exercises: [
              { name: benchEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Chest & Triceps', formCue: benchCue },
              { name: rowEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Mid-Back & Lats', formCue: rowCue },
              { name: 'Standing Overhead Press', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Deltoids & Core', formCue: 'Brace abs and glutes to prevent hyperextending lumbar spine' },
              { name: 'Dumbbell Hammer Curls', sets: '3', reps: '10-12', rest: '45s', target: 'Brachialis & Forearms', formCue: 'Keep elbows locked at sides throughout range' },
              { name: 'Overhead Cable Tricep Extension', sets: '3', reps: '12-15', rest: '45s', target: 'Triceps Long Head', formCue: 'Full deep elbow flexion stretch at bottom' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 2',
            focus: 'Lower Body A (Quad-Dominant & Calves)',
            duration: '50-60 min',
            exercises: [
              { name: squatEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Quads & Core', formCue: squatCue },
              { name: 'Bulgarian Split Squats', sets: '3', reps: '8-10 each leg', rest: '60s', target: 'Quads & Glute Medius', formCue: 'Slight torso forward lean loaded on working heel' },
              { name: 'Leg Extensions', sets: '3', reps: '12-15', rest: '45s', target: 'Rectus Femoris Isolation', formCue: 'Pause 1s at top lockout with controlled 2s descent' },
              { name: 'Standing Calf Raises', sets: '4', reps: '12-15', rest: '45s', target: 'Gastrocnemius', formCue: 'Full deep stretch on the bottom step' },
              { name: 'Hanging Leg Raises', sets: '3', reps: '12-15', rest: '45s', target: 'Abdominal Wall', formCue: 'Avoid swinging; initiate movement by tilting hips' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 3',
            focus: 'Upper Body B (Hypertrophy & Pump)',
            duration: '50-60 min',
            exercises: [
              { name: 'Incline Dumbbell Press', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Upper Chest', formCue: 'Lower weights under control with open ribcage' },
              { name: 'Lat Pulldown (Wide Grip)', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Lats & Upper Back', formCue: 'Pull bar down to upper clavicle with chest puffed up' },
              { name: 'Dumbbell Lateral Raises', sets: '4', reps: '12-15', rest: '45s', target: 'Side Delts', formCue: 'Control the descent, do not use body momentum' },
              { name: 'Incline Dumbbell Bicep Curls', sets: '3', reps: '10-12', rest: '45s', target: 'Biceps Long Head', formCue: 'Supinate wrists at top for maximum peak contraction' },
              { name: 'Rope Pushdown', sets: '3', reps: '12-15', rest: '45s', target: 'Triceps Lateral Head', formCue: 'Pin elbows to ribs' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 4',
            focus: 'Lower Body B (Posterior Chain & Hamstrings)',
            duration: '50-60 min',
            exercises: [
              { name: deadliftEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Hamstrings & Glutes', formCue: deadliftCue },
              { name: 'Lying or Seated Hamstring Curls', sets: '3', reps: '10-12', rest: '60s', target: 'Hamstrings Knee Flexion', formCue: 'Point toes toward shins to emphasize hamstring recruitment' },
              { name: 'Leg Press (High & Wide Foot Placement)', sets: '3', reps: '12-15', rest: '60s', target: 'Glutes & Adductors', formCue: 'Keep lower back glued firmly against seat' },
              { name: 'Seated Calf Raises', sets: '4', reps: '15', rest: '45s', target: 'Soleus', formCue: 'Slow controlled 3s negative' },
              { name: 'Cable Woodchoppers', sets: '3', reps: '12 each side', rest: '45s', target: 'Obliques & Rotary Core', formCue: 'Rotate through thoracic spine, keep hips locked forward' }
            ],
            finisher: cardioProtocol
          }
        ];
        break;

      case 5:
        splitName = 'Upper / Lower + Push / Pull / Legs (5-Day)';
        schedule = [
          {
            day: 'Day 1',
            focus: 'Upper Power',
            duration: '55 min',
            exercises: [
              { name: benchEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Chest', formCue: benchCue },
              { name: rowEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Back Thickness', formCue: rowCue },
              { name: 'Overhead Press', sets: '3', reps: '8', rest: restTime, target: 'Shoulders', formCue: 'Squeeze glutes and abs tight' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 2',
            focus: 'Lower Power',
            duration: '55 min',
            exercises: [
              { name: squatEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Quads', formCue: squatCue },
              { name: deadliftEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Posterior Chain', formCue: deadliftCue },
              { name: 'Standing Calf Raises', sets: '4', reps: '12', rest: '45s', target: 'Calves', formCue: 'Hold 2s contraction at top' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 3',
            focus: 'Push Hypertrophy',
            duration: '50 min',
            exercises: [
              { name: 'Incline DB Press', sets: '3', reps: '10-12', rest: '60s', target: 'Upper Chest', formCue: 'Controlled 2s descent' },
              { name: 'Cable Chest Flys', sets: '3', reps: '12-15', rest: '45s', target: 'Inner Chest Stretch', formCue: 'Emphasize deep horizontal adduction stretch' },
              { name: 'Dumbbell Lateral Raises', sets: '4', reps: '15', rest: '45s', target: 'Side Delts', formCue: 'Lead with elbows' },
              { name: 'Overhead Triceps Extension', sets: '3', reps: '12-15', rest: '45s', target: 'Triceps', formCue: 'Full stretch' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 4',
            focus: 'Pull Hypertrophy',
            duration: '50 min',
            exercises: [
              { name: 'Lat Pulldowns', sets: '3', reps: '10-12', rest: '60s', target: 'Lats', formCue: 'Drive elbows down to ribs' },
              { name: 'Seated Cable Row', sets: '3', reps: '10-12', rest: '60s', target: 'Mid-Back', formCue: 'Squeeze shoulder blades together' },
              { name: 'Face Pulls', sets: '3', reps: '15', rest: '45s', target: 'Rear Delts', formCue: 'External rotation at top' },
              { name: 'Incline Bicep Curls', sets: '3', reps: '10-12', rest: '45s', target: 'Biceps', formCue: 'Supinate wrists' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 5',
            focus: 'Legs & Core Hypertrophy',
            duration: '55 min',
            exercises: [
              { name: 'Leg Press', sets: '4', reps: '12-15', rest: '60s', target: 'Quads', formCue: 'Keep knees tracking over toes' },
              { name: 'Hamstring Leg Curls', sets: '3', reps: '12', rest: '45s', target: 'Hamstrings', formCue: 'Controlled negative' },
              { name: 'Walking Lunges', sets: '3', reps: '12 each', rest: '60s', target: 'Glutes & Legs', formCue: 'Step deep' },
              { name: 'Hanging Leg Raises & Plank', sets: '3', reps: '15 reps', rest: '45s', target: 'Core', formCue: 'Brace core' }
            ],
            finisher: cardioProtocol
          }
        ];
        break;

      case 6:
      default:
        splitName = 'Push / Pull / Legs x 2 (6-Day Dedicated)';
        schedule = [
          {
            day: 'Day 1',
            focus: 'Push A (Chest & Triceps Focus)',
            duration: '55 min',
            exercises: [
              { name: benchEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Chest', formCue: benchCue },
              { name: 'Incline DB Press', sets: '3', reps: '10', rest: '60s', target: 'Upper Chest', formCue: '30-degree angle' },
              { name: 'Dips or Cable Flys', sets: '3', reps: '12', rest: '45s', target: 'Lower Chest', formCue: 'Slight forward lean' },
              { name: 'Lateral Raises', sets: '4', reps: '15', rest: '45s', target: 'Delts', formCue: 'Smooth tempo' },
              { name: 'Triceps Pushdown', sets: '3', reps: '12', rest: '45s', target: 'Triceps', formCue: 'Lock elbows' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 2',
            focus: 'Pull A (Lats & Biceps Focus)',
            duration: '55 min',
            exercises: [
              { name: rowEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Back Thickness', formCue: rowCue },
              { name: 'Lat Pulldowns', sets: '3', reps: '10', rest: '60s', target: 'Lats Width', formCue: 'Pull to upper chest' },
              { name: 'Chest Supported Rear Delt Flys', sets: '3', reps: '15', rest: '45s', target: 'Rear Delts', formCue: 'Lead with pinkies' },
              { name: 'Barbell or DB Bicep Curls', sets: '3', reps: '10', rest: '45s', target: 'Biceps', formCue: 'Strict form' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 3',
            focus: 'Legs A (Quad Dominant)',
            duration: '55 min',
            exercises: [
              { name: squatEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Quads', formCue: squatCue },
              { name: 'Bulgarian Split Squats', sets: '3', reps: '10 each', rest: '60s', target: 'Quads & Glutes', formCue: 'Deep knee bend' },
              { name: 'Leg Extensions', sets: '3', reps: '15', rest: '45s', target: 'Quads Isolation', formCue: 'Squeeze at top' },
              { name: 'Standing Calf Raises', sets: '4', reps: '15', rest: '45s', target: 'Calves', formCue: 'Full stretch' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 4',
            focus: 'Push B (Shoulders & Upper Chest)',
            duration: '55 min',
            exercises: [
              { name: 'Overhead Press', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Shoulders', formCue: 'Brace abs tight' },
              { name: 'Incline Bench Press', sets: '3', reps: '10', rest: '60s', target: 'Upper Chest', formCue: 'Controlled tempo' },
              { name: 'Cable Lateral Raises', sets: '4', reps: '15', rest: '45s', target: 'Lateral Delts', formCue: 'Continuous tension' },
              { name: 'Skull Crushers', sets: '3', reps: '12', rest: '45s', target: 'Triceps', formCue: 'Keep upper arms fixed' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 5',
            focus: 'Pull B (Upper Back & Posterior Chain)',
            duration: '55 min',
            exercises: [
              { name: deadliftEx, sets: defaultSets, reps: repScheme, rest: restTime, target: 'Hamstrings & Lats', formCue: deadliftCue },
              { name: 'Seated Cable Row', sets: '3', reps: '10', rest: '60s', target: 'Mid-Back', formCue: 'Full scapular retraction' },
              { name: 'Face Pulls', sets: '3', reps: '15', rest: '45s', target: 'Rotator Cuff', formCue: 'High pull' },
              { name: 'Incline Hammer Curls', sets: '3', reps: '12', rest: '45s', target: 'Brachialis', formCue: 'Neutral grip' }
            ],
            finisher: cardioProtocol
          },
          {
            day: 'Day 6',
            focus: 'Legs B (Hamstrings, Glutes & Abs)',
            duration: '55 min',
            exercises: [
              { name: 'Leg Press (High Foot Stance)', sets: defaultSets, reps: repScheme, rest: restTime, target: 'Glutes & Hamstrings', formCue: 'Press through heels' },
              { name: 'Lying Leg Curls', sets: '3', reps: '12', rest: '45s', target: 'Hamstrings', formCue: 'Full knee flexion' },
              { name: 'Walking Dumbbell Lunges', sets: '3', reps: '12 each', rest: '60s', target: 'Glutes', formCue: 'Long stride' },
              { name: 'Hanging Leg Raises & Ab Crunch', sets: '4', reps: '15', rest: '45s', target: 'Core', formCue: 'Controlled curl' }
            ],
            finisher: cardioProtocol
          }
        ];
        break;
    }

    return {
      splitName,
      daysPerWeek: days,
      goal: userGoal,
      heightCm: height,
      weightKg: weight,
      bmi,
      bmiCategory,
      leverageNote,
      repScheme,
      defaultSets,
      restTime,
      pacingStrategy,
      cardioProtocol,
      schedule
    };
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanEngine;
}
