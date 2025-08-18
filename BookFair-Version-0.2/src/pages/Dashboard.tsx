import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, ChatBubbleLeftIcon, HeartIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent,  CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Database } from '../types/database.types';

type Book = Database['public']['Tables']['books']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Favorite = Database['public']['Tables']['favorites']['Row'] & {
  books: Book & {
    profiles: {
      username: string;
      location: string;
    };
  };
};

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [activeTab, setActiveTab] = useState('myBooks');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);
      await fetchProfile(user.id);
      await fetchUserBooks(user.id);
      await fetchFavorites(user.id);
      setLoading(false);
    };

    fetchUserAndData();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const fetchUserBooks = async (userId: string) => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setBooks(data || []);
  };

  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select(`
        *,
        books (*,
          profiles:user_id (username, location)
        )
      `)
      .eq('user_id', userId);
    setFavorites(data as Favorite[] || []);
  };

  const deleteBook = async (bookId: string) => {
    if (window.confirm('Are you sure you want to delete this book? This will also delete all related messages.')) {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('book_id', bookId);

      if (messagesError) {
        alert('Error deleting messages: ' + messagesError.message);
        return;
      }

      await supabase
        .from('favorites')
        .delete()
        .eq('book_id', bookId);

      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (!error) {
        setBooks(books.filter(book => book.id !== bookId));
        alert('Book and all related data deleted successfully!');
      } else {
        alert('Error deleting book: ' + error.message);
      }
    }
  };

  const removeFavorite = async (favoriteId: string, bookId: string) => {
    await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);
    setFavorites(favorites.filter(fav => fav.id !== favoriteId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>{user?.email}</span>
          {profile?.location && (
            <span>📍 {profile.location}</span>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="myBooks">My Books ({books.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="myBooks" className="mt-6">
          {books.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">No books listed yet</h3>
                <p className="text-muted-foreground mb-4">Start by listing your first book</p>
                <Button onClick={() => navigate('/sell')}>
                  List a Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <Card key={book.id} className="overflow-hidden">
                  {book.image_url && (
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={book.image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{book.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">by {book.author}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{book.condition}</Badge>
                      <Badge variant="outline">₹{book.price}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {book.description}
                    </p>
                  </CardContent>
                  <div className="p-4 pt-0 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages?book=${book.id}`)}
                    >
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/sell?edit=${book.id}`)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBook(book.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {favorites.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                <p className="text-muted-foreground mb-4">Browse books and add them to your favorites</p>
                <Button onClick={() => navigate('/browse')}>
                  Browse Books
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="overflow-hidden">
                  {favorite.books.image_url && (
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={favorite.books.image_url}
                        alt={favorite.books.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{favorite.books.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">by {favorite.books.author}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFavorite(favorite.id, favorite.books.id)}
                      >
                        <HeartIcon className="h-5 w-5 text-red-500 fill-current" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{favorite.books.condition}</Badge>
                      <Badge variant="outline">₹{favorite.books.price}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-2">
                      <p>By {favorite.books.profiles?.username || 'Unknown'}</p>
                      <p>📍 {favorite.books.profiles?.location || 'Location not set'}</p>
                    </div>
                    <Button
                      onClick={() => navigate(`/messages?book=${favorite.books.id}`)}
                      className="w-full"
                    >
                      <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                      Message Seller
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
