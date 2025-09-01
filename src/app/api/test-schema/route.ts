import { CreateToolSchema, UpdateToolSchema } from '@/lib/validations'
import { successResponse, errorResponse } from '@/lib/api-utils'

// GET /api/test-schema - Test schema validation
export async function GET() {
  try {
    // Test if schemas are working
    const testData = {
      name: 'Test Tool',
      categoryId: 'test-category-id',
      condition: 'GOOD' as const,
      totalQuantity: 10,
      availableQuantity: 8,
      location: 'Test Location'
    }

    // Test CreateToolSchema
    const createResult = CreateToolSchema.safeParse(testData)
    if (!createResult.success) {
      return errorResponse(`CreateToolSchema validation failed: ${createResult.error.message}`, 400)
    }

    // Test UpdateToolSchema
    const updateResult = UpdateToolSchema.safeParse({ name: 'Updated Tool' })
    if (!updateResult.success) {
      return errorResponse(`UpdateToolSchema validation failed: ${updateResult.error.message}`, 400)
    }

    return successResponse({
      message: 'Schema validation working correctly',
      createSchema: 'OK',
      updateSchema: 'OK'
    })
  } catch (error) {
    console.error('Schema test error:', error)
    return errorResponse(`Schema test failed: ${error}`, 500)
  }
}
