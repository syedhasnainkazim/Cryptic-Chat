import { useEffect, useState } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { useChatStore } from '../store/chatStore';
import { useContactStore } from '../store/contactStore';
import useSocket from '../hooks/useSocket';

export default function ChatPage() {
  const fetchConversations = useChatStore(s => s.fetchConversations);
  const fetchContacts = useContactStore(s => s.fetchContacts);
  const activeConversation = useChatStore(s => s.activeConversation);
  const setActiveConversation = useChatStore(s => s.setActiveConversation);
  const [showChat, setShowChat] = useState(false);

  useSocket();

  useEffect(() => {
    fetchConversations();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (activeConversation) setShowChat(true);
  }, [activeConversation]);

  return (
    <div className="h-screen flex overflow-hidden bg-[#0d0d14]">
      {/* Sidebar — hidden on mobile when chat is open */}
      <div className={`flex-shrink-0 w-72 border-r border-[#1e1e2e] flex flex-col ${showChat ? 'hidden sm:flex' : 'flex'}`}>
        <Sidebar />
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!showChat ? 'hidden sm:flex' : 'flex'}`}>
        <ChatWindow
          onBack={() => {
            setShowChat(false);
            setActiveConversation(null);
          }}
        />
      </div>
    </div>
  );
}
