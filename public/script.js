document.addEventListener('DOMContentLoaded', function() {
  // Particle.js configuration
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            value_area: 800
          }
        },
        color: {
          value: "#0ce7fa"
        },
        shape: {
          type: "circle",
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 1,
            opacity_min: 0.1,
            sync: false
          }
        },
        size: {
          value: 3,
          random: true,
          anim: {
            enable: true,
            speed: 2,
            size_min: 0.1,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: "#0ce7fa",
          opacity: 0.4,
          width: 1
        },
        move: {
          enable: true,
          speed: 1,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false,
          attract: {
            enable: false,
            rotateX: 600,
            rotateY: 1200
          }
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: {
            enable: true,
            mode: "grab"
          },
          onclick: {
            enable: true,
            mode: "push"
          },
          resize: true
        },
        modes: {
          grab: {
            distance: 140,
            line_linked: {
              opacity: 1
            }
          },
          push: {
            particles_nb: 4
          }
        }
      },
      retina_detect: true
    });
  }

  // Chat functionality
  const talkBtn = document.getElementById('talkBtn');
  const closeChat = document.getElementById('closeChat');
  const chatbox = document.getElementById('chatbox');
  const chatlog = document.getElementById('chatlog');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');

  // Helper function to escape HTML to prevent XSS
  function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Open chat with proper initial message
  if (talkBtn) {
    talkBtn.addEventListener('click', () => {
      if (chatbox) {
        chatbox.classList.remove('hidden');
        
        // Add welcome message if chat is empty
        if (chatlog && !chatlog.innerHTML.trim()) {
          chatlog.innerHTML = '<p><strong>AI:</strong> Hi there! I\'m Atul\'s virtual assistant. How can I help you today?</p>';
        }
        
        // Focus on input field
        if (userInput) {
          userInput.focus();
        }
      }
    });
  }

  // Ensure close button works properly
  if (closeChat) {
    closeChat.addEventListener('click', () => {
      if (chatbox) {
        chatbox.classList.add('hidden');
      }
    });
  }

  // Send message function with proper error handling
  const sendMessage = async () => {
    if (!userInput || !chatlog) return;
    
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Display user message with HTML escaping for security
    chatlog.innerHTML += `<p><strong>You:</strong> ${escapeHTML(message)}</p>`;
    userInput.value = '';
    chatlog.scrollTop = chatlog.scrollHeight;
    
    // Show loading indicator
    const loadingId = Date.now();
    chatlog.innerHTML += `<p id="loading-${loadingId}"><strong>AI:</strong> <span class="typing">Thinking...</span></p>`;
    chatlog.scrollTop = chatlog.scrollHeight;
    
    try {
      console.log("Sending message to server:", message);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Received response:", data);
      
      // Remove the loading indicator
      const loadingElement = document.getElementById(`loading-${loadingId}`);
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Process and display AI response
      if (data.error) {
        chatlog.innerHTML += `<p><strong>AI:</strong> Sorry, I'm having trouble connecting right now. Please try again later.</p>`;
      } else {
        // Format the response (replace newlines with <br> for proper display)
        const formattedReply = escapeHTML(data.reply).replace(/\n/g, '<br>');
        chatlog.innerHTML += `<p><strong>AI:</strong> ${formattedReply}</p>`;
      }
      
      chatlog.scrollTop = chatlog.scrollHeight;
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Remove the loading indicator
      const loadingElement = document.getElementById(`loading-${loadingId}`);
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Display error message
      chatlog.innerHTML += `<p><strong>AI:</strong> Sorry, I'm having trouble connecting right now. Please try again later.</p>`;
      chatlog.scrollTop = chatlog.scrollHeight;
    }
  };

  // Send message on button click
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // Send message on Enter key
  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  // Add functionality to scroll to sections when clicking nav links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Adjust for navbar height
          behavior: 'smooth'
        });
      }
    });
  });

  // Check if knowledge base is loaded
  async function checkKnowledgeBase() {
    try {
      const res = await fetch('/health');
      const data = await res.json();
      
      if (data.knowledgeBase && data.knowledgeBase.documents === 0) {
        console.warn("No documents loaded in knowledge base. Chatbot may not provide personalized responses.");
      } else {
        console.log(`Knowledge base loaded with ${data.knowledgeBase.documents} document chunks from ${data.knowledgeBase.sources.length} sources`);
      }
    } catch (error) {
      console.error("Error checking knowledge base:", error);
    }
  }

  // Check knowledge base on page load
  checkKnowledgeBase();
});