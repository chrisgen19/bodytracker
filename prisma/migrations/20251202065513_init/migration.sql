-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "details" TEXT,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entries_date_idx" ON "entries"("date");

-- CreateIndex
CREATE INDEX "entries_type_idx" ON "entries"("type");
