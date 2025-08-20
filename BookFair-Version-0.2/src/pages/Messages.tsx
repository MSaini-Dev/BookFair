import { useEffect, useState, useRef } from "react";
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
  const navigate = useNavigate();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const fetchConversations = async () => {
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
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get('book');
      if (bookId) {
        setSelectedBook(bookId);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!selectedBook || !user) return;

    const fetchMessages = async () => {
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
      }
    };

    fetchMessages();

    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Set up real-time subscription
    subscriptionRef.current = supabase
      .channel(`messages-${selectedBook}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `book_id=eq.${selectedBook}`,
        },
        async (payload) => {
          // Only add message if it involves current user
          if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                books (title, user_id),
                sender:profiles!messages_sender_id_fkey (username, avatar_url),
                receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages(prev => [...prev, data]);
              fetchConversations(); // Refresh conversations
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [selectedBook, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBook || !user || sending) return;

    setSending(true);
    setError(null);

    try {
      let conversation = conversations.find(c => c.book_id === selectedBook);
      let receiverId: string;

      if (!conversation) {
        // New conversation - get book owner
        const { data: bookData, error } = await supabase
          .from('books')
          .select('user_id, title')
          .eq('id', selectedBook)
          .single();

        if (error || !bookData) throw new Error("Book not found");

        receiverId = bookData.user_id;
        if (receiverId === user.id) throw new Error("You cannot message yourself");
      } else {
        // Existing conversation - get other participant
        receiverId = conversation.sender_id === user.id
          ? conversation.receiver_id
          : conversation.sender_id;
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          message_text: newMessage.trim(),
          book_id: selectedBook,
          sender_id: user.id,
          receiver_id: receiverId,
        }]);

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError(error.message);
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
            <CardTitle>
              {selectedBook
                ? messages[0]?.books?.title || 'Messages'
                : 'Select a conversation'
              }
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
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                            message.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.message_text}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {error && (
                  <Alert className="mx-4 mb-2">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 p-4 border-t">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={sending}
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
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
