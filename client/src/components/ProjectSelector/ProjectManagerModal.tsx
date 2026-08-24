import { useMemo, useRef, useState } from "react";
import { Archive, Download, Edit2, FolderInput, Save, Trash2, X } from "lucide-react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from "flowbite-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { useProjectStore } from "@/store/projectStore";
import { useToastStore } from "@/store/toast";

interface ProjectManagerModalProps {
  show: boolean;
  onClose: () => void;
}

export function ProjectManagerModal({ show, onClose }: ProjectManagerModalProps) {
  const projects = useProjectStore((state) => state.projects);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const renameProject = useProjectStore((state) => state.renameProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const switchProject = useProjectStore((state) => state.switchProject);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const cards = useLiveQuery(() => db.cards.toArray(), [], []);
  const cardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards ?? []) {
      if (card.projectId && !card.linkedFrontId) counts.set(card.projectId, (counts.get(card.projectId) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    try {
      await action();
      useToastStore.getState().addToast({ message: success, type: "success", dismissible: true });
    } catch (error) {
      useToastStore.getState().showErrorToast(error instanceof Error ? error.message : "Project operation failed");
    } finally {
      setBusy(null);
    }
  };

  const saveRename = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    await run(`rename:${id}`, async () => {
      await renameProject(id, name);
      setEditingId(null);
    }, "Project renamed");
  };

  const exportOne = async (id: string, name: string) => {
    await run(`export:${id}`, async () => {
      const { exportProjectBackup } = await import("@/helpers/projectBackup");
      await exportProjectBackup([id], name);
    }, `Exported “${name}”`);
  };

  const backupAll = async () => {
    await run("backup-all", async () => {
      const { exportProjectBackup } = await import("@/helpers/projectBackup");
      await exportProjectBackup(projects.map((project) => project.id), "proxxied-all-projects");
    }, "All projects backed up");
  };

  const importFile = async (file: File) => {
    await run("import", async () => {
      const { importProjectBackup } = await import("@/helpers/projectBackup");
      const result = await importProjectBackup(file);
      await loadProjects();
      if (result.projectIds.length === 1) await switchProject(result.projectIds[0]);
    }, "Backup import complete");
  };

  const pendingDelete = projects.find((project) => project.id === deleteId);

  return (
    <>
      <Modal show={show} onClose={onClose} size="4xl">
        <ModalHeader>Project Manager</ModalHeader>
        <ModalBody>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button color="blue" onClick={backupAll} disabled={!!busy || projects.length === 0}>
              <Archive className="mr-2 size-4" /> Backup All Projects
            </Button>
            <Button color="gray" onClick={() => importInputRef.current?.click()} disabled={!!busy}>
              <FolderInput className="mr-2 size-4" /> Import Project or Backup
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".proxxied-backup,application/zip"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importFile(file);
              }}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
            {projects.map((project) => (
              <div key={project.id} className="flex flex-col gap-3 border-b border-gray-200 p-3 last:border-b-0 dark:border-gray-600 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  {editingId === project.id ? (
                    <div className="flex gap-2">
                      <TextInput
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && void saveRename(project.id)}
                        autoFocus
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => void saveRename(project.id)} disabled={!editingName.trim() || !!busy}>
                        <Save className="size-4" />
                      </Button>
                      <Button size="sm" color="gray" onClick={() => setEditingId(null)}><X className="size-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <div className="truncate font-medium text-gray-900 dark:text-white">
                        {project.name}{project.id === currentProjectId && <span className="ml-2 text-xs text-blue-600">Current</span>}
                      </div>
                      <div className="text-xs text-gray-500">{cardCounts.get(project.id) ?? 0} cards</div>
                    </>
                  )}
                </div>
                {editingId !== project.id && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" color="gray" onClick={() => { setEditingId(project.id); setEditingName(project.name); }} disabled={!!busy}>
                      <Edit2 className="mr-1 size-4" /> Rename
                    </Button>
                    <Button size="sm" color="gray" onClick={() => void exportOne(project.id, project.name)} disabled={!!busy}>
                      <Download className="mr-1 size-4" /> Export
                    </Button>
                    <Button size="sm" color="red" onClick={() => setDeleteId(project.id)} disabled={!!busy}>
                      <Trash2 className="mr-1 size-4" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Imports are added as new copies and never overwrite existing projects.
          </p>
        </ModalBody>
        <ModalFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-sm text-gray-500">{busy ? "Working…" : `${projects.length} project${projects.length === 1 ? "" : "s"}`}</span>
            <Button color="gray" onClick={onClose}>Close</Button>
          </div>
        </ModalFooter>
      </Modal>

      <Modal show={!!pendingDelete} onClose={() => setDeleteId(null)} size="md">
        <ModalHeader>Delete Project</ModalHeader>
        <ModalBody>
          Delete “{pendingDelete?.name}” and all of its cards? This cannot be undone unless you exported a backup.
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="red" disabled={!!busy} onClick={() => {
            if (!pendingDelete) return;
            void run(`delete:${pendingDelete.id}`, async () => {
              await deleteProject(pendingDelete.id);
              setDeleteId(null);
            }, "Project deleted");
          }}>Delete</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
