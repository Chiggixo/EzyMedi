import subprocess
import time
import sys
import os


def run_system():
    print("--- EZYMEDI MASTER SYSTEM LAUNCH ---")

    # 1. Check for AI Model (Train if missing)
    model_path = os.path.join('ml_model', 'model.pkl')
    if not os.path.exists(model_path):
        print("⚠️ AI Model not found. Starting training process...")
        try:
            # Run the training script and wait for it to finish
            subprocess.run([sys.executable, 'ml_model/train_model.py'], check=True)
            print("✅ Model training complete.")
        except subprocess.CalledProcessError as e:
            print(f"❌ Error during training: {e}")
            return  # Stop if training fails

    # 2. Start Backend Server (runs in parallel)
    print("🚀 Starting Flask Backend (Server + Internal Simulator)...")
    # Popen starts the process without blocking this script
    backend = subprocess.Popen([sys.executable, 'backend/app.py'])

    # Give the server a moment to initialize
    time.sleep(3)

    print("\n--- SYSTEM ONLINE ---")
    print(f"Backend Server running at: http://127.0.0.1:5001")
    print(f"Dashboard available at:    http://127.0.0.1:5001/")
    print("Press Ctrl+C to stop the entire system.")

    try:
        # Keep the main script alive so it can monitor the subprocess
        while True:
            # Check if backend crashed
            if backend.poll() is not None:
                print("❌ Backend server stopped unexpectedly.")
                break
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Stopping System...")
        backend.terminate()  # Kill the server process
        print("System shutdown complete.")


if __name__ == "__main__":
    # Ensure we are running from the project root
    if not os.path.exists('backend') or not os.path.exists('ml_model'):
        print("❌ Error: Please run this script from the 'EzyMedi' root folder.")
    else:
        run_system()