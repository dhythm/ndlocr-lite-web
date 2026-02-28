/**
 * Text recognition module (PARSeq model).
 * Cascade: charCountCategory=3 -> 30-char, =2 -> 50-char, else -> 100-char
 */
import type * as OrtType from 'onnxruntime-web'
import { ort, createSession } from './onnx-config'
import type { TextRegion } from '../types/ocr'
import { PARSEQ_CHARSET } from '../core/config/charset'

type RecognitionResult = {
  text: string
  confidence: number
}

export class TextRecognizer {
  private session: OrtType.InferenceSession | null = null
  private initialized = false
  private inputShape: [number, number, number, number]
  private charList: readonly string[] = PARSEQ_CHARSET

  constructor(inputShape?: [number, number, number, number]) {
    this.inputShape = inputShape ?? [1, 3, 16, 384]
  }

  async initialize(modelData: ArrayBuffer): Promise<void> {
    if (this.initialized) return
    this.session = await createSession(modelData)
    this.initialized = true
  }

  async recognize(imageData: ImageData, region: TextRegion): Promise<RecognitionResult> {
    const cropped = TextRecognizer.cropImageData(imageData, region)
    return this.recognizeCropped(cropped)
  }

  async recognizeCropped(croppedImageData: ImageData): Promise<RecognitionResult> {
    if (!this.initialized || !this.session) {
      throw new Error('Text recognizer not initialized')
    }

    const inputTensor = this.preprocess(croppedImageData)
    const output = await this.session.run({
      [this.session.inputNames[0]]: inputTensor,
    })
    return this.decodeOutput(output)
  }

  static cropImageData(imageData: ImageData, region: TextRegion): ImageData {
    const sourceCanvas = new OffscreenCanvas(imageData.width, imageData.height)
    const sourceCtx = sourceCanvas.getContext('2d')!
    sourceCtx.putImageData(imageData, 0, 0)

    const canvas = new OffscreenCanvas(region.width, region.height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      sourceCanvas,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height,
    )
    return ctx.getImageData(0, 0, region.width, region.height)
  }

  private preprocess(imageData: ImageData): OrtType.Tensor {
    const [, channels, height, width] = this.inputShape
    const imgWidth = imageData.width
    const imgHeight = imageData.height

    // Rotate portrait images 90 degrees counter-clockwise
    const canvas = new OffscreenCanvas(1, 1)
    const ctx = canvas.getContext('2d')!

    if (imgHeight > imgWidth) {
      canvas.width = imgHeight
      canvas.height = imgWidth
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.translate(-canvas.height / 2, -canvas.width / 2)
    } else {
      canvas.width = imgWidth
      canvas.height = imgHeight
    }

    const tempCanvas = new OffscreenCanvas(imgWidth, imgHeight)
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0)

    // Resize to model input size
    const resizeCanvas = new OffscreenCanvas(width, height)
    const resizeCtx = resizeCanvas.getContext('2d')!
    resizeCtx.drawImage(canvas, 0, 0, width, height)

    const resized = resizeCtx.getImageData(0, 0, width, height)
    const { data } = resized

    // Float32Array: [-1, 1] normalization (NCHW format, RGB channels)
    const tensorData = new Float32Array(channels * height * width)
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        const pixelOffset = (h * width + w) * 4
        for (let c = 0; c < channels; c++) {
          const value = data[pixelOffset + c] / 255.0
          tensorData[c * height * width + h * width + w] = 2.0 * (value - 0.5)
        }
      }
    }

    return new ort.Tensor('float32', tensorData, this.inputShape)
  }

  private decodeOutput(outputs: Record<string, OrtType.Tensor>): RecognitionResult {
    const outputName = this.session!.outputNames[0]
    const output = outputs[outputName].data as Float32Array
    const dims = outputs[outputName].dims
    const [, seqLength, vocabSize] = dims
    const vocabSizeN = Number(vocabSize)

    const resultClassIds: number[] = []
    let totalLogProb = 0

    for (let pos = 0; pos < seqLength; pos++) {
      const offset = pos * vocabSizeN

      // Find argmax
      let maxIdx = 0
      let maxVal = output[offset]
      for (let v = 1; v < vocabSizeN; v++) {
        if (output[offset + v] > maxVal) {
          maxVal = output[offset + v]
          maxIdx = v
        }
      }

      // Index 0 = EOS
      if (maxIdx === 0) break
      // Indices 1-3 = special tokens (<s>, </s>, <pad>)
      if (maxIdx < 4) continue

      // Softmax probability for confidence
      let expSum = 0
      for (let v = 0; v < vocabSizeN; v++) {
        expSum += Math.exp(output[offset + v] - maxVal)
      }
      totalLogProb += Math.log(1 / expSum)

      resultClassIds.push(maxIdx - 1)
    }

    // Deduplicate consecutive IDs and map to characters
    const resultChars: string[] = []
    let prevId = -1
    for (const id of resultClassIds) {
      if (id !== prevId && id < this.charList.length) {
        resultChars.push(this.charList[id])
        prevId = id
      }
    }

    const confidence = resultClassIds.length > 0
      ? Math.exp(totalLogProb / resultClassIds.length)
      : 0

    return { text: resultChars.join('').trim(), confidence }
  }

  dispose(): void {
    if (this.session) {
      this.session.release()
      this.session = null
    }
    this.initialized = false
  }
}
