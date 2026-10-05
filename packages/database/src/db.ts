import postgres from "@prisma/orm-postgres/runtime";

import "temporal-polyfill/global";

import type { Contract } from "./generated/contract.d.ts";
import contractJson from "./generated/contract.json" with { type: "json" };

export const db = process.env.DATABASE_URL
  ? postgres<Contract>({ contractJson, url: process.env.DATABASE_URL })
  : postgres<Contract>({ contractJson });

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  connection ??= db
    .connect()
    .then(() => undefined)
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}
