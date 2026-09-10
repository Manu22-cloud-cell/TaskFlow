ALTER TABLE "Task" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked_tasks AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "projectId", "status"
            ORDER BY "createdAt", "id"
        ) - 1 AS "position"
    FROM "Task"
)
UPDATE "Task"
SET "position" = ranked_tasks."position"
FROM ranked_tasks
WHERE "Task"."id" = ranked_tasks."id";

CREATE INDEX "Task_projectId_status_position_idx"
ON "Task"("projectId", "status", "position");
