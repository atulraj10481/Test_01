const talkBtn = document.getElementById('talkBtn');
const userInput = document.getElementById('userInput');
const chatlog = document.getElementById('chatlog');

// Sample responses for simple AI agentic vibe
const responses = {
  hello: "Hi there! 👋 How can I assist you today?",
  projects: "I’ve worked on some amazing tech projects. Want details about a specific one?",
  contact: "You can reach me at your.email@example.com or via LinkedIn!",
  name: "I’m Your Name, a tech builder passionate about web, AI, and problem-solving.",
  default: "I'm not sure about that. Ask me about my work, contact, or background!"
};

// Handle chatbot response
function getBotReply(message) {
  message = message.toLowerCase();
  for (const key in responses) {
    if (message.includes(key)) {
      return responses[key];
    }
  }
  return responses.default;
}

// Append message to chatlog
function addMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender;
  div.innerText = text;
  chatlog.appendChild(div);
  chatlog.scrollTop = chatlog.scrollHeight;
}

// Trigger chat input focus
talkBtn.addEventListener('click', () => {
  userInput.focus();
});

// Send message on Enter key
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && userInput.value.trim() !== '') {
    const message = userInput.value.trim();
    addMessage('user', message);
    const reply = getBotReply(message);
    setTimeout(() => addMessage('bot', reply), 600);
    userInput.value = '';
  }
});
