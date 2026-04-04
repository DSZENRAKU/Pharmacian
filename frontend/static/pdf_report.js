/**
 * frontend/static/pdf_report.js
 * ─────────────────────────────────────────────────────────────
 * Renderer-side PDF report generator for Pharmacian.
 * Uses a hidden iframe + Electron's printToPDF() via IPC.
 * Falls back to window.print() in a browser environment.
 *
 * Usage:
 *   generatePDF(reportData);
 *
 * reportData shape:
 * {
 *   patient: { name, age, gender, patientId, scanDate },
 *   riskScore: 0-100,
 *   riskLevel: "Low" | "Medium" | "High",
 *   predictions: [{ disease, probability, riskLevel, recommendation }],
 *   keyFactors: ["Chest Pain", "Fatigue", ...],
 *   doctorNote: "Auto-generated text...",
 * }
 */

"use strict";

// ─────────────────────────────────────────────────────────────
// 1.  MOCK DATA (used when called without arguments, for testing)
// ─────────────────────────────────────────────────────────────
const MOCK_REPORT = {
  patient: {
    name:      "Jane Doe",
    age:       42,
    gender:    "Female",
    patientId: "PHR-1042",
    scanDate:  new Date().toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" }),
  },
  riskScore: 74,
  riskLevel: "High",
  predictions: [
    { disease:"Heart Disease",  probability:74, riskLevel:"High",   recommendation:"Immediate cardiology referral advised." },
    { disease:"Hypertension",   probability:62, riskLevel:"Medium", recommendation:"Lifestyle modification and medication review." },
    { disease:"Diabetes",       probability:38, riskLevel:"Medium", recommendation:"HbA1c test and dietary counselling." },
    { disease:"Liver Disease",  probability:15, riskLevel:"Low",    recommendation:"Routine LFT monitoring every 6 months." },
    { disease:"Kidney Disease", probability:10, riskLevel:"Low",    recommendation:"Annual renal function panel." },
    { disease:"Cancer Risk",    probability:5,  riskLevel:"Low",    recommendation:"Standard screening per age guidelines." },
  ],
  keyFactors: ["Chest Pain", "Shortness of Breath", "Fatigue", "Elevated Blood Pressure", "Rapid Heartbeat"],
  doctorNote: "Patient presents with a high composite risk profile, primarily in the cardiovascular domain. Immediate consultation with a cardiologist is recommended. A full ECG, echocardiogram, and lipid panel should be obtained within the next 7 days. Lifestyle interventions (dietary change, smoking cessation if applicable) should be initiated promptly.",
};


// ─────────────────────────────────────────────────────────────
// 2.  HTML TEMPLATE BUILDER
// ─────────────────────────────────────────────────────────────
function buildReportHTML(data) {
  if (!data) {
    console.error("PDF Generation Error: No assessment data provided.");
    return "<h1>Error: No Assessment Data</h1>";
  }
  const d = data; // Strictly use passed data
  const now = new Date();
  const generatedAt = now.toLocaleString("en-IN", {
    year:"numeric", month:"long", day:"numeric",
    hour:"2-digit", minute:"2-digit",
  });

  // Risk colour
  const riskColor = d.riskLevel === "High" ? "#ef4444"
                  : d.riskLevel === "Medium" ? "#f59e0b"
                  : "#10b981";

  // Gauge arc calculation (SVG, r=54)
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ - (d.riskScore / 100) * circ;

  // Disease rows
  const diseaseRows = (d.predictions || []).map(p => {
    const rc = p.riskLevel === "High" ? "#ef4444"
             : p.riskLevel === "Medium" ? "#f59e0b"
             : "#10b981";
    const bgc = p.riskLevel === "High" ? "#fef2f2"
              : p.riskLevel === "Medium" ? "#fffbeb"
              : "#f0fdf4";
    return `
      <tr>
        <td>${p.disease}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
              <div style="width:${p.probability}%;height:100%;background:${rc};border-radius:4px;"></div>
            </div>
            <span style="font-weight:700;min-width:36px;text-align:right;">${p.probability}%</span>
          </div>
        </td>
        <td><span style="padding:3px 10px;border-radius:12px;background:${bgc};color:${rc};font-size:11px;font-weight:700;text-transform:uppercase;">${p.riskLevel}</span></td>
        <td style="font-size:12px;">${p.recommendation}</td>
      </tr>`;
  }).join("");

  // Key factor pills
  const factorPills = (d.keyFactors || []).map(f =>
    `<span style="display:inline-block;padding:4px 12px;margin:4px;background:#eff6ff;color:#1d4ed8;
      border:1px solid #bfdbfe;border-radius:20px;font-size:12px;font-weight:600;">${f}</span>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pharmacian Report — ${d.patient.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #ffffff;
      padding: 0;
    }

    /* ── Page wrapper ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 16mm;
      background: #ffffff;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .brand-block { display: flex; align-items: center; gap: 12px; }
    .brand-logo { height: 44px; width: auto; }
    .brand-name {
      font-family: 'Montserrat', sans-serif;
      font-weight: 800;
      font-size: 22px;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-name span { color: #0284c7; }
    .brand-tagline { font-size: 11px; color: #64748b; margin-top: 3px; }
    .report-meta { text-align: right; font-size: 12px; }
    .report-meta .report-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      color: #0284c7;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .report-meta .report-date { color: #64748b; }

    /* ── Section headings ── */
    .section { margin-bottom: 22px; }
    .section-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
    }

    /* ── Patient info table ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .info-cell {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .info-cell .label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-cell .value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 3px; }

    /* ── Risk summary ── */
    .risk-row {
      display: flex;
      align-items: center;
      gap: 30px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .gauge-wrap { flex-shrink: 0; position: relative; width: 120px; height: 120px; }
    .gauge-wrap svg { transform: rotate(-90deg); }
    .gauge-label {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .gauge-score { font-family: 'Montserrat', sans-serif; font-size: 28px; font-weight: 800; line-height: 1; }
    .gauge-sub { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .risk-text h3 { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 800; margin-bottom: 5px; }
    .risk-text p { font-size: 12px; color: #475569; line-height: 1.6; max-width: 380px; }
    .risk-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    /* ── Disease predictions table ── */
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    thead th:first-child { border-radius: 6px 0 0 0; }
    thead th:last-child  { border-radius: 0 6px 0 0; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody tr td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }

    /* ── Key factors ── */
    .factor-pills { line-height: 2; }

    /* ── Doctor note ── */
    .doctor-note {
      background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
      border: 1px solid #bfdbfe;
      border-left: 4px solid #0284c7;
      border-radius: 8px;
      padding: 16px 20px;
      font-size: 13px;
      line-height: 1.7;
      color: #1e3a5f;
    }
    .doctor-note .note-header {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 12px;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ── Footer ── */
    .report-footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }
    .report-footer .disclaimer { font-style: italic; }
    .report-footer .page-num { font-weight: 600; }

    /* ── Print overrides ── */
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 10mm 14mm; width: 100%; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- 1. HEADER -->
  <div class="report-header">
    <div class="brand-block">
      <div>
        <div class="brand-name">PHARMA<span>CIAN</span></div>
        <div class="brand-tagline">Clinical Disease Risk Assessment Platform</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">AI Disease Prediction Report</div>
      <div class="report-date">Generated: ${generatedAt}</div>
    </div>
  </div>

  <!-- 2. PATIENT INFO -->
  <div class="section">
    <div class="section-title">Patient Information</div>
    <div class="info-grid">
      <div class="info-cell"><div class="label">Full Name</div><div class="value">${d.patient.name}</div></div>
      <div class="info-cell"><div class="label">Age</div><div class="value">${d.patient.age} Years</div></div>
      <div class="info-cell"><div class="label">Gender</div><div class="value">${d.patient.gender}</div></div>
      <div class="info-cell"><div class="label">Patient ID</div><div class="value" style="color:#0284c7;">${d.patient.patientId}</div></div>
      <div class="info-cell"><div class="label">Scan Date</div><div class="value">${d.patient.scanDate}</div></div>
      <div class="info-cell"><div class="label">Report Status</div><div class="value" style="color:#10b981;">✓ Verified</div></div>
    </div>
  </div>

  <!-- 3. RISK SUMMARY -->
  <div class="section">
    <div class="section-title">Overall Risk Assessment</div>
    <div class="risk-row">
      <div class="gauge-wrap">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="12"/>
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="${riskColor}" stroke-width="12"
            stroke-dasharray="${circ}" stroke-dashoffset="${filled}"
            stroke-linecap="round"/>
        </svg>
        <div class="gauge-label">
          <span class="gauge-score" style="color:${riskColor};">${d.riskScore}</span>
          <span class="gauge-sub">/ 100</span>
        </div>
      </div>
      <div class="risk-text">
        <div class="risk-badge" style="background:${riskColor}20;color:${riskColor};">${d.riskLevel} Risk</div>
        <h3 style="color:${riskColor};">Composite Risk Score: ${d.riskScore}/100</h3>
        <p>This score represents the patient's overall health risk based on a multi-model clinical assessment across six disease categories. A score above 70 warrants immediate specialist review.</p>
      </div>
    </div>
  </div>

  <!-- 4. DISEASE PREDICTIONS TABLE -->
  <div class="section">
    <div class="section-title">Disease-Wise Prediction Analysis</div>
    <table>
      <thead>
        <tr>
          <th>Disease / Condition</th>
          <th style="width:200px;">Probability Score</th>
          <th>Risk Level</th>
          <th>Clinical Recommendation</th>
        </tr>
      </thead>
      <tbody>
        ${diseaseRows}
      </tbody>
    </table>
  </div>

  <!-- 5. KEY RISK FACTORS -->
  <div class="section">
    <div class="section-title">Key Risk Factors (Contributing Symptoms)</div>
    <div class="factor-pills">${factorPills}</div>
  </div>

  <!-- 6. DOCTOR'S NOTE -->
  <div class="section">
    <div class="doctor-note">
      <div class="note-header">&#9673; Clinical Recommendation</div>
      ${d.doctorNote}
    </div>
  </div>

  <!-- 7. FOOTER -->
  <div class="report-footer">
    <div class="disclaimer">
      &#9888; This report is generated by Pharmacian and is <strong>NOT a substitute for professional medical advice</strong>.
      Always consult a qualified healthcare provider before making clinical decisions.
    </div>
    <div class="page-num">Patient ID: ${d.patient.patientId} | Page 1 of 1</div>
  </div>

</div>
</body>
</html>`;
}


// ─────────────────────────────────────────────────────────────
// 3.  MAIN generatePDF() FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF report.
 * @param {Object} reportData - see shape at top of file. Defaults to MOCK_REPORT if null.
 */
async function generatePDF(reportData = null) {
  const data = reportData || MOCK_REPORT;
  const html = buildReportHTML(data);

  // ── A. Electron path — printToPDF via IPC ──────────────────
  if (typeof window !== "undefined" && window.pharmacianPDF) {
    try {
      showPDFToast("generating");
      const filename = buildFilename(data.patient.name, data.patient.patientId);
      const result = await window.pharmacianPDF.savePDF(html, filename);

      if (result.ok) {
        showPDFToast("success", result.data.path);
      } else {
        showPDFToast("error", result.error);
      }
    } catch (err) {
      showPDFToast("error", err.message);
    }
    return;
  }

  // ── B. Browser fallback — hidden iframe + window.print() ───
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  // Wait for fonts & images to load
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  };
}

// ─────────────────────────────────────────────────────────────
// 4.  HELPERS
// ─────────────────────────────────────────────────────────────

function buildFilename(name = "patient", patientId = "") {
  const safeName = (name || "patient")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().split("T")[0];
  return `pharmacian-report-${safeName}-${date}.pdf`;
}

/** Lightweight in-page toast notification (no external library) */
function showPDFToast(type, detail = "") {
  // Remove any existing toast
  const old = document.getElementById("pdf-toast");
  if (old) old.remove();

  const configs = {
    generating: { bg: "#0284c7", icon: "&#8635;", msg: "Generating PDF report…"                              },
    success:    { bg: "#10b981", icon: "&#10003;", msg: `PDF saved to Downloads` },
    error:      { bg: "#ef4444", icon: "&#10007;", msg: `PDF Error: ${detail}`                               },
  };
  const cfg = configs[type] || configs.error;

  const toast = document.createElement("div");
  toast.id = "pdf-toast";
  toast.innerHTML = `<span style="font-size:1.2em;">${cfg.icon}</span> ${cfg.msg}`;
  toast.style.cssText = `
    position: fixed; bottom: 28px; right: 28px; z-index: 99999;
    background: ${cfg.bg}; color: #fff;
    padding: 14px 22px; border-radius: 10px;
    font-family: Inter, sans-serif; font-weight: 600; font-size: 14px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    animation: toastIn 0.3s ease-out;
    max-width: 380px; line-height: 1.4;
  `;

  // Inject keyframe once
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      @keyframes toastIn  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      @keyframes toastOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(16px); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  if (type !== "generating") {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = "toastOut 0.3s ease-in forwards";
        setTimeout(() => toast.remove(), 300);
      }
    }, type === "success" ? 5000 : 7000);
  }
}
