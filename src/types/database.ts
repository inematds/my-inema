export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          class_id: string
          created_at: string
          criteria: string | null
          featured_attempt_id: string | null
          id: string
          lesson_type: string
          max_hints: number
          min_initial_chars: number
          prompt: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          criteria?: string | null
          featured_attempt_id?: string | null
          id?: string
          lesson_type?: string
          max_hints?: number
          min_initial_chars?: number
          prompt: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          criteria?: string | null
          featured_attempt_id?: string | null
          id?: string
          lesson_type?: string
          max_hints?: number
          min_initial_chars?: number
          prompt?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_messages: {
        Row: {
          attempt_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          attempt_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          attempt_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_messages_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_feedback: {
        Row: {
          attempt_id: string
          body: string
          created_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          body: string
          created_at?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          body?: string
          created_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_feedback_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          assignment_id: string
          autonomy_score: number | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          student_id: string
        }
        Insert: {
          assignment_id: string
          autonomy_score?: number | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          student_id: string
        }
        Update: {
          assignment_id?: string
          autonomy_score?: number | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          school_id: string
          teacher_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          school_id: string
          teacher_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          attempt_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_log_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_books: {
        Row: {
          attempt_id: string | null
          created_at: string
          id: string
          lesson_type: string
          published_at: string | null
          published_scope: string
          published_title: string | null
          session_token: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          id?: string
          lesson_type?: string
          published_at?: string | null
          published_scope?: string
          published_title?: string | null
          session_token?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          id?: string
          lesson_type?: string
          published_at?: string | null
          published_scope?: string
          published_title?: string | null
          session_token?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "junior_books_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_characters: {
        Row: {
          book_id: string
          created_at: string
          description: string
          epithet: string | null
          id: string
          image_data: string | null
          name: string | null
          position: number
        }
        Insert: {
          book_id: string
          created_at?: string
          description: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "junior_characters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "junior_books"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_objects: {
        Row: {
          book_id: string
          created_at: string
          description: string
          epithet: string | null
          id: string
          image_data: string | null
          name: string | null
          position: number
        }
        Insert: {
          book_id: string
          created_at?: string
          description: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "junior_objects_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "junior_books"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_scene_characters: {
        Row: {
          character_id: string
          scene_id: string
        }
        Insert: {
          character_id: string
          scene_id: string
        }
        Update: {
          character_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "junior_scene_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "junior_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "junior_scene_characters_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "junior_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_scene_objects: {
        Row: {
          object_id: string
          scene_id: string
        }
        Insert: {
          object_id: string
          scene_id: string
        }
        Update: {
          object_id?: string
          scene_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "junior_scene_objects_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "junior_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "junior_scene_objects_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "junior_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_scenes: {
        Row: {
          book_id: string
          created_at: string
          description: string
          epithet: string | null
          id: string
          image_data: string | null
          name: string | null
          position: number
          setting_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          description: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
          setting_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
          setting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "junior_scenes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "junior_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "junior_scenes_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "junior_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      junior_settings: {
        Row: {
          book_id: string
          created_at: string
          description: string
          epithet: string | null
          id: string
          image_data: string | null
          name: string | null
          position: number
        }
        Insert: {
          book_id: string
          created_at?: string
          description: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string
          epithet?: string | null
          id?: string
          image_data?: string | null
          name?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "junior_settings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "junior_books"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      turns: {
        Row: {
          attempt_id: string
          author: string
          content: string
          created_at: string
          id: string
          kind: string
          tokens_used: number | null
        }
        Insert: {
          attempt_id: string
          author: string
          content: string
          created_at?: string
          id?: string
          kind: string
          tokens_used?: number | null
        }
        Update: {
          attempt_id?: string
          author?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "turns_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_class_teacher: { Args: { target_class: string }; Returns: boolean }
      is_enrolled: { Args: { target_class: string }; Returns: boolean }
    }
    Enums: {
      user_role: "admin" | "teacher" | "student" | "parent"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["admin", "teacher", "student", "parent"],
    },
  },
} as const
