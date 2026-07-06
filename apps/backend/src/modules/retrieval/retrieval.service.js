import { performSemanticSearch } from './retrieval.semantic.js';
import { performKeywordSearch } from './retrieval.keyword.js';
import { expandRelationships } from './retrieval.relationship-expansion.js';
import { rankResults } from './retrieval.ranker.js';
import { evaluateConfidence } from './retrieval.confidence.js';

export class RetrievalService {
  /**
   * Orchestrates the Hybrid Schema-Aware RAG pipeline.
   * Completely deterministic, zero runtime LLM calls.
   */
  async retrieveTables(connectionId, query, limit = 5) {
    // 1. Semantic Search
    const semanticResults = await performSemanticSearch(connectionId, query, 10);
    
    // 2. Keyword Search
    const keywordResults = await performKeywordSearch(connectionId, query, 10);
    
    // Combine unique candidates for expansion
    const candidates = [...semanticResults, ...keywordResults].filter((v, i, a) => 
      a.findIndex(t => (t.metadataId === v.metadataId)) === i
    );
    
    // 3. Relationship Expansion
    const expansionResults = await expandRelationships(connectionId, candidates);
    
    // 4. Ranking
    const rankedResults = rankResults(semanticResults, keywordResults, expansionResults);
    
    // 5. Select Top K
    const topResults = rankedResults.slice(0, limit);
    
    // 6. Confidence Evaluation
    const diagnostics = evaluateConfidence(topResults);
    
    return {
      results: topResults,
      diagnostics
    };
  }
}

export const retrievalService = new RetrievalService();
