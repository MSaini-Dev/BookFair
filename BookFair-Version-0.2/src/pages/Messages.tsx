import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'] & {
  books?: { title: string };
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
  const navigate = useNavigate();

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

      const uniqueConversations: Conversation[] = [];
      const seenBooks = new Set();
      
      for (const message of messagesData || []) {
        if (!seenBooks.has(message.book_id)) {
          seenBooks.add(message.book_id);
          uniqueConversations.push(message);
        }
      }
      
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
            books (title),
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

    const subscription = supabase
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
          if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                books (title),
                sender:profiles!messages_sender_id_fkey (username, avatar_url),
                receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages(prev => [...prev, data]);
              fetchConversations();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedBook, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBook || !user) return;

    setSending(true);
    setError(null);

    try {
      let conversation = conversations.find(c => c.book_id === selectedBook);
      let receiverId: string;

      if (!conversation) {
        const { data: bookData, error } = await supabase
          .from('books')
          .select('user_id, title')
          .eq('id', selectedBook)
          .single();

        if (error || !bookData) throw new Error("Book not found");
        
        receiverId = bookData.user_id;
        if (receiverId === user.id) throw new Error("You cannot message yourself");
      } else {
        receiverId = conversation.sender_id === user.id 
          ? conversation.receiver_id 
          : conversation.sender_id;
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          text: newMessage.trim(),
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <h3 className="font-semibold mb-2">No conversations yet</h3>
                  <p className="text-sm">Browse books to start messaging sellers</p>
                  <Button 
                    onClick={() => navigate('/browse')} 
                    className="mt-4"
                    variant="outline"
                  >
                    Browse Books
                  </Button>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
                      selectedBook === conv.book_id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedBook(conv.book_id)}
                  >
                    <div className="font-medium text-sm mb-1">
                      {conv.books?.title || 'Unknown Book'}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      with {getOtherParticipant(conv)}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {conv.text}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedBook 
                ? messages[0]?.books?.title || 'Messages'
                : 'Select a conversation'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedBook ? (
              <div className="text-center text-muted-foreground h-[400px] flex items-center justify-center">
                <div>
                  <p className="mb-4">Select a conversation to view messages</p>
                  <p className="text-sm">Or browse books to message sellers</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[350px] pr-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
