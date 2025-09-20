import { useCallback } from 'react';
import { PRDUpdater, type PRDUpdate } from '@/utils/prdUpdater';

/**
 * Hook para facilitar atualizações do PRD em componentes
 */
export const usePRDUpdate = (componentName: string) => {
  const recordChange = useCallback((
    description: string,
    type: PRDUpdate['type'] = 'feature_modified',
    category: PRDUpdate['category'] = 'ui',
    impact: PRDUpdate['impact'] = 'medium',
    files_changed: string[] = [componentName]
  ) => {
    PRDUpdater.addUpdate({
      type,
      category,
      description: `${componentName}: ${description}`,
      files_changed,
      impact
    });
  }, [componentName]);

  const recordFeatureComplete = useCallback((
    feature: string,
    completionPercentage: number = 100
  ) => {
    PRDUpdater.addUpdate({
      type: 'feature_added',
      category: 'ui',
      description: `${componentName}: ${feature} implementado`,
      files_changed: [componentName],
      impact: 'high',
      completion_percentage: completionPercentage
    });
  }, [componentName]);

  const recordBugFix = useCallback((
    bug: string,
    impact: PRDUpdate['impact'] = 'medium'
  ) => {
    PRDUpdater.addUpdate({
      type: 'bug_fixed',
      category: 'ui',
      description: `${componentName}: ${bug}`,
      files_changed: [componentName],
      impact
    });
  }, [componentName]);

  return {
    recordChange,
    recordFeatureComplete,
    recordBugFix
  };
};