import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { useI18n } from './hooks/useI18n'
import { useOCRWorker } from './hooks/useOCRWorker'
import { useFileProcessor } from './hooks/useFileProcessor'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { FileDropZone } from './components/upload/FileDropZone'
import { ProgressBar } from './components/progress/ProgressBar'
import { ImageViewer } from './components/viewer/ImageViewer'
import { RegionOCRDialog } from './components/viewer/RegionOCRDialog'
import { ResultPanel } from './components/results/ResultPanel'
import { ResultActions } from './components/results/ResultActions'
import { HistoryPanel } from './components/results/HistoryPanel'
import { SettingsModal } from './components/settings/SettingsModal'
import type { OCRResult, TextBlock } from './types/ocr'
import type { DBRunEntry } from './types/db'
import { saveRunEntry } from './utils/db'

type AppPhase = 'upload' | 'preview' | 'processing' | 'results'

function App() {
  const { lang, setLang, t } = useI18n()
  const { isReady, jobState, processImage, processRegion, resetState } = useOCRWorker()
  const { processedImages, isLoading, error: fileError, processFiles, clearImages } = useFileProcessor()

  const [phase, setPhase] = useState<AppPhase>('upload')
  const [results, setResults] = useState<OCRResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showBbox, setShowBbox] = useState(true)
  const [ignoreLineBreaks, setIgnoreLineBreaks] = useState(false)
  const [includeFileName, setIncludeFileName] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('ndlocr-dark')
    return stored === 'true'
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Region OCR state
  const [regionImageData, setRegionImageData] = useState<ImageData | null>(null)
  const [regionResult, setRegionResult] = useState<{ textBlocks: TextBlock[]; fullText: string } | null>(null)
  const [regionProcessing, setRegionProcessing] = useState(false)

  // Dark mode effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('ndlocr-dark', String(darkMode))
  }, [darkMode])

  // Transition to preview when images are loaded
  useEffect(() => {
    if (processedImages.length > 0 && phase === 'upload') {
      setPhase('preview')
    }
  }, [processedImages, phase])

  const handleFilesSelected = useCallback((files: File[]) => {
    setResults([])
    setSelectedIndex(0)
    processFiles(files)
  }, [processFiles])

  const handleStartOCR = useCallback(async () => {
    if (processedImages.length === 0) return
    setPhase('processing')
    const allResults: OCRResult[] = []

    for (let i = 0; i < processedImages.length; i++) {
      try {
        const result = await processImage(processedImages[i], i, processedImages.length)
        allResults.push(result)
        setResults([...allResults])
      } catch (err) {
        console.error('OCR error:', err)
      }
    }

    setResults(allResults)
    setPhase('results')

    // Save to history
    if (allResults.length > 0) {
      try {
        await saveRunEntry({
          id: `run-${Date.now()}`,
          files: allResults.map((r) => ({
            fileName: r.fileName,
            imageDataUrl: r.imageDataUrl,
            textBlocks: r.textBlocks.map((b) => ({
              x: b.x, y: b.y, width: b.width, height: b.height,
              text: b.text, readingOrder: b.readingOrder, confidence: b.confidence,
            })),
            fullText: r.fullText,
            processingTimeMs: r.processingTimeMs,
          })),
          createdAt: Date.now(),
        })
      } catch {
        // Ignore DB errors
      }
    }
  }, [processedImages, processImage])

  const handleRegionSelect = useCallback(async (imageData: ImageData) => {
    setRegionImageData(imageData)
    setRegionResult(null)
    setRegionProcessing(true)
    try {
      const result = await processRegion(imageData)
      setRegionResult(result)
    } catch (err) {
      console.error('Region OCR error:', err)
      setRegionResult({ textBlocks: [], fullText: '' })
    } finally {
      setRegionProcessing(false)
    }
  }, [processRegion])

  const handleCloseRegionDialog = useCallback(() => {
    setRegionImageData(null)
    setRegionResult(null)
    setRegionProcessing(false)
  }, [])

  const handleReset = useCallback(() => {
    setPhase('upload')
    setResults([])
    setSelectedIndex(0)
    clearImages()
    resetState()
  }, [clearImages, resetState])

  const handleHistorySelect = useCallback((entry: DBRunEntry) => {
    const restored: OCRResult[] = entry.files.map((f, i) => ({
      id: `restored-${i}`,
      fileName: f.fileName,
      imageDataUrl: f.imageDataUrl,
      textBlocks: f.textBlocks.map((b) => ({
        ...b, classId: 0, charCountCategory: undefined,
      })),
      fullText: f.fullText,
      processingTimeMs: f.processingTimeMs,
      createdAt: entry.createdAt,
    }))
    setResults(restored)
    setSelectedIndex(0)
    setPhase('results')
  }, [])

  const currentResult = results[selectedIndex]
  const isProcessing = phase === 'processing' || jobState.status === 'loading_model'
  const showProgress = isProcessing || (jobState.status === 'loading_model' && phase !== 'results')

  return (
    <div className="app">
      <Header
        isReady={isReady}
        hasImages={processedImages.length > 0}
        isProcessing={isProcessing}
        onStartOCR={handleStartOCR}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ja' ? 'en' : 'ja')}
        t={t}
      />

      {phase === 'upload' && !isLoading && (
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          disabled={!isReady && jobState.status !== 'idle'}
          t={t}
        />
      )}

      {isLoading && (
        <div className="progress-panel">
          <p className="progress-panel__message">{t.upload.loadingFile}</p>
        </div>
      )}

      {!isReady && jobState.status === 'loading_model' && phase === 'upload' && (
        <ProgressBar jobState={jobState} t={t} />
      )}

      {phase === 'preview' && processedImages.length > 0 && !isProcessing && (
        <div className="file-thumbnails">
          {processedImages.map((img, i) => (
            <img
              key={i}
              src={img.thumbnailDataUrl}
              alt={img.fileName}
              className="file-thumb"
              title={img.pageIndex ? `${img.fileName} p.${img.pageIndex}` : img.fileName}
            />
          ))}
        </div>
      )}

      {showProgress && (
        <ProgressBar jobState={jobState} t={t} />
      )}

      {fileError && (
        <div className="error">
          <p>{t.common.error}: {fileError}</p>
        </div>
      )}

      {jobState.status === 'error' && (
        <div className="error">
          <p>{t.common.error}: {jobState.errorMessage}</p>
        </div>
      )}

      {phase === 'results' && results.length > 0 && currentResult && (
        <>
          <ResultActions
            results={results}
            ignoreLineBreaks={ignoreLineBreaks}
            onToggleIgnoreLineBreaks={() => setIgnoreLineBreaks((v) => !v)}
            includeFileName={includeFileName}
            onToggleIncludeFileName={() => setIncludeFileName((v) => !v)}
            t={t}
          />
          <div className="viewer">
            <ImageViewer
              imageDataUrl={currentResult.imageDataUrl}
              textBlocks={currentResult.textBlocks}
              showBbox={showBbox}
              onRegionSelect={isReady ? handleRegionSelect : undefined}
            />
            <div className="viewer__text-panel">
              <div className="viewer__controls">
                <label>
                  <input
                    type="checkbox"
                    checked={showBbox}
                    onChange={(e) => setShowBbox(e.target.checked)}
                  />
                  {t.viewer.showBbox}
                </label>
              </div>
              <ResultPanel
                results={results}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
                t={t}
              />
            </div>
          </div>
        </>
      )}

      {phase !== 'upload' && !isProcessing && (
        <button className="header__btn" onClick={handleReset} style={{ display: 'block', margin: '16px auto' }}>
          {t.common.newFile}
        </button>
      )}

      <RegionOCRDialog
        imageData={regionImageData}
        result={regionResult}
        isProcessing={regionProcessing}
        onClose={handleCloseRegionDialog}
        t={t}
      />

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectEntry={handleHistorySelect}
        t={t}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        t={t}
      />

      <Footer t={t} />
    </div>
  )
}

export default App
