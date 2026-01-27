export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_job_appointments: {
        Row: {
          assignee: string
          assignee_email: string | null
          created_at: string
          end_at: string
          google_calendar_id: string | null
          google_event_id: string | null
          google_sync_error: string | null
          google_sync_status: string
          id: string
          job_id: string
          kind: string
          notes: string | null
          service_kinds: string[] | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          assignee?: string
          assignee_email?: string | null
          created_at?: string
          end_at: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          id?: string
          job_id: string
          kind?: string
          notes?: string | null
          service_kinds?: string[] | null
          start_at: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          assignee?: string
          assignee_email?: string | null
          created_at?: string
          end_at?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          id?: string
          job_id?: string
          kind?: string
          notes?: string | null
          service_kinds?: string[] | null
          start_at?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_job_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      admin_job_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          job_id: string
          name: string | null
          notes: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          job_id: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          job_id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      admin_job_existing_systems: {
        Row: {
          cooking_fuel: string
          cooling: string
          created_at: string
          dryer_fuel: string
          job_id: string
          space_heating: string
          water_heating: string
        }
        Insert: {
          cooking_fuel?: string
          cooling?: string
          created_at?: string
          dryer_fuel?: string
          job_id: string
          space_heating?: string
          water_heating?: string
        }
        Update: {
          cooking_fuel?: string
          cooling?: string
          created_at?: string
          dryer_fuel?: string
          job_id?: string
          space_heating?: string
          water_heating?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_job_existing_systems_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_existing_systems_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_existing_systems_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_existing_systems_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      admin_job_files: {
        Row: {
          bucket: string
          category: string
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          filename: string
          id: string
          job_id: string
          kind: string
          meta: Json
          mime_type: string | null
          note: string | null
          original_filename: string | null
          path: string
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string
          utility_row_id: string | null
        }
        Insert: {
          bucket?: string
          category?: string
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          job_id: string
          kind?: string
          meta?: Json
          mime_type?: string | null
          note?: string | null
          original_filename?: string | null
          path?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string
          utility_row_id?: string | null
        }
        Update: {
          bucket?: string
          category?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          job_id?: string
          kind?: string
          meta?: Json
          mime_type?: string | null
          note?: string | null
          original_filename?: string | null
          path?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string
          utility_row_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "admin_job_files_utility_row_id_fkey"
            columns: ["utility_row_id"]
            isOneToOne: false
            referencedRelation: "admin_job_utilities"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_job_requests: {
        Row: {
          created_at: string
          id: string
          job_id: string
          request_key: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          request_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          request_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_job_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      admin_job_utilities: {
        Row: {
          bill_amount: number | null
          computed_at: string | null
          confidence: string
          created_at: string
          estimated_usage_kwh: number | null
          estimated_usage_therms: number | null
          id: string
          input_type: string
          job_id: string
          period: string
          rate_assumption_id: string | null
          season: string
          usage_gallons: number | null
          usage_kwh: number | null
          usage_therms: number | null
          utility_name: string | null
          utility_type: string
        }
        Insert: {
          bill_amount?: number | null
          computed_at?: string | null
          confidence?: string
          created_at?: string
          estimated_usage_kwh?: number | null
          estimated_usage_therms?: number | null
          id?: string
          input_type?: string
          job_id: string
          period?: string
          rate_assumption_id?: string | null
          season?: string
          usage_gallons?: number | null
          usage_kwh?: number | null
          usage_therms?: number | null
          utility_name?: string | null
          utility_type: string
        }
        Update: {
          bill_amount?: number | null
          computed_at?: string | null
          confidence?: string
          created_at?: string
          estimated_usage_kwh?: number | null
          estimated_usage_therms?: number | null
          id?: string
          input_type?: string
          job_id?: string
          period?: string
          rate_assumption_id?: string | null
          season?: string
          usage_gallons?: number | null
          usage_kwh?: number | null
          usage_therms?: number | null
          utility_name?: string | null
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_job_utilities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_utilities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_utilities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_job_utilities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      admin_jobs: {
        Row: {
          address1: string | null
          address2: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          confirmation_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_type: string | null
          id: string
          inspection_status: string | null
          intake_payload: Json | null
          intake_progress: Json | null
          intake_source: string | null
          intake_stage: string | null
          is_archived: boolean
          notes: string | null
          requested_outputs: string[] | null
          response_status: string | null
          source: string | null
          state: string
          status: string
          updated_at: string | null
          zip: string
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          confirmation_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          id?: string
          inspection_status?: string | null
          intake_payload?: Json | null
          intake_progress?: Json | null
          intake_source?: string | null
          intake_stage?: string | null
          is_archived?: boolean
          notes?: string | null
          requested_outputs?: string[] | null
          response_status?: string | null
          source?: string | null
          state?: string
          status?: string
          updated_at?: string | null
          zip?: string
        }
        Update: {
          address1?: string | null
          address2?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          confirmation_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          id?: string
          inspection_status?: string | null
          intake_payload?: Json | null
          intake_progress?: Json | null
          intake_source?: string | null
          intake_stage?: string | null
          is_archived?: boolean
          notes?: string | null
          requested_outputs?: string[] | null
          response_status?: string | null
          source?: string | null
          state?: string
          status?: string
          updated_at?: string | null
          zip?: string
        }
        Relationships: []
      }
      admin_parameters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          parameter_key: string
          scope: string
          scope_ref: string | null
          updated_at: string
          value_boolean: boolean | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
          value_type: Database["public"]["Enums"]["parameter_value_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parameter_key: string
          scope?: string
          scope_ref?: string | null
          updated_at?: string
          value_boolean?: boolean | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
          value_type: Database["public"]["Enums"]["parameter_value_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parameter_key?: string
          scope?: string
          scope_ref?: string | null
          updated_at?: string
          value_boolean?: boolean | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
          value_type?: Database["public"]["Enums"]["parameter_value_type"]
        }
        Relationships: []
      }
      admin_schedule_assignments: {
        Row: {
          assignee: string
          calendar_id: string | null
          created_at: string
          ends_at: string
          google_event_id: string | null
          google_last_synced_at: string | null
          id: string
          job_id: string
          notes: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assignee?: string
          calendar_id?: string | null
          created_at?: string
          ends_at: string
          google_event_id?: string | null
          google_last_synced_at?: string | null
          id?: string
          job_id: string
          notes?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignee?: string
          calendar_id?: string | null
          created_at?: string
          ends_at?: string
          google_event_id?: string | null
          google_last_synced_at?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_schedule_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_schedule_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_schedule_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_schedule_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      incentive_programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          jurisdiction: string
          jurisdiction_ref: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction: string
          jurisdiction_ref?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction?: string
          jurisdiction_ref?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      incentive_rules: {
        Row: {
          created_at: string
          id: string
          incentive_program_id: string
          is_active: boolean
          priority: number
          rule_definition: Json
          rule_type: Database["public"]["Enums"]["incentive_rule_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          incentive_program_id: string
          is_active?: boolean
          priority?: number
          rule_definition: Json
          rule_type: Database["public"]["Enums"]["incentive_rule_type"]
        }
        Update: {
          created_at?: string
          id?: string
          incentive_program_id?: string
          is_active?: boolean
          priority?: number
          rule_definition?: Json
          rule_type?: Database["public"]["Enums"]["incentive_rule_type"]
        }
        Relationships: [
          {
            foreignKeyName: "incentive_rules_incentive_program_id_fkey"
            columns: ["incentive_program_id"]
            isOneToOne: false
            referencedRelation: "incentive_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_files: {
        Row: {
          bucket: string
          created_at: string
          id: string
          job_id: string
          mime_type: string | null
          original_name: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          job_id: string
          mime_type?: string | null
          original_name?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          job_id?: string
          mime_type?: string | null
          original_name?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "admin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_unscheduled"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_admin_jobs_with_next_appt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_needing_service_schedule"
            referencedColumns: ["job_id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          raw_payload: Json
          source: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          raw_payload?: Json
          source?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          raw_payload?: Json
          source?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          computed_results: Json
          created_at: string
          id: string
          job_id: string
          snapshot_version: string
        }
        Insert: {
          computed_results?: Json
          created_at?: string
          id?: string
          job_id: string
          snapshot_version?: string
        }
        Update: {
          computed_results?: Json
          created_at?: string
          id?: string
          job_id?: string
          snapshot_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_catalog: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          fuel_type: string | null
          id: string
          is_active: boolean
          manufacturer: string
          model: string
          system_type: Database["public"]["Enums"]["system_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          fuel_type?: string | null
          id?: string
          is_active?: boolean
          manufacturer: string
          model: string
          system_type?: Database["public"]["Enums"]["system_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          fuel_type?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string
          model?: string
          system_type?: Database["public"]["Enums"]["system_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      system_compatibility: {
        Row: {
          compatibility_type: Database["public"]["Enums"]["compatibility_type"]
          compatible_with_system_id: string
          created_at: string
          id: string
          notes: string | null
          rule_flags: Json
          system_id: string
        }
        Insert: {
          compatibility_type?: Database["public"]["Enums"]["compatibility_type"]
          compatible_with_system_id: string
          created_at?: string
          id?: string
          notes?: string | null
          rule_flags?: Json
          system_id: string
        }
        Update: {
          compatibility_type?: Database["public"]["Enums"]["compatibility_type"]
          compatible_with_system_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          rule_flags?: Json
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_compatibility_compatible_with_system_id_fkey"
            columns: ["compatible_with_system_id"]
            isOneToOne: false
            referencedRelation: "system_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_compatibility_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "system_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_rate_assumptions: {
        Row: {
          created_at: string
          effective_end: string | null
          effective_start: string | null
          electric_rate_per_kwh: number | null
          fixed_monthly_charge_electric: number | null
          fixed_monthly_charge_gas: number | null
          gas_rate_per_therm: number | null
          id: string
          is_active: boolean
          scope: string
          season: string
          source_note: string | null
          state: string
          utility_name: string | null
        }
        Insert: {
          created_at?: string
          effective_end?: string | null
          effective_start?: string | null
          electric_rate_per_kwh?: number | null
          fixed_monthly_charge_electric?: number | null
          fixed_monthly_charge_gas?: number | null
          gas_rate_per_therm?: number | null
          id?: string
          is_active?: boolean
          scope: string
          season?: string
          source_note?: string | null
          state: string
          utility_name?: string | null
        }
        Update: {
          created_at?: string
          effective_end?: string | null
          effective_start?: string | null
          electric_rate_per_kwh?: number | null
          fixed_monthly_charge_electric?: number | null
          fixed_monthly_charge_gas?: number | null
          gas_rate_per_therm?: number | null
          id?: string
          is_active?: boolean
          scope?: string
          season?: string
          source_note?: string | null
          state?: string
          utility_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_admin_jobs_unscheduled: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          confirmation_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_type: string | null
          id: string | null
          inspection_status: string | null
          intake_payload: Json | null
          intake_progress: Json | null
          intake_source: string | null
          intake_stage: string | null
          is_unscheduled: boolean | null
          notes: string | null
          requested_outputs: string[] | null
          response_status: string | null
          source: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          confirmation_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          id?: string | null
          inspection_status?: string | null
          intake_payload?: Json | null
          intake_progress?: Json | null
          intake_source?: string | null
          intake_stage?: string | null
          is_unscheduled?: never
          notes?: string | null
          requested_outputs?: string[] | null
          response_status?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          confirmation_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          id?: string | null
          inspection_status?: string | null
          intake_payload?: Json | null
          intake_progress?: Json | null
          intake_source?: string | null
          intake_stage?: string | null
          is_unscheduled?: never
          notes?: string | null
          requested_outputs?: string[] | null
          response_status?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      v_admin_jobs_with_next_appt: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          confirmation_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_type: string | null
          id: string | null
          inspection_status: string | null
          intake_payload: Json | null
          intake_progress: Json | null
          intake_source: string | null
          intake_stage: string | null
          next_appt_assignee: string | null
          next_appt_end_at: string | null
          next_appt_id: string | null
          next_appt_kind: string | null
          next_appt_start_at: string | null
          next_appt_status: string | null
          notes: string | null
          requested_outputs: string[] | null
          response_status: string | null
          source: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
        }
        Relationships: []
      }
      v_jobs_needing_service_schedule: {
        Row: {
          address1: string | null
          address2: string | null
          broker_name: string | null
          city: string | null
          confirmation_code: string | null
          created_at: string | null
          customer_name: string | null
          job_id: string | null
          missing_hes_schedule: boolean | null
          missing_inspection_schedule: boolean | null
          needs_hes: boolean | null
          needs_inspection: boolean | null
          requested_outputs: string[] | null
          response_status: string | null
          state: string | null
          status: string | null
          zip: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
    }
    Enums: {
      compatibility_type: "allowed" | "blocked" | "conditional"
      incentive_rule_type:
        | "zip"
        | "state"
        | "utility"
        | "income"
        | "customer_type"
        | "system_type"
        | "other"
      job_status:
        | "new"
        | "validated"
        | "queued"
        | "processing"
        | "completed"
        | "failed"
      parameter_value_type: "number" | "integer" | "boolean" | "string" | "json"
      system_type:
        | "furnace"
        | "boiler"
        | "heat_pump"
        | "mini_split"
        | "ac"
        | "water_heater"
        | "heat_pump_water_heater"
        | "insulation"
        | "air_sealing"
        | "windows"
        | "solar_pv"
        | "battery"
        | "ev_charger"
        | "panel_upgrade"
        | "smart_thermostat"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      compatibility_type: ["allowed", "blocked", "conditional"],
      incentive_rule_type: [
        "zip",
        "state",
        "utility",
        "income",
        "customer_type",
        "system_type",
        "other",
      ],
      job_status: [
        "new",
        "validated",
        "queued",
        "processing",
        "completed",
        "failed",
      ],
      parameter_value_type: ["number", "integer", "boolean", "string", "json"],
      system_type: [
        "furnace",
        "boiler",
        "heat_pump",
        "mini_split",
        "ac",
        "water_heater",
        "heat_pump_water_heater",
        "insulation",
        "air_sealing",
        "windows",
        "solar_pv",
        "battery",
        "ev_charger",
        "panel_upgrade",
        "smart_thermostat",
      ],
    },
  },
} as const
