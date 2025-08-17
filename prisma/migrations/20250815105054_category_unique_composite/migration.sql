/*
  Warnings:

  - A unique constraint covering the columns `[name,type]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `categories_name_key` ON `categories`;

-- CreateIndex
CREATE UNIQUE INDEX `categories_name_type_key` ON `categories`(`name`, `type`);
