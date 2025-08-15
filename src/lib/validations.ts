import { z } from 'zod'

// Enums
export const ItemTypeSchema = z.enum(['TOOL', 'MATERIAL'])
export const ToolConditionSchema = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR'])
export const BorrowingStatusSchema = z.enum(['ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED'])

// Category Schemas
export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type: ItemTypeSchema,
  description: z.string().optional(),
})

export const UpdateCategorySchema = CreateCategorySchema.partial()

// Tool Schemas
export const CreateToolShape = {
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  categoryId: z.string().min(1, 'Category is required'),
  condition: ToolConditionSchema.default('GOOD'),
  totalQuantity: z.number().int().min(1, 'Total quantity must be at least 1'),
  availableQuantity: z.number().int().min(0, 'Available quantity cannot be negative'),
  location: z.string().optional(),
  supplier: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative').optional(),
  notes: z.string().optional(),
}

export const CreateToolSchema = z.object(CreateToolShape).refine(data => data.availableQuantity <= data.totalQuantity, {
  message: 'Available quantity cannot exceed total quantity',
  path: ['availableQuantity'],
})

export const UpdateToolSchema = z.object(CreateToolShape).partial()

// Material Schemas
export const CreateMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  categoryId: z.string().min(1, 'Category is required'),
  currentQuantity: z.number().min(0, 'Current quantity cannot be negative'),
  thresholdQuantity: z.number().min(0, 'Threshold quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required').max(20, 'Unit too long'),
  location: z.string().optional(),
  supplier: z.string().optional(),
  unitPrice: z.number().min(0, 'Unit price cannot be negative').optional(),
  notes: z.string().optional(),
})

export const UpdateMaterialSchema = CreateMaterialSchema.partial()

// User Schemas
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const UpdateUserSchema = CreateUserSchema.partial()

// Borrowing Schemas
export const CreateBorrowingSchema = z.object({
  borrowerName: z.string().min(1, 'Borrower name is required').max(100, 'Name too long'),
  dueDate: z.string().datetime('Invalid due date'),
  purpose: z.string().min(1, 'Purpose is required').max(500, 'Purpose too long'),
  notes: z.string().optional(),
  items: z.array(z.object({
    toolId: z.string().min(1, 'Tool ID is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  })).min(1, 'At least one item is required'),
})

export const ReturnBorrowingSchema = z.object({
  borrowingId: z.string().min(1, 'Borrowing ID is required'),
  items: z.array(z.object({
    borrowingItemId: z.string().min(1, 'Borrowing item ID is required'),
    returnCondition: ToolConditionSchema,
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional(),
})

export const ExtendBorrowingSchema = z.object({
  borrowingId: z.string().min(1, 'Borrowing ID is required'),
  newDueDate: z.string().datetime('Invalid due date'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
})

// Consumption Schemas
export const CreateConsumptionSchema = z.object({
  consumerName: z.string().min(1, 'Consumer name is required').max(100, 'Name too long'),
  purpose: z.string().min(1, 'Purpose is required').max(500, 'Purpose too long'),
  projectName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialId: z.string().min(1, 'Material ID is required'),
    quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
    unitPrice: z.number().min(0, 'Unit price cannot be negative').optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
})

// ... (hapus schema pencarian/pagination yang tidak didefinisikan)

// Response Types
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
export type CreateToolInput = z.infer<typeof CreateToolSchema>
export type UpdateToolInput = z.infer<typeof UpdateToolSchema>
export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>
export type UpdateMaterialInput = z.infer<typeof UpdateMaterialSchema>
export type CreateBorrowingInput = z.infer<typeof CreateBorrowingSchema>
export type ReturnBorrowingInput = z.infer<typeof ReturnBorrowingSchema>
export type ExtendBorrowingInput = z.infer<typeof ExtendBorrowingSchema>
export type CreateConsumptionInput = z.infer<typeof CreateConsumptionSchema>
// ... (hapus type SearchInput yang tidak didefinisikan)
