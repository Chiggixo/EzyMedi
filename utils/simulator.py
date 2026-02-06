import requests
import random
import time
import os
import numpy as np
from itertools import cycle

# Attempt to load medical library for real clinical patterns
try:
    import wfdb

    HAS_WFDB = True
except ImportError:
    HAS_WFDB = False
    print("⚠️ wfdb library not found. Falling back to synthetic patterns.")

# Server Configuration
BACKEND_URL = 'http://127.0.0.1:5001/api/vitals'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIT_BIH_DIR = os.path.join(BASE_DIR, 'backend', 'mit_bih_data')


class ClinicalWardPatient:
    def __init__(self, pid, record, condition):
        self.pid = pid
        self.record = record
        self.condition = condition  # 'Stable', 'Acute', 'Chronic', 'Noisy'
        self.index = 0
        self.bpm_data = np.array([])

        # Internal Physiological State (Floats for smooth drift)
        self.current_spo2 = 98.5
        self.base_temp = 36.6

        # Load clinical data if file exists
        if record and HAS_WFDB:
            self.load_clinical_data()

    def load_clinical_data(self):
        """Loads data from different clinical databases (MIT-BIH, CHF, NST)"""
        try:
            path = os.path.join(MIT_BIH_DIR, self.record)
            if not os.path.exists(path + '.dat'):
                print(f"⚠️ Missing .dat for {self.record} in {MIT_BIH_DIR}")
                return

            # Map record types to correct annotation extensions
            ext = 'ecg' if 'chf' in self.record else 'atr'
            # Determine sampling frequency (MIT-BIH = 360Hz, BIDMC = 250Hz)
            fs = 250 if 'chf' in self.record else 360

            annotation = wfdb.rdann(path, ext)
            r_peaks = annotation.sample

            # Calculate Heart Rate from interval differences
            self.bpm_data = 60 / (np.diff(r_peaks) / fs)
            # Filter outliers/noise spikes for clean data stream
            self.bpm_data = self.bpm_data[(self.bpm_data > 40) & (self.bpm_data < 210)]

            print(f"✅ Loaded {self.pid}: {len(self.bpm_data)} clinical beats ({self.condition})")
        except Exception as e:
            print(f"❌ Error loading {self.record}: {e}")

    def get_packet(self):
        """Generate one packet of vitals based on clinical state and drift logic."""
        # 1. Heart Rate Selection (Real human data)
        if self.bpm_data.size > 0:
            hr = float(self.bpm_data[self.index % len(self.bpm_data)])
            # For "Noisy" patient, add sensor jitter to the HR
            if self.condition == 'Noisy':
                hr += random.uniform(-5, 5)
        else:
            hr = 75.0 + random.randint(-5, 5)

        self.index += 1

        # 2. Physiological Drift (Random Walk logic for SpO2)
        # Instead of being stuck, the value "drifts" slightly each step
        drift = random.uniform(-0.2, 0.2)
        self.current_spo2 += drift

        # Keep SpO2 in realistic bounds for a stable patient
        if self.condition == 'Stable':
            self.current_spo2 = max(min(self.current_spo2, 99.4), 97.0)

        # 3. Condition-Specific Deviations
        spo2_out = self.current_spo2
        mot = 0.5

        if self.condition == 'Acute':
            # Rapid drop simulation when Heart Rate spikes
            if hr > 120:
                spo2_out -= (self.index % 10) * 0.5

        elif self.condition == 'Chronic':
            # Persistent decay (drops 0.05% every packet)
            # Simulates slow oxygen decline in heart failure patients
            spo2_out = 98.0 - (self.index * 0.05)

        elif self.condition == 'Noisy':
            # High motion (MPU6050 simulation)
            mot = 5.8 + random.uniform(0, 2.0)
            # Movement causes SpO2 sensor "bouncing" (simulates probe loose/movement noise)
            if random.random() > 0.8:
                spo2_out -= random.uniform(1, 4)

        return {
            "patient_id": self.pid,
            "body_temperature_C": round(self.base_temp + random.uniform(-0.1, 0.1), 1),
            "spo2_percent": int(max(min(spo2_out, 100), 70)),
            "ecg_bpm": int(hr),
            "bp_systolic_mmHg": 120 + (25 if hr > 130 else 0),
            "bp_diastolic_mmHg": 80,
            "motion_magnitude": mot,
            "humidity_percent": 50,
            "alcohol_mg_L": 0.0
        }


if __name__ == "__main__":
    print("=" * 60)
    print("🏥 EZYMEDI CLINICAL WARD: VITAL DRIFT ENGINE ONLINE")
    print("=" * 60)

    # Initialize the 4 unique clinical ward cases
    ward = [
        ClinicalWardPatient('patient_001', '100', 'Stable'),
        ClinicalWardPatient('patient_002', '203', 'Acute'),
        ClinicalWardPatient('patient_003', 'chf01', 'Chronic'),
        ClinicalWardPatient('patient_004', '118e_6', 'Noisy')
    ]

    stream = cycle(ward)

    while True:
        p = next(stream)
        try:
            # Send to the backend API
            requests.post(BACKEND_URL, json=p.get_packet(), timeout=5)
        except Exception as e:
            # Silent fail for connection issues during ward cycles
            pass

        # 0.3s sleep for highly responsive dashboard updates
        # Syncs perfectly with 800ms frontend polling
        time.sleep(0.3)