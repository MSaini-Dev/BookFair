import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'] & {
  books?: { title: string; user_id: string };
  sender?: { username: string; avatar_url: string };
  receiver?: { username: string; avatar_url: string };
};

type Conversation = Message;

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs to store current values for stable access in callbacks
  const currentUserRef = useRef<any>(null);
  const currentSelectedBookRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const messagesRef = useRef<Message[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);

  // Update refs when state changes
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  useEffect(() => {
    currentSelectedBookRef.current = selectedBook;
  }, [selectedBook]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Theme initialization
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
    initializeTheme();
  }, []);

  // Scroll when messages change
  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (!user) {
          navigate('/auth');
          return;
        }
        
        console.log('User authenticated:', user.id);
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        navigate('/auth');
      }
    };
    fetchUser();
  }, [navigate]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          books!messages_book_id_fkey (id, title, user_id),
          sender:profiles!messages_sender_id_fkey (username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Group by book_id and get latest message for each conversation
      const conversationMap = new Map<string, Conversation>();
      
      for (const message of messagesData || []) {
        if (!conversationMap.has(message.book_id) || 
            new Date(message.created_at) > new Date(conversationMap.get(message.book_id)!.created_at)) {
          conversationMap.set(message.book_id, message);
        }
      }

      const uniqueConversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setConversations(uniqueConversations);
      console.log('Conversations loaded:', uniqueConversations.length);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      setError(`Failed to load conversations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load conversations when user is available
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Handle URL book parameter
  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get('book');
      if (bookId) {
        setSelectedBook(bookId);
      }
    }
  }, [user]);

  // Fetch messages when selectedBook changes
  useEffect(() => {
    if (!selectedBook || !user) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {        
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select(`
            *,
            books!messages_book_id_fkey (title, user_id),
            sender:profiles!messages_sender_id_fkey (username, avatar_url),
            receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
          `)
          .eq('book_id', selectedBook)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(messagesData || []);
        console.log('Messages loaded for book:', selectedBook, messagesData?.length || 0);
        
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        setError(`Failed to load messages: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedBook, user]);

  // Enhanced Real-time subscription with broader filtering and polling fallback
  useEffect(() => {
    if (!user?.id) {
      console.log('No user, skipping real-time setup');
      return;
    }

    console.log('🚀 Setting up real-time subscription for user:', user.id);

    // Clean up any existing channel
    if (channelRef.current) {
      console.log('Removing existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }

    // Create a unique channel name
    const channelName = `messages-realtime-${Date.now()}`;
    
    // Create the channel with specific config
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: user.id }
      }
    });

    // Listen for ALL message inserts, we'll filter client-side
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        console.log('📨 Real-time INSERT payload received:', payload);
        
        const newMsg = payload.new as any;
        const currentUser = currentUserRef.current;
        
        if (!currentUser) {
          console.log('No current user, ignoring message');
          return;
        }

        // Check if message involves current user (either sender or receiver)
        const isForCurrentUser = newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id;
        
        if (!isForCurrentUser) {
          console.log('Message not for current user:', newMsg.sender_id, newMsg.receiver_id, 'vs', currentUser.id);
          return;
        }

        console.log('✅ Message is for current user, processing...', newMsg);

        try {
          // Wait a bit to ensure the message is fully committed with all relations
          await new Promise(resolve => setTimeout(resolve, 200));

          // Fetch the complete message with relations
          const { data: completeMessage, error } = await supabase
            .from('messages')
            .select(`
              *,
              books!messages_book_id_fkey (title, user_id),
              sender:profiles!messages_sender_id_fkey (username, avatar_url),
              receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
            `)
            .eq('id', newMsg.id)
            .single();

          if (error) {
            console.error('Error fetching complete message:', error);
            return;
          }

          console.log('📬 Complete message fetched:', completeMessage);

          // Update messages list if this is for the currently selected book
          const currentBook = currentSelectedBookRef.current;
          if (currentBook && currentBook === completeMessage.book_id) {
            console.log('Adding message to current conversation for book:', currentBook);
            
            setMessages(currentMessages => {
              const exists = currentMessages.some(msg => msg.id === completeMessage.id);
              
              if (exists) {
                console.log('Message already exists, skipping');
                return currentMessages;
              }
              
              const updated = [...currentMessages, completeMessage].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              console.log('Messages updated, new count:', updated.length);
              return updated;
            });
          } else {
            console.log('Message not for current book:', currentBook, 'vs', completeMessage.book_id);
          }

          // Always update conversations list
          setConversations(currentConversations => {
            const existingIndex = currentConversations.findIndex(conv => conv.book_id === completeMessage.book_id);
            
            if (existingIndex >= 0) {
              // Update existing conversation
              const updated = [...currentConversations];
              updated[existingIndex] = completeMessage;
              const sorted = updated.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              console.log('Updated existing conversation');
              return sorted;
            } else {
              // Add new conversation
              const updated = [completeMessage, ...currentConversations].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              console.log('Added new conversation');
              return updated;
            }
          });

        } catch (error) {
          console.error('Error processing real-time message:', error);
        }
      }
    );

    // Also listen for UPDATE events (in case messages are updated)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        console.log('📨 Real-time UPDATE payload received:', payload);
        
        const updatedMsg = payload.new as any;
        const currentUser = currentUserRef.current;
        
        if (!currentUser) return;

        const isForCurrentUser = updatedMsg.sender_id === currentUser.id || updatedMsg.receiver_id === currentUser.id;
        if (!isForCurrentUser) return;

        // Refresh conversations to get latest message states
        fetchConversations();
        
        // If this message is in the current conversation, refresh messages
        const currentBook = currentSelectedBookRef.current;
        if (currentBook === updatedMsg.book_id) {
          // Re-fetch messages for current book
          try {
            const { data: messagesData, error } = await supabase
              .from('messages')
              .select(`
                *,
                books!messages_book_id_fkey (title, user_id),
                sender:profiles!messages_sender_id_fkey (username, avatar_url),
                receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
              `)
              .eq('book_id', currentBook)
              .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
              .order('created_at', { ascending: true });

            if (!error && messagesData) {
              setMessages(messagesData);
            }
          } catch (error) {
            console.error('Error refreshing messages after update:', error);
          }
        }
      }
    );

    // Subscribe with simpler error handling
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('🎉 Real-time connected successfully!');
        setIsConnected(true);
      } else if (status === 'CLOSED') {
        setIsConnected(false);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error:', err);
        setError('Real-time connection failed');
        setIsConnected(false);
      }
    });

    // Store the channel reference
    channelRef.current = channel;

    // Polling fallback - check for new messages every 10 seconds as backup
    const pollInterval = setInterval(async () => {
      const currentUser = currentUserRef.current;
      const currentBook = currentSelectedBookRef.current;
      
      if (!currentUser || !currentBook) {
        return;
      }
      
      try {
        const { data: latestMessages, error } = await supabase
          .from('messages')
          .select(`
            *,
            books!messages_book_id_fkey (title, user_id),
            sender:profiles!messages_sender_id_fkey (username, avatar_url),
            receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
          `)
          .eq('book_id', currentBook)
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: true });

        if (!error && latestMessages) {
          const currentMessages = messagesRef.current;
          if (latestMessages.length > currentMessages.length) {
            console.log('🔄 Found new messages via polling, updating...');
            setMessages(latestMessages);
          }
        }
      } catch (error) {
        // Silently handle polling errors to avoid spam
      }
    }, 10000); // Poll every 10 seconds

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time subscription');
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user?.id]); // Only depend on user.id to prevent infinite reconnections

  // Send message function with optimistic updates
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBook || !user || sending) {
      console.log('Cannot send message - missing requirements');
      return;
    }

    setSending(true);
    setError(null);
    
    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Clear input immediately
    setNewMessage("");

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      message_text: messageText,
      book_id: selectedBook,
      sender_id: user.id,
      receiver_id: '', // Will be filled in below
      message_type: 'text',
      offer_amount: 0,
      read_at: '',
      created_at: new Date().toISOString(),
      sender: {
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'You',
        avatar_url: user.user_metadata?.avatar_url || ''
      }
    };

    try {
      console.log('📤 Sending message...');
      
      const conversation = conversations.find(c => c.book_id === selectedBook);
      let receiverId: string;

      if (!conversation) {
        // New conversation - get book owner
        const { data: bookData, error } = await supabase
          .from('books')
          .select('user_id, title')
          .eq('id', selectedBook)
          .single();

        if (error || !bookData) {
          throw new Error("Book not found");
        }
        
        receiverId = bookData.user_id;
        
        if (receiverId === user.id) {
          throw new Error("You cannot message yourself");
        }
        
        // Add book info to optimistic message
        optimisticMessage.books = {
          title: bookData.title,
          user_id: bookData.user_id
        };
      } else {
        // Existing conversation - get other participant
        receiverId = conversation.sender_id === user.id
          ? conversation.receiver_id
          : conversation.sender_id;
          
        optimisticMessage.books = conversation.books;
      }

      optimisticMessage.receiver_id = receiverId;

      // Add optimistic message to UI
      if (selectedBook === currentSelectedBookRef.current) {
        setMessages(prev => [...prev, optimisticMessage]);
      }

      // Insert the message
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          message_text: messageText,
          book_id: selectedBook,
          sender_id: user.id,
          receiver_id: receiverId,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Remove optimistic message and let real-time handle the real one
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      console.log('✅ Message sent successfully:', data);
      
    } catch (error: any) {
      console.error("❌ Error sending message:", error);
      setError(error.message);
      setNewMessage(messageText); // Restore message on error
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    if (!conv || !user) return "Unknown";
    
    if (conv.sender_id === user.id) {
      return conv.receiver?.username || "Unknown User";
    } else {
      return conv.sender?.username || "Unknown User";
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Enhanced test function
  const testRealtime = async () => {
    if (!user || !selectedBook) return;
    
    console.log('🧪 Testing real-time with manual message insert...');
    console.log('Current book:', selectedBook);
    console.log('User ID:', user.id);
    console.log('Is connected:', isConnected);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          message_text: `Test real-time message - ${new Date().toLocaleTimeString()}`,
          book_id: selectedBook,
          sender_id: user.id,
          receiver_id: user.id, // Send to self for testing
        }])
        .select()
        .single();
        
      if (error) throw error;
      console.log('Test message inserted:', data);
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  if (loading && !selectedBook) {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Conversations
              {/* Debug Info */}
              <div className="text-xs flex gap-1">
                <button 
                  onClick={testRealtime}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  disabled={!selectedBook}
                >
                  Test RT
                </button>
                <div className={`px-2 py-1 rounded text-xs ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isConnected ? '🟢' : '🔴'}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversations.length === 0 ? (
                <div className="text-center p-6">
                  <p className="text-muted-foreground mb-4">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse books to start messaging sellers
                  </p>
                  <Button
                    onClick={() => navigate('/browse')}
                    variant="outline"
                  >
                    Browse Books
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedBook === conv.book_id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedBook(conv.book_id)}
                    >
                      <div className="font-medium text-sm">
                        {conv.books?.title || 'Unknown Book'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        with {getOtherParticipant(conv)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {conv.message_text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedBook && messages.length > 0
                  ? messages[0]?.books?.title || 'Messages'
                  : selectedBook ? 'Messages' : 'Select a conversation'
                }
              </span>
              {selectedBook && (
                <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                  isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {isConnected ? 'Live' : 'Disconnected'}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedBook ? (
              <div className="flex items-center justify-center h-[400px] text-center">
                <div>
                  <p className="text-muted-foreground mb-4">Select a conversation to view messages</p>
                  <p className="text-sm text-muted-foreground">
                    Or browse books to message sellers
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-[500px]">
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 bg-background"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender_id === user?.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          } ${
                            message.id.startsWith('temp-') ? 'opacity-70' : ''
                          }`}
                        >
                          <div className="text-sm">{message.message_text}</div>
                          <div className={`text-xs mt-1 ${
                            message.sender_id === user?.id 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {message.id.startsWith('temp-') 
                              ? 'Sending...' 
                              : new Date(message.created_at).toLocaleTimeString()
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {error && (
                  <Alert className="mx-4 mb-2">
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 p-4 border-t">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
