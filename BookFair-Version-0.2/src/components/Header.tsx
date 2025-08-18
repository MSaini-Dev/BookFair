import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu, User, LogOut, Settings, MessageSquare, LayoutDashboard } from 'lucide-react';

interface Profile {
  username?: string;
  avatar_url?: string;
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navigation = [
    { name: 'Home', href: '/', public: true },
    { name: 'Browse', href: '/browse', public: true },
    { name: 'Sell', href: '/sell', protected: true },
    { name: 'Messages', href: '/messages', protected: true },
    { name: 'Dashboard', href: '/dashboard', protected: true },
  ];

  const publicNavigation = navigation.filter(item => item.public);
  const protectedNavigation = navigation.filter(item => item.protected);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">📚</span>
          </div>
          <span className="font-bold text-xl">BookExchange</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {publicNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`transition-colors hover:text-foreground/80 ${
                isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              {item.name}
            </Link>
          ))}
          
          {user && protectedNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`transition-colors hover:text-foreground/80 ${
                isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Menu / Auth Buttons */}
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.username || 'User'} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {profile?.username && (
                      <p className="font-medium">{profile.username}</p>
                    )}
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/messages')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex space-x-2">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Sign Up
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-4 mt-4">
                {publicNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-lg font-medium transition-colors hover:text-foreground/80 ${
                      isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {user ? (
                  <>
                    {protectedNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`text-lg font-medium transition-colors hover:text-foreground/80 ${
                          isActive(item.href) ? 'text-foreground' : 'text-foreground/60'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                    <Button onClick={handleSignOut} variant="outline" className="w-full">
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        navigate('/auth');
                        setIsOpen(false);
                      }}
                      variant="outline" 
                      className="w-full"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => {
                        navigate('/auth');
                        setIsOpen(false);
                      }}
                      className="w-full"
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
