import { pgEnum } from "drizzle-orm/pg-core";

export const playerStatusEnum = pgEnum("player_status", [
  "active",
  "retired",
  "deceased",
]);

export const stintTypeEnum = pgEnum("stint_type", [
  "standard",
  "two_way",
  "assignment",
  "loan",
]);
