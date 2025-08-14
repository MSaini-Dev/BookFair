import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch current user
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
  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Get all messages for this user with profiles joined
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

      // Group by book_id and get the latest message for each conversation
      const uniqueConversations = [];
      const seenBooks = new Set();

      for (const message of messagesData || []) {
        if (!seenBooks.has(message.book_id)) {
          seenBooks.add(message.book_id);
          uniqueConversations.push(message);
        }
      }

      setConversations(uniqueConversations);
    } catch (error) {
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

  // Fetch messages for selected book
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
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError(`Failed to load messages: ${error.message}`);
      }
    };

    fetchMessages();

    // Set up real-time subscription
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
            // Fetch the complete message with profile data
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
              fetchConversations(); // Refresh conversations
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
      // Find receiver ID
      let conversation = conversations.find(c => c.book_id === selectedBook);
      let receiverId;

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
        receiverId = conversation.sender_id === user.id ? conversation.receiver_id : conversation.sender_id;
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
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error.message);
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv || !user) return "Unknown";
    
    if (conv.sender_id === user.id) {
      return conv.receiver?.username || "Unknown User";
    } else {
      return conv.sender?.username || "Unknown User";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
          <div className="flex h-full">
            {/* Conversations Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Browse books to start messaging sellers</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedBook(conv.book_id)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedBook === conv.book_id ? 'bg-indigo-50 border-indigo-200' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {getOtherParticipant(conv).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {conv.books?.title || "Unknown Book"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {conv.sender_id === user.id ? `To: ${getOtherParticipant(conv)}` : `From: ${getOtherParticipant(conv)}`}
                          </div>
                          <div className="text-xs text-gray-400 truncate mt-1">
                            {conv.text?.substring(0, 30)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedBook ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sender_id === user.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <div className="text-sm">{msg.text}</div>
                          <div className={`text-xs mt-1 ${
                            msg.sender_id === user.id ? 'text-indigo-200' : 'text-gray-500'
                          }`}>
                            {msg.sender?.username || (msg.sender_id === user.id ? "You" : "Unknown")} •{" "}
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl text-gray-300 mb-4">💬</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation to start chatting</h3>
                    <p className="text-gray-600">Or browse books to message sellers</p>
                    <button
                      onClick={() => navigate('/browse')}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Browse Books
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
