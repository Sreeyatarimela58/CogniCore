export function rankResults(semanticResults, keywordResults, expansionResults) {
  const scoreMap = new Map();

  const addScore = (item, weight) => {
    const current = scoreMap.get(item.tableName) || {
      metadataId: item.metadataId,
      tableName: item.tableName,
      score: 0,
      sources: new Set()
    };
    
    current.score += (item.score * weight);
    current.sources.add(item.source);
    scoreMap.set(item.tableName, current);
  };

  // Weightings can be tuned
  semanticResults.forEach(r => addScore(r, 1.0));
  keywordResults.forEach(r => addScore(r, 0.8));
  expansionResults.forEach(r => addScore(r, 0.5));

  const ranked = Array.from(scoreMap.values())
    .map(r => ({
      ...r,
      sources: Array.from(r.sources)
    }))
    .sort((a, b) => b.score - a.score);

  return ranked;
}
