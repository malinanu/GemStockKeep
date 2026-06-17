import { z } from 'zod';

export const RequestOtpSchema = z.object({
  phone: z.string().min(7).max(20),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6).regex(/^\d+$/),
});

export const CreateVendorSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const CreateLookupSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateSettingsSchema = z.object({
  id_prefix: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/).optional(),
});

export const CreateGemSchema = z.object({
  stone_type_id: z.number().int().positive(),
  weight: z.string().regex(/^\d+(\.\d{1,3})?$/),
  shape_id: z.number().int().positive(),
  purchasing_price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  bought_from_vendor_id: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
});

export const UpdateGemSchema = z.object({
  stone_type_id: z.number().int().positive().optional(),
  weight: z.string().regex(/^\d+(\.\d{1,3})?$/).optional(),
  shape_id: z.number().int().positive().optional(),
  purchasing_price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  bought_from_vendor_id: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const AssignSchema = z.object({
  vendorId: z.number().int().positive(),
  askingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const ReassignSchema = AssignSchema;

export const SellSchema = z.object({
  soldPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const ResolveQrSchema = z.object({
  qr: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name:  z.string().min(1).max(100),
});

export const GemsFilterSchema = z.object({
  status: z.enum(['IN_STOCK', 'WITH_VENDOR', 'SOLD', 'RETURNED', 'ALL']).optional(),
  vendor_id: z.coerce.number().int().positive().optional(),
  stone_type_id: z.coerce.number().int().positive().optional(),
  search: z.string().max(50).optional(),
});
