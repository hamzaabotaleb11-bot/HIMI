# RTM (ريتم) - Personalized Fitness & Budget-Smart Nutrition

**RTM** is a modern, responsive web application that tailors workout routines and meal plans around your real-world lifestyle constraints:

> *"Your Pace. Your Budget. Your Real Life."*

---

## ⚡ Key Features

1. **Physical Metrics & Calorie Engine**
   - Inputs for Height, Weight, Age, and Gender.
   - Computes Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).
   - Generates exact daily calorie goals and macronutrient distributions (Protein, Carbs, Fats) based on goals:
     - Burn Fat & Shred (Caloric deficit + protein sparing)
     - Build Lean Muscle (Hypertrophy caloric surplus)
     - Maximize Strength & Power
     - Healthy Athletic Maintenance

2. **Adaptive Training Splits (2 to 6 Days / Week)**
   - **2 Days:** Full Body Split A & B (Maximum efficiency compound movements)
   - **3 Days:** Push / Pull / Legs
   - **4 Days:** Upper Body / Lower Body Split (A & B)
   - **5 Days:** Upper / Lower + Push / Pull / Legs Hybrid
   - **6 Days:** Push / Pull / Legs x 2 high-frequency rotation
   - Includes targeted exercises, sets, reps, and muscle groups for each day.

3. **Budget-Smart Nutrition & Grocery Strategy**
   - **Smart Budget ($4 - $6 / day):** Prioritizes highest protein-per-dollar staples (whole eggs, rolled oats, canned tuna, cottage cheese / قريش, rice, peanut butter).
   - **Standard Fresh ($8 - $12 / day):** Chicken breast, Greek yogurt, sweet potatoes, berries, olive oil.
   - **Performance ($15+ / day):** Salmon, sirloin steaks, avocados, whey isolate.
   - Full daily meal schedule: Breakfast, Lunch, Pre/Post-workout, and Dinner.

4. **Smartwatch & Wearables Sync Simulation**
   - Live telemetry feed: Real-time heart rate (with animated optical sensor pulse), daily step counter, active calorie burn, and battery level.
   - Interactive pair/unpair device toggle.

5. **Progress & Weigh-In Tracker**
   - Log new weigh-ins with date and workout/energy notes.
   - Keeps track of historical check-ins with local storage persistence.

6. **Bilingual Support (English & العربية)**
   - One-click toggle between English and Arabic with native RTL (Right-to-Left) layout support.

---

## 🚀 How to Run

Because **RTM** is built as a zero-dependency modern web application:
- Simply double-click [`index.html`](file:///C:/Users/hamza/.gemini/antigravity/scratch/HIMI/index.html) or open it in any browser (Chrome, Edge, Firefox, Safari).
- Or run in PowerShell:
  ```powershell
  Start-Process "C:\Users\hamza\.gemini\antigravity\scratch\HIMI\index.html"
  ```

---

## 📁 Repository Structure

```text
HIMI/
├── index.html        # App interface & responsive layout
├── styles.css        # Design tokens, glassmorphism, heartbeat animations, dark theme
├── app.js            # App controller, bilingual dictionary, state persistence
├── plan-engine.js    # Workout split algorithms, TDEE, macros & budget meal logic
├── wearables.js      # Smartwatch telemetry simulation & event streaming
└── README.md         # Documentation & guide
```
