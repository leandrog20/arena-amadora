-- Renomear tabelas de Team para Clan
ALTER TABLE "team_members" RENAME TO "clan_members";
ALTER TABLE "teams" RENAME TO "clans";

-- Renomear colunas referenciando teams
ALTER TABLE "clan_members" RENAME COLUMN "team_id" TO "clan_id";
ALTER TABLE "participants" RENAME COLUMN "team_id" TO "clan_id";

-- Adicionar campos à tabela clans
ALTER TABLE "clans" ADD COLUMN "status" VARCHAR(255) DEFAULT 'ACTIVE';
ALTER TABLE "clans" ADD COLUMN "co_leader_id" VARCHAR(255);

-- Adicionar clanId à tabela chat_messages e tornar tournamentId opcional
ALTER TABLE "chat_messages" ADD COLUMN "clan_id" VARCHAR(255);
ALTER TABLE "chat_messages" ALTER COLUMN "tournament_id" DROP NOT NULL;

-- Adicionar índices
CREATE INDEX "chat_messages_clan_id_created_at_idx" ON "chat_messages"("clan_id", "created_at");

-- Adicionar foreign keys
ALTER TABLE "clans" ADD CONSTRAINT "clans_co_leader_id_fkey" FOREIGN KEY ("co_leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_clan_id_fkey" FOREIGN KEY ("clan_id") REFERENCES "clans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Renomear índices de team_members para clan_members
ALTER INDEX "team_members_team_id_user_id_key" RENAME TO "clan_members_clan_id_user_id_key";
