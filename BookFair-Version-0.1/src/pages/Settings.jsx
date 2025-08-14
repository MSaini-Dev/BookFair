import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Settings() {
const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState('system');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Apply theme class to document element
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  };

  // Initialize theme from localStorage or profile
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const savedTheme = localStorage.getItem('theme') || profile.theme || 'system';
        setProfile(profile);
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }
      setLoading(false);
    };

    fetchUser();
  }, [navigate]);

  // Update theme in database and localStorage
  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            theme: newTheme,
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
        toast.success('Theme updated successfully!');
      } catch (error) {
        toast.error('Failed to save theme preference');
        console.error('Error updating theme:', error);
      }
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
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Theme Preferences</h2>
        
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={(e) => updateTheme(e.target.value)}
              className="mr-3 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">☀️ Light Mode</span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={(e) => updateTheme(e.target.value)}
              className="mr-3 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">🌙 Dark Mode</span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={theme === 'system'}
              onChange={(e) => updateTheme(e.target.value)}
              className="mr-3 text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">🖥️ System Default</span>
          </label>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Current theme: <span className="font-medium">{theme}</span>
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Account Information</h2>
        <div className="space-y-2">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Email:</strong> {user?.email}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Username:</strong> {profile?.username || 'Not set'}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Location:</strong> {profile?.location || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}
