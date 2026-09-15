import type { D1Like } from "../../lib/db/client";
export async function getNotificationSubscriptionCount(db:D1Like){return db.prepare(`SELECT COUNT(*) AS count FROM notification_subscriptions WHERE status='ACTIVE'`).first<{count:number}>();}
