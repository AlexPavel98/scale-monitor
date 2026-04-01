/**
 * Broadcasts live weight readings to Supabase so web clients can see
 * the scale in real-time without being on the factory PC.
 *
 * Uses upsert on scale_live_weight (one row per org).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BROADCAST_INTERVAL = 1000; // ms — push every 1s
const OFFLINE_TIMEOUT = 10000; // ms — mark disconnected after 10s of no weight

export class WeightBroadcaster {
  private supabase: SupabaseClient | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private organizationId: string;
  private lastWeight = 0;
  private lastStable = false;
  private lastConnected = false;
  private lastWeightTime = 0;
  private dirty = false; // only push when something changed

  constructor(supabaseUrl: string, supabaseKey: string, organizationId: string) {
    this.organizationId = organizationId;
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /** Call this on every weight reading from the serial port */
  updateWeight(weight: number, stable: boolean): void {
    if (weight !== this.lastWeight || stable !== this.lastStable || !this.lastConnected) {
      this.dirty = true;
    }
    this.lastWeight = weight;
    this.lastStable = stable;
    this.lastConnected = true;
    this.lastWeightTime = Date.now();
  }

  /** Call this when serial port disconnects */
  setDisconnected(): void {
    if (this.lastConnected) {
      this.lastConnected = false;
      this.dirty = true;
    }
  }

  /** Start periodic broadcasting */
  start(): void {
    if (this.timer || !this.supabase) return;

    this.timer = setInterval(() => {
      // Mark disconnected if no weight update for a while
      if (this.lastConnected && Date.now() - this.lastWeightTime > OFFLINE_TIMEOUT) {
        this.lastConnected = false;
        this.dirty = true;
      }

      if (!this.dirty) return;
      this.dirty = false;
      this.push();
    }, BROADCAST_INTERVAL);

    console.log("[WeightBroadcaster] Started broadcasting");
  }

  /** Stop broadcasting */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Push final disconnected state
    this.lastConnected = false;
    this.push();
    console.log("[WeightBroadcaster] Stopped broadcasting");
  }

  private async push(): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from("scale_live_weight").upsert(
        {
          organization_id: this.organizationId,
          weight_kg: this.lastWeight,
          stable: this.lastStable,
          connected: this.lastConnected,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" }
      );
    } catch (err) {
      // Silently ignore — don't crash the app for broadcast failures
      console.error("[WeightBroadcaster] Push failed:", err);
    }
  }
}
