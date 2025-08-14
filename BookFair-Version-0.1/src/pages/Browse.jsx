import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

export default function Browse() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [locationRange, setLocationRange] = useState('');
  const [sort, setSort] = useState('desc');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  
  // New filter states (keep only one set)
  const [bookType, setBookType] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchFavorites(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [search, condition, category, location, locationRange, sort, priceRange, bookType, schoolName]);

  const fetchFavorites = async (userId) => {
    const { data } = await supabase
      .from('favorites')
      .select('book_id')
      .eq('user_id', userId);
    setFavorites(data?.map(fav => fav.book_id) || []);
  };

  const fetchBooks = async () => {
    setLoading(true);
    let query = supabase
      .from('books')
      .select(`
        *,
        profiles:user_id (username, location)
      `);

    if (condition) query = query.eq('condition', condition);
    if (category) query = query.eq('category', category);
    if (bookType) query = query.eq('book_type', bookType);
    if (schoolName && bookType === 'school') {
      query = query.ilike('school_name', `%${schoolName}%`);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (priceRange.min) query = query.gte('price', priceRange.min);
    if (priceRange.max) query = query.lte('price', priceRange.max);

    const { data } = await query.order('created_at', { ascending: sort === 'asc' });
    setBooks(data || []);
    setLoading(false);
  };

  const toggleFavorite = async (bookId) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const isFavorite = favorites.includes(bookId);
    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId);
      setFavorites(favorites.filter(id => id !== bookId));
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, book_id: bookId });
      setFavorites([...favorites, bookId]);
    }
  };

  const handleMessage = (bookId) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?book=${bookId}`);
  };

  const clearFilters = () => {
    setSearch('');
    setCondition('');
    setCategory('');
    setLocation('');
    setLocationRange('');
    setPriceRange({ min: '', max: '' });
    setSort('desc');
    setBookType('');
    setSchoolName('');
  };

  const authorBookCategories = [
    'Fiction', 'Non-Fiction', 'Biography', 'Self-Help', 'Art', 'Technology', 
    'Business', 'Health', 'Travel', 'Cooking', 'Sports', 'Philosophy', 'Poetry'
  ];

  const schoolBookCategories = [
    'Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics',
    'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Psychology',
    'Engineering', 'Medical', 'Law', 'Management'
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          Find your next great read
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Discover amazing books from your local community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search books..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Book Type Filter */}
          <select
            value={bookType}
            onChange={(e) => setBookType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Book Types</option>
            <option value="author">Author Books</option>
            <option value="school">School Books</option>
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {(bookType === 'school' ? schoolBookCategories : authorBookCategories).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Condition Filter */}
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Conditions</option>
            <option value="New">New</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>

        {/* School Name Filter - Only show when school books selected */}
        {bookType === 'school' && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by school name..."
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Price Range and Sort */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Min price"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="number"
            placeholder="Max price"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4 text-center">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading books...</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300">
              Found {books.length} book{books.length !== 1 ? 's' : ''}
            </p>
          </div>

          {books.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No books found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <div key={book.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  {book.image_url && (
                    <img 
                      src={book.image_url} 
                      alt={book.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate">{book.title}</h3>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${book.price}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">by {book.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{book.condition}</p>
                    
                    {/* Show book type and school info if applicable */}
                    <div className="mb-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        book.book_type === 'school' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {book.book_type === 'school' ? 'School Book' : 'Author Book'}
                      </span>
                      {book.school_name && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          📚 {book.school_name}
                        </span>
                      )}
                    </div>

                    {book.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {book.description}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleFavorite(book.id)}
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {favorites.includes(book.id) ? (
                            <HeartSolidIcon className="h-5 w-5 text-red-500" />
                          ) : (
                            <HeartIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleMessage(book.id)}
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        by {book.profiles?.username || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
