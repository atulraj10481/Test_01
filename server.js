const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const pdfParse = require('pdf-parse');
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Define repository path for PDFs
const PDF_REPO_PATH = path.join(__dirname, 'pdf_repository');
let knowledgeBase = [];

// Function to load all PDFs from repository
async function loadPDFRepository() {
  console.log("Loading PDF knowledge base...");
  try {
    // Ensure the directory exists
    if (!fs.existsSync(PDF_REPO_PATH)) {
      fs.mkdirSync(PDF_REPO_PATH, { recursive: true });
      console.log(`Created PDF repository at ${PDF_REPO_PATH}`);
      return [];
    }
    
    const pdfFiles = fs.readdirSync(PDF_REPO_PATH).filter(file => file.endsWith('.pdf'));
    console.log(`Found ${pdfFiles.length} PDF files`);
    
    const documents = [];
    
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(PDF_REPO_PATH, pdfFile);
      console.log(`Processing: ${pdfFile}`);
      
      try {
        // Read and parse PDF
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        
        // Split into chunks (simple approach - can be improved)
        const textChunks = splitIntoChunks(pdfData.text, 1000);
        
        // Add each chunk as a document with metadata
        textChunks.forEach((chunk, index) => {
          documents.push({
            content: chunk,
            metadata: {
              source: pdfFile,
              chunk: index,
              title: pdfFile.replace('.pdf', '')
            }
          });
        });
        
        console.log(`Added ${textChunks.length} chunks from ${pdfFile}`);
      } catch (error) {
        console.error(`Error processing ${pdfFile}: ${error.message}`);
      }
    }
    
    return documents;
  } catch (error) {
    console.error("Error loading PDF repository:", error);
    return [];
  }
}

// Simple text chunking function
function splitIntoChunks(text, chunkSize) {
  const chunks = [];
  let currentChunk = "";
  
  // Split by newline to avoid cutting in the middle of paragraphs when possible
  const paragraphs = text.split(/\n+/);
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size, save current chunk and start new one
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    
    currentChunk += paragraph + "\n";
  }
  
  // Add the last chunk if there's anything left
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Simple search function to find relevant document chunks
function searchDocuments(query, documents, maxResults = 3) {
  if (!documents || documents.length === 0) return [];
  
  // Convert query to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();
  
  // Score documents based on keyword matching
  const scoredDocs = documents.map(doc => {
    const lowerContent = doc.content.toLowerCase();
    // Count occurrences of query terms in the document
    const queryTerms = lowerQuery.split(/\s+/).filter(term => term.length > 2);
    let score = 0;
    
    for (const term of queryTerms) {
      // Count occurrences of the term in the content
      const regex = new RegExp(term, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    return { ...doc, score };
  });
  
  // Sort by score (descending) and take top results
  return scoredDocs
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Chat endpoint with PDF knowledge integration
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  
  try {
    // Search for relevant documents based on the user's query
    const relevantDocs = searchDocuments(userMessage, knowledgeBase, 3);
    
    // Prepare context from the documents
    let context = "";
    if (relevantDocs.length > 0) {
      context = "Based on the following information from Atul's documents:\n\n" + 
        relevantDocs.map(doc => `[From ${doc.metadata.source}]: ${doc.content.substring(0, 300)}`).join("\n\n");
    }
    
    // Add context to the message
    const messageWithContext = `
      You are a virtual assistant for Atul Raj, a Product Manager and podcast host.
      Keep responses friendly, professional, and concise (1-3 sentences when possible).
      
      ${context ? context + "\n\n" : ""}
      User's question: ${userMessage}
      
      If the question cannot be answered based on Atul's documents, simply respond based on your general knowledge about product management, computer science engineering, podcasting, or leadership.
    `;
    
    console.log("Sending request to Gemini API...");
    
    // Generate response
    const result = await model.generateContent(messageWithContext);
    const response = result.response;
    const text = response.text();
    
    console.log("Received response from Gemini API");
    
    res.json({ reply: text });
  } catch (error) {
    console.error("API Error:", error);
    
    res.status(500).json({ 
      reply: "Sorry, I'm having trouble connecting to my AI services. Please try again later.",
      error: error.message 
    });
  }
});

// Add endpoint to refresh knowledge base
app.post("/api/refresh-knowledge", async (req, res) => {
  try {
    knowledgeBase = await loadPDFRepository();
    res.json({ 
      success: true, 
      message: `Knowledge base refreshed. Loaded ${knowledgeBase.length} document chunks.` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to refresh knowledge base", 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK",
    knowledgeBase: {
      documents: knowledgeBase.length,
      sources: knowledgeBase.length > 0 
        ? [...new Set(knowledgeBase.map(doc => doc.metadata.source))]
        : []
    }
  });
});

// Handle SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000

// Initialize and start the server
async function startServer() {
  try {
    // Load knowledge base
    knowledgeBase = await loadPDFRepository();
    console.log(`Knowledge base loaded with ${knowledgeBase.length} document chunks`);
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();