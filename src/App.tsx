/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Printer, Plus, Trash2, 
  RefreshCw, CheckCircle, BarChart3, Users, BookOpen, 
  Award, Settings, Save, FileText, Check, Upload, Download
} from 'lucide-react';

interface Student {
  id: string;
  noUrut: number;
  name: string;
  gender: 'L' | 'P';
  pgAnswers: string;
  essayScores: number[];
}

type WeightScheme = 'es60_pg40' | 'es70_pg30' | 'pg60_es40' | 'pg70_es30';

interface TestConfig {
  schoolName: string;
  subject: string;
  className: string;
  semester: string;
  academicYear: string;
  testName: string;
  kd: string;
  teacherName: string;
  teacherNip: string;
  testDate: string;
  kkm: number;
  pgCount: number;
  pgKey: string;
  essayCount: number;
  essayMaxScores: number[];
  weightScheme: WeightScheme;
}

const WEIGHT_SCHEME_MAP: Record<string, { pg: number; essay: number; label: string }> = {
  es60_pg40: { pg: 40, essay: 60, label: 'Esai 60% & PG 40%' },
  es70_pg30: { pg: 30, essay: 70, label: 'Esai 70% & PG 30%' },
  pg60_es40: { pg: 60, essay: 40, label: 'PG 60% & Esai 40%' },
  pg70_es30: { pg: 70, essay: 30, label: 'PG 70% & Esai 30%' },
  '60_40': { pg: 60, essay: 40, label: 'PG 60% & Esai 40%' },
  '70_30': { pg: 70, essay: 30, label: 'PG 70% & Esai 30%' },
};

const normalizeWeightScheme = (scheme?: string): WeightScheme => {
  if (scheme === 'es60_pg40' || scheme === 'es70_pg30' || scheme === 'pg60_es40' || scheme === 'pg70_es30') {
    return scheme;
  }
  if (scheme === '60_40') return 'pg60_es40';
  if (scheme === '70_30') return 'pg70_es30';
  return 'es60_pg40';
};

const DEFAULT_CONFIG: TestConfig = {
  schoolName: "SMP NEGERI 7 SENTANI",
  subject: "",
  className: "",
  semester: "",
  academicYear: "",
  testName: "",
  kd: "",
  teacherName: "",
  teacherNip: "",
  testDate: "",
  kkm: 75,
  pgCount: 0,
  pgKey: "",
  essayCount: 0,
  essayMaxScores: [],
  weightScheme: 'es60_pg40'
};

const sanitizePgLetters = (val: string) => val.replace(/[^a-dA-D]/g, '');

const INITIAL_STUDENTS: Student[] = [];

export default function App() {
  const [config, setConfig] = useState<TestConfig>(() => {
    const saved = localStorage.getItem('smp7_config_v6');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleanKey = sanitizePgLetters(parsed?.pgKey || '');
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          pgKey: cleanKey,
          pgCount: parsed?.pgKey !== undefined ? cleanKey.length : Math.max(0, Math.min(100, Number(parsed?.pgCount) || 0)),
          weightScheme: normalizeWeightScheme(parsed?.weightScheme),
        };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('smp7_students_v6');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s: Student) => ({
            ...s,
            pgAnswers: sanitizePgLetters(s.pgAnswers || ''),
          }));
        }
      } catch {
        return INITIAL_STUDENTS;
      }
    }
    return INITIAL_STUDENTS;
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'input' | 'analysis' | 'soal'>('settings');
  const [status, setStatus] = useState('');

  useEffect(() => {
    localStorage.setItem('smp7_config_v6', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('smp7_students_v6', JSON.stringify(students));
  }, [students]);

  // Adjust PG key length when pgCount changes (only A-D / a-d)
  const handlePgCountChange = (newCount: number) => {
    const count = Math.max(0, Math.min(100, Math.floor(newCount) || 0));
    const cleanedKey = sanitizePgLetters(config.pgKey);
    const padChar = cleanedKey.length > 0 && cleanedKey === cleanedKey.toLowerCase() ? 'c' : 'C';
    const adjustedKey = cleanedKey.length >= count
      ? cleanedKey.slice(0, count)
      : cleanedKey.padEnd(count, padChar);
    setConfig({ ...config, pgCount: count, pgKey: adjustedKey });
  };

  // Adjust essay scores and essay max weights when essayCount changes
  const handleEssayCountChange = (newCount: number) => {
    const count = Math.max(0, Math.min(10, Math.floor(newCount) || 0));
    const currentWeights = config.essayMaxScores || [];
    const adjustedWeights = currentWeights.length < count
      ? [...currentWeights, ...Array(count - currentWeights.length).fill(10)]
      : currentWeights.slice(0, count);

    setConfig({ ...config, essayCount: count, essayMaxScores: adjustedWeights });
    setStudents(students.map(s => {
      const currentScores = s.essayScores || [];
      if (currentScores.length < count) {
        return { ...s, essayScores: [...currentScores, ...Array(count - currentScores.length).fill(0)] };
      } else {
        return { ...s, essayScores: currentScores.slice(0, count) };
      }
    }));
  };

  const handleEssayWeightChange = (idx: number, value: number) => {
    const updatedWeights = Array.from({ length: config.essayCount }, (_, i) =>
      i === idx ? Math.max(0, value || 0) : (config.essayMaxScores[i] ?? 10)
    );
    setConfig({ ...config, essayMaxScores: updatedWeights });
  };

  const activeWeightScheme = WEIGHT_SCHEME_MAP[config.weightScheme] ?? WEIGHT_SCHEME_MAP.es60_pg40;
  const selectedPgWeight = activeWeightScheme.pg;
  const selectedEssayWeight = activeWeightScheme.essay;
  const activeEssayWeights = Array.from({ length: config.essayCount }, (_, i) => config.essayMaxScores?.[i] ?? 10);
  const maxTotalEssay = activeEssayWeights.reduce((a, b) => a + (Number(b) || 0), 0);
  const maxPgRaw = config.pgCount * 1;

  const effectivePgWeight = maxPgRaw > 0 && maxTotalEssay > 0
    ? selectedPgWeight
    : maxPgRaw > 0
      ? 100
      : 0;
  const effectiveEssayWeight = maxPgRaw > 0 && maxTotalEssay > 0
    ? selectedEssayWeight
    : maxTotalEssay > 0
      ? 100
      : 0;

  const pgPointInFinal = maxPgRaw > 0 ? effectivePgWeight / maxPgRaw : 0;
  const essayPointInFinal = maxTotalEssay > 0 ? effectiveEssayWeight / maxTotalEssay : 0;
  const pgItemPct100 = maxPgRaw > 0 ? 100 / maxPgRaw : 0;

  const safeKkm = Math.max(0, Math.min(99, Number(config.kkm) || 0));
  const kkmInterval = (100 - safeKkm) / 3;
  const gradeCMin = safeKkm;
  const gradeBMin = Math.round(safeKkm + kkmInterval);
  const gradeAMin = Math.round(safeKkm + kkmInterval * 2);

  const getPredicate = (score: number): { grade: 'A' | 'B' | 'C' | 'D'; label: string } => {
    if (score >= gradeAMin) return { grade: 'A', label: 'Sangat Baik' };
    if (score >= gradeBMin) return { grade: 'B', label: 'Baik' };
    if (score >= gradeCMin) return { grade: 'C', label: 'Cukup' };
    return { grade: 'D', label: 'Perlu Bimbingan' };
  };

  const calculatedStudents = students.map(student => {
    let pgCorrect = 0;
    let pgWrong = 0;
    const ans = sanitizePgLetters(student.pgAnswers || '').toUpperCase().padEnd(config.pgCount, ' ');
    const key = sanitizePgLetters(config.pgKey).toUpperCase().padEnd(config.pgCount, ' ');

    for (let i = 0; i < config.pgCount; i++) {
      if (ans[i].trim() !== '' && key[i].trim() !== '') {
        if (ans[i] === key[i]) pgCorrect++;
        else pgWrong++;
      }
    }

    const pgScore = maxPgRaw > 0 ? (pgCorrect / maxPgRaw) * 100 : 0;
    const pgEarnedPct = maxPgRaw > 0 ? (pgCorrect / maxPgRaw) * effectivePgWeight : 0;

    const essayTotal = (student.essayScores || []).slice(0, config.essayCount).reduce((a, b) => a + (Number(b) || 0), 0);
    const essayScore = maxTotalEssay > 0 ? (essayTotal / maxTotalEssay) * 100 : 0;
    const essayEarnedPct = maxTotalEssay > 0 ? (essayTotal / maxTotalEssay) * effectiveEssayWeight : 0;

    const rawFinalScore = pgEarnedPct + essayEarnedPct;
    const finalScore = Number(rawFinalScore.toFixed(1));
    const isComplete = finalScore >= safeKkm;
    const predicate = getPredicate(finalScore);
    const kkmDiff = Number((finalScore - safeKkm).toFixed(1));

    return {
      ...student,
      pgCorrect,
      pgWrong,
      pgScore,
      pgEarnedPct,
      essayTotal,
      essayScore,
      essayEarnedPct,
      finalScore,
      isComplete,
      predicate,
      kkmDiff
    };
  });

  const totalStudents = calculatedStudents.length;
  const lCount = calculatedStudents.filter(s => s.gender === 'L').length;
  const pCount = calculatedStudents.filter(s => s.gender === 'P').length;
  const scores = calculatedStudents.map(s => s.finalScore);
  const avgScore = totalStudents > 0 ? scores.reduce((a, b) => a + b, 0) / totalStudents : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const passedCount = calculatedStudents.filter(s => s.isComplete).length;
  const passPercentage = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;

  const gradeCounts = {
    A: calculatedStudents.filter(s => s.predicate.grade === 'A').length,
    B: calculatedStudents.filter(s => s.predicate.grade === 'B').length,
    C: calculatedStudents.filter(s => s.predicate.grade === 'C').length,
    D: calculatedStudents.filter(s => s.predicate.grade === 'D').length,
  };

  // Export CSV for Excel (Laporan Wali Kelas)
  const exportExcelCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `"${config.schoolName}"\r\n`;
    csvContent += `"LAPORAN HASIL ANALISIS NILAI UNTUK WALI KELAS - ${config.testName}"\r\n`;
    csvContent += `"Mata Pelajaran: ${config.subject}","Kelas: ${config.className}"\r\n`;
    csvContent += `"Guru: ${config.teacherName}","NIP: ${config.teacherNip}"\r\n`;
    csvContent += `"Skema Bobot: PG ${effectivePgWeight}% / Esai ${effectiveEssayWeight}%","KKM: ${safeKkm}"\r\n`;
    csvContent += `"Rentang Kriteria: A (${gradeAMin}-100) | B (${gradeBMin}-${(gradeAMin - 0.1).toFixed(1)}) | C (${gradeCMin}-${(gradeBMin - 0.1).toFixed(1)}) | D (<${gradeCMin})"\r\n\r\n`;
    csvContent += `No,Nama Siswa,L/P,Benar PG,Nilai PG (100),Perolehan PG (${effectivePgWeight}%),Skor Esai (Maks ${maxTotalEssay}),Nilai Esai (100),Perolehan Esai (${effectiveEssayWeight}%),Nilai Akhir,KKM,Selisih KKM,Predikat (D-A),Kriteria,Ketuntasan\r\n`;
    
    calculatedStudents.forEach(s => {
      csvContent += `${s.noUrut},"${s.name}",${s.gender},${s.pgCorrect},${s.pgScore.toFixed(1)},${s.pgEarnedPct.toFixed(1)}%,${s.essayTotal},${s.essayScore.toFixed(1)},${s.essayEarnedPct.toFixed(1)}%,${s.finalScore},${safeKkm},${s.kkmDiff >= 0 ? `+${s.kkmDiff}` : s.kkmDiff},${s.predicate.grade},"${s.predicate.label}",${s.isComplete ? "TUNTAS" : "BELUM TUNTAS"}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Analisis_${config.className.replace(/[\/\s.]/g, '_')}_SMPN7Sentani.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatus("File Excel/CSV berhasil diunduh!");
    setTimeout(() => setStatus(''), 3000);
  };

  // Download CSV template containing ONLY Nama Siswa and L/P
  const downloadTemplateCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nama Siswa,L/P\r\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Format_Data_Siswa_SMPN7Sentani.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatus("Template format Nama & Jenis Kelamin berhasil diunduh!");
    setTimeout(() => setStatus(''), 3000);
  };

  // Handle bulk CSV import for Name and Gender only
  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
        
        const newStudents: Student[] = [];
        let startIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].toLowerCase();
          if (l.includes('nama') || l.includes('siswa')) {
            startIndex = i + 1;
            break;
          }
        }

        const rowsToParse = lines.slice(startIndex);
        rowsToParse.forEach((line, idx) => {
          const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 1 && parts[0]) {
            let name = parts[0];
            let genderInput = parts[1] || 'L';
            
            if (!isNaN(Number(parts[0])) && parts.length >= 2) {
              name = parts[1];
              genderInput = parts[2] || 'L';
            }

            const gender = (genderInput.toUpperCase() === 'P' ? 'P' : 'L') as ('L' | 'P');

            newStudents.push({
              id: Date.now().toString() + idx,
              noUrut: newStudents.length + 1,
              name: name.toUpperCase(),
              gender,
              pgAnswers: '',
              essayScores: Array(config.essayCount).fill(0)
            });
          }
        });

        if (newStudents.length > 0) {
          setStudents(newStudents);
          setStatus(`Berhasil mengimpor ${newStudents.length} data nama & jenis kelamin siswa secara kolektif!`);
          setTimeout(() => setStatus(''), 4000);
        } else {
          alert("Tidak ada data valid yang dapat dibaca dari file CSV.");
        }
      } catch (err) {
        alert("Gagal memproses file CSV. Pastikan format sesuai template.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col font-sans print:h-auto print:overflow-visible print:bg-white">
      <div className="shrink-0 z-30 shadow-md print:hidden">
        <header className="bg-emerald-800 text-white p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-2.5 rounded-xl">
              <BookOpen className="w-7 h-7 text-emerald-200" />
            </div>
            <div>
              <span className="text-xs uppercase bg-emerald-900 px-2 py-0.5 rounded text-emerald-200 font-semibold">
                Kurikulum Merdeka • Sentani
              </span>
              <h1 className="text-xl font-bold">{config.schoolName}</h1>
              <p className="text-xs text-emerald-100">Aplikasi Analisis Hasil Soal Pilihan Ganda & Esai</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow">
              <Printer className="w-4 h-4" /> Cetak PDF / Laporan
            </button>
            <button onClick={exportExcelCSV} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow">
              <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
            </button>
          </div>
        </div>
      </header>

      <div className="bg-yellow-400 px-4 py-3 shadow-inner border-y border-yellow-500 print:hidden">
        <div className="max-w-7xl mx-auto flex gap-3 overflow-x-auto text-sm font-semibold">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap border-2 ${
              activeTab === 'settings'
                ? 'animate-nav-blink bg-blue-700 text-white border-slate-900 font-bold shadow-lg ring-2 ring-white'
                : 'bg-blue-600 text-white border-blue-800 hover:bg-blue-700'
            }`}
          >
            ⚙️ Pengaturan & Kunci Esai
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap border-2 ${
              activeTab === 'input'
                ? 'animate-nav-blink bg-emerald-700 text-white border-slate-900 font-bold shadow-lg ring-2 ring-white'
                : 'bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-700'
            }`}
          >
            ✍️ Input & Impor Roster Nama & L/P
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap border-2 ${
              activeTab === 'analysis'
                ? 'animate-nav-blink bg-purple-700 text-white border-slate-900 font-bold shadow-lg ring-2 ring-white'
                : 'bg-purple-600 text-white border-purple-800 hover:bg-purple-700'
            }`}
          >
            📊 Analisis & Nilai Siswa
          </button>
          <button
            onClick={() => setActiveTab('soal')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap border-2 ${
              activeTab === 'soal'
                ? 'animate-nav-blink bg-rose-700 text-white border-slate-900 font-bold shadow-lg ring-2 ring-white'
                : 'bg-rose-600 text-white border-rose-800 hover:bg-rose-700'
            }`}
          >
            📈 Statistik Butir Soal
          </button>
        </div>
      </div>

      {status && <div className="bg-emerald-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2"><Check className="w-4 h-4"/> {status}</div>}
      </div>

      <div className="flex-1 overflow-y-scroll worksheet-scroll print:overflow-visible print:h-auto">
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-center pb-4 border-b mb-4">
            <h2 className="text-xl font-bold uppercase text-slate-900">{config.schoolName || 'NAMA SEKOLAH'}</h2>
            <h3 className="text-base font-semibold text-emerald-800 mt-1">
              {config.testName || 'Nama Tes / Asesmen'} {config.subject ? `- ${config.subject}` : ''}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tahun Pelajaran: {config.academicYear || '-'} | Semester: {config.semester || '-'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-xl border">
            <div>
              <span className="text-xs text-slate-500 uppercase block font-semibold">Kelas</span>
              <strong className="text-slate-800">{config.className || '-'}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase block font-semibold">Guru Pengajar</span>
              <strong className="text-slate-800">{config.teacherName || '-'}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase block font-semibold">NIP Guru</span>
              <strong className="text-slate-800">{config.teacherNip || '-'}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase block font-semibold">KKM</span>
              <strong className="text-emerald-700">{config.kkm}</strong>
            </div>
          </div>
        </div>

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Siswa</p>
                <h4 className="text-2xl font-bold mt-1">{totalStudents} <span className="text-xs font-normal text-slate-500">({lCount}L, {pCount}P)</span></h4>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-xs text-slate-500 font-semibold uppercase">Rata-rata Kelas</p>
                <h4 className="text-2xl font-bold text-emerald-700 mt-1">{avgScore.toFixed(1)}</h4>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-xs text-slate-500 font-semibold uppercase">Tertinggi / Terendah</p>
                <h4 className="text-2xl font-bold mt-1">{maxScore.toFixed(0)} <span className="text-xs text-slate-400">/ {minScore.toFixed(0)}</span></h4>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <p className="text-xs text-slate-500 font-semibold uppercase">Ketuntasan (KKM {config.kkm})</p>
                <h4 className="text-2xl font-bold text-emerald-700 mt-1">{passPercentage.toFixed(1)}%</h4>
              </div>
            </div>

            {/* KKM Criteria & Grade Distribution Summary for Wali Kelas */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b pb-2">
                <h3 className="font-bold text-sm text-slate-800">
                  Skala Kriteria Nilai Berdasarkan KKM ({safeKkm}) — Laporan Untuk Wali Kelas
                </h3>
                <span className="text-xs text-slate-500">
                  Interval KKM: {kkmInterval.toFixed(1)} poin (Rumus: (100 - {safeKkm}) / 3)
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 text-sm block">A (Sangat Baik)</span>
                    <span className="text-emerald-700 font-medium">{gradeAMin} – 100</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-800">{gradeCounts.A} <span className="text-[11px] font-normal">siswa</span></span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900 text-sm block">B (Baik)</span>
                    <span className="text-blue-700 font-medium">{gradeBMin} – {(gradeAMin - 0.1).toFixed(1)}</span>
                  </div>
                  <span className="text-lg font-bold text-blue-800">{gradeCounts.B} <span className="text-[11px] font-normal">siswa</span></span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900 text-sm block">C (Cukup / Tuntas)</span>
                    <span className="text-amber-700 font-medium">{gradeCMin} – {(gradeBMin - 0.1).toFixed(1)}</span>
                  </div>
                  <span className="text-lg font-bold text-amber-800">{gradeCounts.C} <span className="text-[11px] font-normal">siswa</span></span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-900 text-sm block">D (Perlu Bimbingan)</span>
                    <span className="text-rose-700 font-medium">&lt; {gradeCMin}</span>
                  </div>
                  <span className="text-lg font-bold text-rose-800">{gradeCounts.D} <span className="text-[11px] font-normal">siswa</span></span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3 print:hidden">
                <div>
                  <h3 className="font-bold text-slate-800">Daftar Nilai Akhir, KKM & Predikat (Siap Diserahkan ke Wali Kelas)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Skema Aktif: <strong className="text-emerald-700">PG {effectivePgWeight}% / Esai {effectiveEssayWeight}%</strong>
                    {maxPgRaw > 0 && ` • 1 Benar PG = ${pgPointInFinal.toFixed(2)}%`}
                    {maxTotalEssay > 0 && ` • 1 Poin Esai = ${essayPointInFinal.toFixed(2)}% (Maks ${maxTotalEssay} poin)`}
                  </p>
                </div>
                <button onClick={() => setActiveTab('input')} className="px-3.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow">
                  <Plus className="w-4 h-4" /> Kelola Roster & Siswa
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b text-xs uppercase text-slate-600 font-semibold">
                      <th className="p-3 text-center">No</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3 text-center">L/P</th>
                      <th className="p-3 text-center">Benar PG</th>
                      <th className="p-3 text-center text-blue-800">Perolehan PG ({effectivePgWeight}%)</th>
                      <th className="p-3 text-center">Skor Esai ({maxTotalEssay})</th>
                      <th className="p-3 text-center text-purple-800">Perolehan Esai ({effectiveEssayWeight}%)</th>
                      <th className="p-3 text-center font-bold bg-slate-200/60">Nilai Akhir</th>
                      <th className="p-3 text-center font-bold">KKM</th>
                      <th className="p-3 text-center">Kriteria (D-A)</th>
                      <th className="p-3 text-center">Ketuntasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calculatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          Belum ada data siswa. Silakan lengkapi Pengaturan lalu tambahkan atau impor siswa di menu Input & Impor.
                        </td>
                      </tr>
                    ) : (
                      calculatedStudents.map(s => {
                        const badgeColors = {
                          A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                          B: 'bg-blue-100 text-blue-800 border-blue-300',
                          C: 'bg-amber-100 text-amber-800 border-amber-300',
                          D: 'bg-rose-100 text-rose-800 border-rose-300',
                        }[s.predicate.grade];
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-3 text-center">{s.noUrut}</td>
                            <td className="p-3 font-semibold text-slate-900">{s.name || '-'}</td>
                            <td className="p-3 text-center">{s.gender}</td>
                            <td className="p-3 text-center text-emerald-700 font-medium">{s.pgCorrect}/{config.pgCount}</td>
                            <td className="p-3 text-center font-semibold text-blue-700 bg-blue-50/40">{s.pgEarnedPct.toFixed(1)}%</td>
                            <td className="p-3 text-center">{s.essayTotal}/{maxTotalEssay}</td>
                            <td className="p-3 text-center font-semibold text-purple-700 bg-purple-50/40">{s.essayEarnedPct.toFixed(1)}%</td>
                            <td className="p-3 text-center font-bold text-slate-900 bg-slate-50">{s.finalScore}</td>
                            <td className="p-3 text-center font-semibold text-slate-600">{safeKkm}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColors}`}>
                                {s.predicate.grade} <span className="font-normal">({s.predicate.label})</span>
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {s.isComplete ? 'Tuntas' : 'Belum'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Block for Print */}
            <div className="pt-12 hidden print:grid grid-cols-2 text-center text-sm">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Sekolah {config.schoolName || 'SMP Negeri 7 Sentani'}</p>
                <div className="h-16"></div>
                <p className="font-bold underline">........................................</p>
                <p>NIP. .................................</p>
              </div>
              <div>
                <p>Sentani, {config.testDate || '....................'}</p>
                <p className="font-semibold">Guru Mata Pelajaran</p>
                <div className="h-16"></div>
                <p className="font-bold underline">{config.teacherName || '........................................'}</p>
                <p>NIP. {config.teacherNip || '.................................'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'input' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-700" />
                    Impor Format Nama & Jenis Kelamin Siswa
                  </h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    Unduh format template CSV khusus untuk data Nama & Jenis Kelamin (L/P), lalu unggah untuk memasukkan daftar siswa sekelas secara instan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadTemplateCSV}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow"
                  >
                    <Download className="w-4 h-4" /> Unduh Template Nama & L/P
                  </button>
                  <label className="px-4 py-2 bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-300 rounded-lg text-sm font-medium flex items-center gap-2 shadow cursor-pointer transition">
                    <Upload className="w-4 h-4" /> Unggah Data Nama & L/P (.csv)
                    <input type="file" accept=".csv,.txt" onChange={handleBulkImport} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Kelola Siswa & Input Jawaban & Esai ({config.essayCount} Soal)</h3>
                  <p className="text-sm text-slate-500">Edit nama, jenis kelamin, jawaban PG, dan skor esai siswa.</p>
                </div>
                <button onClick={() => {
                  const newId = Date.now().toString();
                  setStudents([...students, { id: newId, noUrut: students.length + 1, name: '', gender: 'L', pgAnswers: '', essayScores: Array(config.essayCount).fill(0) }]);
                }} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow">
                  <Plus className="w-4 h-4" /> Tambah Siswa
                </button>
              </div>
              {students.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                  Daftar siswa masih kosong. Klik <strong>Tambah Siswa</strong> atau unggah file CSV Nama & L/P di atas.
                </div>
              ) : (
                <div className="space-y-4">
                  {calculatedStudents.map(s => (
                    <div key={s.id} className="p-4 bg-slate-50 border rounded-xl space-y-3">
                      <div className="flex flex-wrap gap-3 items-center">
                        <span className="font-bold w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm">{s.noUrut}</span>
                        <input
                          type="text"
                          value={s.name}
                          onChange={e => setStudents(students.map(st => st.id === s.id ? { ...st, name: e.target.value } : st))}
                          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm font-semibold bg-white"
                          placeholder="Masukkan Nama Siswa"
                        />
                        <select
                          value={s.gender}
                          onChange={e => setStudents(students.map(st => st.id === s.id ? { ...st, gender: e.target.value as any } : st))}
                          className="px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                          <option value="L">L</option>
                          <option value="P">P</option>
                        </select>
                        <div className="text-xs bg-white border px-3 py-1.5 rounded-lg flex items-center gap-3">
                          <span>PG: <strong className="text-blue-700">{s.pgEarnedPct.toFixed(1)}%</strong></span>
                          <span>Esai: <strong className="text-purple-700">{s.essayEarnedPct.toFixed(1)}%</strong></span>
                          <span>Akhir: <strong className="text-emerald-700">{s.finalScore}</strong></span>
                        </div>
                        <button onClick={() => setStudents(students.filter(st => st.id !== s.id).map((st, idx) => ({ ...st, noUrut: idx + 1 })))} className="text-rose-600 p-2 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Jawaban PG (Hanya A-D / a-d • {s.pgAnswers.length}/{config.pgCount}) — Benar: {s.pgCorrect} poin ({s.pgEarnedPct.toFixed(1)}%):
                          </label>
                          <input
                            type="text"
                            value={s.pgAnswers}
                            onChange={e => {
                              const filtered = sanitizePgLetters(e.target.value);
                              setStudents(students.map(st => st.id === s.id ? { ...st, pgAnswers: filtered } : st));
                            }}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono bg-white"
                            placeholder="Hanya A-D atau a-d (cth: abcd / ABCD)"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Skor Esai ({config.essayCount} Soal — Total {s.essayTotal}/{maxTotalEssay} poin = {s.essayEarnedPct.toFixed(1)}%):
                          </label>
                          {config.essayCount === 0 ? (
                            <p className="text-xs text-slate-400 italic py-1.5">Belum ada soal esai yang diatur.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: config.essayCount }, (_, eIdx) => {
                                const maxW = activeEssayWeights[eIdx] ?? 10;
                                return (
                                  <div key={eIdx} className="flex flex-col items-center">
                                    <span className="text-[10px] font-semibold text-slate-500">E{eIdx+1} <span className="text-slate-400">/{maxW}</span></span>
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxW}
                                      value={s.essayScores[eIdx] ?? 0}
                                      onChange={e => {
                                        const rawVal = Number(e.target.value);
                                        const clampedVal = maxW > 0 ? Math.max(0, Math.min(maxW, rawVal)) : Math.max(0, rawVal);
                                        const newScores = [...s.essayScores];
                                        newScores[eIdx] = clampedVal;
                                        setStudents(students.map(st => st.id === s.id ? { ...st, essayScores: newScores } : st));
                                      }}
                                      className="w-16 px-1 py-1 text-center border rounded-lg text-sm bg-white"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'soal' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Analisis & Persentase Per Item Soal Pilihan Ganda</h3>
                  <p className="text-sm text-slate-500">Bobot per 1 soal PG benar = <strong>{pgItemPct100.toFixed(2)}%</strong> bagian PG (atau <strong>{pgPointInFinal.toFixed(2)}%</strong> pada Nilai Akhir dengan skema {effectivePgWeight}/{effectiveEssayWeight}).</p>
                </div>
              </div>
              {config.pgCount === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                  Belum ada kunci jawaban PG yang diatur di Pengaturan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b text-xs uppercase text-slate-600 font-semibold">
                        <th className="p-3 text-center">No Soal</th>
                        <th className="p-3 text-center">Kunci</th>
                        <th className="p-3 text-center">Persentase Item (PG)</th>
                        <th className="p-3 text-center">Bobot Nilai Akhir ({effectivePgWeight}%)</th>
                        <th className="p-3 text-center">Benar</th>
                        <th className="p-3 text-center">Salah</th>
                        <th className="p-3 text-center">Daya Serap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Array.from({ length: config.pgCount }, (_, qIdx) => {
                        const cleanKeyChar = sanitizePgLetters(config.pgKey[qIdx] || '') || '-';
                        const keyCharUpper = cleanKeyChar.toUpperCase();
                        let correct = 0;
                        calculatedStudents.forEach(s => {
                          const cleanAnsChar = sanitizePgLetters(s.pgAnswers[qIdx] || '').toUpperCase();
                          if (cleanKeyChar !== '-' && cleanAnsChar === keyCharUpper) correct++;
                        });
                        const pct = totalStudents > 0 ? (correct / totalStudents) * 100 : 0;
                        return (
                          <tr key={qIdx} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold">Soal {qIdx + 1}</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-700">{cleanKeyChar}</td>
                            <td className="p-3 text-center text-slate-600">{pgItemPct100.toFixed(2)}%</td>
                            <td className="p-3 text-center font-semibold text-blue-700">{pgPointInFinal.toFixed(2)}%</td>
                            <td className="p-3 text-center text-emerald-600 font-semibold">{correct} siswa</td>
                            <td className="p-3 text-center text-rose-600 font-semibold">{totalStudents - correct} siswa</td>
                            <td className="p-3 text-center font-bold">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Analisis & Persentase Per Item Soal Esai</h3>
                <p className="text-sm text-slate-500">Total bobot maksimal esai = <strong>{maxTotalEssay} poin</strong> ({effectiveEssayWeight}% Nilai Akhir). 1 poin esai = <strong>{essayPointInFinal.toFixed(2)}%</strong> Nilai Akhir.</p>
              </div>
              {config.essayCount === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                  Belum ada soal esai yang diatur di Pengaturan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b text-xs uppercase text-slate-600 font-semibold">
                        <th className="p-3 text-center">No Soal Esai</th>
                        <th className="p-3 text-center">Bobot Maksimal</th>
                        <th className="p-3 text-center">Persentase Item (Esai)</th>
                        <th className="p-3 text-center">Bobot Nilai Akhir ({effectiveEssayWeight}%)</th>
                        <th className="p-3 text-center">Rata-rata Skor Siswa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {activeEssayWeights.map((w, eIdx) => {
                        const pctWithinEssay = maxTotalEssay > 0 ? (w / maxTotalEssay) * 100 : 0;
                        const pctInFinal = maxTotalEssay > 0 ? (w / maxTotalEssay) * effectiveEssayWeight : 0;
                        const avgItemScore = totalStudents > 0
                          ? calculatedStudents.reduce((sum, st) => sum + (Number(st.essayScores?.[eIdx]) || 0), 0) / totalStudents
                          : 0;
                        return (
                          <tr key={eIdx} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold">Esai {eIdx + 1}</td>
                            <td className="p-3 text-center font-semibold">{w} poin</td>
                            <td className="p-3 text-center text-slate-600">{pctWithinEssay.toFixed(2)}%</td>
                            <td className="p-3 text-center font-semibold text-purple-700">{pctInFinal.toFixed(2)}%</td>
                            <td className="p-3 text-center font-bold">{avgItemScore.toFixed(1)} / {w}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
            <h3 className="font-bold text-lg text-slate-800">Pengaturan Sekolah, Guru, Kunci & Soal Esai</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Sekolah</label>
                <input type="text" value={config.schoolName} onChange={e => setConfig({ ...config, schoolName: e.target.value })} placeholder="SMP NEGERI 7 SENTANI" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Tes / Asesmen</label>
                <input type="text" value={config.testName} onChange={e => setConfig({ ...config, testName: e.target.value })} placeholder="Contoh: ASESMEN SUMATIF TENGAH SEMESTER (ASTS)" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Mata Pelajaran</label>
                <input type="text" value={config.subject} onChange={e => setConfig({ ...config, subject: e.target.value })} placeholder="Contoh: Ilmu Pengetahuan Sosial (IPS)" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Kelas</label>
                <input type="text" value={config.className} onChange={e => setConfig({ ...config, className: e.target.value })} placeholder="Contoh: IX.1" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Semester</label>
                <input type="text" value={config.semester} onChange={e => setConfig({ ...config, semester: e.target.value })} placeholder="Contoh: GANJIL / GENAP" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tahun Pelajaran</label>
                <input type="text" value={config.academicYear} onChange={e => setConfig({ ...config, academicYear: e.target.value })} placeholder="Contoh: 2026-2027" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Guru Pengajar</label>
                <input type="text" value={config.teacherName} onChange={e => setConfig({ ...config, teacherName: e.target.value })} placeholder="Masukkan Nama Lengkap & Gelar Guru" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">NIP Guru</label>
                <input type="text" value={config.teacherNip} onChange={e => setConfig({ ...config, teacherNip: e.target.value })} placeholder="Masukkan NIP Guru" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tanggal Tes</label>
                <input type="date" value={config.testDate} onChange={e => setConfig({ ...config, testDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">KKM (0 - 99)</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={config.kkm}
                  onChange={e => setConfig({ ...config, kkm: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="font-semibold text-sm text-slate-800">
                  Pembagian Otomatis Kriteria D – A Berdasarkan KKM ({safeKkm})
                </h4>
                <span className="text-xs text-slate-500">
                  Berlaku sama untuk semua skema bobot (60%/40% maupun 70%/30%)
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                  <strong className="text-rose-900 block">D (Perlu Bimbingan)</strong>
                  <span className="text-rose-700">&lt; {gradeCMin}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <strong className="text-amber-900 block">C (Cukup)</strong>
                  <span className="text-amber-700">{gradeCMin} – {(gradeBMin - 0.1).toFixed(1)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                  <strong className="text-blue-900 block">B (Baik)</strong>
                  <span className="text-blue-700">{gradeBMin} – {(gradeAMin - 0.1).toFixed(1)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <strong className="text-emerald-900 block">A (Sangat Baik)</strong>
                  <span className="text-emerald-700">{gradeAMin} – 100</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800">Skema Persentase Perhitungan Nilai (Esai & PG)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bobot esai yang lebih tinggi (60% atau 70%) membantu mendongkrak nilai akhir siswa ketika perolehan PG kurang maksimal.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Rekomendasi Utama: Esai Membantu PG (Bobot Esai Lebih Besar)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, weightScheme: 'es60_pg40' })}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      config.weightScheme === 'es60_pg40'
                        ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">Opsi 1: Esai 60% & PG 40%</span>
                      {config.weightScheme === 'es60_pg40' && (
                        <span className="text-xs bg-emerald-700 text-white px-2 py-0.5 rounded-full font-semibold">Aktif</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {maxTotalEssay > 0
                        ? `1 poin esai = ${(60 / maxTotalEssay).toFixed(2)}% (maks 60%).`
                        : 'Isi soal esai untuk melihat nilai per poin.'}{' '}
                      {config.pgCount > 0
                        ? `1 soal PG benar = ${(40 / config.pgCount).toFixed(2)}% (maks 40%).`
                        : 'Isi soal PG untuk melihat nilai per soal.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, weightScheme: 'es70_pg30' })}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      config.weightScheme === 'es70_pg30'
                        ? 'border-purple-600 bg-purple-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">Opsi 2: Esai 70% & PG 30%</span>
                      {config.weightScheme === 'es70_pg30' && (
                        <span className="text-xs bg-purple-700 text-white px-2 py-0.5 rounded-full font-semibold">Aktif</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {maxTotalEssay > 0
                        ? `1 poin esai = ${(70 / maxTotalEssay).toFixed(2)}% (maks 70%).`
                        : 'Isi soal esai untuk melihat nilai per poin.'}{' '}
                      {config.pgCount > 0
                        ? `1 soal PG benar = ${(30 / config.pgCount).toFixed(2)}% (maks 30%).`
                        : 'Isi soal PG untuk melihat nilai per soal.'}
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Opsi Alternatif (Jika PG Lebih Dominan)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, weightScheme: 'pg60_es40' })}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      config.weightScheme === 'pg60_es40'
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-800">PG 60% & Esai 40%</span>
                      {config.weightScheme === 'pg60_es40' && (
                        <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full font-semibold">Aktif</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {config.pgCount > 0 ? `1 PG = ${(60 / config.pgCount).toFixed(2)}%` : 'PG maks 60%'} •{' '}
                      {maxTotalEssay > 0 ? `1 poin esai = ${(40 / maxTotalEssay).toFixed(2)}%` : 'Esai maks 40%'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, weightScheme: 'pg70_es30' })}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      config.weightScheme === 'pg70_es30'
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-800">PG 70% & Esai 30%</span>
                      {config.weightScheme === 'pg70_es30' && (
                        <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full font-semibold">Aktif</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {config.pgCount > 0 ? `1 PG = ${(70 / config.pgCount).toFixed(2)}%` : 'PG maks 70%'} •{' '}
                      {maxTotalEssay > 0 ? `1 poin esai = ${(30 / maxTotalEssay).toFixed(2)}%` : 'Esai maks 30%'}
                    </p>
                  </button>
                </div>
              </div>

              {(config.pgCount > 0 || config.essayCount > 0) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase block">Nilai 1 Poin Benar PG</span>
                    <strong className="text-sm text-blue-700">
                      {maxPgRaw > 0 ? `${pgPointInFinal.toFixed(2)}%` : '-'}
                    </strong>
                    <span className="block text-slate-500">
                      ({pgItemPct100.toFixed(2)}% dari PG • Maks {effectivePgWeight}% Nilai Akhir)
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase block">Nilai 1 Poin Skor Esai</span>
                    <strong className="text-sm text-purple-700">
                      {maxTotalEssay > 0 ? `${essayPointInFinal.toFixed(2)}%` : '-'}
                    </strong>
                    <span className="block text-slate-500">
                      (Total bobot esai {maxTotalEssay} poin • Maks {effectiveEssayWeight}% Nilai Akhir)
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase block">Total Maksimal Nilai Akhir</span>
                    <strong className="text-sm text-emerald-700">
                      {effectivePgWeight + effectiveEssayWeight}% (100 Poin)
                    </strong>
                    <span className="block text-slate-500">
                      Esai ({effectiveEssayWeight}%) + PG ({effectivePgWeight}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Simulasi Perhitungan Daya Bantu Esai untuk 60/40 & 70/30 */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h5 className="font-bold text-xs uppercase text-amber-900">
                    Simulasi Perhitungan: Bagaimana Esai Membantu Nilai PG (Contoh PG 50% & Esai 90%)
                  </h5>
                  <span className="text-[11px] text-amber-800 font-medium">
                    Target KKM: {safeKkm}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-amber-200 text-amber-900 font-semibold">
                        <th className="py-1.5 pr-2">Skema Bobot</th>
                        <th className="py-1.5 px-2 text-center">Perolehan PG (Skor 50)</th>
                        <th className="py-1.5 px-2 text-center">Perolehan Esai (Skor 90)</th>
                        <th className="py-1.5 px-2 text-center">Nilai Akhir</th>
                        <th className="py-1.5 pl-2 text-center">Status KKM ({safeKkm})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 text-slate-700">
                      {[
                        { id: 'es60_pg40', name: 'Esai 60% & PG 40% (Rekomendasi)', pgW: 40, esW: 60 },
                        { id: 'es70_pg30', name: 'Esai 70% & PG 30% (Daya Bantu Tinggi)', pgW: 30, esW: 70 },
                        { id: 'pg60_es40', name: 'PG 60% & Esai 40%', pgW: 60, esW: 40 },
                        { id: 'pg70_es30', name: 'PG 70% & Esai 30%', pgW: 70, esW: 30 },
                      ].map(sim => {
                        const simPg = 50 * (sim.pgW / 100);
                        const simEs = 90 * (sim.esW / 100);
                        const simTotal = simPg + simEs;
                        const simPass = simTotal >= safeKkm;
                        const isSelected = config.weightScheme === sim.id;
                        return (
                          <tr key={sim.id} className={isSelected ? 'bg-amber-100/80 font-semibold' : ''}>
                            <td className="py-1.5 pr-2">{sim.name}</td>
                            <td className="py-1.5 px-2 text-center">{simPg.toFixed(1)}%</td>
                            <td className="py-1.5 px-2 text-center text-purple-800">{simEs.toFixed(1)}%</td>
                            <td className="py-1.5 px-2 text-center font-bold">{simTotal.toFixed(1)}</td>
                            <td className="py-1.5 pl-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${simPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {simPass ? `Tuntas (${getPredicate(simTotal).grade})` : `Belum (${getPredicate(simTotal).grade})`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-800">Pengaturan Soal Esai / Uraian & Bobot Tiap Nomor</h4>
                {config.essayCount > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                    Total Bobot Esai: {maxTotalEssay} poin ({effectiveEssayWeight}% Nilai Akhir)
                  </span>
                )}
              </div>
              <div className="max-w-xs">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Jumlah Soal Esai (0 - 10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.essayCount}
                  onChange={e => handleEssayCountChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                />
                <p className="text-xs text-slate-500 mt-1">Bobot tiap nomor soal otomatis menyesuaikan jumlah soal esai.</p>
              </div>

              {config.essayCount > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                  {activeEssayWeights.map((weight, idx) => {
                    const pctEssay = maxTotalEssay > 0 ? (weight / maxTotalEssay) * 100 : 0;
                    const pctFinal = maxTotalEssay > 0 ? (weight / maxTotalEssay) * effectiveEssayWeight : 0;
                    return (
                      <div key={idx} className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5">
                        <label className="text-xs font-bold text-purple-900 block">Bobot Esai {idx + 1}</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={weight}
                          onChange={e => handleEssayWeightChange(idx, Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-sm font-bold text-center"
                        />
                        <div className="text-[11px] text-slate-600 leading-tight">
                          <div>{pctEssay.toFixed(1)}% dari Esai</div>
                          <div className="font-semibold text-purple-700">{pctFinal.toFixed(1)}% Nilai Akhir</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-slate-800">Pengaturan Soal Pilihan Ganda (PG) & Kunci Jawaban</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Jumlah Soal PG (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.pgCount}
                    onChange={e => handlePgCountChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                  <p className="text-xs text-slate-500 mt-1">Otomatis menyesuaikan panjang kunci jawaban.</p>
                </div>
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600">
                      Kunci Jawaban PG (Hanya Huruf A-D atau a-d)
                    </label>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Jumlah Soal: {config.pgCount} soal {maxPgRaw > 0 ? `(${pgItemPct100.toFixed(2)}% / item PG • ${pgPointInFinal.toFixed(2)}% Nilai Akhir)` : ''}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={config.pgKey}
                    onChange={e => {
                      const val = sanitizePgLetters(e.target.value);
                      setConfig({
                        ...config,
                        pgKey: val,
                        pgCount: val.length
                      });
                    }}
                    placeholder="Contoh: abcdabcd atau ABCDABCD..."
                    className="w-full px-3 py-2 border rounded-lg font-mono tracking-wider text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Hanya menerima huruf A-D (kapital atau kecil). Huruf selain A-D otomatis tidak terbaca. Jumlah soal PG mengikuti jumlah huruf kunci jawaban ({config.pgCount} soal).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button onClick={() => {
                setConfig(DEFAULT_CONFIG);
                setStudents([]);
                setStatus("Semua data guru dan siswa berhasil dikosongkan!");
                setTimeout(() => setStatus(''), 3000);
              }} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-500 transition flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Kosongkan Semua Data
              </button>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
