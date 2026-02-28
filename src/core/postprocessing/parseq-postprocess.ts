import type { ParseqModelSize } from '../pipeline/types.ts'

type DecodeResult = {
  readonly text: string
  readonly confidence: number
  readonly positions: ReadonlyArray<{ charIndex: number; probability: number }>
}

/**
 * Decode PARSeq model output tensor to text.
 *
 * Output shape: [1, seqLen, vocabSize]
 * - Index 0 = EOS token
 * - charlist[index - 1] for character mapping (1-indexed)
 * - Truncates at first EOS occurrence
 */
export function parseqDecode(
  output: Float32Array,
  seqLen: number,
  vocabSize: number,
  charset: readonly string[],
): DecodeResult {
  const positions: Array<{ charIndex: number; probability: number }> = []
  let text = ''
  let totalLogProb = 0

  for (let pos = 0; pos < seqLen; pos++) {
    const offset = pos * vocabSize

    // Find argmax
    let maxIdx = 0
    let maxVal = output[offset]
    for (let v = 1; v < vocabSize; v++) {
      if (output[offset + v] > maxVal) {
        maxVal = output[offset + v]
        maxIdx = v
      }
    }

    // Index 0 = EOS
    if (maxIdx === 0) break

    // Compute softmax probability for the selected character
    let expSum = 0
    for (let v = 0; v < vocabSize; v++) {
      expSum += Math.exp(output[offset + v] - maxVal)
    }
    const probability = 1 / expSum

    const charIdx = maxIdx - 1
    if (charIdx >= 0 && charIdx < charset.length) {
      text += charset[charIdx]
      positions.push({ charIndex: charIdx, probability })
      totalLogProb += Math.log(probability)
    }
  }

  const confidence = positions.length > 0
    ? Math.exp(totalLogProb / positions.length)
    : 0

  return { text, confidence, positions }
}

/**
 * Check if model should escalate to the next larger size.
 *
 * - small (256): escalate if decoded text > 25 chars
 * - medium (384): escalate if decoded text > 45 chars
 * - large (768): never escalate
 */
export function shouldEscalateModel(
  modelSize: ParseqModelSize,
  decodedLength: number,
): boolean {
  if (modelSize === 'small' && decodedLength > 25) return true
  if (modelSize === 'medium' && decodedLength > 45) return true
  return false
}
