/*
  Warnings:

  - You are about to drop the column `password` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "account" ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "password";
