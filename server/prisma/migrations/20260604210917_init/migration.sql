-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('like', 'comment', 'follow', 'mention');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clerk_id" TEXT NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(60),
    "bio" TEXT,
    "avatar_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stamps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "framed_url" TEXT,
    "caption" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'private',
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "location_name" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stamp_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stamp_id" UUID NOT NULL,
    "tag" VARCHAR(40) NOT NULL,

    CONSTRAINT "stamp_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "cover_stamp_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_stamps" (
    "album_id" UUID NOT NULL,
    "stamp_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "album_stamps_pkey" PRIMARY KEY ("album_id","stamp_id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "likes" (
    "user_id" UUID NOT NULL,
    "stamp_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id","stamp_id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stamp_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "stamp_id" UUID,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "stamps_user_id_idx" ON "stamps"("user_id");

-- CreateIndex
CREATE INDEX "stamps_visibility_idx" ON "stamps"("visibility");

-- CreateIndex
CREATE INDEX "stamps_created_at_idx" ON "stamps"("created_at" DESC);

-- CreateIndex
CREATE INDEX "stamp_tags_stamp_id_idx" ON "stamp_tags"("stamp_id");

-- CreateIndex
CREATE INDEX "stamp_tags_tag_idx" ON "stamp_tags"("tag");

-- CreateIndex
CREATE INDEX "albums_user_id_idx" ON "albums"("user_id");

-- CreateIndex
CREATE INDEX "comments_stamp_id_idx" ON "comments"("stamp_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_idx" ON "notifications"("recipient_id", "read");

-- AddForeignKey
ALTER TABLE "stamps" ADD CONSTRAINT "stamps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_tags" ADD CONSTRAINT "stamp_tags_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_stamps" ADD CONSTRAINT "album_stamps_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_stamps" ADD CONSTRAINT "album_stamps_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
