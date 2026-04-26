import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          poster_url: string;
          region: string;
          venue: string;
          start_date: string;
          end_date: string;
          day_string: string;
          category: string;
          industry: string;
          target_link: string | null;
          description: string | null;
          organizer: string | null;
          admission_fee: string | null;
          operating_hours: string | null;
          contact: string | null;
          parking_info: string | null;
          transportation_info: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      saved_events: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saved_events']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['saved_events']['Insert']>;
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          title: string | null;
          location: string | null;
          interests: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
    };
  };
}
