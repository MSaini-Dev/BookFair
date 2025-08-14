import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, ChatBubbleLeftIcon, HeartIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [books, setBooks] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [favorites, setFavorites] = useState([]);
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

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const fetchUserBooks = async (userId) => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setBooks(data || []);
  };

  const fetchFavorites = async (userId) => {
    const { data } = await supabase
      .from('favorites')
      .select(`
        *,
        books (*,
          profiles:user_id (username, location)
        )
      `)
      .eq('user_id', userId);
    setFavorites(data || []);
  };
// In Dashboard.jsx - Update the deleteBook function
const deleteBook = async (bookId) => {
  if (window.confirm('Are you sure you want to delete this book? This will also delete all related messages.')) {
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('book_id', bookId);

    if (messagesError) {
      alert('Error deleting messages: ' + messagesError.message);
      return;
    }

    // Delete favorites related to this book
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

  const removeFavorite = async (favoriteId, bookId) => {
    await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);
    
    setFavorites(favorites.filter(fav => fav.id !== favoriteId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {profile?.username || 'User'}!
                </h1>
                <p className="text-gray-600">{user?.email}</p>
                {profile?.location && (
                  <p className="text-gray-500 text-sm">📍 {profile.location}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/sell')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              List New Book
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-2">{books.length}</div>
            <div className="text-gray-600">Books Listed</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{favorites.length}</div>
            <div className="text-gray-600">Favorites</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              ₹{books.reduce((sum, book) => sum + (book.price || 0), 0)}
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('myBooks')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'myBooks'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Books ({books.length})
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'favorites'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Favorites ({favorites.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'myBooks' && (
              <div>
                {books.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl text-gray-300 mb-4">📚</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No books listed yet</h3>
                    <p className="text-gray-600 mb-4">Start by listing your first book</p>
                    <button
                      onClick={() => navigate('/sell')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      List Your First Book
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map(book => (
                      <div key={book.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                          {book.image_url ? (
                            <img 
                              src={book.image_url} 
                              alt={book.title}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-2xl">{book.title.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
                            {book.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">by {book.author}</p>
                          
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xl font-bold text-indigo-600">₹{book.price}</span>
                            <span className="text-xs text-gray-500">{book.condition}</span>
                          </div>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {book.description}
                          </p>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/messages?book=${book.id}`)}
                              className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                            >
                              <ChatBubbleLeftIcon className="h-4 w-4" />
                              <span>Messages</span>
                            </button>
                            
                            <button
                              onClick={() => navigate(`/edit-book/${book.id}`)}
                              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => deleteBook(book.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div>
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl text-gray-300 mb-4">❤️</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No favorites yet</h3>
                    <p className="text-gray-600 mb-4">Browse books and add them to your favorites</p>
                    <button
                      onClick={() => navigate('/browse')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      Browse Books
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map(favorite => (
                      <div key={favorite.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                          {favorite.books.image_url ? (
                            <img 
                              src={favorite.books.image_url} 
                              alt={favorite.books.title}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-2xl">{favorite.books.title.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
                            {favorite.books.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">by {favorite.books.author}</p>
                          
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xl font-bold text-indigo-600">₹{favorite.books.price}</span>
                            <span className="text-xs text-gray-500">{favorite.books.condition}</span>
                          </div>

                          <div className="text-sm text-gray-500 mb-3">
                            <p>By {favorite.books.profiles?.username || 'Unknown'}</p>
                            <p>📍 {favorite.books.profiles?.location || 'Location not set'}</p>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/messages?book=${favorite.books.id}`)}
                              className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-1"
                            >
                              <ChatBubbleLeftIcon className="h-4 w-4" />
                              <span>Message</span>
                            </button>
                            
                            <button
                              onClick={() => removeFavorite(favorite.id, favorite.books.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove from favorites"
                            >
                              <HeartIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
