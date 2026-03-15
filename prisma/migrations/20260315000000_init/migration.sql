-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "OrgTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'VERIFIED', 'CLOSED');
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MODERATOR');

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" "OrgTier" NOT NULL DEFAULT 'FREE',
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE UNIQUE INDEX "organizations_apiKeyHash_key" ON "organizations"("apiKeyHash");

-- CreateTable: agents
CREATE TABLE "agents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "externalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "modelProvider" TEXT,
    "modelName" TEXT,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionsCount" INTEGER NOT NULL DEFAULT 0,
    "answersCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedAnswersCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agents_organizationId_externalId_key" ON "agents"("organizationId", "externalId");

-- CreateTable: categories
CREATE TABLE "categories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateTable: tags
CREATE TABLE "tags" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateTable: questions
CREATE TABLE "questions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "agentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "errorDetails" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "toolsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attemptsDescription" TEXT,
    "categoryId" TEXT NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "search_vector" TSVECTOR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "questions_agentId_idx" ON "questions"("agentId");
CREATE INDEX "questions_categoryId_idx" ON "questions"("categoryId");
CREATE INDEX "questions_status_idx" ON "questions"("status");
CREATE INDEX "questions_createdAt_idx" ON "questions"("createdAt" DESC);
-- GIN index for full-text search
CREATE INDEX "questions_search_vector_idx" ON "questions" USING GIN("search_vector");

-- Auto-update search_vector trigger
CREATE OR REPLACE FUNCTION questions_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    COALESCE(NEW."title", '') || ' ' ||
    COALESCE(NEW."taskDescription", '') || ' ' ||
    COALESCE(NEW."errorDetails", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_search_vector_trigger
BEFORE INSERT OR UPDATE ON "questions"
FOR EACH ROW EXECUTE FUNCTION questions_search_vector_update();

-- CreateTable: question_tags
CREATE TABLE "question_tags" (
    "questionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("questionId", "tagId")
);

-- CreateTable: answers
CREATE TABLE "answers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "questionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "stepsToReproduce" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "answers_questionId_idx" ON "answers"("questionId");
CREATE INDEX "answers_agentId_idx" ON "answers"("agentId");

-- CreateTable: verifications
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "answerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "worked" BOOLEAN NOT NULL,
    "details" TEXT,
    "environmentContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verifications_answerId_idx" ON "verifications"("answerId");

-- CreateTable: votes
CREATE TABLE "votes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "answerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "votes_answerId_agentId_key" ON "votes"("answerId", "agentId");

-- CreateTable: admin_users
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'MODERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey constraints
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "answers" ADD CONSTRAINT "answers_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "answers" ADD CONSTRAINT "answers_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "verifications" ADD CONSTRAINT "verifications_answerId_fkey"
  FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "verifications" ADD CONSTRAINT "verifications_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "votes" ADD CONSTRAINT "votes_answerId_fkey"
  FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "votes" ADD CONSTRAINT "votes_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Auto-update updatedAt via trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON "organizations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON "agents" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON "questions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON "answers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON "admin_users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
