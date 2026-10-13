/**
 * RTM (ريتم) - Smartwatch & Wearables Integration Simulator
 * Simulates real-time telemetry (Heart rate, steps, calories burned, sync state)
 */
class WearablesSimulator {
  constructor(updateCallback) {
    this.updateCallback = updateCallback;
    this.isConnected = false;
    this.deviceType = 'Apple Watch Series 9';
    this.heartRate = 72;
    this.steps = 5420;
    this.activeCalories = 320;
    this.battery = 84;
    this.intervalId = null;
  }

  connect(deviceName = 'Apple Watch Ultra / WearOS') {
    this.isConnected = true;
    this.deviceType = deviceName;
    this.startTelemetry();
    this.emitUpdate();
  }

  disconnect() {
    this.isConnected = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emitUpdate();
  }

  toggleConnection() {
    if (this.isConnected) {
      this.disconnect();
    } else {
      this.connect();
    }
  }

  startTelemetry() {
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      if (!this.isConnected) return;

      // Realistic random fluctuation in BPM (e.g. 68 to 88 resting/walking)
      const deltaBpm = Math.floor(Math.random() * 5) - 2;
      this.heartRate = Math.min(160, Math.max(62, this.heartRate + deltaBpm));

      // Periodic step increment
      if (Math.random() > 0.4) {
        const addedSteps = Math.floor(Math.random() * 12) + 3;
        this.steps += addedSteps;
        this.activeCalories += Math.round(addedSteps * 0.04);
      }

      this.emitUpdate();
    }, 2500);
  }

  emitUpdate() {
    if (this.updateCallback) {
      this.updateCallback({
        isConnected: this.isConnected,
        deviceType: this.deviceType,
        heartRate: this.heartRate,
        steps: this.steps,
        activeCalories: this.activeCalories,
        battery: this.battery,
        lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.WearablesSimulator = WearablesSimulator;
}
