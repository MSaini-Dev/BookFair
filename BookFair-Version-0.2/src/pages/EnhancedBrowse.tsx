import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EnhancedLocationPicker from '../components/EnhancedLocationPicker';
import { advancedBookSearch, trackBookView } from '../utils/advancedBookSearch';
import { MagnifyingGlassIcon, HeartIcon, ChatBubbleLeftIcon, MapPinIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon } from '@heroicons/react/24/solid';
import type { BookWithProfile, SearchFilters, LocationData } from '../types/database.types';
import { toast } from 'sonner';

export default function EnhancedBrowse() {
  const [books, setBooks] = useState<BookWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Advanced search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [bookType, setBookType] = useState<'author' | 'school' | ''>('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [board, setBoard] = useState('');
  const [maxDistance, setMaxDistance] = useState([20]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [negotiable, setNegotiable] = useState<boolean | undefined>(undefined);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const navigate = useNavigate();

  // Constants
  const grades = ['6', '7', '8', '9', '10', '11', '12'];
  const boards = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE'];
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
  
  const categories = [
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics',
    'Accountancy', 'Business Studies', 'Political Science', 'History',
    'Geography', 'Psychology', 'Law', 'Engineering', 'Medical',
    'Fiction', 'Non-Fiction', 'Biography', 'Self-Help', 'Art'
  ];
  
  const subjects = [
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics',
    'Accountancy', 'Business Studies', 'Political Science', 'History',
    'Geography', 'Psychology', 'Philosophy', 'Physical Education'
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get user's profile with location
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile?.lat && profile?.lng) {
          setUserLocation({
            lat: profile.lat,
            lng: profile.lng,
            address: profile.location || '',
            area: profile.area,
            pincode: profile.pincode,
            landmark: profile.landmark
          });
        }
        
        fetchFavorites(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (userLocation) {
      performSearch();
    }
  }, [
    userLocation, searchQuery, schoolName, category, condition, bookType,
    grade, subject, board, maxDistance, minPrice, maxPrice, negotiable
  ]);

  const performSearch = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    try {
      const filters: SearchFilters = {
        query: searchQuery || undefined,
        schoolName: schoolName || undefined,
        category: category || undefined,
        condition: condition || undefined,
        bookType: bookType || undefined,
        grade: grade || undefined,
        subject: subject || undefined,
        board: board || undefined,
        maxDistance: maxDistance[0],
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        negotiable: negotiable
      };
      
      const results = await advancedBookSearch(
        filters,
        userLocation,
        user?.id,
        50,
        0
      );
      
      setBooks(results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select('book_id')
      .eq('user_id', userId);
    setFavorites(data?.map(fav => fav.book_id) || []);
  };

  const toggleFavorite = async (bookId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const isFavorite = favorites.includes(bookId);
    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('book_id', bookId);
        setFavorites(favorites.filter(id => id !== bookId));
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, book_id: bookId });
        setFavorites([...favorites, bookId]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleBookClick = async (book: BookWithProfile) => {
    // Track book view
    await trackBookView(book.id, user?.id, 'browse_page');
    
    // Navigate to book details or open contact
    navigate(`/messages?book=${book.id}`);
  };

  const handleLocationSelect = (location: LocationData) => {
    setUserLocation(location);
    toast.success('Location updated');
  };

  const handleSchoolSelect = (school: any) => {
    setSchoolName(school.name);
    toast.success('School selected');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSchoolName('');
    setCategory('');
    setCondition('');
    setBookType('');
    setGrade('');
    setSubject('');
    setBoard('');
    setMaxDistance([20]);
    setMinPrice('');
    setMaxPrice('');
    setNegotiable(undefined);
    toast.success('Filters cleared');
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Like New': return 'bg-blue-100 text-blue-800';
      case 'Good': return 'bg-yellow-100 text-yellow-800';
      case 'Fair': return 'bg-orange-100 text-orange-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Smart Book Search</h1>
              <p className="text-muted-foreground">
                Find books from your school and nearby areas with intelligent matching
              </p>
            </div>
            
            {!userLocation && (
              <EnhancedLocationPicker
                onLocationSelect={handleLocationSelect}
                trigger={
                  <Button size="lg" className="bg-primary">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Set Location
                  </Button>
                }
              />
            )}
          </div>
          
          {userLocation && (
            <Alert className="mt-4">
              <MapPinIcon className="h-4 w-4" />
              <AlertDescription>
                Searching books near: {userLocation.address}
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setUserLocation(null)}
                  className="ml-2"
                >
                  Change
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    Smart Filters
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Query */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Books</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Title, author, subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Book Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Book Type</label>
                  <Tabs value={bookType || "all"} onValueChange={(v) => setBookType(v === "all" ? "" : v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="school">Academic</TabsTrigger>
                      <TabsTrigger value="author">General</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* School Selection for Academic Books */}
                {bookType === 'school' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your School</label>
                    <EnhancedLocationPicker
                      mode="school"
                      schoolName={schoolName}
                      onSchoolSelect={handleSchoolSelect}
                      trigger={
                        <Button variant="outline" className="w-full justify-start">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          {schoolName || 'Find Your School'}
                        </Button>
                      }
                    />
                    {schoolName && (
                      <div className="p-2 bg-primary/10 rounded text-sm">
                        <p className="font-medium">🏫 {schoolName}</p>
                        <p className="text-xs text-muted-foreground">
                          Books from your school will appear first
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Academic Filters */}
                {bookType === 'school' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Grade</label>
                      <Select value={grade || "all"} onValueChange={(v) => setGrade(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {grades.map(g => (
                            <SelectItem key={g} value={g}>Class {g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Board</label>
                      <Select value={board || "all"} onValueChange={(v) => setBoard(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Boards</SelectItem>
                          {boards.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Subject */}
                {bookType === 'school' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select value={subject || "all"} onValueChange={(v) => setSubject(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {subjects.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <Select value={condition || "all"} onValueChange={(v) => setCondition(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Condition</SelectItem>
                      {conditions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Max Distance: {maxDistance[0]}km
                  </label>
                  <Slider
                    value={maxDistance}
                    onValueChange={setMaxDistance}
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1km</span>
                    <span>50km</span>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price Range (₹)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Negotiable */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Negotiable Price Only</label>
                  <Switch
                    checked={negotiable === true}
                    onCheckedChange={(checked) => setNegotiable(checked ? true : undefined)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            {!userLocation ? (
              <Card className="text-center py-16">
                <CardContent>
                  <MapPinIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Set Your Location First</h3>
                  <p className="text-muted-foreground mb-6">
                    We need your location to find books near you and calculate distances accurately
                  </p>
                  <EnhancedLocationPicker
                    onLocationSelect={handleLocationSelect}
                    trigger={
                      <Button size="lg">
                        <MapPinIcon className="h-5 w-5 mr-2" />
                        Set Your Location
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                    
                    <div>
                      <p className="text-lg font-semibold">
                        {loading ? 'Searching...' : `${books.length} books found`}
                      </p>
                      {schoolName && (
                        <p className="text-sm text-muted-foreground">
                          Prioritizing books from {schoolName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Best Match</SelectItem>
                        <SelectItem value="distance">Nearest First</SelectItem>
                        <SelectItem value="price_low">Price: Low to High</SelectItem>
                        <SelectItem value="price_high">Price: High to Low</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="condition">Best Condition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                )}

                {/* No Results */}
                {!loading && books.length === 0 && (
                  <Card className="text-center py-16">
                    <CardContent>
                      <h3 className="text-xl font-semibold mb-2">No books found</h3>
                      <p className="text-muted-foreground mb-6">
                        Try adjusting your search criteria or increasing the distance
                      </p>
                      <Button onClick={clearFilters} variant="outline">
                        Clear Filters
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Books Grid */}
                {!loading && books.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {books.map((book) => (
                      <Card key={book.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer">
                        <div className="relative">
                          {book.image_url ? (
                            <div className="aspect-[3/4] overflow-hidden">
                              <img
                                src={book.image_url}
                                alt={book.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                              <div className="text-center text-muted-foreground">
                                <div className="text-4xl mb-2">📚</div>
                                <p className="text-sm">No Image</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Favorite Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(book.id);
                            }}
                            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                          >
                            {book.is_favorited ? (
                              <HeartSolidIcon className="h-5 w-5 text-red-500" />
                            ) : (
                              <HeartIcon className="h-5 w-5" />
                            )}
                          </Button>

                          {/* Distance Badge */}
                          {book.distance && (
                            <Badge className="absolute top-2 left-2 bg-black/80 text-white">
                              {book.distance.toFixed(1)}km away
                            </Badge>
                          )}

                          {/* School Match Badge */}
                          {book.school_name === schoolName && (
                            <Badge className="absolute bottom-2 left-2 bg-green-500 text-white">
                              Your School
                            </Badge>
                          )}
                        </div>

                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                                {book.title}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                by {book.author}
                              </p>
                            </div>
                          </div>

                          {/* Book Details */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge className={getConditionColor(book.condition)}>
                              {book.condition}
                            </Badge>
                            {book.grade && (
                              <Badge variant="outline">Class {book.grade}</Badge>
                            )}
                            {book.subject && (
                              <Badge variant="outline">{book.subject}</Badge>
                            )}
                            {book.board && book.board !== 'CBSE' && (
                              <Badge variant="outline">{book.board}</Badge>
                            )}
                            {book.negotiable && (
                              <Badge variant="outline" className="text-green-600">
                                Negotiable
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          {book.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {book.description}
                            </p>
                          )}

                          {/* School Info */}
                          {book.school_name && book.school_name !== schoolName && (
                            <p className="text-xs text-muted-foreground mb-2">
                              🏫 {book.school_name}
                            </p>
                          )}

                          {/* Price and Seller Info */}
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-2xl font-bold text-primary">
                                ₹{book.price.toLocaleString()}
                              </div>
                              {book.original_price && book.original_price > book.price && (
                                <div className="text-xs text-muted-foreground line-through">
                                  ₹{book.original_price.toLocaleString()}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <StarIcon className="h-3 w-3 text-yellow-500" />
                                <span>{book.profiles.rating.toFixed(1)}</span>
                              </div>
                              <p>{book.profiles.username}</p>
                              {book.profiles.verified_seller && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-0">
                          <Button
                            onClick={() => handleBookClick(book)}
                            className="w-full"
                          >
                            <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                            Contact Seller
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
