import { describe, it, expect, vi } from 'vitest';
import { rankResults } from './retrieval.ranker.js';
import { evaluateConfidence } from './retrieval.confidence.js';

describe('Hybrid Schema-Aware RAG - Retrieval Pipeline', () => {

  describe('Ranker', () => {
    it('should aggregate scores correctly from multiple sources', () => {
      const semantic = [
        { metadataId: '1', tableName: 'users', score: 0.9, source: 'semantic' }
      ];
      const keyword = [
        { metadataId: '1', tableName: 'users', score: 1.0, source: 'keyword' },
        { metadataId: '2', tableName: 'user_profiles', score: 1.0, source: 'keyword' }
      ];
      const expansion = [
        { metadataId: '1', tableName: 'users', score: 0.5, source: 'expansion' },
        { metadataId: '3', tableName: 'orders', score: 0.5, source: 'expansion' }
      ];

      const ranked = rankResults(semantic, keyword, expansion);
      
      expect(ranked.length).toBe(3);
      
      // users should be top: 0.9*1.0 + 1.0*0.8 + 0.5*0.5 = 0.9 + 0.8 + 0.25 = 1.95
      expect(ranked[0].tableName).toBe('users');
      expect(ranked[0].score).toBeCloseTo(1.95);
      expect(ranked[0].sources).toContain('semantic');
      expect(ranked[0].sources).toContain('keyword');
      expect(ranked[0].sources).toContain('expansion');

      // user_profiles: 1.0*0.8 = 0.8
      expect(ranked[1].tableName).toBe('user_profiles');
      expect(ranked[1].score).toBe(0.8);

      // orders: 0.5*0.5 = 0.25
      expect(ranked[2].tableName).toBe('orders');
      expect(ranked[2].score).toBe(0.25);
    });
  });

  describe('Confidence Evaluator', () => {
    it('should meet threshold when top score is very high and gap is large', () => {
      const ranked = [
        { score: 0.95 },
        { score: 0.40 }
      ];
      const result = evaluateConfidence(ranked);
      expect(result.meetsThreshold).toBe(true);
      expect(result.confidence).toBe(0.95);
    });

    it('should fail threshold when top score is low', () => {
      const ranked = [
        { score: 0.50 } // Assuming default threshold is 0.65
      ];
      const result = evaluateConfidence(ranked);
      expect(result.meetsThreshold).toBe(false);
      expect(result.confidence).toBe(0.50);
      expect(result.reason).toContain('below threshold');
    });

    it('should flag ambiguity and fail when top scores are too close', () => {
      const ranked = [
        { score: 0.80 },
        { score: 0.75 }
      ];
      const result = evaluateConfidence(ranked);
      expect(result.meetsThreshold).toBe(false);
      expect(result.reason).toContain('Ambiguous match');
      // Gap is 0.05. Scale gap: 0.05 * (0.65 / 0.15) = 0.216, which is < 0.65
      expect(result.confidence).toBeLessThan(0.65);
    });
    
    it('should handle zero results gracefully', () => {
      const result = evaluateConfidence([]);
      expect(result.meetsThreshold).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toBe('No results found');
    });
  });

});
