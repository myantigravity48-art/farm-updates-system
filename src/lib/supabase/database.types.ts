/**
 * Hand-written database types mirroring migrations 0001, 0002, 0004, 0005, 0006, 0007, 0009 and 0010.
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
          updated_at: string | null;
          updated_by_name: string | null;
        };
        Insert: {
          key: "dry_season" | "planting";
          start_month: number;
          start_day: number;
          end_month: number;
          end_day: number;
          updated_at?: string | null;
          updated_by_name?: string | null;
        };
        Update: {
          key?: "dry_season" | "planting";
          start_month?: number;
          start_day?: number;
          end_month?: number;
          end_day?: number;
          updated_at?: string | null;
          updated_by_name?: string | null;
        };
        Relationships: [];
      };
      stage_templates: {
        Row: {
          id: string;
          position: number;
          name: string;
          trigger_type: "season_window" | "after_planting" | "after_stage_done";
          offset_months: number | null;
          window_key: string | null;
          anchor_window_key: string | null;
          offset_days: number | null;
          updated_at: string | null;
          updated_by_name: string | null;
        };
        Insert: {
          id?: string;
          position: number;
          name: string;
          trigger_type: "season_window" | "after_planting" | "after_stage_done";
          offset_months?: number | null;
          window_key?: string | null;
          anchor_window_key?: string | null;
          offset_days?: number | null;
          updated_at?: string | null;
          updated_by_name?: string | null;
        };
        Update: {
          id?: string;
          position?: number;
          name?: string;
          trigger_type?: "season_window" | "after_planting" | "after_stage_done";
          offset_months?: number | null;
          window_key?: string | null;
          anchor_window_key?: string | null;
          offset_days?: number | null;
          updated_at?: string | null;
          updated_by_name?: string | null;
        };
        Relationships: [];
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
        Relationships: [];
      };
      farm_stages: {
        Row: {
          id: string;
          farm_id: string;
          template_id: string;
          is_done: boolean;
          done_date: string | null;
          done_by: string | null;
          done_by_name: string | null;
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
          done_by_name?: string | null;
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
          done_by_name?: string | null;
          done_note?: string | null;
          due_date_override?: string | null;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          farm_id: string;
          farm_stage_id: string | null;
          body: string;
          author_name: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          farm_id: string;
          farm_stage_id?: string | null;
          body: string;
          author_name?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: string;
          farm_stage_id?: string | null;
          body?: string;
          author_name?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          farm_id: string;
          farm_stage_id: string | null;
          storage_path: string;
          caption: string | null;
          taken_on: string | null;
          author_name: string | null;
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
          author_name?: string | null;
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
          author_name?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recipients: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          enabled?: boolean;
        };
        Relationships: [];
      };
      alert_settings: {
        Row: {
          id: boolean;
          heads_up_days: number;
          reminder_days: number;
          overdue_enabled: boolean;
          overdue_repeat_days: number;
          window_nudge_days: number;
          send_hour_london: number;
        };
        Insert: {
          id?: boolean;
          heads_up_days?: number;
          reminder_days?: number;
          overdue_enabled?: boolean;
          overdue_repeat_days?: number;
          window_nudge_days?: number;
          send_hour_london?: number;
        };
        Update: {
          id?: boolean;
          heads_up_days?: number;
          reminder_days?: number;
          overdue_enabled?: boolean;
          overdue_repeat_days?: number;
          window_nudge_days?: number;
          send_hour_london?: number;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          farm_stage_id: string;
          recipient_id: string;
          alert_type: "heads_up" | "reminder" | "overdue" | "window_open" | "done_notice";
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
          alert_type: "heads_up" | "reminder" | "overdue" | "window_open" | "done_notice";
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
          alert_type?: "heads_up" | "reminder" | "overdue" | "window_open" | "done_notice";
          occurrence_key?: string;
          status?: "sent" | "failed";
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_farm: {
        Args: {
          p_name: string;
          p_location: string | null;
          p_size_value: number | null;
          p_size_unit: string | null;
          p_notes: string | null;
          p_current_position: number;
          p_planting_date: string | null;
          p_anchor_date: string;
        };
        Returns: string;
      };
      create_farms_bulk: {
        Args: {
          p_rows: Json;
          p_anchor_date: string;
        };
        Returns: number;
      };
      mark_stage_done: {
        Args: {
          p_farm_stage_id: string;
          p_done_date: string;
          p_note: string | null;
          p_done_by_name: string | null;
          p_today: string;
        };
        Returns: undefined;
      };
      undo_stage_done: {
        Args: { p_farm_stage_id: string };
        Returns: undefined;
      };
      set_planting_date: {
        Args: { p_farm_id: string; p_date: string; p_today: string };
        Returns: undefined;
      };
      set_stage_due_override: {
        Args: { p_farm_stage_id: string; p_date: string | null };
        Returns: undefined;
      };
      save_lifecycle: {
        Args: { p_stages: Json; p_windows: Json; p_updated_by_name: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
