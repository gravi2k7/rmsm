ALTER TABLE "rdse_v2_runtime_states"
ADD COLUMN "htfPendingSwingType" TEXT,
ADD COLUMN "htfPendingSwingStartTime" TIMESTAMP(3),
ADD COLUMN "htfPendingSwingC1Open" DECIMAL,
ADD COLUMN "htfPendingSwingC1High" DECIMAL,
ADD COLUMN "htfPendingSwingC1Low" DECIMAL,
ADD COLUMN "ltfPendingSwingType" TEXT,
ADD COLUMN "ltfPendingSwingStartTime" TIMESTAMP(3),
ADD COLUMN "ltfPendingSwingC1Open" DECIMAL,
ADD COLUMN "ltfPendingSwingC1High" DECIMAL,
ADD COLUMN "ltfPendingSwingC1Low" DECIMAL;
