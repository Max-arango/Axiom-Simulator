// hand-extended for ternary_beta migration; regenerate with supabase gen types once the migration is deployed
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json
          target: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      ternary_beta_grants: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          note: string | null
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ternary_beta_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ternary_beta_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ternary_beta_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      examples: {
        Row: {
          configuration: Json
          created_at: string
          description: string | null
          featured: boolean
          id: string
          slug: string
          title: string
          updated_at: string
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          slug: string
          title: string
          updated_at?: string
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          slug?: string
          title?: string
          updated_at?: string
          workspace?: Database["public"]["Enums"]["workspace_type"]
        }
        Relationships: []
      }
      experiment_tags: {
        Row: {
          experiment_id: string
          tag_id: string
        }
        Insert: {
          experiment_id: string
          tag_id: string
        }
        Update: {
          experiment_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_tags_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          configuration: Json
          created_at: string
          description: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["experiment_status"]
          title: string
          updated_at: string
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["experiment_status"]
          title: string
          updated_at?: string
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["experiment_status"]
          title?: string
          updated_at?: string
          workspace?: Database["public"]["Enums"]["workspace_type"]
        }
        Relationships: [
          {
            foreignKeyName: "experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_tags: {
        Row: {
          notebook_id: string
          tag_id: string
        }
        Insert: {
          notebook_id: string
          tag_id: string
        }
        Update: {
          notebook_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_tags_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"]
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notebooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"]
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
          workspace?: Database["public"]["Enums"]["workspace_type"]
        }
        Relationships: [
          {
            foreignKeyName: "presets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          role: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          role?: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      project_tags: {
        Row: {
          project_id: string
          tag_id: string
        }
        Insert: {
          project_id: string
          tag_id: string
        }
        Update: {
          project_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"]
          workspace_type: Database["public"]["Enums"]["workspace_type"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
          workspace_type?: Database["public"]["Enums"]["workspace_type"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
          workspace_type?: Database["public"]["Enums"]["workspace_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      workspace_metadata: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          icon: string | null
          id: string
          name: string
          route: string | null
          sort_order: number
          updated_at: string
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          route?: string | null
          sort_order?: number
          updated_at?: string
          workspace: Database["public"]["Enums"]["workspace_type"]
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          route?: string | null
          sort_order?: number
          updated_at?: string
          workspace?: Database["public"]["Enums"]["workspace_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      has_ternary_beta_access: { Args: { uid?: string }; Returns: boolean }
    }
    Enums: {
      experiment_status: "draft" | "running" | "completed" | "failed"
      visibility_type: "public" | "private" | "unlisted"
      workspace_type:
        | "calculator"
        | "fractal_lab"
        | "bloch_sphere"
        | "four_d"
        | "topology"
        | "dynamics"
        | "inspector"
        | "notebook"
        | "docs"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      experiment_status: ["draft", "running", "completed", "failed"],
      visibility_type: ["public", "private", "unlisted"],
      workspace_type: [
        "calculator",
        "fractal_lab",
        "bloch_sphere",
        "four_d",
        "topology",
        "dynamics",
        "inspector",
        "notebook",
        "docs",
      ],
    },
  },
} as const
