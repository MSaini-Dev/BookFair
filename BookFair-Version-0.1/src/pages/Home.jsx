import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [user, setUser] = useState(null);
  const [featuredBooks, setFeaturedBooks] = useState([]);
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
    {
      icon: "🔍",
      title: "Easy Search",
      description: "Find books by title, author, or category with our powerful search"
    },
    {
      icon: "💬",
      title: "Direct Messaging",
      description: "Chat directly with sellers to negotiate prices and arrange pickup"
    },
    {
      icon: "📍",
      title: "Local Sellers",
      description: "Find books near you and save on shipping costs"
    },
    {
      icon: "⭐",
      title: "Quality Ratings",
      description: "See book conditions and seller ratings before you buy"
    },
    {
      icon: "💰",
      title: "Best Prices",
      description: "Get great deals on used books from fellow book lovers"
    },
    {
      icon: "🚀",
      title: "Quick Listing",
      description: "List your books in minutes with our simple selling process"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-20 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Buy, Sell & Exchange Books
            </h1>
            <p className="text-xl md:text-2xl text-indigo-100 mb-8 max-w-3xl mx-auto">
              Connect with book lovers in your community. Find your next read or give your old books a new home.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/browse')}
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Browse Books
              </button>
              {user ? (
                <button
                  onClick={() => navigate('/sell')}
                  className="bg-indigo-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-400 transition-colors"
                >
                  Sell Your Books
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-indigo-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-400 transition-colors"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              A Better Way to Exchange Books
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform makes it easy to buy and sell used books in your local community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Books Section */}
      {featuredBooks.length > 0 && (
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Recently Added Books
              </h2>
              <p className="text-lg text-gray-600">
                Check out these latest additions from our community
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {featuredBooks.slice(0, 4).map(book => (
                <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">by {book.author}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-indigo-600">₹{book.price}</span>
                      <span className="text-xs text-gray-500">{book.condition}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/browse')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                View All Books
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="py-16 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Trading Books?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of book lovers who are already buying and selling on our platform
          </p>
          
          {!user ? (
            <button
              onClick={() => navigate('/auth')}
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-lg"
            >
              Sign Up Now
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/sell')}
                className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                List Your First Book
              </button>
              <button
                onClick={() => navigate('/browse')}
                className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-400 transition-colors"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
