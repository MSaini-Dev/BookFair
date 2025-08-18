import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EnhancedLocationPicker from '../components/EnhancedLocationPicker';
import { searchBooksWithLocation } from '../utils/bookSearchAlgorithm';
import { MagnifyingGlassIcon, HeartIcon, ChatBubbleLeftIcon, MapPinIcon, SchoolIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

export default function EnhancedBrowse() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [condition, setCondition] = useState('');
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  const navigate = useNavigate();

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
          setUserLocation({ lat: profile.lat, lng: profile.lng });
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
  }, [userLocation, searchQuery, schoolName, grade, subject, condition, maxDistance, priceRange]);

  const performSearch = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    try {
      const searchParams = {
        query: searchQuery,
        schoolName: schoolName,
        userLat: userLocation.lat,
        userLng: userLocation.lng,
        grade: grade || undefined,
        subject: subject || undefined,
        condition: condition || undefined,
        maxDistance: maxDistance
      };
      
      const results = await searchBooksWithLocation(searchParams);
      
      // Apply price filter on frontend for now
      let filteredResults = results;
      if (priceRange.min) {
        filteredResults = filteredResults.filter(book => book.price >= parseFloat(priceRange.min));
      }
      if (priceRange.max) {
        filteredResults = filteredResults.filter(book => book.price <= parseFloat(priceRange.max));
      }
      
      setBooks(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: any) => {
    setUserLocation({ lat: location.lat, lng: location.lng });
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

  const grades = ['6', '7', '8', '9', '10', '11', '12'];
  const subjects = [
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics',
    'Accountancy', 'Business Studies', 'Political Science', 'History', 'Geography'
  ];
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Your School Books</h1>
        <p className="text-muted-foreground">
          Smart search finds books from your school and nearby areas
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Enhanced Filters Sidebar */}
        <div className="lg:w-80">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-5 w-5" />
                Smart Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Location</label>
                <EnhancedLocationPicker
                  onLocationSelect={handleLocationSelect}
                  defaultLocation={userLocation || undefined}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {userLocation ? 'Update Location' : 'Set Your Location'}
                    </Button>
                  }
                />
                {userLocation && (
                  <p className="text-xs text-muted-foreground">
                    📍 Location set ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
                  </p>
                )}
              </div>

              {/* School Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your School (Optional)</label>
                <EnhancedLocationPicker
                  mode="school"
                  schoolName={schoolName}
                  onLocationSelect={handleLocationSelect}
                  onSchoolSelect={(school) => setSchoolName(school.name)}
                  trigger={
                    <Button variant="outline" className="w-full justify-start">
                      <SchoolIcon className="h-4 w-4 mr-2" />
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

              {/* Search Query */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Books</label>
                <Input
                  placeholder="Book title, author, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Grade & Subject */}
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
                        <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Select value={subject || "all"} onValueChange={(v) => setSubject(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Condition</label>
                <Select value={condition || "all"} onValueChange={(v) => setCondition(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
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
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Max Distance: {maxDistance}km
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
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
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={performSearch} 
                className="w-full" 
                disabled={loading || !userLocation}
              >
                {loading ? 'Searching...' : 'Search Books'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="flex-1">
          {!userLocation ? (
            <Card className="text-center py-12">
              <CardContent>
                <MapPinIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Set Your Location First</h3>
                <p className="text-muted-foreground mb-4">
                  We need your location to find books near you and calculate distances
                </p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">
                    Found {books.length} book{books.length !== 1 ? 's' : ''}
                  </p>
                  {schoolName && (
                    <p className="text-sm text-primary">
                      Prioritizing books from {schoolName}
                    </p>
                  )}
                </div>
              </div>

              {books.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <h3 className="text-lg font-semibold mb-2">No books found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search criteria or increasing the distance
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {books.map((book) => (
                    <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-all">
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2 mb-1">
                              {book.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">by {book.author}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(book.id)}
                            className="shrink-0"
                          >
                            {favorites.includes(book.id) ? (
                              <HeartSolidIcon className="h-5 w-5 text-red-500" />
                            ) : (
                              <HeartIcon className="h-5 w-5" />
                            )}
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="secondary">{book.condition}</Badge>
                          {book.grade && <Badge variant="outline">Grade {book.grade}</Badge>}
                          {book.schoolMatch && <Badge className="bg-green-100 text-green-800">Same School</Badge>}
                          {book.distance <= 2 && <Badge variant="outline">📍 Very Close</Badge>}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {book.subject && (
                            <p className="text-sm text-muted-foreground">📚 {book.subject}</p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-primary">₹{book.price}</div>
                            <div className="text-xs text-muted-foreground text-right">
                              <p>🚶 {book.distance.toFixed(1)}km away</p>
                              <p>⭐ {book.sellerRating.toFixed(1)} rating</p>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            <p><strong>Match:</strong> {book.matchReason}</p>
                            {book.school_name && book.school_name !== schoolName && (
                              <p><strong>School:</strong> {book.school_name}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>

                      <div className="p-4 pt-0">
                        <Button
                          onClick={() => navigate(`/messages?book=${book.id}`)}
                          className="w-full"
                        >
                          <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                          Contact Seller
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
