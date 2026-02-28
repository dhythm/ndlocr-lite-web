import './App.css'
import { useOcr } from './hooks/useOcr.ts'
import { ImageUploader } from './components/ImageUploader.tsx'
import { ProgressIndicator } from './components/ProgressIndicator.tsx'
import { ResultViewer } from './components/ResultViewer.tsx'
import { ExportButton } from './components/ExportButton.tsx'

function App() {
  const { state, processFile, reset } = useOcr()

  const isProcessing = state.status === 'loading-models' || state.status === 'processing'

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">NDLOCR Lite Web</h1>
        <p className="app__subtitle">
          ブラウザ完結型 OCR - ONNX Runtime Web で動作
        </p>
      </header>

      {state.status === 'idle' && (
        <ImageUploader onFileSelect={processFile} />
      )}

      {isProcessing && state.progress && (
        <ProgressIndicator progress={state.progress} />
      )}

      {state.status === 'error' && (
        <div className="error">
          <p>エラーが発生しました: {state.error}</p>
        </div>
      )}

      {state.status === 'done' && state.result && (
        <>
          <ExportButton result={state.result} />
          <ResultViewer result={state.result} imageUrls={state.imageUrls} />
        </>
      )}

      {state.status !== 'idle' && !isProcessing && (
        <button className="app__reset" onClick={reset}>
          新しいファイルを処理
        </button>
      )}
    </div>
  )
}

export default App
