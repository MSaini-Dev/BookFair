
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          phone: string;
          location: string;
          lat: number;
          lng: number;
          pincode: string;
          area: string;
          landmark: string;
          avatar_url: string;
          theme: 'light' | 'dark' | 'system';
          rating: number;
          total_sales: number;
          total_purchases: number;
          verified_seller: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string;
          email?: string;
          phone?: string;
          location?: string;
          lat?: number;
          lng?: number;
          pincode?: string;
          area?: string;
          landmark?: string;
          avatar_url?: string;
          theme?: 'light' | 'dark' | 'system';
        };
        Update: {
          username?: string;
          email?: string;
          phone?: string;
          location?: string;
          lat?: number;
          lng?: number;
          pincode?: string;
          area?: string;
          landmark?: string;
          avatar_url?: string;
          theme?: 'light' | 'dark' | 'system';
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          author: string;
          category: string;
          book_type: 'author' | 'school';
          grade: string;
          subject: string;
          board: string;
          academic_year: string;
          publisher: string;
          edition_year: number;
          condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
          price: number;
          original_price: number;
          negotiable: boolean;
          isbn: string;
          barcode: string;
          lat: number;
          lng: number;
          location: string;
          area: string;
          pincode: string;
          landmark: string;
          school_name: string;
          school_id: string;
          school_lat: number;
          school_lng: number;
          image_url: string;
          images: string[];
          video_url: string;
          view_count: number;
          favorite_count: number;
          message_count: number;
          book_score: number;
          status: 'available' | 'sold' | 'reserved' | 'hidden';
          verification_status: string;
          featured: boolean;
          boost_expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          description?: string;
          author: string;
          category: string;
          book_type: 'author' | 'school';
          grade?: string;
          subject?: string;
          board?: string;
          academic_year?: string;
          publisher?: string;
          edition_year?: number;
          condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
          price: number;
          original_price?: number;
          negotiable?: boolean;
          isbn?: string;
          barcode?: string;
          lat?: number;
          lng?: number;
          location?: string;
          area?: string;
          pincode?: string;
          landmark?: string;
          school_name?: string;
          school_id?: string;
          school_lat?: number;
          school_lng?: number;
          image_url?: string;
          images?: string[];
          video_url?: string;
        };
        Update: {
          title?: string;
          description?: string;
          author?: string;
          category?: string;
          condition?: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
          price?: number;
          status?: 'available' | 'sold' | 'reserved' | 'hidden';
          updated_at?: string;
        };
      };
      school_clusters: {
        Row: {
          id: string;
          school_name: string;
          normalized_name: string;
          area: string;
          city: string;
          state: string;
          pincode: string;
          landmarks: string[];
          school_type: string;
          lat: number;
          lng: number;
          verified: boolean;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          book_id: string;
          sender_id: string;
          receiver_id: string;
          message_text: string;
          message_type: 'text' | 'offer' | 'image' | 'location';
          offer_amount: number;
          read_at: string;
          created_at: string;
        };
        Insert: {
          book_id: string;
          sender_id: string;
          receiver_id: string;
          message_text: string;
          message_type?: 'text' | 'offer' | 'image' | 'location';
          offer_amount?: number;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          book_id: string;
        };
      };
      book_views: {
        Row: {
          id: string;
          book_id: string;
          viewer_id: string;
          viewer_ip: string;
          referrer: string;
          created_at: string;
        };
        Insert: {
          book_id: string;
          viewer_id: string;
          viewer_ip: string;
          referrer: string;
        };
      };
    };
  };
}

export type BookWithProfile = Database['public']['Tables']['books']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  distance?: number;
  is_favorited?: boolean;
  score?: number;
};

export type MessageWithProfiles = Database['public']['Tables']['messages']['Row'] & {
  sender: Database['public']['Tables']['profiles']['Row'];
  receiver: Database['public']['Tables']['profiles']['Row'];
  books: Pick<Database['public']['Tables']['books']['Row'], 'title' | 'image_url'>;
};

export interface SearchFilters {
  query?: string;
  schoolName?: string;
  grade?: string;
  subject?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  maxDistance?: number;
  bookType?: 'author' | 'school';
  board?: string;
  negotiable?: boolean;
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  pincode?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
}

export interface SchoolMatch {
  id: string;
  school_name: string;
  normalized_name: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmarks: string[];
  school_type: string;
  lat: number;
  lng: number;
  verified: boolean;
  created_at: string;
}
