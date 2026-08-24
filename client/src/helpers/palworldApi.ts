import { apiUrl } from "@/constants";
import type { ScryfallCard } from "../../../shared/types";

export async function searchPalworldCards(
  name: string,
  signal?: AbortSignal
): Promise<ScryfallCard[]> {
  const response = await fetch(
    apiUrl(`/api/palworld/search?name=${encodeURIComponent(name.trim())}`),
    { signal }
  );
  if (!response.ok) throw new Error("Failed to search the local Palworld collection");
  const payload = await response.json() as { data?: ScryfallCard[] };
  return payload.data ?? [];
}
