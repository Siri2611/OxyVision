'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/sidebar';
import {
  IconActivity,
  IconAlertTriangle,
  IconLink,
  IconUsb,
  IconPlayerRecord,
  IconPlayerStop,
  IconUserPlus,
  IconBrain,
  IconStethoscope,
  IconCheck,
  IconLoader,
} from '@tabler/icons-react';

interface Patient {
  id: string;
  name: string;
  recordingUrl: string | null;
  status: string;
  copdProbability?: number | null;
  isLive?: boolean;
  lastUpdated: string;
  age: number;
  bmi: number;
  sex: 'M' | 'F';
}

export default function AdminDetectionDashboard() {
  const { isLoading } = useAuth();
  
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioDataRef = useRef<number[]>(new Array(200).fill(128));
  const animationRef = useRef<number>(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const recordingBufferRef = useRef<number[]>([]);
  const [currentVolume, setCurrentVolume] = useState(0);

  // Patient Management State
  const [patients, setPatients] = useState<Patient[]>([
    { id: '1', name: 'Patient 001', recordingUrl: null, status: 'Ready', isLive: true, lastUpdated: new Date().toLocaleTimeString(), age: 25, bmi: 22.0, sex: 'M' }
  ]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('1');
  const [isPredicting, setIsPredicting] = useState(false);

  // Intake Form Inputs
  const [newAge, setNewAge] = useState<number>(25);
  const [newBmi, setNewBmi] = useState<number>(22.0);
  const [newSex, setNewSex] = useState<'M' | 'F'>('M');

  const connectHardware = async () => {
    // ... same as before
    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      // @ts-expect-error - Web Serial API types might missing
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 921600 });
      setIsSerialConnected(true);

      const reader = port.readable.getReader();

      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              const chunk = Array.from(value) as number[];
              audioDataRef.current = [...audioDataRef.current.slice(chunk.length), ...chunk];
              
              if (isRecordingRef.current) {
                recordingBufferRef.current.push(...chunk);
              }

              let sumSquares = 0;
              for (const byte of chunk) {
                const normalized = (byte - 128) / 128;
                sumSquares += normalized * normalized;
              }
              const rms = Math.sqrt(sumSquares / chunk.length);
              setCurrentVolume(Math.floor(rms * 100));
            }
          }
        } catch (error) {
          console.error('Serial Read Error:', error);
        } finally {
          reader.releaseLock();
        }
      })();

    } catch (error) {
      console.error('Hardware Connection Failed:', error);
      setIsSerialConnected(false);
    }
  };

  const loadTestSample = (type: 'wheeze' | 'crackle') => {
    const url = type === 'wheeze' ? '/test_wheeze.wav' : '/test_crackle.wav';
    setPatients(prev => prev.map(p => 
      p.id === selectedPatientId 
        ? { ...p, recordingUrl: url, status: 'Ready', isLive: false, lastUpdated: new Date().toLocaleTimeString() } 
        : p
    ));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const objectUrl = URL.createObjectURL(file);
    
    setPatients(prev => prev.map(p => 
      p.id === selectedPatientId 
        ? { 
            ...p, 
            recordingUrl: objectUrl, 
            isLive: false, // Mark as clinical uploaded file
            status: 'Ready',
            copdProbability: null
          } 
        : p
    ));
  };

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const data = audioDataRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;

      const sliceWidth = width / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255.0;
        const y = v * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.stroke();
      animationRef.current = requestAnimationFrame(draw);
    };

    if (isSerialConnected) {
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isSerialConnected]);

  const startRecording = () => {
    recordingBufferRef.current = [];
    setIsRecording(true);
    isRecordingRef.current = true;
    
    setPatients(prev => prev.map(p => 
      p.id === selectedPatientId ? { ...p, status: 'Recording...' } : p
    ));
  };

  const stopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;

    const samples = recordingBufferRef.current;
    if (samples.length === 0) return;

    const numChannels = 1;
    const sampleRate = 8000;
    const bytesPerSample = 1;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < samples.length; i++) {
      view.setUint8(44 + i, samples[i]);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    setPatients(prev => prev.map(p => 
      p.id === selectedPatientId 
        ? { ...p, recordingUrl: url, status: 'Ready', isLive: true, lastUpdated: new Date().toLocaleTimeString() } 
        : p
    ));
  };

  const addNewPatient = () => {
    const newId = (patients.length + 1).toString();
    const newPatient: Patient = {
      id: newId,
      name: `Patient 00${newId}`,
      recordingUrl: null,
      status: 'Ready',
      isLive: true,
      lastUpdated: new Date().toLocaleTimeString(),
      age: newAge,
      bmi: newBmi,
      sex: newSex
    };
    setPatients([...patients, newPatient]);
    setSelectedPatientId(newId);
  };

  const clearAllPatients = () => {
    if (typeof window !== 'undefined' && window.confirm('Clear all patient data? (This cannot be undone)')) {
      const initial: Patient = { 
        id: '1', 
        name: 'Patient 001', 
        recordingUrl: null, 
        status: 'Ready', 
        isLive: true,
        lastUpdated: new Date().toLocaleTimeString(), 
        age: 25, 
        bmi: 22.0,
        sex: 'M'
      };
      setPatients([initial]);
      setSelectedPatientId('1');
    }
  };

  const runMLPrediction = async () => {
    const currentPatient = patients.find(p => p.id === selectedPatientId);
    if (!currentPatient?.recordingUrl) {
      alert('Please Record audio for this patient first before running ML Analysis.');
      return;
    }

    setIsPredicting(true);
    setPatients(prev => prev.map(p => 
      p.id === selectedPatientId ? { ...p, status: 'Predicting...' } : p
    ));

    try {
      const response = await fetch(currentPatient.recordingUrl);
      const audioBlob = await response.blob();
      
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('age', currentPatient.age.toString());
      formData.append('sex', currentPatient.sex === 'M' ? '1' : '0');
      formData.append('bmi', currentPatient.bmi.toString());
      formData.append('isLive', (currentPatient.isLive !== false).toString());
      
      const extractRes = await fetch('/api/predict', { method: 'POST', body: formData });
      const data = await extractRes.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to run prediction');
      
      const probability = data.probability;
      let outcome = 'Low COPD Risk';
      if (probability >= 70) {
        outcome = 'High COPD Risk';
      } else if (probability >= 40) {
        outcome = 'Moderate COPD Risk';
      }
      
      setPatients(prev => prev.map(p => 
        p.id === selectedPatientId 
          ? { 
              ...p, 
              status: outcome, 
              copdProbability: probability, 
              lastUpdated: new Date().toLocaleTimeString() 
            } 
          : p
      ));

      // Save to Supabase DB
      try {
        await supabase.from('oxyvision_patients').insert([{
          patient_id_label: currentPatient.name,
          age: currentPatient.age,
          sex: currentPatient.sex,
          bmi: currentPatient.bmi,
          status: outcome,
          copd_probability: probability
        }]);
      } catch (dbError) {
        console.error('Failed to save to Supabase:', dbError);
      }
      
    } catch (error) {
      console.error('Prediction Error:', error);
      alert('ML Prediction failed. See console for details.');
      setPatients(prev => prev.map(p => 
        p.id === selectedPatientId ? { ...p, status: 'Ready' } : p
      ));
    } finally {
      setIsPredicting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <LoadingSpinner size="lg" text="Initialising Intake Environment..." />
      </div>
    );
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Ribbon */}
        <div className="bg-[#121212] rounded-2xl border border-[#2a2a2a] shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-1">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-[#2a2a2a]/50">
                <img src="/oxyvision_logo.png" alt="OxyVision Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tighter uppercase italic">OxyVision</h1>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em]">ML Respiratory Intake System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={connectHardware}
              className={`px-4 py-2 border rounded-xl shadow-sm flex items-center gap-2 transition-all ${
                isSerialConnected 
                ? 'bg-green-950/40 border-green-900/50 text-green-400' 
                : 'bg-[#121212] border-[#2a2a2a] text-zinc-300 hover:bg-[#0a0a0a]'
              }`}
            >
              {isSerialConnected ? <IconLink className="w-4 h-4" /> : <IconUsb className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {isSerialConnected ? 'Hardware Linked' : 'Connect Hardware'}
              </span>
            </button>
            <div className="px-4 py-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isSerialConnected ? 'bg-blue-500' : 'bg-green-950/400'}`}></div>
              <span className="text-sm font-bold text-zinc-300 tracking-wider">
                {isSerialConnected ? 'LIVE' : 'WAITING'}
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT: Hardware Stream & Recording controls */}
          <div className="space-y-6 sticky top-8">
            <div className="bg-neutral-900 text-white rounded-2xl p-6 shadow-2xl border border-neutral-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2 text-red-500">
                  <IconActivity className="w-5 h-5" />
                  Live Acoustic Stream (8kHz)
                </h3>
                {selectedPatient && (
                  <div className="text-xs bg-neutral-800 px-3 py-1 rounded-full text-neutral-300">
                    Active: <span className="text-white font-bold">{selectedPatient.name}</span>
                  </div>
                )}
              </div>
              
              <div className="w-full h-40 mb-6 bg-neutral-950/80 rounded-xl border border-neutral-800 overflow-hidden relative shadow-inner">
                <canvas 
                  ref={canvasRef} 
                  width={600} 
                  height={160} 
                  className="w-full h-full opacity-90"
                />
                {!isSerialConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <IconAlertTriangle className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
                      Awaiting Hardware Initialization
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-xs opacity-80 mb-8 border-b border-neutral-800 pb-6">
                <div>
                  <p className="text-zinc-500 mb-1">INTENSITY</p>
                  <p className={`text-xl ${currentVolume > 80 ? 'text-red-400' : 'text-green-400'}`}>{currentVolume}%</p>
                </div>
                <div>
                  <p className="text-zinc-500 mb-1">CONTEXT</p>
                  <p className="text-blue-400">
                    {selectedPatient ? `${selectedPatient.age}y | ${selectedPatient.sex} | ${selectedPatient.bmi} BMI` : 'SELECT PATIENT'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  disabled={!isSerialConnected || isPredicting}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                    !isSerialConnected ? 'bg-neutral-800 text-zinc-400 cursor-not-allowed' :
                    isRecording 
                    ? 'bg-red-950/400 text-white animate-pulse' 
                    : 'bg-[#121212] text-zinc-100 hover:bg-[#1e1e1e]'
                  }`}
                >
                  {isRecording ? <IconPlayerStop className="w-5 h-5" /> : <IconPlayerRecord className="w-5 h-5" />}
                  {isRecording ? 'Stop Recording' : `Record Subject: ${selectedPatient?.name || ''}`}
                </button>

                  <div className="flex flex-col gap-3">
                    <div className="border border-dashed border-neutral-700 rounded-xl p-3 bg-neutral-900/50 flex flex-col items-center justify-center gap-2">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Clinical Dataset Upload</p>
                      <label className="cursor-pointer w-full text-center py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-lg border border-neutral-600 transition-colors block">
                        <span>📁 Select Audio Sample (.wav)</span>
                        <input 
                          type="file" 
                          accept="audio/wav,audio/*" 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </label>
                      {selectedPatient?.recordingUrl && selectedPatient?.isLive === false && (
                        <span className="text-[10px] text-green-400 font-mono">✓ Clinical Sample Loaded Successfully!</span>
                      )}
                    </div>
                  </div>

                <button
                  disabled={!selectedPatient?.recordingUrl || isRecording || isPredicting}
                  onClick={runMLPrediction}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                    !selectedPatient?.recordingUrl || isRecording 
                    ? 'bg-neutral-800 text-zinc-500 cursor-not-allowed border border-neutral-700' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
                  }`}
                >
                  {isPredicting ? <IconLoader className="w-5 h-5 animate-spin" /> : <IconBrain className="w-5 h-5" />}
                  {isPredicting ? 'Running AI Inference...' : 'Send to ML Model'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Patient Matrix */}
          <div className="bg-[#121212] rounded-2xl border border-[#2a2a2a] shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-6 border-b border-[#2a2a2a] bg-[#0a0a0a]/50 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <IconStethoscope className="w-5 h-5 text-indigo-400" />
                  Patient Directory
                </h2>
                <button
                  type="button"
                  onClick={clearAllPatients}
                  className="relative z-20 text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              {/* Intake Form */}
              <div className="grid grid-cols-3 gap-3 bg-[#121212] p-4 rounded-2xl border border-[#2a2a2a] shadow-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pl-1">Age</label>
                  <input 
                    type="number" 
                    value={newAge}
                    onChange={(e) => setNewAge(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pl-1">Sex</label>
                  <select 
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value as 'M' | 'F')}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pl-1">BMI</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newBmi}
                    onChange={(e) => setNewBmi(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  onClick={addNewPatient}
                  className="col-span-3 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <IconUserPlus className="w-4 h-4" />
                  Add Patient Entry
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#121212] p-2">
              <div className="min-w-full inline-block align-middle">
                {patients.map((patient) => {
                  const isSelected = selectedPatientId === patient.id;
                  return (
                    <div 
                      key={patient.id}
                      onClick={() => !isRecording && setSelectedPatientId(patient.id)}
                      className={`relative flex flex-col p-4 mb-2 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-900/20 shadow-md' 
                          : 'border-transparent hover:bg-[#0a0a0a] hover:border-[#2a2a2a]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-indigo-500 rounded-r-full"></div>
                      )}

                      <div className="flex items-center justify-between mb-3 pl-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-indigo-900/50 text-indigo-300' : 'bg-[#1e1e1e] text-zinc-400'}`}>
                            {patient.id}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-100 text-lg flex items-center gap-2">
                              {patient.name}
                              <span className="text-[10px] bg-neutral-200 px-2 py-0.5 rounded-full text-zinc-400 font-mono">
                                {patient.age}y | {patient.sex} | {patient.bmi} BMI
                              </span>
                            </p>
                            <p className="text-xs text-zinc-500 font-mono">ID: BRT-26-00{patient.id}</p>
                          </div>
                        </div>
                        
                        {patient.recordingUrl && (
                          <div className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
                            <audio src={patient.recordingUrl} controls className="h-8 max-w-[140px] opacity-80" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pl-3 bg-[#121212]/50 p-3 rounded-lg border border-[#2a2a2a]/50 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Status:</span>
                          <span className={`text-sm font-bold flex items-center gap-1 ${
                            patient.status === 'Ready' ? 'text-zinc-500' :
                            patient.status === 'Recording...' ? 'text-red-500 animate-pulse' :
                            patient.status === 'Predicting...' ? 'text-indigo-500 animate-pulse' :
                            patient.status.includes('High') ? 'text-red-600' :
                            patient.status.includes('Moderate') ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {patient.status.includes('Low') && <IconCheck className="w-4 h-4" />}
                            {(patient.status.includes('High') || patient.status.includes('Moderate')) && <IconAlertTriangle className="w-4 h-4" />}
                            {patient.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {patient.copdProbability !== undefined && patient.copdProbability !== null && (
                            <div className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${
                              patient.copdProbability >= 70 ? 'bg-red-950/40 text-red-400 border-red-900/50 animate-pulse' :
                              patient.copdProbability >= 40 ? 'bg-amber-950/40 text-amber-400 border-amber-900/50' :
                              'bg-green-950/40 text-green-400 border-green-900/50'
                            }`}>
                              COPD: {patient.copdProbability}%
                            </div>
                          )}
                          <span className="text-xs text-zinc-600 font-mono">{patient.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}