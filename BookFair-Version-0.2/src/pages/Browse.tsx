import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "../types/database.types";

type Book = Database["public"]["Tables"]["books"]["Row"] & {
  profiles: {
    username: string;
    location: string;
  };
};

export default function Browse() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [locationRange, setLocationRange] = useState("");
  const [sort, setSort] = useState("desc");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookType, setBookType] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchFavorites(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [
    search,
    condition,
    category,
    location,
    locationRange,
    sort,
    priceRange,
    bookType,
    schoolName,
  ]);

  const fetchFavorites = async (userId: string) => {
    const { data } = await supabase
      .from("favorites")
      .select("book_id")
      .eq("user_id", userId);
    setFavorites(data?.map((fav) => fav.book_id) || []);
  };

  const fetchBooks = async () => {
    setLoading(true);
    let query = supabase.from("books").select(`
        *,
        profiles:user_id (username, location)
      `);

    if (condition) query = query.eq("condition", condition);
    if (category) query = query.eq("category", category);
    if (bookType) query = query.eq("book_type", bookType);
    if (schoolName && bookType === "school") {
      query = query.ilike("school_name", `%${schoolName}%`);
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`
      );
    }
    if (priceRange.min) query = query.gte("price", priceRange.min);
    if (priceRange.max) query = query.lte("price", priceRange.max);

    const { data } = await query.order("created_at", {
      ascending: sort === "asc",
    });
    setBooks((data as Book[]) || []);
    setLoading(false);
  };

  const toggleFavorite = async (bookId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const isFavorite = favorites.includes(bookId);
    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("book_id", bookId);
      setFavorites(favorites.filter((id) => id !== bookId));
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, book_id: bookId });
      setFavorites([...favorites, bookId]);
    }
  };

  const handleMessage = (bookId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/messages?book=${bookId}`);
  };

  const clearFilters = () => {
    setSearch("");
    setCondition("");
    setCategory("");
    setLocation("");
    setLocationRange("");
    setPriceRange({ min: "", max: "" });
    setSort("desc");
    setBookType("");
    setSchoolName("");
  };

  const authorBookCategories = [
    "Fiction",
    "Non-Fiction",
    "Biography",
    "Self-Help",
    "Art",
    "Technology",
    "Business",
    "Health",
    "Travel",
    "Cooking",
    "Sports",
    "Philosophy",
    "Poetry",
  ];

  const schoolBookCategories = [
    "Mathematics",
    "Science",
    "English",
    "History",
    "Geography",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "Economics",
    "Psychology",
    "Engineering",
    "Medical",
    "Law",
    "Management",
  ];

  const conditions = ["New", "Like New", "Good", "Fair", "Poor"];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Discover amazing books from your local community
        </h1>
        <p className="text-muted-foreground">
          Find your next favorite read or textbook
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="lg:w-80">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Title, author, or keyword..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
  <label className="text-sm font-medium">Book Type</label>
  <Tabs value={bookType || "all"} onValueChange={(value) => setBookType(value === "all" ? "" : value)}>
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="author">General</TabsTrigger>
      <TabsTrigger value="school">Academic</TabsTrigger>
    </TabsList>
  </Tabs>
</div>

              {/* School Name for Academic Books */}
              {bookType === "school" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    School/University
                  </label>
                  <Input
                    placeholder="Enter school name..."
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
              )}

              {/* Category */}
              <div className="space-y-2">
  <label className="text-sm font-medium">Category</label>
  <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
    <SelectTrigger>
      <SelectValue placeholder="All categories" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All categories</SelectItem>
      {(bookType === 'school' ? schoolBookCategories : authorBookCategories).map((cat) => (
        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Condition</label>
  <Select value={condition || "all"} onValueChange={(value) => setCondition(value === "all" ? "" : value)}>
    <SelectTrigger>
      <SelectValue placeholder="Any condition" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Any condition</SelectItem>
      {conditions.map((cond) => (
        <SelectItem key={cond} value={cond}>{cond}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>


              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        min: e.target.value,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        max: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
  <label className="text-sm font-medium">Sort By</label>
  <Select value={sort} onValueChange={setSort}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="desc">Newest First</SelectItem>
      <SelectItem value="asc">Oldest First</SelectItem>
    </SelectContent>
  </Select>
</div>

            </CardContent>
          </Card>
        </div>

        {/* Books Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-muted-foreground">
                  Found {books.length} book{books.length !== 1 ? "s" : ""}
                </p>
              </div>

              {books.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <h3 className="text-lg font-semibold mb-2">
                      No books found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search criteria
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {books.map((book) => (
                    <Card
                      key={book.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
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
                          <CardTitle className="text-lg line-clamp-2">
                            {book.title}
                          </CardTitle>
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
                        <p className="text-sm text-muted-foreground">
                          by {book.author}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{book.condition}</Badge>
                          {book.book_type && (
                            <Badge variant="outline">
                              {book.book_type === "school"
                                ? "Academic"
                                : "General"}
                            </Badge>
                          )}
                        </div>
                        {book.book_type === "school" && book.school_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📚 {book.school_name}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {book.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold text-primary">
                            ₹{book.price}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            <p>{book.profiles?.username || "Unknown"}</p>
                            <p>
                              📍 {book.profiles?.location || "Location not set"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          onClick={() => handleMessage(book.id)}
                          className="w-full"
                        >
                          <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
                          Message Seller
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
  );
}
