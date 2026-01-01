import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export interface BugReportContext {
  route: string;
  entityType?: 'device' | 'room' | 'scene' | 'group';
  entityId?: string;
  entityData?: any;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  timestamp: string;
}

export interface BugReport {
  description: string;
  context: BugReportContext;
}

export function useBugReport() {
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getContext = (entityType?: 'device' | 'room' | 'scene' | 'group', entityId?: string, entityData?: any): BugReportContext => {
    return {
      route: location.pathname,
      entityType,
      entityId,
      entityData,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timestamp: new Date().toISOString(),
    };
  };

  const submitBugReport = async (
    description: string,
    entityType?: 'device' | 'room' | 'scene' | 'group',
    entityId?: string,
    entityData?: any
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!description.trim()) {
      return { success: false, error: 'Beschreibung ist erforderlich' };
    }

    setIsSubmitting(true);

    try {
      const context = getContext(entityType, entityId, entityData);
      const bugReport: BugReport = {
        description: description.trim(),
        context,
      };

      const response = await fetch('/webui/bug-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bugReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      return { success: false, error: 'Fehler beim Senden des Bug-Reports' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitBugReport,
    isSubmitting,
  };
}
