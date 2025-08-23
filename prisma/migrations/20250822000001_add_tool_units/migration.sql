-- CreateTable
CREATE TABLE `tool_units` (
    `id` VARCHAR(191) NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `unitNumber` INTEGER NOT NULL,
    `condition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL DEFAULT 'GOOD',
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tool_units_toolId_unitNumber_key`(`toolId`, `unitNumber`),
    INDEX `tool_units_toolId_idx`(`toolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrowing_item_units` (
    `id` VARCHAR(191) NOT NULL,
    `borrowingItemId` VARCHAR(191) NOT NULL,
    `toolUnitId` VARCHAR(191) NOT NULL,
    `condition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL,
    `returnCondition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `borrowing_item_units_borrowingItemId_idx`(`borrowingItemId`),
    INDEX `borrowing_item_units_toolUnitId_idx`(`toolUnitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tool_units` ADD CONSTRAINT `tool_units_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `borrowing_item_units` ADD CONSTRAINT `borrowing_item_units_borrowingItemId_fkey` FOREIGN KEY (`borrowingItemId`) REFERENCES `borrowing_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `borrowing_item_units` ADD CONSTRAINT `borrowing_item_units_toolUnitId_fkey` FOREIGN KEY (`toolUnitId`) REFERENCES `tool_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Modify Tool table to remove condition field (will be tracked per unit)
ALTER TABLE `tools` DROP COLUMN `condition`;
