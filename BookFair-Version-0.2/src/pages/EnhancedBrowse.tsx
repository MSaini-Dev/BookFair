import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
// import type { Database } from '../types/database.types';
import type { User } from '@supabase/supabase-js'; // Import Supabase User type
import { 
  Search, 
  MapPin, 
  School, 
  Star, 
  Eye, 
  Heart, 
  Filter,
  AlertCircle,
  Loader2,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import type { BookWithProfile, SearchFilters, LocationData } from '../types/database.types';

export default function EnhancedBrowse() {
  // State management
  const [books, setBooks] = useState<BookWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Fix: Use Supabase User type instead of Database profile type
  const [user, setUser] = useState<User | null>(null);
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  
  // Search and filter states
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    schoolName: '',
    grade: '',
    subject: '',
    category: '',
    condition: '',
    minPrice: 0,
    maxPrice: 10000,
    maxDistance: 25,
    bookType: undefined,
    board: '',
    negotiable: false
  });
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price_low' | 'price_high' | 'newest'>('distance');
  
  const navigate = useNavigate();

  // Constants
  const grades = ['6', '7', '8', '9', '10', '11', '12'];
  const boards = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE'];
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
  const categories = [
    'Fiction', 'Non-Fiction', 'Biography', 'Self-Help', 'Art', 'Technology',
    'Business', 'Health', 'Travel', 'Cooking', 'Sports', 'Philosophy', 'Poetry',
    'Romance', 'Mystery', 'Science Fiction', 'Fantasy', 'History'
  ];
  const subjects = [
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Sanskrit',
    'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Economics',
    'Business Studies', 'Accountancy', 'Political Science', 'Geography',
    'Psychology', 'Sociology', 'Physical Education'
  ];
  useEffect(() => {
    const initializeTheme = () => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
      const root = document.documentElement;
      
      if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    // Initialize theme immediately
    initializeTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'system') {
        initializeTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);
  // Initialize user and location
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (user) {
          setUser(user); // Now this works with correct type
          
          // Get user profile separately
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            // Set user location if available
            if (profile.lat && profile.lng) {
              setLocation({
                lat: profile.lat,
                lng: profile.lng,
                address: profile.location || '',
                area: profile.area || '',
                pincode: profile.pincode || '',
                landmark: profile.landmark || ''
              });
            }
          }

          // Get user's school from their books
          const { data: userBooks } = await supabase
            .from('books')
            .select('school_name')
            .eq('user_id', user.id)
            .eq('book_type', 'school')
            .not('school_name', 'is', null)
            .limit(1);

          if (userBooks && userBooks.length > 0) {
            setSchoolName(userBooks[0].school_name);
            setFilters(prev => ({ ...prev, schoolName: userBooks[0].school_name }));
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Request location permission
  useEffect(() => {
    const requestLocation = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser');
        return;
      }

      // Skip if we already have location from profile
      if (location) return;

      setLocationLoading(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          };
          setLocation(newLocation);
          setLocationLoading(false);
          setLocationError(null);
          
          // Save location to user profile if logged in
          if (user) {
            updateUserLocation(newLocation);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          setLocationError(errorMessage);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    };

    requestLocation();
  }, [user, location]);

  // Update user location in profile
  const updateUserLocation = async (locationData: LocationData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          lat: locationData.lat,
          lng: locationData.lng,
          location: locationData.address,
          area: locationData.area,
          pincode: locationData.pincode,
          landmark: locationData.landmark,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Search books with filters
  const searchBooks = async () => {
    setSearchLoading(true);
    try {
      let query = supabase
        .from('books')
        .select(`
          *,
          profiles!books_user_id_profiles_fkey (
            id,
            username,
            location,
            verified_seller,
            rating,
            total_sales
          )
        `)
        .eq('status', 'available');

      // Apply text search
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,author.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      // Apply book type filter
      if (filters.bookType) {
        query = query.eq('book_type', filters.bookType);
      }

      // Apply school filters
      if (filters.schoolName) {
        query = query.ilike('school_name', `%${filters.schoolName}%`);
      }

      if (filters.grade) {
        query = query.eq('grade', filters.grade);
      }

      if (filters.subject) {
        query = query.eq('subject', filters.subject);
      }

      if (filters.board) {
        query = query.eq('board', filters.board);
      }

      // Apply category filter for author books
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Apply condition filter
      if (filters.condition) {
        query = query.eq('condition', filters.condition);
      }

      // Apply price range - use non-null assertion since we have defaults
      if (filters.minPrice! > 0) {
        query = query.gte('price', filters.minPrice!);
      }
      if (filters.maxPrice! < 10000) {
        query = query.lte('price', filters.maxPrice!);
      }

      // Apply negotiable filter
      if (filters.negotiable) {
        query = query.eq('negotiable', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      let processedBooks = data || [];

      // Add distance calculation and filtering
      if (location) {
        processedBooks = processedBooks.map(book => ({
          ...book,
          distance: book.lat && book.lng 
            ? calculateDistance(location.lat, location.lng, book.lat, book.lng)
            : 999
        })).filter(book => book.distance <= filters.maxDistance!); // Use non-null assertion
      }

      // Add favorites status
      if (user) {
        const { data: favoritesData } = await supabase
          .from('favorites')
          .select('book_id')
          .eq('user_id', user.id);

        const favoriteIds = new Set(favoritesData?.map(f => f.book_id) || []);
        
        processedBooks = processedBooks.map(book => ({
          ...book,
          is_favorited: favoriteIds.has(book.id)
        }));
      }

      // Sort books
      processedBooks = sortBooks(processedBooks);

      // Prioritize school books if user has a school
      if (schoolName) {
        const schoolBooks = processedBooks.filter(book => 
          book.school_name && book.school_name.toLowerCase().includes(schoolName.toLowerCase())
        );
        const otherBooks = processedBooks.filter(book => 
          !book.school_name || !book.school_name.toLowerCase().includes(schoolName.toLowerCase())
        );
        processedBooks = [...schoolBooks, ...otherBooks];
      }

      setBooks(processedBooks);
    } catch (error) {
      console.error('Error searching books:', error);
      toast.error('Failed to search books');
    } finally {
      setSearchLoading(false);
    }
  };

  // Sort books based on selected criteria
  const sortBooks = (books: BookWithProfile[]): BookWithProfile[] => {
    return [...books].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  };

  // Load initial books
  useEffect(() => {
    searchBooks();
  }, [location, user]);

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value as typeof sortBy);
    setBooks(prev => sortBooks(prev));
  };

  const toggleFavorite = async (bookId: string, isFavorited: boolean | undefined) => {
    if (!user) {
      toast.error('Please sign in to add favorites');
      return;
    }

    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId);
        
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, book_id: bookId }]);
        
        toast.success('Added to favorites');
      }

      // Update local state
      setBooks(prev => prev.map(book => 
        book.id === bookId 
          ? { ...book, is_favorited: !isFavorited }
          : book
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  // Handle view details
  const handleViewDetails = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  // Handle message
  const handleMessage = (book: BookWithProfile) => {
    if (!user) {
      toast.error('Please sign in to message sellers');
      return;
    }

    if (book.user_id === user.id) {
      toast.error('You cannot message yourself');
      return;
    }

    navigate(`/messages?book=${book.id}`);
  };

  // Retry location
  const retryLocation = () => {
    setLocationError(null);
    setLocation(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Browse Books</h1>
        <p className="text-muted-foreground">
          Find books from your school and nearby areas with intelligent matching
        </p>
        
        {schoolName && (
          <div className="mt-2 flex items-center gap-2">
            <School className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">{schoolName}</span>
            <span className="text-xs text-muted-foreground">Books from your school will appear first</span>
          </div>
        )}
      </div>

      {/* Location Alert */}
      {locationError && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>We need your location to find books near you and calculate distances accurately</span>
            <Button variant="outline" size="sm" onClick={retryLocation}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {locationLoading && (
        <Alert className="mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Getting your location...</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search books by title, author, or description..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && searchBooks()}
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filters.bookType || ''} onValueChange={(value) => handleFilterChange('bookType', value || undefined)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Book Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="types">All Types</SelectItem>
                  <SelectItem value="school">Academic</SelectItem>
                  <SelectItem value="author">General</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="price_low">Price: Low</SelectItem>
                  <SelectItem value="price_high">Price: High</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>

              <Button onClick={searchBooks} disabled={searchLoading} className="gap-2">
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {searchLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Academic Filters */}
                {(!filters.bookType || filters.bookType === 'school') && (
                  <>
                    <Select value={filters.grade} onValueChange={(value) => handleFilterChange('grade', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grade">All Grades</SelectItem>
                        {grades.map((grade) => (
                          <SelectItem key={grade} value={grade}>Class {grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.subject} onValueChange={(value) => handleFilterChange('subject', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subjects">All Subjects</SelectItem>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.board} onValueChange={(value) => handleFilterChange('board', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Board" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boards">All Boards</SelectItem>
                        {boards.map((board) => (
                          <SelectItem key={board} value={board}>{board}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="School Name"
                      value={filters.schoolName}
                      onChange={(e) => handleFilterChange('schoolName', e.target.value)}
                    />
                  </>
                )}

                {/* General Book Filters */}
                {(!filters.bookType || filters.bookType === 'author') && (
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="categories">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={filters.condition} onValueChange={(value) => handleFilterChange('condition', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conditions">All Conditions</SelectItem>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Price Range: ₹{filters.minPrice} - ₹{filters.maxPrice}
                </label>
                <div className="flex gap-4 items-center">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || 10000)}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Distance Filter */}
              {location && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Max Distance: {filters.maxDistance}km
                  </label>
                  <Slider
                    value={[filters.maxDistance || 25]}
                    onValueChange={(value) => handleFilterChange('maxDistance', value[0])}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {/* Negotiable Switch */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="negotiable"
                  checked={filters.negotiable}
                  onCheckedChange={(checked) => handleFilterChange('negotiable', checked)}
                />
                <label htmlFor="negotiable" className="text-sm font-medium">
                  Only negotiable prices
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {searchLoading ? 'Searching...' : `${books.length} books found`}
          </h2>
          {schoolName && (
            <Badge variant="secondary">
              Prioritizing books from {schoolName}
            </Badge>
          )}
        </div>
      </div>

      {/* Books Grid */}
      {books.length === 0 && !searchLoading ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No books found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or increasing the distance
            </p>
            <Button variant="outline" onClick={() => {
              setFilters({
                query: '',
                schoolName: '',
                grade: '',
                subject: '',
                category: '',
                condition: '',
                minPrice: 0,
                maxPrice: 10000,
                maxDistance: 50,
                bookType: undefined,
                board: '',
                negotiable: false
              });
              searchBooks();
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <Card key={book.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewDetails(book.id)}>
              <CardContent className="p-4">
                {/* Book Image */}
                <div className="relative mb-3">
                  {book.image_url || (book.images && book.images.length > 0) ? (
                    <img
                      src={book.image_url || book.images[0]}
                      alt={book.title}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='0.3em' fill='%23374151'%3ENo Image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BookOpen className="h-8 w-8 mx-auto mb-1" />
                        <div className="text-sm">No Image</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Favorite button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(book.id, book.is_favorited);
                    }}
                  >
                    <Heart className={`h-4 w-4 ${book.is_favorited ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>

                  {/* Condition Badge */}
                  <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                    {book.condition}
                  </Badge>
                </div>

                {/* Book Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-2">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">by {book.author}</p>
                  
                  {book.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{book.description}</p>
                  )}

                  {/* Academic Info */}
                  {book.book_type === 'school' && (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {book.grade && <Badge variant="outline">Class {book.grade}</Badge>}
                      {book.subject && <Badge variant="outline">{book.subject}</Badge>}
                      {book.board && <Badge variant="outline">{book.board}</Badge>}
                    </div>
                  )}

                  {/* Category for general books */}
                  {book.book_type === 'author' && book.category && (
                    <Badge variant="outline" className="text-xs">{book.category}</Badge>
                  )}

                  {/* School Info */}
                  {book.school_name && book.school_name !== schoolName && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <School className="h-3 w-3" />
                      {book.school_name}
                    </div>
                  )}

                  {/* Price and Seller Info */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-green-600">
                        ₹{book.price}
                        {book.negotiable && <span className="text-xs text-muted-foreground ml-1">(Negotiable)</span>}
                      </div>
                      {book.original_price && book.original_price > book.price && (
                        <div className="text-xs text-muted-foreground line-through">₹{book.original_price}</div>
                      )}
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium">{book.profiles?.username}</div>
                      <div className="flex items-center gap-1">
                        {book.profiles?.verified_seller && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                        {book.profiles?.rating && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {book.profiles.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      {book.distance && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {book.distance.toFixed(1)}km away
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(book.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessage(book);
                      }}
                    >
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}