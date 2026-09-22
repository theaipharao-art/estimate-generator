import React, { useState } from 'react'
import Head from 'next/head'

interface Estimate {
  id: string
  jobNumber: string
  location: string
  serviceLine: string
  urgency: string
  scope: string
  techRate: number
  helperRate: number
  tripCharge: number
  nte?: number
  materialDesc: string
  materialCost: number
  techHours: number
  helperHours: number
  includeTrip: boolean
  total: number
}

interface UploadedImage {
  id: string
  file: File
  preview: string
  extractedData?: any
  loading: boolean
  error?: string
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [currentTab, setCurrentTab] = useState<'upload' | 'form' | 'result'>('upload')
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()

      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        const imageBase64 = base64.split(',')[1]
        const mimeType = file.type

        const newImage: UploadedImage = {
          id: Date.now().toString() + i,
          file,
          preview: base64,
          loading: true,
        }

        setImages((prev) => [...prev, newImage])

        try {
          const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, mimeType }),
          })

          const data = await response.json()

          if (response.ok) {
            setImages((prev) =>
              prev.map((img) =>
                img.id === newImage.id
                  ? { ...img, extractedData: data, loading: false }
                  : img
              )
            )
          } else {
            setImages((prev) =>
              prev.map((img) =>
                img.id === newImage.id
                  ? { ...img, error: data.error || 'Failed to extract data', loading: false }
                  : img
              )
            )
          }
        } catch (error) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === newImage.id
                ? {
                    ...img,
                    error: error instanceof Error ? error.message : 'Failed to process image',
                    loading: false,
                  }
                : img
            )
          )
        }
      }

      reader.readAsDataURL(file)
    }

    e.currentTarget.value = ''
  }

  const createEstimate = (image: UploadedImage) => {
    if (!image.extractedData) return

    const estimate: Estimate = {
      id: image.id,
      jobNumber: image.extractedData.jobNumber || '',
      location: image.extractedData.location || '',
      serviceLine: image.extractedData.serviceLine || '',
      urgency: image.extractedData.urgency || 'Normal',
      scope: image.extractedData.scope || '',
      techRate: image.extractedData.techRate || 41,
      helperRate: image.extractedData.helperRate || 21,
      tripCharge: image.extractedData.tripCharge || 30,
      nte: image.extractedData.nte,
      materialDesc: '',
      materialCost: 0,
      techHours: 0,
      helperHours: 0,
      includeTrip: true,
      total: 0,
    }

    setEstimates((prev) => [...prev, estimate])
    setEditingEstimateId(estimate.id)
    setCurrentTab('form')
  }

  const updateEstimate = (id: string, updates: Partial<Estimate>) => {
    setEstimates((prev) =>
      prev.map((est) => {
        if (est.id !== id) return est
        const updated = { ...est, ...updates }
        // Recalculate total
        const techLabor = (updated.techHours || 0) * (updated.techRate || 0)
        const helperLabor = (updated.helperHours || 0) * (updated.helperRate || 0)
        const trip = updated.includeTrip ? (updated.tripCharge || 0) : 0
        updated.total = techLabor + helperLabor + (updated.materialCost || 0) + trip
        return updated
      })
    )
  }

  const currentEstimate = estimates.find((e) => e.id === editingEstimateId)

  return (
    <>
      <Head>
        <title>Estimate Generator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <div className="container">
        <div className="header">
          <h1>⚡ Estimate Generator</h1>
          <p>Arabic Interface / English Output</p>
        </div>

        <div className="tabs">
          <button
            className={`tab-button ${currentTab === 'upload' ? 'active' : ''}`}
            onClick={() => setCurrentTab('upload')}
          >
            Upload
          </button>
          <button
            className={`tab-button ${currentTab === 'form' ? 'active' : ''}`}
            onClick={() => setCurrentTab('form')}
            disabled={!currentEstimate}
          >
            Form
          </button>
          <button
            className={`tab-button ${currentTab === 'result' ? 'active' : ''}`}
            onClick={() => setCurrentTab('result')}
            disabled={!currentEstimate}
          >
            Estimate
          </button>
        </div>

        <div className="content">
          {/* UPLOAD TAB */}
          {currentTab === 'upload' && (
            <div>
              <div className="info-box">Upload multiple work order images. Data will be extracted automatically.</div>

              <div className="upload-area" onClick={() => document.getElementById('fileInput')?.click()}>
                <div className="upload-area-icon">📸</div>
                <div className="upload-area-text">Tap to upload work order images</div>
                <div className="upload-area-text" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Multiple images supported
                </div>
              </div>
              <input
                id="fileInput"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />

              {images.length > 0 && (
                <div className="images-list">
                  <h3 className="section-title">Uploaded Images ({images.length})</h3>
                  {images.map((img) => (
                    <div key={img.id} className="image-card">
                      <img src={img.preview} alt="uploaded" className="image-preview" />
                      <div className="image-info">
                        <div className="image-name">{img.file.name}</div>
                        {img.loading && <div className="image-status loading">Extracting data...</div>}
                        {img.error && <div className="image-status error">Error: {img.error}</div>}
                        {img.extractedData && !img.loading && (
                          <>
                            <div className="image-status success">✓ Data extracted</div>
                            <button
                              className="button button-primary"
                              onClick={() => createEstimate(img)}
                            >
                              Create Estimate
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FORM TAB */}
          {currentTab === 'form' && currentEstimate && (
            <div>
              <div className="section">
                <div className="section-title">Job Details (from work order)</div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Job Number</span>
                    <span className="field-label-ar">رقم الوظيفة</span>
                  </div>
                  <input
                    type="text"
                    value={currentEstimate.jobNumber}
                    onChange={(e) => updateEstimate(currentEstimate.id, { jobNumber: e.target.value })}
                    placeholder="JOB-260917-2184"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Location</span>
                    <span className="field-label-ar">الموقع</span>
                  </div>
                  <input
                    type="text"
                    value={currentEstimate.location}
                    onChange={(e) => updateEstimate(currentEstimate.id, { location: e.target.value })}
                    placeholder="Address"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Service Line</span>
                    <span className="field-label-ar">خط الخدمة</span>
                  </div>
                  <input
                    type="text"
                    value={currentEstimate.serviceLine}
                    onChange={(e) => updateEstimate(currentEstimate.id, { serviceLine: e.target.value })}
                    placeholder="Service Type"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Urgency</span>
                    <span className="field-label-ar">الاستعجالية</span>
                  </div>
                  <select
                    value={currentEstimate.urgency}
                    onChange={(e) => updateEstimate(currentEstimate.id, { urgency: e.target.value })}
                  >
                    <option>Normal</option>
                    <option>High</option>
                    <option>Emergency</option>
                  </select>
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Scope of Work</span>
                    <span className="field-label-ar">نطاق العمل</span>
                  </div>
                  <textarea
                    value={currentEstimate.scope}
                    onChange={(e) => updateEstimate(currentEstimate.id, { scope: e.target.value })}
                    placeholder="Scope description"
                  />
                </div>
              </div>

              <div className="divider"></div>

              <div className="section">
                <div className="section-title">Payment Details (from work order)</div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Technician Rate ($/hr)</span>
                    <span className="field-label-ar">سعر الفني بالساعة</span>
                  </div>
                  <input
                    type="number"
                    value={currentEstimate.techRate}
                    onChange={(e) => updateEstimate(currentEstimate.id, { techRate: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Helper Rate ($/hr)</span>
                    <span className="field-label-ar">سعر المساعد بالساعة</span>
                  </div>
                  <input
                    type="number"
                    value={currentEstimate.helperRate}
                    onChange={(e) => updateEstimate(currentEstimate.id, { helperRate: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Trip Charge ($)</span>
                    <span className="field-label-ar">رسم الرحلة</span>
                  </div>
                  <input
                    type="number"
                    value={currentEstimate.tripCharge}
                    onChange={(e) => updateEstimate(currentEstimate.id, { tripCharge: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="divider"></div>

              <div className="section">
                <div className="section-title">Your Estimate Details</div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Material Description & Cost</span>
                    <span className="field-label-ar">وصف المادة والتكلفة</span>
                  </div>
                  <textarea
                    value={currentEstimate.materialDesc}
                    onChange={(e) => updateEstimate(currentEstimate.id, { materialDesc: e.target.value })}
                    placeholder="e.g., replacement handle - $50 دولار"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Material Cost ($)</span>
                    <span className="field-label-ar">تكلفة المادة</span>
                  </div>
                  <input
                    type="number"
                    value={currentEstimate.materialCost}
                    onChange={(e) => updateEstimate(currentEstimate.id, { materialCost: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Technician Labor Hours</span>
                    <span className="field-label-ar">ساعات عمل الفني</span>
                  </div>
                  <input
                    type="number"
                    value={currentEstimate.techHours}
                    onChange={(e) => updateEstimate(currentEstimate.id, { techHours: parseFloat(e.target.value) })}
                    step="0.5"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Helper Labor Hours</span>
                    <span className="field-label-ar">ساعات عمل المساعد</span>
                  </div>
                  <input
                    type="number"
                    value={currentEstimate.helperHours}
                    onChange={(e) => updateEstimate(currentEstimate.id, { helperHours: parseFloat(e.target.value) })}
                    step="0.5"
                  />
                </div>

                <div className="field">
                  <div className="field-label">
                    <span className="field-label-en">Include Trip Charge?</span>
                    <span className="field-label-ar">هل تشمل رسم الرحلة؟</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentEstimate.includeTrip}
                      onChange={(e) => updateEstimate(currentEstimate.id, { includeTrip: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <span>Yes</span>
                  </label>
                </div>
              </div>

              <button className="button button-primary" onClick={() => setCurrentTab('result')}>
                Calculate Estimate
              </button>
            </div>
          )}

          {/* RESULT TAB */}
          {currentTab === 'result' && currentEstimate && (
            <div>
              <div className="section">
                <div className="section-title">Estimate Summary</div>

                <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>JOB</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>
                    {currentEstimate.jobNumber || '—'}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>SCOPE</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {currentEstimate.scope || '—'}
                  </div>
                </div>

                <div className="calc-result">
                  <div className="calc-result-label">Total Estimate</div>
                  <div className="calc-result-value">${currentEstimate.total.toFixed(2)}</div>
                  <div className="calc-result-detail">
                    <div>Tech: {currentEstimate.techHours}h × ${currentEstimate.techRate} = ${(currentEstimate.techHours * currentEstimate.techRate).toFixed(2)}</div>
                    <div>Helper: {currentEstimate.helperHours}h × ${currentEstimate.helperRate} = ${(currentEstimate.helperHours * currentEstimate.helperRate).toFixed(2)}</div>
                    <div>Materials: ${currentEstimate.materialCost.toFixed(2)}</div>
                    {currentEstimate.includeTrip && <div>Trip: ${currentEstimate.tripCharge.toFixed(2)}</div>}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '1rem' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>BREAKDOWN</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'var(--text-primary)' }}>
                    <div>Tech Labor: <strong>${(currentEstimate.techHours * currentEstimate.techRate).toFixed(2)}</strong></div>
                    <div>Helper Labor: <strong>${(currentEstimate.helperHours * currentEstimate.helperRate).toFixed(2)}</strong></div>
                    <div>Materials: <strong>${currentEstimate.materialCost.toFixed(2)}</strong></div>
                    {currentEstimate.includeTrip && <div>Trip: <strong>${currentEstimate.tripCharge.toFixed(2)}</strong></div>}
                  </div>
                </div>
              </div>

              <button className="button button-secondary" onClick={() => setCurrentTab('form')}>
                Edit Estimate
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  const estimate = `
ESTIMATE
========
Job #: ${currentEstimate.jobNumber}
Location: ${currentEstimate.location}
Service: ${currentEstimate.serviceLine}
Urgency: ${currentEstimate.urgency}

SCOPE: ${currentEstimate.scope}

TOTAL ESTIMATE: $${currentEstimate.total.toFixed(2)}

BREAKDOWN:
- Technician labor (${currentEstimate.techHours}h × $${currentEstimate.techRate}/h): $${(currentEstimate.techHours * currentEstimate.techRate).toFixed(2)}
- Helper labor (${currentEstimate.helperHours}h × $${currentEstimate.helperRate}/h): $${(currentEstimate.helperHours * currentEstimate.helperRate).toFixed(2)}
- Materials: $${currentEstimate.materialCost.toFixed(2)}
${currentEstimate.includeTrip ? `- Trip charge: $${currentEstimate.tripCharge.toFixed(2)}` : ''}

${currentEstimate.materialDesc ? `MATERIAL DETAILS: ${currentEstimate.materialDesc}` : ''}
                  `.trim()
                  navigator.clipboard.writeText(estimate).then(() => {
                    alert('Estimate copied to clipboard!')
                  })
                }}
              >
                Copy Estimate
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 420px;
          margin: 0 auto;
          background: var(--surface-0);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: var(--surface-1);
          border-bottom: 0.5px solid var(--border);
          padding: 1rem;
          text-align: center;
        }

        .header h1 {
          font-size: 18px;
          font-weight: 500;
          margin: 0;
          color: var(--text-primary);
        }

        .header p {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 4px 0 0;
        }

        .tabs {
          display: flex;
          gap: 8px;
          padding: 1rem;
          background: var(--surface-1);
          border-bottom: 0.5px solid var(--border);
        }

        .tab-button {
          flex: 1;
          padding: 8px;
          border: 0.5px solid var(--border);
          background: var(--surface-0);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button.active {
          background: var(--fill-accent);
          color: var(--on-accent);
          border-color: var(--fill-accent);
        }

        .tab-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .content {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 0.75rem;
        }

        .field {
          margin-bottom: 1rem;
        }

        .field-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .field-label-en {
          color: var(--text-primary);
        }

        .field-label-ar {
          font-size: 11px;
          color: var(--text-secondary);
          direction: rtl;
        }

        input[type='text'],
        input[type='number'],
        textarea,
        select {
          width: 100%;
          padding: 10px;
          border: 0.5px solid var(--border);
          border-radius: var(--radius);
          font-size: 14px;
          color: var(--text-primary);
          background: var(--surface-2);
        }

        input:focus,
        textarea:focus,
        select:focus {
          outline: none;
          border-color: var(--text-accent);
          box-shadow: 0 0 0 2px var(--bg-accent);
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        .button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 0.5rem;
        }

        .button-primary {
          background: var(--fill-accent);
          color: var(--on-accent);
        }

        .button-primary:active {
          transform: scale(0.98);
        }

        .button-secondary {
          background: var(--surface-1);
          border: 0.5px solid var(--border);
          color: var(--text-primary);
        }

        .calc-result {
          background: var(--bg-success);
          border: 0.5px solid var(--border-success);
          border-radius: var(--radius);
          padding: 1rem;
          margin-top: 1rem;
        }

        .calc-result-label {
          font-size: 12px;
          color: var(--text-success);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .calc-result-value {
          font-size: 28px;
          font-weight: 500;
          color: var(--text-success);
          margin: 0;
        }

        .calc-result-detail {
          font-size: 12px;
          color: var(--text-success);
          margin-top: 8px;
          line-height: 1.5;
        }

        .divider {
          height: 0.5px;
          background: var(--border);
          margin: 1.5rem 0;
        }

        .upload-area {
          border: 2px dashed var(--border-strong);
          border-radius: var(--radius);
          padding: 2rem 1rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1.5rem;
        }

        .upload-area:hover {
          border-color: var(--text-accent);
          background: var(--bg-accent);
        }

        .upload-area-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .upload-area-text {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .info-box {
          background: var(--bg-accent);
          border: 0.5px solid var(--border-accent);
          border-radius: var(--radius);
          padding: 0.75rem;
          font-size: 12px;
          color: var(--text-accent);
          margin-bottom: 1rem;
        }

        .images-list {
          margin-top: 2rem;
        }

        .image-card {
          display: flex;
          gap: 12px;
          background: var(--surface-1);
          border: 0.5px solid var(--border);
          border-radius: var(--radius);
          padding: 12px;
          margin-bottom: 12px;
          align-items: flex-start;
        }

        .image-preview {
          width: 60px;
          height: 80px;
          object-fit: cover;
          border-radius: var(--radius);
          flex-shrink: 0;
        }

        .image-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .image-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          word-break: break-word;
        }

        .image-status {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .image-status.loading {
          background: var(--bg-accent);
          color: var(--text-accent);
        }

        .image-status.error {
          background: #ffebee;
          color: #c62828;
        }

        .image-status.success {
          background: var(--bg-success);
          color: var(--text-success);
        }
      `}</style>
    </>
  )
}
