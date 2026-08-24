import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { Project } from "@/db";
import { db } from "@/db";
import { ImageSource } from "../../../shared/types";
import type { CardOption } from "../../../shared/types";
import { createProjectBackup, importProjectBackup, remapImportedProjects } from "./projectBackup";

describe("remapImportedProjects", () => {
  it("creates non-destructive project copies and preserves card links", () => {
    const projects: Project[] = [{ id: "old-project", name: "Deck", createdAt: 1, lastOpenedAt: 1, cardCount: 2, settings: {} }];
    const cards = [
      { uuid: "front", name: "Front", order: 10, projectId: "old-project", linkedBackId: "back" },
      { uuid: "back", name: "Back", order: 10, projectId: "old-project", linkedFrontId: "front" },
    ] as CardOption[];

    const result = remapImportedProjects(projects, cards, ["Deck"]);
    expect(result.projects[0].id).not.toBe("old-project");
    expect(result.projects[0].name).toBe("Deck (Imported)");
    expect(result.cards[0].uuid).not.toBe("front");
    expect(result.cards[0].linkedBackId).toBe(result.cards[1].uuid);
    expect(result.cards[1].linkedFrontId).toBe(result.cards[0].uuid);
  });

  it("assigns unique names when importing repeated backups", () => {
    const projects: Project[] = [{ id: "p", name: "Deck", createdAt: 1, lastOpenedAt: 1, cardCount: 0, settings: {} }];
    expect(remapImportedProjects(projects, [], ["Deck", "Deck (Imported)"]).projects[0].name)
      .toBe("Deck (Imported 2)");
  });
});

describe("project backup round trip", () => {
  beforeEach(async () => {
    await Promise.all([
      db.projects.clear(), db.cards.clear(), db.images.clear(),
      db.user_images.clear(), db.cardbacks.clear(),
    ]);
  });

  it("restores project settings, cards, and referenced upload data", async () => {
    const project: Project = { id: "project", name: "Upload Deck", createdAt: 1, lastOpenedAt: 1, cardCount: 1, settings: { columns: 4 } };
    const upload = new Blob(["image bytes"], { type: "image/png" });
    await db.projects.add(project);
    await db.cards.add({ uuid: "card", name: "Custom", order: 10, projectId: project.id, imageId: "upload-hash", source: ImageSource.UploadLibrary, isUserUpload: true });
    await db.user_images.add({ hash: "upload-hash", data: upload, type: "image/png", createdAt: 1, displayName: "Custom" });
    await db.images.add({ id: "upload-hash", refCount: 1, source: ImageSource.UploadLibrary, originalBlob: upload });

    const backup = await createProjectBackup([project.id]);
    expect(backup.size).toBeGreaterThan(upload.size);
    await Promise.all([db.projects.clear(), db.cards.clear(), db.images.clear(), db.user_images.clear()]);
    const file = new File([backup], "project.proxxied-backup", { type: "application/zip" });
    const result = await importProjectBackup(file);

    expect(result.projectCount).toBe(1);
    expect(result.cardCount).toBe(1);
    expect((await db.projects.get(result.projectIds[0]))?.settings).toEqual({ columns: 4 });
    expect((await db.cards.where("projectId").equals(result.projectIds[0]).first())?.name).toBe("Custom");
    const restoredUpload = await db.user_images.get("upload-hash");
    expect(restoredUpload?.displayName).toBe("Custom");
    expect(restoredUpload?.data).toBeDefined();
  });
});
