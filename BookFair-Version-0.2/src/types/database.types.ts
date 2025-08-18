export interface Database {
    public: {
      Tables: {
        profiles: {
          Row: {
            id: string;
            username: string;
            location: string;
            phone: string;
            avatar_url: string;
            theme: string;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id: string;
            username?: string;
            location?: string;
            phone?: string;
            avatar_url?: string;
            theme?: string;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            username?: string;
            location?: string;
            phone?: string;
            avatar_url?: string;
            theme?: string;
            created_at?: string;
            updated_at?: string;
          };
        };
        books: {
          Row: {
            id: string;
            title: string;
            author: string;
            description: string;
            category: string;
            book_type: 'author' | 'school';
            condition: string;
            price: number;
            location: string;
            image_url: string;
            user_id: string;
            school_name: string;
            school_lat: number;
            school_lng: number;
            barcode: string;
            isbn: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            title: string;
            author: string;
            description: string;
            category: string;
            book_type: 'author' | 'school';
            condition: string;
            price: number;
            location: string;
            image_url?: string;
            user_id: string;
            school_name?: string;
            school_lat?: number;
            school_lng?: number;
            barcode?: string;
            isbn?: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            title?: string;
            author?: string;
            description?: string;
            category?: string;
            book_type?: 'author' | 'school';
            condition?: string;
            price?: number;
            location?: string;
            image_url?: string;
            user_id?: string;
            school_name?: string;
            school_lat?: number;
            school_lng?: number;
            barcode?: string;
            isbn?: string;
            created_at?: string;
          };
        };
        messages: {
          Row: {
            id: string;
            text: string;
            book_id: string;
            sender_id: string;
            receiver_id: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            text: string;
            book_id: string;
            sender_id: string;
            receiver_id: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            text?: string;
            book_id?: string;
            sender_id?: string;
            receiver_id?: string;
            created_at?: string;
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
            id?: string;
            user_id: string;
            book_id: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            book_id?: string;
            created_at?: string;
          };
        };
      };
    };
  }
  