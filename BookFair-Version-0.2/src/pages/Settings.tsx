import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Initialize theme on app load
  const initializeTheme = () => {
    // First check localStorage, then system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  };

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  };

  // Initialize theme immediately on component mount
  useEffect(() => {
    initializeTheme();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          navigate('/auth');
          return;
        }

        setUser(user);

        // Fetch or create profile
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it with current theme
          const currentTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
          
          const newProfile = {
            id: user.id,
            username: user.email?.split('@')[0] || 'user',
            theme: currentTheme,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (createError) throw createError;
          profile = createdProfile;
        } else if (profileError) {
          throw profileError;
        }

        if (profile) {
          setProfile(profile);
          
          // Use profile theme if it exists, otherwise keep current localStorage theme
          if (profile.theme) {
            const profileTheme = profile.theme as 'light' | 'dark' | 'system';
            setTheme(profileTheme);
            localStorage.setItem('theme', profileTheme);
            applyTheme(profileTheme);
          }
        }
      } catch (error: any) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user settings');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const updateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    if (saving) return;
    
    setSaving(true);
    try {
      // Update UI and localStorage immediately
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            username: profile?.username || user.email?.split('@')[0] || 'user',
            theme: newTheme,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) throw error;
        
        // Update local profile state
        setProfile(prev => prev ? { ...prev, theme: newTheme } : null);
        toast.success('Theme updated successfully!');
      }
    } catch (error: any) {
      toast.error('Failed to save theme preference');
      console.error('Error updating theme:', error);
      
      // Revert on error
      const previousTheme = profile?.theme as 'light' | 'dark' | 'system' || 'system';
      setTheme(previousTheme);
      localStorage.setItem('theme', previousTheme);
      applyTheme(previousTheme);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Don't clear localStorage on sign out to preserve theme
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast.error('Error signing out');
      console.error('Sign out error:', error);
    }
  };
const handleDeleteAccount = async () => {
  if (!user) return;

  setDeleting(true);
  try {
    // Delete user’s books
    await supabase.from("books").delete().eq("user_id", user.id);

    // Delete user’s messages
    await supabase
      .from("messages")
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    // Delete profile
    await supabase.from("profiles").delete().eq("id", user.id);

    // Call backend route to delete the auth user
    const response = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!response.ok) throw new Error("Failed to delete auth user");

    toast.success("Account deleted successfully");
    localStorage.clear();
    navigate("/");
  } catch (error: any) {
    console.error("Error deleting account:", error);
    toast.error("Failed to delete account. Please contact support.");
  } finally {
    setDeleting(false);
  }
};


  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme(theme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and settings</p>
        </div>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Appearance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose your preferred theme. Current theme: <Badge variant="outline">{theme}</Badge>
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <Select value={theme} onValueChange={updateTheme} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                System theme follows your device's dark mode preference
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Username</label>
              <p className="text-sm text-muted-foreground">{profile?.username || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <p className="text-sm text-muted-foreground">{profile?.location || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Member since</label>
              <p className="text-sm text-muted-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage your account settings and data
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
                      <p className="font-semibold">This includes:</p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>Your profile and account information</li>
                        <li>All your listed books</li>
                        <li>All your messages and conversations</li>
                        <li>Your purchase and selling history</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete my account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Note:</strong> Signing out will preserve your theme preference. 
                Deleting your account will permanently remove all your data and cannot be undone.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}