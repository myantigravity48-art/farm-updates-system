/**
 * Hand-written database types mirroring supabase/migrations/0001_schema.sql.
 * Regenerate with `npx supabase gen types typescript` once the CLI is set up.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      season_windows: {
        Row: {
          key: "dry_season" | "planting";
          start_month: number;
          start_day: number;
          end_month: number;
          end_day: number;
        };
        Insert: {
          key: "dry_season" | "planting";
          start_month: number;
          start_day: number;
          end_month: number;
          end_day: number;
        };
        Update: {
          key?: "dry_season" | "planting";
          start_month?: number;
          start_day?: number;
          end_month?: number;
          end_day?: number;
        };
      };
      stage_templates: {
        Row: {
          id: string;
          position: number;
          name: string;
          trigger_type: "season_window" | "after_planting";
          offset_months: number | null;
          window_key: string | null;
        };
        Insert: {
          id?: string;
          position: number;
          name: string;
          trigger_type: "season_window" | "after_planting";
          offset_months?: number | null;
          window_key?: string | null;
        };
        Update: {
          id?: string;
          position?: number;
          name?: string;
          trigger_type?: "season_window" | "after_planting";
          offset_months?: number | null;
          window_key?: string | null;
        };
      };
      farms: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          size_value: number | null;
          size_unit: string | null;
          planting_date: string | null;
          schedule_anchor_date: string;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          size_value?: number | null;
          size_unit?: string | null;
          planting_date?: string | null;
          schedule_anchor_date?: string;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          size_value?: number | null;
          size_unit?: string | null;
          planting_date?: string | null;
          schedule_anchor_date?: string;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
      farm_stages: {
        Row: {
          id: string;
          farm_id: string;
          template_id: string;
          is_done: boolean;
          done_date: string | null;
          done_by: string | null;
          done_note: string | null;
          due_date_override: string | null;
        };
        Insert: {
          id?: string;
          farm_id: string;
          template_id: string;
          is_done?: boolean;
          done_date?: string | null;
          done_by?: string | null;
          done_note?: string | null;
          due_date_override?: string | null;
        };
        Update: {
          id?: string;
          farm_id?: string;
          template_id?: string;
          is_done?: boolean;
          done_date?: string | null;
          done_by?: string | null;
          done_note?: string | null;
          due_date_override?: string | null;
        };
      };
      notes: {
        Row: {
          id: string;
          farm_id: string;
          farm_stage_id: string | null;
          body: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          farm_stage_id?: string | null;
          body: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          farm_stage_id?: string | null;
          body?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          farm_id: string;
          farm_stage_id: string | null;
          storage_path: string;
          caption: string | null;
          taken_on: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          farm_stage_id?: string | null;
          storage_path: string;
          caption?: string | null;
          taken_on?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          farm_stage_id?: string | null;
          storage_path?: string;
          caption?: string | null;
          taken_on?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      recipients: {
        Row: {
          id: string;
          name: string;
          email: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          enabled?: boolean;
        };
      };
      alert_settings: {
        Row: {
          id: boolean;
          heads_up_days: number;
          reminder_days: number;
          overdue_enabled: boolean;
          overdue_repeat_days: number;
          send_hour_london: number;
        };
        Insert: {
          id?: boolean;
          heads_up_days?: number;
          reminder_days?: number;
          overdue_enabled?: boolean;
          overdue_repeat_days?: number;
          send_hour_london?: number;
        };
        Update: {
          id?: boolean;
          heads_up_days?: number;
          reminder_days?: number;
          overdue_enabled?: boolean;
          overdue_repeat_days?: number;
          send_hour_london?: number;
        };
      };
      notification_log: {
        Row: {
          id: string;
          farm_stage_id: string;
          recipient_id: string;
          alert_type: "heads_up" | "reminder" | "overdue" | "done_notice";
          occurrence_key: string;
          status: "sent" | "failed";
          provider_message_id: string | null;
          error: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          farm_stage_id: string;
          recipient_id: string;
          alert_type: "heads_up" | "reminder" | "overdue" | "done_notice";
          occurrence_key: string;
          status: "sent" | "failed";
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          farm_stage_id?: string;
          recipient_id?: string;
          alert_type?: "heads_up" | "reminder" | "overdue" | "done_notice";
          occurrence_key?: string;
          status?: "sent" | "failed";
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
