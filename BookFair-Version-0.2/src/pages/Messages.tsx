// import { useEffect, useState, useRef, useCallback } from "react";
// import { supabase } from "../services/supabase";
// import { useNavigate } from "react-router-dom";
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import type { Database } from '../types/database.types';

// type Message = Database['public']['Tables']['messages']['Row'] & {
//   books?: { title: string; user_id: string };
//   sender?: { username: string; avatar_url: string };
//   receiver?: { username: string; avatar_url: string };
// };

// type Conversation = Message;

// export default function Messages() {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [selectedBook, setSelectedBook] = useState<string | null>(null);
//   const [user, setUser] = useState<any>(null);
//   const [conversations, setConversations] = useState<Conversation[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const subscriptionRef = useRef<any>(null);
//   const messagesContainerRef = useRef<HTMLDivElement>(null);
//   const navigate = useNavigate();
//   const [isConnected, setIsConnected] = useState(false);
  
//   // Add reconnection state management
//   const [reconnectAttempts, setReconnectAttempts] = useState(0);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const maxReconnectAttempts = 5;

//   // Improved scroll to bottom function
//   const scrollToBottom = useCallback(() => {
//     if (messagesContainerRef.current) {
//       messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
//     }
//   }, []);
//   useEffect(() => {
//     const initializeTheme = () => {
//       const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
//       const root = document.documentElement;
      
//       if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
//         root.classList.add('dark');
//         root.setAttribute('data-theme', 'dark');
//       } else {
//         root.classList.remove('dark');
//         root.setAttribute('data-theme', 'light');
//       }
//     };

//     // Initialize theme immediately
//     initializeTheme();

//     // Listen for system theme changes
//     const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
//     const handleSystemThemeChange = () => {
//       const savedTheme = localStorage.getItem('theme');
//       if (savedTheme === 'system') {
//         initializeTheme();
//       }
//     };

//     mediaQuery.addEventListener('change', handleSystemThemeChange);
    
//     return () => {
//       mediaQuery.removeEventListener('change', handleSystemThemeChange);
//     };
//   }, []);
//   // Scroll to bottom when messages change - with a slight delay
//   useEffect(() => {
//     const timeoutId = setTimeout(() => {
//       scrollToBottom();
//     }, 50);

//     return () => clearTimeout(timeoutId);
//   }, [messages, scrollToBottom]);

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const { data: { user }, error } = await supabase.auth.getUser();
//         if (error) throw error;
        
//         if (!user) {
//           navigate('/auth');
//           return;
//         }

//         setUser(user);
//       } catch (error) {
//         console.error("Error fetching user:", error);
//         navigate('/auth');
//       }
//     };

//     fetchUser();
//   }, [navigate]);

//   // Memoized fetchConversations to prevent unnecessary calls
//   const fetchConversations = useCallback(async () => {
//     if (!user) return;

//     setLoading(true);
//     setError(null);

//     try {
//       const { data: messagesData, error: messagesError } = await supabase
//         .from('messages')
//         .select(`
//           *,
//           books (id, title, user_id),
//           sender:profiles!messages_sender_id_fkey (username, avatar_url),
//           receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
//         `)
//         .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
//         .order('created_at', { ascending: false });

//       if (messagesError) throw messagesError;

//       // Group by book_id and get latest message for each conversation
//       const conversationMap = new Map<string, Conversation>();
      
//       for (const message of messagesData || []) {
//         if (!conversationMap.has(message.book_id) || 
//             new Date(message.created_at) > new Date(conversationMap.get(message.book_id)!.created_at)) {
//           conversationMap.set(message.book_id, message);
//         }
//       }

//       const uniqueConversations = Array.from(conversationMap.values())
//         .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

//       setConversations(uniqueConversations);
//     } catch (error: any) {
//       console.error("Error fetching conversations:", error);
//       setError(`Failed to load conversations: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [user]);

//   useEffect(() => {
//     if (user) {
//       fetchConversations();
//     }
//   }, [user, fetchConversations]);

//   useEffect(() => {
//     if (user) {
//       const urlParams = new URLSearchParams(window.location.search);
//       const bookId = urlParams.get('book');
//       if (bookId) {
//         setSelectedBook(bookId);
//       }
//     }
//   }, [user]);

//   // Stable real-time subscription setup
//   const setupRealtimeSubscription = useCallback(async () => {
//     if (!selectedBook || !user) return;

//     console.log(`Setting up subscription for book ${selectedBook}`);

//     // Clean up any existing subscription
//     if (subscriptionRef.current) {
//       console.log('Cleaning up previous subscription');
//       await supabase.removeChannel(subscriptionRef.current);
//       subscriptionRef.current = null;
//     }

//     // Clear any pending reconnection attempts
//     if (reconnectTimeoutRef.current) {
//       clearTimeout(reconnectTimeoutRef.current);
//       reconnectTimeoutRef.current = null;
//     }

//     try {
//       // Create new subscription with stable configuration
//       const channel = supabase
//         .channel(`messages_${selectedBook}_${user.id}`, {
//           config: {
//             presence: { key: user.id }
//           }
//         })
//         .on(
//           "postgres_changes",
//           {
//             event: "INSERT",
//             schema: "public",
//             table: "messages",
//             filter: `book_id=eq.${selectedBook}`
//           },
//           async (payload) => {
//             console.log('New message received via real-time:', payload);
            
//             // Check if message involves current user
//             const isForUser = payload.new.sender_id === user.id || payload.new.receiver_id === user.id;
            
//             if (isForUser) {
//               try {
//                 // Fetch complete message data immediately
//                 const { data: completeMessage, error } = await supabase
//                   .from('messages')
//                   .select(`
//                     *,
//                     books (title, user_id),
//                     sender:profiles!messages_sender_id_fkey (username, avatar_url),
//                     receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
//                   `)
//                   .eq('id', payload.new.id)
//                   .single();

//                 if (completeMessage && !error) {
//                   // Only add if not from current user (to avoid duplicates from send)
//                   if (payload.new.sender_id !== user.id) {
//                     setMessages(prev => {
//                       const exists = prev.some(msg => msg.id === completeMessage.id);
//                       if (!exists) {
//                         return [...prev, completeMessage];
//                       }
//                       return prev;
//                     });
//                   }

//                   // Update conversations list
//                   setConversations(prev => {
//                     const updated = prev.map(conv => {
//                       if (conv.book_id === completeMessage.book_id) {
//                         return { ...completeMessage };
//                       }
//                       return conv;
//                     });
                    
//                     const existingConv = prev.find(conv => conv.book_id === completeMessage.book_id);
//                     if (!existingConv) {
//                       return [completeMessage, ...updated];
//                     }
                    
//                     return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
//                   });
//                 }
//               } catch (error) {
//                 console.error('Error fetching complete message data:', error);
//               }
//             }
//           }
//         )
//         .subscribe((status, err) => {
//           console.log(`Subscription status: ${status}`, err);
          
//           if (status === 'SUBSCRIBED') {
//             setIsConnected(true);
//             setReconnectAttempts(0);
//             console.log('✅ Real-time subscription active');
//           } else if (status === 'CLOSED') {
//             setIsConnected(false);
//             console.log('❌ Real-time subscription closed');
            
//             // Implement exponential backoff for reconnection
//             if (reconnectAttempts < maxReconnectAttempts) {
//               const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
//               console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);
              
//               reconnectTimeoutRef.current = setTimeout(() => {
//                 setReconnectAttempts(prev => prev + 1);
//                 setupRealtimeSubscription();
//               }, delay);
//             } else {
//               console.log('Max reconnection attempts reached');
//               setError('Connection lost. Please refresh the page.');
//             }
//           } else if (status === 'CHANNEL_ERROR') {
//             setIsConnected(false);
//             console.error('Channel error:', err);
//             setError('Real-time connection error. Messages may not update automatically.');
//           }
//         });

//       subscriptionRef.current = channel;
      
//     } catch (error) {
//       console.error('Error setting up subscription:', error);
//       setError('Failed to establish real-time connection');
//     }
//   }, [selectedBook, user, reconnectAttempts]);

//   // Effect for fetching messages and setting up subscription
//   useEffect(() => {
//     if (!selectedBook || !user) return;

//     const fetchMessages = async () => {
//       try {
//         const { data: messagesData, error } = await supabase
//           .from('messages')
//           .select(`
//             *,
//             books (title, user_id),
//             sender:profiles!messages_sender_id_fkey (username, avatar_url),
//             receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
//           `)
//           .eq('book_id', selectedBook)
//           .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
//           .order('created_at', { ascending: true });

//         if (error) throw error;

//         setMessages(messagesData || []);
        
//         // Set up real-time subscription after messages are loaded
//         setupRealtimeSubscription();
        
//       } catch (error: any) {
//         console.error('Error fetching messages:', error);
//         setError(`Failed to load messages: ${error.message}`);
//       }
//     };

//     fetchMessages();

//     // Cleanup function
//     return () => {
//       if (subscriptionRef.current) {
//         console.log('Cleaning up subscription in useEffect cleanup');
//         supabase.removeChannel(subscriptionRef.current);
//         subscriptionRef.current = null;
//       }
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//         reconnectTimeoutRef.current = null;
//       }
//     };
//   }, [selectedBook, user]); // Removed setupRealtimeSubscription from dependencies

//   const sendMessage = async () => {
//     if (!newMessage.trim() || !selectedBook || !user || sending) return;

//     setSending(true);
//     setError(null);

//     try {
//       const conversation = conversations.find(c => c.book_id === selectedBook);
//       let receiverId: string;

//       if (!conversation) {
//         // New conversation - get book owner
//         const { data: bookData, error } = await supabase
//           .from('books')
//           .select('user_id, title')
//           .eq('id', selectedBook)
//           .single();

//         if (error || !bookData) throw new Error("Book not found");
//         receiverId = bookData.user_id;
//         if (receiverId === user.id) throw new Error("You cannot message yourself");
//       } else {
//         // Existing conversation - get other participant
//         receiverId = conversation.sender_id === user.id
//           ? conversation.receiver_id
//           : conversation.sender_id;
//       }

//       // Clear the input immediately for better UX
//       const messageText = newMessage.trim();
//       setNewMessage("");

//       // Insert the message
//       const { data: newMessageData, error } = await supabase
//         .from('messages')
//         .insert([{
//           message_text: messageText,
//           book_id: selectedBook,
//           sender_id: user.id,
//           receiver_id: receiverId,
//         }])
//         .select(`
//           *,
//           books (title, user_id),
//           sender:profiles!messages_sender_id_fkey (username, avatar_url),
//           receiver:profiles!messages_receiver_id_fkey (username, avatar_url)
//         `)
//         .single();

//       if (error) throw error;

//       // Immediately add the message to local state for instant feedback
//       if (newMessageData) {
//         setMessages(prev => {
//           // Check if message already exists to prevent duplicates
//           const exists = prev.some(msg => msg.id === newMessageData.id);
//           if (!exists) {
//             return [...prev, newMessageData];
//           }
//           return prev;
//         });

//         // Update conversations list
//         setConversations(prev => {
//           const updated = prev.map(conv => {
//             if (conv.book_id === newMessageData.book_id) {
//               return { ...newMessageData };
//             }
//             return conv;
//           });
          
//           // If this is a new conversation, add it
//           const existingConv = prev.find(conv => conv.book_id === newMessageData.book_id);
//           if (!existingConv) {
//             return [newMessageData, ...updated];
//           }
          
//           return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
//         });
//       }
      
//     } catch (error: any) {
//       console.error("Error sending message:", error);
//       setError(error.message);
//       // Restore the message text if there was an error
//       // setNewMessage(messageText);
//     } finally {
//       setSending(false);
//     }
//   };

//   // Cleanup on component unmount
//   useEffect(() => {
//     return () => {
//       if (subscriptionRef.current) {
//         console.log('Component unmounting, cleaning up subscription');
//         supabase.removeChannel(subscriptionRef.current);
//       }
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//     };
//   }, []);

//   const getOtherParticipant = (conv: Conversation) => {
//     if (!conv || !user) return "Unknown";
    
//     if (conv.sender_id === user.id) {
//       return conv.receiver?.username || "Unknown User";
//     } else {
//       return conv.sender?.username || "Unknown User";
//     }
//   };

//   // Handle Enter key press
//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   if (loading) {
//     return (
//       <div className="container mx-auto px-4 py-8">
//         <div className="flex items-center justify-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
//         {/* Conversations List */}
//         <Card className="md:col-span-1">
//           <CardHeader>
//             <CardTitle>Conversations</CardTitle>
//           </CardHeader>
//           <CardContent className="p-0">
//             <ScrollArea className="h-[500px]">
//               {conversations.length === 0 ? (
//                 <div className="text-center p-6">
//                   <p className="text-muted-foreground mb-4">No conversations yet</p>
//                   <p className="text-sm text-muted-foreground mb-4">
//                     Browse books to start messaging sellers
//                   </p>
//                   <Button
//                     onClick={() => navigate('/browse')}
//                     variant="outline"
//                   >
//                     Browse Books
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="space-y-2 p-4">
//                   {conversations.map((conv) => (
//                     <div
//                       key={conv.id}
//                       className={`p-3 rounded-lg cursor-pointer transition-colors ${
//                         selectedBook === conv.book_id
//                           ? 'bg-primary/10 border border-primary/20'
//                           : 'hover:bg-muted'
//                       }`}
//                       onClick={() => setSelectedBook(conv.book_id)}
//                     >
//                       <div className="font-medium text-sm">
//                         {conv.books?.title || 'Unknown Book'}
//                       </div>
//                       <div className="text-xs text-muted-foreground">
//                         with {getOtherParticipant(conv)}
//                       </div>
//                       <div className="text-xs text-muted-foreground mt-1 truncate">
//                         {conv.message_text}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </ScrollArea>
//           </CardContent>
//         </Card>

//         {/* Messages */}
//         <Card className="md:col-span-2">
//           <CardHeader>
//             <CardTitle className="flex items-center justify-between">
//               <span>
//                 {selectedBook
//                   ? messages[0]?.books?.title || 'Messages'
//                   : 'Select a conversation'
//                 }
//               </span>
//               {selectedBook && (
//                 <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
//                   isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                 }`}>
//                   <div className={`w-2 h-2 rounded-full ${
//                     isConnected ? 'bg-green-500' : 'bg-red-500'
//                   }`}></div>
//                   {isConnected ? 'Connected' : reconnectAttempts > 0 ? 'Reconnecting...' : 'Disconnected'}
//                 </div>
//               )}
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-0">
//             {!selectedBook ? (
//               <div className="flex items-center justify-center h-[400px] text-center">
//                 <div>
//                   <p className="text-muted-foreground mb-4">Select a conversation to view messages</p>
//                   <p className="text-sm text-muted-foreground">
//                     Or browse books to message sellers
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="flex flex-col h-[500px]">
//                 <div 
//                   ref={messagesContainerRef}
//                   className="flex-1 overflow-y-auto p-4 bg-background"
//                   style={{ scrollBehavior: 'smooth' }}
//                 >
//                   <div className="space-y-2">
//                     {messages.map((message) => (
//                       <div
//                         key={message.id}
//                         className={`flex ${
//                           message.sender_id === user.id ? 'justify-end' : 'justify-start'
//                         }`}
//                       >
//                         <div
//                           className={`max-w-[80%] p-3 rounded-lg ${
//                             message.sender_id === user.id 
//                               ? 'bg-primary text-primary-foreground' 
//                               : 'bg-muted'
//                           }`}
//                         >
//                           <div className="text-sm">{message.message_text}</div>
//                           <div className={`text-xs mt-1 ${
//                             message.sender_id === user.id 
//                               ? 'text-primary-foreground/70' 
//                               : 'text-muted-foreground'
//                           }`}>
//                             {new Date(message.created_at).toLocaleTimeString()}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                     {/* Scroll anchor */}
//                     <div ref={messagesEndRef} />
//                   </div>
//                 </div>

//                 {error && (
//                   <Alert className="mx-4 mb-2">
//                     <AlertDescription>
//                       {error}
//                       {error.includes('Connection lost') && (
//                         <Button
//                           variant="link"
//                           className="p-0 ml-2 h-auto"
//                           onClick={() => window.location.reload()}
//                         >
//                           Refresh
//                         </Button>
//                       )}
//                     </AlertDescription>
//                   </Alert>
//                 )}

//                 <div className="flex gap-2 p-4 border-t">
//                   <Input
//                     value={newMessage}
//                     onChange={(e) => setNewMessage(e.target.value)}
//                     placeholder="Type your message..."
//                     onKeyPress={handleKeyPress}
//                     disabled={sending}
//                   />
//                   <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
//                     {sending ? 'Sending...' : 'Send'}
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }
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
  
  // Add reconnection state management
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;

  // Improved scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

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

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'system') {
        initializeTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

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

  // Memoized fetchConversations to prevent unnecessary calls
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

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get('book');
      if (bookId) {
        setSelectedBook(bookId);
      }
    }
  }, [user]);

  // Fixed real-time subscription setup
  const setupRealtimeSubscription = useCallback(async () => {
    if (!user) return;

    console.log(`Setting up global subscription for user ${user.id}`);

    // Clean up any existing subscription
    if (subscriptionRef.current) {
      console.log('Cleaning up previous subscription');
      await supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsConnected(false);
    }

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Create new subscription with unique channel name for user
      const channelName = `messages_user_${user.id}_${Date.now()}`;
      
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT", // Only listen to new messages
            schema: "public",
            table: "messages",
            // Filter for messages where user is sender OR receiver
            filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`
          },
          async (payload) => {
            console.log('Real-time message event:', payload.eventType, payload);
            
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as any;
              
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

                if (completeMessage && !error) {
                  console.log('Adding new message to state:', completeMessage);
                  
                  // Add to messages if viewing the same book
                  if (selectedBook === completeMessage.book_id) {
                    setMessages(prev => {
                      const exists = prev.some(msg => msg.id === completeMessage.id);
                      if (!exists) {
                        const updated = [...prev, completeMessage];
                        console.log('Messages updated, count:', updated.length);
                        return updated;
                      }
                      return prev;
                    });
                  }

                  // Update conversations list
                  setConversations(prev => {
                    const updated = prev.map(conv => {
                      if (conv.book_id === completeMessage.book_id) {
                        return { ...completeMessage };
                      }
                      return conv;
                    });
                    
                    const existingConv = prev.find(conv => conv.book_id === completeMessage.book_id);
                    if (!existingConv) {
                      return [completeMessage, ...updated];
                    }
                    
                    return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  });
                }
              } catch (error) {
                console.error('Error fetching complete message data:', error);
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`Subscription status: ${status}`, err);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setReconnectAttempts(0);
            console.log('✅ Real-time subscription active');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            console.log(`❌ Subscription ${status.toLowerCase()}`);
            
            // Implement exponential backoff for reconnection
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
              console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1})`);
              
              reconnectTimeoutRef.current = setTimeout(() => {
                setReconnectAttempts(prev => prev + 1);
                setupRealtimeSubscription();
              }, delay);
            } else {
              console.log('Max reconnection attempts reached');
              setError('Connection lost. Please refresh the page.');
            }
          }
        });

      subscriptionRef.current = channel;
      
    } catch (error) {
      console.error('Error setting up subscription:', error);
      setError('Failed to establish real-time connection');
      setIsConnected(false);
    }
  }, [user, reconnectAttempts, selectedBook]);

  // Set up global subscription when user is available
  useEffect(() => {
    if (user) {
      setupRealtimeSubscription();
    }

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up subscription in user effect');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user]); // Only depend on user, not setupRealtimeSubscription

  // Separate effect for fetching messages when book selection changes
  useEffect(() => {
    if (!selectedBook || !user) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        console.log('Fetching messages for book:', selectedBook);
        
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

        console.log('Fetched messages:', messagesData?.length || 0);
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBook || !user || sending) return;

    setSending(true);
    setError(null);

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

        if (error || !bookData) throw new Error("Book not found");
        receiverId = bookData.user_id;
        if (receiverId === user.id) throw new Error("You cannot message yourself");
      } else {
        // Existing conversation - get other participant
        receiverId = conversation.sender_id === user.id
          ? conversation.receiver_id
          : conversation.sender_id;
      }

      // Store message text and clear input immediately for better UX
      const messageText = newMessage.trim();
      setNewMessage("");

      console.log('Sending message:', messageText);

      // Insert the message
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
      // Real-time subscription will handle adding the message to state
      
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError(error.message);
      // Restore the message text if there was an error
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up all subscriptions');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

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
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedBook
                  ? messages[0]?.books?.title || 'Messages'
                  : 'Select a conversation'
                }
              </span>
              {user && (
                <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                  isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {isConnected ? 'Live' : reconnectAttempts > 0 ? 'Reconnecting...' : 'Disconnected'}
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
                      {error.includes('Connection lost') && (
                        <Button
                          variant="link"
                          className="p-0 ml-2 h-auto"
                          onClick={() => window.location.reload()}
                        >
                          Refresh
                        </Button>
                      )}
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
