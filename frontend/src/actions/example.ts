/**
 * Example Server Actions — wrappers over DAL for use from client hooks.
 */
"use server";

import { z } from "zod";
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  type Item,
} from "@/lib/dal/example";
import { withAuth } from "@/lib/action-utils";

const paginationSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

const itemIdSchema = z.string().min(1);

const createItemSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const updateItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export async function fetchItems(offset = 0, limit = 20): Promise<Item[]> {
  const input = paginationSchema.parse({ offset, limit });
  return withAuth(() => getItems(input.offset, input.limit));
}

export async function fetchItem(id: string): Promise<Item> {
  const validId = itemIdSchema.parse(id);
  return withAuth(() => getItem(validId));
}

export async function addNewItem(data: {
  title: string;
  description?: string;
}): Promise<Item> {
  const input = createItemSchema.parse(data);
  return withAuth(() => createItem(input));
}

export async function addItem(formData: FormData): Promise<Item> {
  const input = createItemSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  return withAuth(() => createItem(input));
}

export async function editItem(
  id: string,
  data: { title?: string; description?: string },
): Promise<Item> {
  const validId = itemIdSchema.parse(id);
  const input = updateItemSchema.parse(data);
  return withAuth(() => updateItem(validId, input));
}

export async function removeItem(id: string): Promise<void> {
  const validId = itemIdSchema.parse(id);
  return withAuth(() => deleteItem(validId));
}
