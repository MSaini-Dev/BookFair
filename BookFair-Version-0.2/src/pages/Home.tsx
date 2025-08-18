import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type{ Database } from '../types/database.types';

type Book = Database['public']['Tables']['books']['Row'] & {
  profiles?: {
    username?: string;
    location?: string;
  };
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    fetchFeaturedBooks();
  }, []);

  const fetchFeaturedBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select(`
        *,
        profiles:user_id (username, location)
      `)
      .limit(8)
      .order('created_at', { ascending: false });
    setFeaturedBooks(data || []);
  };

  const features = [
    { icon: "🔍", title: "Easy Search", description: "Find books by title, author, or category with our powerful search" },
    { icon: "💬", title: "Direct Messaging", description: "Chat directly with sellers to negotiate prices and arrange pickup" },
    { icon: "📍", title: "Local Sellers", description: "Find books near you and save on shipping costs" },
    { icon: "⭐", title: "Quality Ratings", description: "See book conditions and seller ratings before you buy" },
    { icon: "💰", title: "Best Prices", description: "Get great deals on used books from fellow book lovers" },
    { icon: "🚀", title: "Quick Listing", description: "List your books in minutes with our simple selling process" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Connect with book lovers in your community
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Find your next read or give your old books a new home.
        </p>
        {!user ? (
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/auth')} size="lg">
              Get Started
            </Button>
            <Button variant="outline" onClick={() => navigate('/browse')} size="lg">
              Browse Books
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate('/browse')} size="lg">
            Browse Books
          </Button>
        )}
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Our platform makes it easy to buy and sell used books in your local community</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center p-6 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Books */}
      <section className="container mx-auto px-4 py-16 bg-muted/10">
        <h2 className="text-3xl font-bold text-center mb-12">Check out these latest additions from our community</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredBooks.map((book) => (
            <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
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
                <CardTitle className="line-clamp-2 text-lg">{book.title}</CardTitle>
                <p className="text-sm text-muted-foreground">by {book.author}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">₹{book.price}</Badge>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{book.profiles?.username || 'Unknown'}</p>
                    <p>📍 {book.profiles?.location || 'Location not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-8">
          <Button onClick={() => navigate('/browse')} size="lg">
            View All Books
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Join thousands of book lovers</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            who are already buying and selling on our platform
          </p>
          {!user ? (
            <Button onClick={() => navigate('/auth')} size="lg">
              Join Now
            </Button>
          ) : (
            <Button onClick={() => navigate('/sell')} size="lg">
              List a Book
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
