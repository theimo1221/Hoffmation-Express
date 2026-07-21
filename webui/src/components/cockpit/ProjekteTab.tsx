import { useState, useMemo } from 'react';
import type { CockpitData, CockpitConfig, CockpitItem, CockpitProject } from '@/types/cockpit';
import { DomainBadge } from './DomainBadge';
import { ProjectDetailDialog } from './ProjectDetailDialog';
import { formatShortDate } from './helpers';

export function ProjekteTab({
  data,
  config,
  onItemClick,
  onNoteSent,
}: {
  data: CockpitData;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
  onNoteSent: (id: string) => void;
}) {
  const [selectedProject, setSelectedProject] = useState<CockpitProject | null>(null);

  const itemById = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);

  const projectsWithItems = useMemo(
    () =>
      data.projects
        .filter((p) => p.rollup.item_ids.length > 0)
        .map((project) => ({
          project,
          items: project.rollup.item_ids.map((id) => itemById.get(id)).filter(Boolean) as CockpitItem[],
        }))
        .sort((a, b) => {
          const an = a.project.rollup.next_due ?? '9999-99-99';
          const bn = b.project.rollup.next_due ?? '9999-99-99';
          return an < bn ? -1 : an > bn ? 1 : 0;
        }),
    [data.projects, itemById],
  );

  const selectedItems = useMemo(() => {
    if (!selectedProject) return [];
    return selectedProject.rollup.item_ids.map((id) => itemById.get(id)).filter(Boolean) as CockpitItem[];
  }, [selectedProject, itemById]);

  return (
    <>
      <div className="p-3 space-y-2 max-w-3xl mx-auto">
        {projectsWithItems.map(({ project, items }) => (
          <button
            key={project.key}
            onClick={() => setSelectedProject(project)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card shadow-sm hover:bg-muted/30 text-left"
          >
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">{project.name}</span>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                {items.slice(0, 3).map((i) => (
                  <span key={i.id} className="truncate max-w-[160px]">{i.id} {i.title.slice(0, 30)}</span>
                ))}
                {items.length > 3 && <span>+{items.length - 3} weitere</span>}
              </div>
            </div>
            <DomainBadge domain={project.domain} config={config} />
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {project.rollup.open} offen
              {project.rollup.next_due ? ` · ${formatShortDate(project.rollup.next_due)}` : ''}
            </span>
            <span className="text-muted-foreground text-sm shrink-0">›</span>
          </button>
        ))}
      </div>

      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          items={selectedItems}
          config={config}
          onClose={() => setSelectedProject(null)}
          onItemClick={onItemClick}
          onSent={onNoteSent}
        />
      )}
    </>
  );
}
