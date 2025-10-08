-- CreateTable
CREATE TABLE "GeminiRequest" (
    "id" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT,
    "emailHtml" TEXT,
    "model" TEXT,
    "usage" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "fileProcessed" BOOLEAN NOT NULL DEFAULT false,
    "filesProcessed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "GeminiRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GeminiRequest" ADD CONSTRAINT "GeminiRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

