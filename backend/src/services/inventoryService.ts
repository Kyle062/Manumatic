import * as partModel from "../models/partModel";
import { Part, CreatePartBody, UpdatePartBody } from "../types";

// ============================================================
// GET ALL PARTS
// ============================================================

export const getAllParts = async (): Promise<Part[]> => {
  return partModel.findAll();
};

// ============================================================
// GET PART BY ID
// ============================================================

export const getPartById = async (id: number): Promise<Part> => {
  const part = await partModel.findById(id);

  if (!part) {
    throw { status: 404, message: "Part not found." };
  }

  return part;
};

// ============================================================
// CREATE PART
// ============================================================

export const createPart = async (
  body: CreatePartBody
): Promise<{ part_id: number }> => {
  // ---- Validate required fields ----
  const part_number = body.part_number?.trim();
  const name = body.name?.trim();
  const category = body.category?.trim();

  if (!part_number) {
    throw { status: 400, message: "Part number is required." };
  }
  if (!name) {
    throw { status: 400, message: "Name is required." };
  }
  if (!category) {
    throw { status: 400, message: "Category is required." };
  }

  // ---- Validate numeric fields ----
  const price = Number(body.price);
  if (isNaN(price) || price < 0) {
    throw { status: 400, message: "Price must be a positive number." };
  }

  const reorder_level = Number(body.reorder_level ?? 10);
  if (isNaN(reorder_level) || reorder_level < 0) {
    throw { status: 400, message: "Reorder level must be a positive number." };
  }

  const quantity = Number(body.quantity ?? 0);
  if (isNaN(quantity) || quantity < 0) {
    throw { status: 400, message: "Quantity must be a positive number." };
  }

  // ---- Check for duplicate part_number ----
  const existing = await partModel.findByPartNumber(part_number);
  if (existing) {
    throw { status: 400, message: "Part number already exists." };
  }

  // ---- Insert ----
  const part_id = await partModel.create({
    part_number,
    name,
    category,
    description: body.description?.trim() || null,
    price,
    reorder_level,
    quantity,
    location: body.location?.trim() || null,
    image: body.image || null
  });

  return { part_id };
};

// ============================================================
// UPDATE PART
// ============================================================

export const updatePart = async (
  id: number,
  body: UpdatePartBody
): Promise<void> => {
  // ---- Check if part exists ----
  const current = await partModel.findById(id);
  if (!current) {
    throw { status: 404, message: "Part not found." };
  }

  // ---- Merge with existing values ----
  const part_number = body.part_number?.trim() ?? current.part_number;
  const name = body.name?.trim() ?? current.name;
  const category = body.category?.trim() ?? current.category;
  const description =
    body.description !== undefined
      ? body.description?.trim() || null
      : current.description;

  const price =
    body.price !== undefined ? Number(body.price) : current.price;
  if (isNaN(price) || price < 0) {
    throw { status: 400, message: "Price must be a positive number." };
  }

  const reorder_level =
    body.reorder_level !== undefined
      ? Number(body.reorder_level)
      : current.reorder_level;
  if (isNaN(reorder_level) || reorder_level < 0) {
    throw { status: 400, message: "Reorder level must be a positive number." };
  }

  const quantity =
    body.quantity !== undefined ? Number(body.quantity) : current.quantity;
  if (isNaN(quantity) || quantity < 0) {
    throw { status: 400, message: "Quantity must be a positive number." };
  }

  const location =
    body.location !== undefined
      ? body.location?.trim() || null
      : current.location;

  const image = body.image !== undefined ? body.image : current.image;

  // ---- Check duplicate part_number (if changed) ----
  if (part_number !== current.part_number) {
    const duplicate = await partModel.findByPartNumber(part_number);
    if (duplicate) {
      throw { status: 400, message: "Part number already exists." };
    }
  }

  // ---- Update ----
  await partModel.update({
    part_id: id,
    part_number,
    name,
    category,
    description,
    price,
    reorder_level,
    quantity,
    location,
    image
  });
};

// ============================================================
// DELETE PART
// ============================================================

export const deletePart = async (id: number): Promise<void> => {
  const affected = await partModel.remove(id);

  if (affected === 0) {
    throw { status: 404, message: "Part not found." };
  }
};

// ============================================================
// SEARCH PARTS
// ============================================================

export const searchParts = async (
  q?: string,
  category?: string
): Promise<Part[]> => {
  return partModel.search(q, category);
};

// ============================================================
// GET LOW STOCK PARTS
// ============================================================

export const getLowStockParts = async (): Promise<Part[]> => {
  return partModel.findLowStock();
};

// ============================================================
// ADJUST STOCK (no logging)
// ============================================================

export interface AdjustStockBody {
  part_id: number;
  type: "in" | "out";
  quantity: number;
  reason?: string;
  notes?: string;
}

export const adjustStock = async (
  body: AdjustStockBody
): Promise<{ old_quantity: number; new_quantity: number }> => {
  // ---- Validate ----
  if (!body.part_id || isNaN(body.part_id)) {
    throw { status: 400, message: "Valid part ID is required." };
  }

  if (body.type !== "in" && body.type !== "out") {
    throw { status: 400, message: "Type must be 'in' or 'out'." };
  }

  const qty = Number(body.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw { status: 400, message: "Quantity must be a positive number." };
  }

  // ---- Fetch part ----
  const part = await partModel.findById(body.part_id);
  if (!part) {
    throw { status: 404, message: "Part not found." };
  }

  const oldQty = part.quantity;
  let newQty: number;

  if (body.type === "in") {
    newQty = oldQty + qty;
  } else {
    if (qty > oldQty) {
      throw {
        status: 400,
        message: `Cannot remove ${qty} units. Only ${oldQty} in stock.`
      };
    }
    newQty = oldQty - qty;
  }

  // ---- Update parts.quantity ----
  await partModel.update({
    part_id: part.part_id,
    part_number: part.part_number,
    name: part.name,
    category: part.category,
    description: part.description,
    price: part.price,
    reorder_level: part.reorder_level,
    quantity: newQty,
    location: part.location,
    image: part.image
  });

  return { old_quantity: oldQty, new_quantity: newQty };
};