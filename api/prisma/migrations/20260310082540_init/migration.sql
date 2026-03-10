-- CreateTable
CREATE TABLE "deposit_commitments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "commitment" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "deposit_amount" DECIMAL NOT NULL,
    "yield_amount" DECIMAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "proof_validated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "deposit_commitments_commitment_key" ON "deposit_commitments"("commitment");
