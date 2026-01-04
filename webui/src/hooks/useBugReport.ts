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
  id: string;
  description: string;
  context: BugReportContext;
  createdAt: string;
  done: boolean;
  doneAt?: string;
}

export interface BugReportSubmission {
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
      const bugReport: BugReportSubmission = {
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

  const fetchBugReports = async (): Promise<{ success: boolean; reports?: BugReport[]; error?: string }> => {
    try {
      const response = await fetch('/webui/bug-reports');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reports = await response.json();
      return { success: true, reports };
    } catch (error) {
      console.error('Failed to fetch bug reports:', error);
      return { success: false, error: 'Fehler beim Laden der Bug-Reports' };
    }
  };

  const updateBugReport = async (
    id: string,
    updates: Partial<Pick<BugReport, 'description' | 'done'>>
  ): Promise<{ success: boolean; report?: BugReport; error?: string }> => {
    try {
      const response = await fetch(`/webui/bug-report/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      return { success: true, report: result.report };
    } catch (error) {
      console.error('Failed to update bug report:', error);
      return { success: false, error: 'Fehler beim Aktualisieren des Bug-Reports' };
    }
  };

  return {
    submitBugReport,
    fetchBugReports,
    updateBugReport,
    isSubmitting,
  };
}
