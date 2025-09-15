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
  const subscriptionRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);

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
          books (id, title, user_id),
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

  // Setup real-time subscription - SIMPLIFIED AND FIXED
 useEffect(() => {
  if (!user) return;

  console.log('Setting up real-time subscription for user:', user.id);

  // Clean up existing subscription
  if (subscriptionRef.current) {
    supabase.removeChannel(subscriptionRef.current);
    subscriptionRef.current = null;
  }

  const channel = supabase
    .channel(`messages_for_${user.id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const msg = payload.new as any;

        // Only process messages involving the current user
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          console.log('📩 New relevant message:', msg);
          await handleNewMessage(msg);
        }
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      setIsConnected(status === 'SUBSCRIBED');
    });

  subscriptionRef.current = channel;

  return () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsConnected(false);
    }
  };
}, [user]);


  // Handle new real-time messages
  const handleNewMessage = useCallback(async (newMsg: any) => {
    try {
      // Fetch complete message data with relations
      const { data: completeMessage, error } = await supabase
        .from('messages')
        .select(`
          *,
          books (title, user_id),
          sender:profiles!messages_sender_id_fkey (username, avatar_url),
          receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
        `)
        .eq('id', newMsg.id)
        .single();

      if (error || !completeMessage) {
        console.error('Error fetching complete message:', error);
        return;
      }

      // Update messages if this message is for the currently selected book
      if (selectedBook && completeMessage.book_id === selectedBook) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === completeMessage.id);
          if (!exists) {
            return [...prev, completeMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          return prev;
        });
      }

      // Always update conversations
      setConversations(prev => {
        const existingIndex = prev.findIndex(conv => conv.book_id === completeMessage.book_id);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...completeMessage };
          return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else {
          return [completeMessage, ...prev].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      });
    } catch (error) {
      console.error('Error handling new message:', error);
    }
  }, [selectedBook]);

  // Fetch messages when selectedBook changes
  useEffect(() => {
    if (!selectedBook || !user) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      
      try {        
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select(`
            *,
            books (title, user_id),
            sender:profiles!messages_sender_id_fkey (username, avatar_url),
            receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
          `)
          .eq('book_id', selectedBook)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(messagesData || []);
        
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        setError(`Failed to load messages: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedBook, user]);

  // FIXED: Send message without immediate local state update
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBook || !user || sending) {
      return;
    }

    setSending(true);
    setError(null);
    
    // Store message text and clear input immediately for better UX
    const messageText = newMessage.trim();
    setNewMessage("");

    try {
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
      } else {
        // Existing conversation - get other participant
        receiverId = conversation.sender_id === user.id
          ? conversation.receiver_id
          : conversation.sender_id;
      }

      // Insert the message - let the real-time subscription handle the UI update
      const { error } = await supabase
        .from('messages')
        .insert([{
          message_text: messageText,
          book_id: selectedBook,
          sender_id: user.id,
          receiver_id: receiverId,
        }]);

      if (error) throw error;
      
      console.log('Message sent successfully');
      
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError(error.message);
      // Restore the message text if there was an error
      setNewMessage(messageText);
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
            <CardTitle>Conversations</CardTitle>
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
                {selectedBook
                  ? messages?.books?.title || 'Messages'
                  : 'Select a conversation'
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
                          message.sender_id === user.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender_id === user.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm">{message.message_text}</div>
                          <div className={`text-xs mt-1 ${
                            message.sender_id === user.id 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString()}
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
