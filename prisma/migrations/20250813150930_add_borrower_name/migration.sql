-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('TOOL', 'MATERIAL') NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tools` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `condition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL DEFAULT 'GOOD',
    `totalQuantity` INTEGER NOT NULL DEFAULT 1,
    `availableQuantity` INTEGER NOT NULL DEFAULT 1,
    `location` VARCHAR(191) NULL,
    `supplier` VARCHAR(191) NULL,
    `purchaseDate` DATETIME(3) NULL,
    `purchasePrice` DECIMAL(10, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tools_categoryId_idx`(`categoryId`),
    INDEX `tools_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `currentQuantity` DECIMAL(10, 3) NOT NULL,
    `thresholdQuantity` DECIMAL(10, 3) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `supplier` VARCHAR(191) NULL,
    `unitPrice` DECIMAL(10, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `materials_categoryId_idx`(`categoryId`),
    INDEX `materials_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrowing_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `borrowerName` VARCHAR(191) NOT NULL,
    `borrowDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `returnDate` DATETIME(3) NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `borrowing_transactions_status_idx`(`status`),
    INDEX `borrowing_transactions_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrowing_items` (
    `id` VARCHAR(191) NOT NULL,
    `borrowingTransactionId` VARCHAR(191) NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `originalCondition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NOT NULL,
    `returnCondition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NULL,
    `returnDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `borrowing_items_borrowingTransactionId_idx`(`borrowingTransactionId`),
    INDEX `borrowing_items_toolId_idx`(`toolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consumption_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `consumerName` VARCHAR(191) NOT NULL,
    `consumptionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `purpose` VARCHAR(191) NOT NULL,
    `projectName` VARCHAR(191) NULL,
    `totalValue` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `consumption_transactions_consumptionDate_idx`(`consumptionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consumption_items` (
    `id` VARCHAR(191) NOT NULL,
    `consumptionTransactionId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `unitPrice` DECIMAL(10, 2) NULL,
    `totalValue` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `consumption_items_consumptionTransactionId_idx`(`consumptionTransactionId`),
    INDEX `consumption_items_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('TOOL', 'MATERIAL', 'BORROWING_TRANSACTION', 'CONSUMPTION_TRANSACTION', 'USER', 'CATEGORY') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'BORROW', 'RETURN', 'CONSUME', 'EXTEND') NOT NULL,
    `actorName` VARCHAR(191) NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `activity_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tools` ADD CONSTRAINT `tools_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `borrowing_items` ADD CONSTRAINT `borrowing_items_borrowingTransactionId_fkey` FOREIGN KEY (`borrowingTransactionId`) REFERENCES `borrowing_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `borrowing_items` ADD CONSTRAINT `borrowing_items_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consumption_items` ADD CONSTRAINT `consumption_items_consumptionTransactionId_fkey` FOREIGN KEY (`consumptionTransactionId`) REFERENCES `consumption_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consumption_items` ADD CONSTRAINT `consumption_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
