import JSZip from "jszip";
import { db, type Cardback, type Image, type Project, type UserImage } from "@/db";
import { ImageSource, type CardOption } from "../../../shared/types";
import { generateUUID } from "./uuid";
import { getMpcAutofillImageUrl } from "./mpcAutofillApi";

const BACKUP_TYPE = "proxxied-project-backup";
const BACKUP_VERSION = 1;

type BlobReference = { field: string; file: string; type: string };
type PackedRecord<T> = { record: T; blobs: BlobReference[] };

interface BackupManifest {
  type: typeof BACKUP_TYPE;
  version: number;
  exportedAt: string;
  projects: Project[];
  cards: CardOption[];
  images: Array<PackedRecord<Record<string, unknown>>>;
  userImages: Array<PackedRecord<Record<string, unknown>>>;
  cardbacks: Array<PackedRecord<Record<string, unknown>>>;
}

export interface ImportBackupResult {
  projectIds: string[];
  projectCount: number;
  cardCount: number;
}

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80) || "project";
}

async function packRecord<T extends Record<string, unknown>>(
  zip: JSZip,
  folder: string,
  index: number,
  value: T
): Promise<PackedRecord<Record<string, unknown>>> {
  const record: Record<string, unknown> = {};
  const blobs: BlobReference[] = [];
  for (const [field, fieldValue] of Object.entries(value)) {
    if (fieldValue instanceof Blob) {
      const file = `${folder}/${index}-${field}.bin`;
      zip.file(file, fieldValue);
      blobs.push({ field, file, type: fieldValue.type || "application/octet-stream" });
    } else {
      record[field] = fieldValue;
    }
  }
  return { record, blobs };
}

async function unpackRecord<T>(zip: JSZip, packed: PackedRecord<Record<string, unknown>>): Promise<T> {
  const record = { ...packed.record };
  for (const blobRef of packed.blobs ?? []) {
    const entry = zip.file(blobRef.file);
    if (!entry) throw new Error(`Backup is missing ${blobRef.file}`);
    record[blobRef.field] = new Blob([await entry.async("arraybuffer")], { type: blobRef.type });
  }
  return record as T;
}

async function cardsForProjects(projectIds: string[]): Promise<CardOption[]> {
  const groups = await Promise.all(projectIds.map((id) => db.cards.where("projectId").equals(id).toArray()));
  return groups.flat();
}

function portableImage(image: Image): Record<string, unknown> {
  return {
    id: image.id,
    refCount: image.refCount,
    source: image.source,
    originalBlob: image.originalBlob,
    sourceUrl: image.sourceUrl,
    imageUrls: image.imageUrls,
    prints: image.prints,
  };
}

function portableCardback(cardback: Cardback): Record<string, unknown> {
  return {
    id: cardback.id,
    originalBlob: cardback.originalBlob,
    sourceUrl: cardback.sourceUrl,
    source: cardback.source,
    displayName: cardback.displayName,
    hasBuiltInBleed: cardback.hasBuiltInBleed,
    displayVersion: cardback.displayVersion,
    processedWithAaBlur: cardback.processedWithAaBlur,
    mpcSource: cardback.mpcSource,
    tags: cardback.tags,
  };
}

export async function createProjectBackup(projectIds: string[]): Promise<Blob> {
  const uniqueIds = [...new Set(projectIds)];
  const projects = (await db.projects.bulkGet(uniqueIds)).filter((project): project is Project => !!project);
  if (projects.length === 0) throw new Error("No projects selected for backup");

  const cards = await cardsForProjects(projects.map((project) => project.id));
  const imageIds = [...new Set(cards.flatMap((card) => card.imageId ? [card.imageId] : []))];
  const images = (await db.images.bulkGet(imageIds)).filter((image): image is Image => !!image);
  const userImages = (await db.user_images.bulkGet(imageIds)).filter((image): image is UserImage => !!image);

  const defaultCardbackIds = projects.flatMap((project) => {
    const settings = project.settings as Record<string, unknown> | null;
    return typeof settings?.defaultCardbackId === "string" ? [settings.defaultCardbackId] : [];
  });
  const cardbackIds = [...new Set([
    ...cards.flatMap((card) => card.source === ImageSource.Cardback && card.imageId ? [card.imageId] : []),
    ...defaultCardbackIds,
  ])];
  const cardbacks = (await db.cardbacks.bulkGet(cardbackIds)).filter((cardback): cardback is Cardback => !!cardback);

  const zip = new JSZip();
  const packedImages = await Promise.all(images.map((image, index) => packRecord(zip, "blobs/images", index, portableImage(image))));
  const packedUserImages = await Promise.all(userImages.map((image, index) => packRecord(zip, "blobs/uploads", index, image as unknown as Record<string, unknown>)));
  const packedCardbacks = await Promise.all(cardbacks.map((cardback, index) => packRecord(zip, "blobs/cardbacks", index, portableCardback(cardback))));

  const manifest: BackupManifest = {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    cards,
    images: packedImages,
    userImages: packedUserImages,
    cardbacks: packedCardbacks,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function downloadBackupBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportProjectBackup(projectIds: string[], label: string): Promise<void> {
  const blob = await createProjectBackup(projectIds);
  const date = new Date().toISOString().slice(0, 10);
  downloadBackupBlob(blob, `${safeFilename(label)}-${date}.proxxied-backup`);
}

function uniqueImportedName(name: string, existingNames: Set<string>): string {
  let candidate = `${name} (Imported)`;
  let suffix = 2;
  while (existingNames.has(candidate.toLowerCase())) candidate = `${name} (Imported ${suffix++})`;
  existingNames.add(candidate.toLowerCase());
  return candidate;
}

export function remapImportedProjects(
  projects: Project[],
  cards: CardOption[],
  existingProjectNames: string[]
): { projects: Project[]; cards: CardOption[]; projectIds: string[] } {
  const projectIdMap = new Map(projects.map((project) => [project.id, generateUUID()]));
  const cardIdMap = new Map(cards.map((card) => [card.uuid, generateUUID()]));
  const names = new Set(existingProjectNames.map((name) => name.toLowerCase()));

  const importedProjects = projects.map((project) => ({
    ...project,
    id: projectIdMap.get(project.id)!,
    name: uniqueImportedName(project.name, names),
    createdAt: Date.now(),
    lastOpenedAt: Date.now(),
    shareId: undefined,
    lastSharedAt: undefined,
    lastSyncedHash: undefined,
  }));
  const importedCards = cards
    .filter((card) => !!card.projectId && projectIdMap.has(card.projectId))
    .map((card) => ({
      ...card,
      uuid: cardIdMap.get(card.uuid)!,
      projectId: projectIdMap.get(card.projectId!)!,
      linkedFrontId: card.linkedFrontId ? cardIdMap.get(card.linkedFrontId) : undefined,
      linkedBackId: card.linkedBackId ? cardIdMap.get(card.linkedBackId) : undefined,
    }));

  return { projects: importedProjects, cards: importedCards, projectIds: importedProjects.map((project) => project.id) };
}

function fallbackImage(card: CardOption, refCount: number): Image | null {
  if (!card.imageId || card.source === ImageSource.Cardback || card.source === ImageSource.UploadLibrary) return null;
  const sourceUrl = card.source === ImageSource.MPC
    ? getMpcAutofillImageUrl(card.imageId)
    : card.imageId;
  return { id: card.imageId, refCount, source: card.source, sourceUrl, imageUrls: [sourceUrl] };
}

export async function importProjectBackup(file: File): Promise<ImportBackupResult> {
  const zip = await JSZip.loadAsync(file);
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) throw new Error("This is not a Proxxied project backup");
  const manifest = JSON.parse(await manifestEntry.async("text")) as BackupManifest;
  if (manifest.type !== BACKUP_TYPE || manifest.version !== BACKUP_VERSION || !Array.isArray(manifest.projects) || !Array.isArray(manifest.cards)) {
    throw new Error("Unsupported or invalid Proxxied project backup");
  }

  const existingProjects = await db.projects.toArray();
  const remapped = remapImportedProjects(manifest.projects, manifest.cards, existingProjects.map((project) => project.name));
  const [images, userImages, cardbacks] = await Promise.all([
    Promise.all((manifest.images ?? []).map((record) => unpackRecord<Image>(zip, record))),
    Promise.all((manifest.userImages ?? []).map((record) => unpackRecord<UserImage>(zip, record))),
    Promise.all((manifest.cardbacks ?? []).map((record) => unpackRecord<Cardback>(zip, record))),
  ]);

  const imageCounts = new Map<string, number>();
  for (const card of remapped.cards) {
    if (card.imageId) imageCounts.set(card.imageId, (imageCounts.get(card.imageId) ?? 0) + 1);
  }
  const imageMap = new Map(images.map((image) => [image.id, image]));
  for (const card of remapped.cards) {
    if (card.imageId && !imageMap.has(card.imageId)) {
      const fallback = fallbackImage(card, imageCounts.get(card.imageId) ?? 1);
      if (fallback) imageMap.set(fallback.id, fallback);
    }
  }

  await db.transaction("rw", db.projects, db.cards, db.images, db.user_images, db.cardbacks, async () => {
    await db.projects.bulkAdd(remapped.projects);
    await db.cards.bulkAdd(remapped.cards);
    if (userImages.length) await db.user_images.bulkPut(userImages);
    if (cardbacks.length) await db.cardbacks.bulkPut(cardbacks);
    for (const image of imageMap.values()) {
      const existing = await db.images.get(image.id);
      const importedRefs = imageCounts.get(image.id) ?? image.refCount ?? 1;
      await db.images.put({ ...image, refCount: (existing?.refCount ?? 0) + importedRefs });
    }
  });

  return { projectIds: remapped.projectIds, projectCount: remapped.projects.length, cardCount: remapped.cards.length };
}
