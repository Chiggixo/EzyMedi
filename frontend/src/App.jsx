import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Database,
  Lock,
  Share2,
  Cpu,
  Wind,
  Thermometer,
  Droplets,
  AlertCircle,
  Move,
  TrendingUp,
  User,
  Globe,
  FileJson
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components for the forecasting graph
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const App = () => {
  const [vitals, setVitals] = useState(null);
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [patientId, setPatientId] = useState('patient_001');

  const patients = [
    { id: 'patient_001', label: 'PATIENT 001 (Stable Baseline)' },
    { id: 'patient_002', label: 'PATIENT 002 (Acute Crisis)' },
    { id: 'patient_003', label: 'PATIENT 003 (Chronic Decay)' },
    { id: 'patient_004', label: 'PATIENT 004 (Noise Stress Test)' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://ezymedi-api.onrender.com/api/get_latest_vital?patient_id=${patientId}`);
        const data = await response.json();

        if (!data.error) {
          setVitals(data);
          setIsConnected(true);

          setHistory(prev => {
            const newPoint = {
              time: new Date().toLocaleTimeString().split(' ')[0],
              hr: data.vitals.ecg_bpm,
              spo2: data.vitals.spo2_percent
            };
            return [...prev, newPoint].slice(-20);
          });
        }
      } catch (err) {
        setIsConnected(false);
      }
    };

    // 800ms interval to synchronize with the faster simulator stream
    const interval = setInterval(fetchData, 800);
    return () => clearInterval(interval);
  }, [patientId]);

  const handleDownloadFhir = () => {
    if (!vitals) return;
    const fhirResource = {
      resourceType: "Observation",
      id: `ezymedi-${vitals.vitals._id}`,
      status: "final",
      category: [{ text: "Vital Signs" }],
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: vitals.vitals.timestamp,
      performer: [{ display: "EzyMedi Intelligent AI Node" }],
      component: [
        { code: { text: "Heart Rate" }, valueQuantity: { value: vitals.vitals.ecg_bpm, unit: "bpm" } },
        { code: { text: "SpO2" }, valueQuantity: { value: vitals.vitals.spo2_percent, unit: "%" } },
        { code: { text: "Body Temp" }, valueQuantity: { value: vitals.vitals.body_temperature_C, unit: "C" } }
      ]
    };

    const blob = new Blob([JSON.stringify(fhirResource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EzyMedi_FHIR_${patientId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = {
    labels: history.map(h => h.time),
    datasets: [
      {
        label: 'Heart Rate',
        data: history.map(h => h.hr),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 3
      },
      {
        label: 'SpO2 Oxygen',
        data: history.map(h => h.spo2),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 3
      }
    ]
  };

  const VitalCard = ({ title, value, unit, icon: Icon, colorClass, isAnomaly }) => (
    <div className={`bg-[#0d1117] border p-6 rounded-[2rem] transition-all duration-300 shadow-xl ${isAnomaly ? 'border-red-500 ring-2 ring-red-500/10 animate-pulse' : 'border-gray-800'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClass}`}>
          <Icon size={20} className="text-white" />
        </div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-4xl font-bold text-white tracking-tighter">{value ?? '--'}</span>
        <span className="text-gray-500 text-xs font-semibold">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#010409] text-gray-200 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <nav className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-white uppercase italic">EzyMedi <span className="text-blue-500 font-normal text-xs align-top not-italic ml-1 normal-case tracking-normal">PRO AI</span></h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                <Globe size={12} className="text-blue-500 animate-pulse" /> Clinical Validation Node
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
             <button
               onClick={handleDownloadFhir}
               className="flex items-center gap-2 bg-[#161b22] border border-gray-800 px-6 py-3 rounded-2xl text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-lg"
             >
               <FileJson size={14} /> EXPORT FHIR
             </button>

            <div className="flex items-center gap-4 bg-[#161b22] border border-gray-800 p-2 rounded-2xl px-5">
              <User size={18} className="text-blue-500" />
              <select
                className="bg-transparent border-none text-sm font-bold text-white outline-none cursor-pointer pr-4"
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  setHistory([]);
                }}
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0d1117]">{p.label}</option>
                ))}
              </select>
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-bold border ${isConnected ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : 'bg-red-400'}`} />
                {isConnected ? 'LIVE' : 'LINK LOST'}
              </div>
            </div>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <VitalCard
                title="Pulse Rate"
                value={vitals?.vitals?.ecg_bpm}
                unit="BPM"
                icon={Activity}
                colorClass="bg-red-600"
                isAnomaly={vitals?.vitals?.ecg_bpm > 110}
              />
              <VitalCard
                title="Oxygen Sat"
                value={vitals?.vitals?.spo2_percent}
                unit="%"
                icon={Wind}
                colorClass="bg-blue-600"
                isAnomaly={vitals?.vitals?.spo2_percent < 94}
              />
              <VitalCard
                title="Body Temp"
                value={vitals?.vitals?.body_temperature_C?.toFixed(1)}
                unit="°C"
                icon={Thermometer}
                colorClass="bg-orange-500"
              />
              <VitalCard title="Humidity" value={vitals?.vitals?.humidity_percent} unit="%" icon={Droplets} colorClass="bg-cyan-600" />
              <VitalCard title="Toxicity (MQ3)" value={vitals?.vitals?.alcohol_mg_L} unit="mg/L" icon={AlertCircle} colorClass="bg-rose-500" />
              <VitalCard
                title="Motion (MPU)"
                value={vitals?.vitals?.motion_magnitude?.toFixed(1)}
                unit="G"
                icon={Move}
                colorClass="bg-violet-600"
                isAnomaly={vitals?.vitals?.motion_magnitude > 4.5}
              />
            </div>

            <div className="bg-[#0d1117] border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-3 text-sm uppercase tracking-wider">
                      <TrendingUp size={20} className="text-blue-400" /> Temporal Crisis Forecasting
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold italic">
                        Inference: <span className={vitals?.anomaly_report?.forecast?.includes('STABLE') ? 'text-blue-400' : 'text-orange-400 animate-pulse'}>
                          {vitals?.anomaly_report?.forecast}
                        </span>
                    </p>
                  </div>
               </div>
               <div className="h-56 w-full">
                  <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.03)' } } } }} />
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className={`p-8 rounded-[2.5rem] border transition-all duration-700 ${vitals?.anomaly_report?.status === 'abnormal' ? 'bg-red-950/20 border-red-500/40 shadow-red-500/10' : 'bg-[#0d1117]/50 border-gray-800'}`}>
              <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-4">
                <Database size={22} className="text-blue-500" /> AI Analytics
              </h2>
              <div className="min-h-[140px]">
                {vitals?.anomaly_report?.alerts?.length > 0 ? (
                  vitals.anomaly_report.alerts.map((a, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[#161b22] border border-red-500/20 text-red-400 text-[11px] font-bold mb-2 uppercase">{a}</div>
                  ))
                ) : (
                  <div className="text-center opacity-10 py-10">
                    <ShieldCheck size={56} className="mx-auto" />
                  </div>
                )}
              </div>
              <div className="mt-8 pt-8 border-t border-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Cpu size={14} /> ABP Progress</span>
                  <span className="text-[10px] font-bold text-blue-400">{vitals?.abp_progress}%</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${vitals?.abp_progress}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-gray-800 p-7 rounded-[2.5rem] shadow-2xl">
                <h3 className="text-white font-bold text-xs uppercase mb-5 flex items-center gap-3 tracking-widest">
                  <Lock size={16} className="text-blue-500" /> Blockchain Log
                </h3>
                <div className="bg-black/60 p-5 rounded-2xl border border-gray-800/60 font-mono text-[9px] text-blue-400/80 break-all leading-relaxed shadow-inner uppercase font-black">
                  SHA-256: {vitals?.vitals?.block_hash}
                </div>
                <div className="mt-5 flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                   Immutable Proof Verified
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
