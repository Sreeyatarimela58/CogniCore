import { env } from '../../config/env.js';

export function evaluateConfidence(rankedResults) {
  if (rankedResults.length === 0) {
    return {
      confidence: 0,
      meetsThreshold: false,
      topScore: 0,
      secondScore: 0,
      scoreGap: 0,
      reason: 'No results found'
    };
  }

  const threshold = env.RETRIEVAL_CONFIDENCE_THRESHOLD;
  const topScore = rankedResults[0].score;
  const secondScore = rankedResults.length > 1 ? rankedResults[1].score : 0;
  const scoreGap = topScore - secondScore;

  let confidence = topScore;
  let meetsThreshold = true;
  let reason = 'High confidence match';

  // Base threshold check
  if (topScore < threshold) {
    meetsThreshold = false;
    reason = `Top score (${topScore.toFixed(2)}) is below threshold (${threshold})`;
  }
  // Ambiguity check: if the top two results are extremely close, it's ambiguous
  else if (rankedResults.length > 1 && scoreGap < 0.15) {
    confidence = scoreGap * (threshold / 0.15); // Scale confidence down based on gap
    if (confidence < threshold) {
      meetsThreshold = false;
      reason = `Ambiguous match. Score gap (${scoreGap.toFixed(2)}) indicates uncertainty.`;
    }
  }

  return {
    confidence,
    meetsThreshold,
    topScore,
    secondScore,
    scoreGap,
    reason
  };
}
