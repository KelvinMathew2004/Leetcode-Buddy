import React, { useState, useRef, useEffect } from 'react';
import problemsData from './problems.json';
import { Play, Check, Terminal, Layout, Code, Loader2, Send, Cpu, ChevronDown, ArrowLeft, Search } from 'lucide-react';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
const MODEL_NAME = "gemini-flash-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// --- PROCESS JSON DATASET ---
const PROBLEMS = problemsData.map(p => {
  let generatedStarterCode = `class Solution:\n    def solve(self):\n        # Write your solution here\n        pass\n`;
  
  if (p.solution_code_python) {
    const lines = p.solution_code_python.split('\n').filter(line => line.trim() !== '');
    if (lines.length >= 2) {
      generatedStarterCode = `${lines[0]}\n${lines[1]}\n        # Write your solution here\n        pass\n`;
    }
  }

  return {
    ...p,
    starterCode: generatedStarterCode,
    topics: p.topics || [],
    hints: p.hints || []
  };
});

export default function App() {
  const [view, setView] = useState('home'); // 'home' or 'editor'
  const [activeProblemId, setActiveProblemId] = useState(PROBLEMS[0]?.frontendQuestionId || "1");
  const activeProblem = PROBLEMS.find(p => p.frontendQuestionId === activeProblemId) || PROBLEMS[0];

  const [code, setCode] = useState(activeProblem?.starterCode || "");
  const [activeTab, setActiveTab] = useState('problem');
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: `Hello! I'm your AI Interviewer. I see we're tackling "${activeProblem?.title}". What's your initial thought on how to approach this problem?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [output, setOutput] = useState("Run your code to see the evaluation here.");
  const [isRunning, setIsRunning] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, view]);

  const handleSelectProblem = (id) => {
    const newProblem = PROBLEMS.find(p => p.frontendQuestionId === id);
    if (newProblem) {
      setActiveProblemId(id);
      setCode(newProblem.starterCode);
      setOutput("Run your code to see the evaluation here.");
      setChatHistory([
        { role: 'model', text: `Hello! I'm your AI Interviewer. I see we're tackling "${newProblem.title}". What's your initial thought on how to approach this problem?` }
      ]);
      setView('editor');
    }
  };

  const handleProblemChange = (e) => {
    handleSelectProblem(e.target.value);
  };

  const callGemini = async (prompt, systemInstruction) => {
    let retries = 5;
    let delay = 1000;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    while (retries > 0) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      } catch (error) {
        retries--;
        console.error("API Call Failed:", error.message);
        if (retries === 0) return `Error connecting to AI server: ${error.message}`;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; 
      }
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const RAG_CONTEXT = `Topics: ${activeProblem.topics.join(', ')}. Official Hints: ${activeProblem.hints.join(' ')}`;

    const systemPrompt = `You are a strict but helpful FAANG technical interviewer. 
    1. NEVER write the full code for the user. 
    2. Guide them using the Socratic method (ask questions).
    3. Use the following algorithm context to guide your hints: ${RAG_CONTEXT}
    4. Keep responses concise (2-3 sentences max).`;
    
    const promptContext = `User Code:\n${code}\n\nUser Question:\n${userMsg}`;
    
    const response = await callGemini(promptContext, systemPrompt);
    
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsTyping(false);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("Evaluating code...\nGenerating edge cases...\nAnalyzing Time/Space complexity...");
    
    const systemPrompt = `You are an automated grading agent. 
    Step 1: Read the user's Python code for the '${activeProblem.title}' problem.
    Step 2: Generate 3 hidden test cases in your mind (including edge cases).
    Step 3: Evaluate if the code passes those tests.
    Step 4: Analyze Time and Space complexity.
    
    Output Format:
    [PASS/FAIL]
    Time Complexity: O(?)
    Space Complexity: O(?)
    Feedback: [1-2 sentences on efficiency]`;

    const prompt = `Evaluate this code:\n${code}`;
    
    const result = await callGemini(prompt, systemPrompt);
    setOutput(result);
    setIsRunning(false);
  };

  const handleKeyDown = (e) => {
    const { value, selectionStart, selectionEnd } = e.target;

    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + '    ' + value.substring(selectionEnd);
      setCode(newValue);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 4;
      }, 0);
    } 
    else if (e.key === 'Enter') {
      e.preventDefault();
      const currentLine = value.substring(0, selectionStart).split('\n').pop();
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : '';

      if (currentLine.trim().endsWith(':')) {
        indent += '    ';
      }

      const newValue = value.substring(0, selectionStart) + '\n' + indent + value.substring(selectionEnd);
      setCode(newValue);

      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 1 + indent.length;
      }, 0);
    }
  };

  const getDifficultyColor = (diff) => {
    if (diff === 'Easy') return 'text-green-500 bg-green-500/10';
    if (diff === 'Medium') return 'text-yellow-500 bg-yellow-500/10';
    return 'text-red-500 bg-red-500/10';
  };

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center space-x-3 mb-12 border-b border-gray-800 pb-6">
            <Code className="text-blue-500" size={36} />
            <h1 className="text-white font-bold text-3xl tracking-tight">Leetcode Buddy</h1>
          </div>

          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl text-white font-bold mb-2">Study Plan</h2>
              <p className="text-gray-400">Master algorithms with your personal AI interviewer.</p>
            </div>
            
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search problems..." 
                className="bg-[#1a1a1a] border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors w-64"
              />
            </div>
          </div>

          {/* Problem List */}
          <div className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-[#1a1a1a] text-gray-400 text-sm">
                  <th className="p-4 font-semibold w-16 text-center">Status</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold w-32">Difficulty</th>
                  <th className="p-4 font-semibold hidden md:table-cell">Topics</th>
                </tr>
              </thead>
              <tbody>
                {PROBLEMS.map(p => (
                  <tr 
                    key={p.frontendQuestionId}
                    onClick={() => handleSelectProblem(p.frontendQuestionId)}
                    className="border-b border-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 text-center">
                      <div className="w-5 h-5 mx-auto rounded-full border-2 border-gray-600 group-hover:border-blue-500 transition-colors"></div>
                    </td>
                    <td className="p-4 font-medium text-gray-200 group-hover:text-blue-400 transition-colors">
                      {p.frontendQuestionId}. {p.title}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 text-xs rounded-full font-medium ${getDifficultyColor(p.difficulty)}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 truncate max-w-[200px] hidden md:table-cell">
                      {p.topics.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-300 font-sans">
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#1a1a1a] border-b border-gray-800 flex items-center px-4 justify-between z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setView('home')}
            className="p-1.5 hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-white"
            title="Back to problems"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center space-x-2 border-l border-gray-800 pl-4">
            <Code className="text-blue-500" size={20} />
            <span className="text-white font-bold text-md tracking-tight hidden sm:block">Leetcode Buddy</span>
          </div>
          
          {/* Problem Selector Dropdown */}
          <div className="relative pl-4">
            <select 
              value={activeProblemId}
              onChange={handleProblemChange}
              className="appearance-none bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer w-48 sm:w-64 truncate"
            >
              {PROBLEMS.map(p => (
                <option key={p.frontendQuestionId} value={p.frontendQuestionId}>
                  {p.frontendQuestionId}. {p.title}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center space-x-1 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Play size={16} className="text-green-500" />}
            <span className="hidden sm:inline">Run</span>
          </button>
          <button 
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center space-x-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Check size={16} />
            <span className="hidden sm:inline">Submit</span>
          </button>
        </div>
      </div>

      {/* Main Content (Split Pane) */}
      <div className="flex w-full pt-14">
        
        {/* Left Pane: Problem & Chat */}
        <div className="w-1/2 border-r border-gray-800 flex flex-col bg-[#111111]">
          {/* Tabs */}
          <div className="flex bg-[#1a1a1a] border-b border-gray-800">
            <button 
              onClick={() => setActiveTab('problem')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'problem' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Layout size={16} />
              <span>Description</span>
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Cpu size={16} />
              <span>AI Interviewer</span>
            </button>
          </div>

          {/* Left Pane Content */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            {activeTab === 'problem' ? (
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{activeProblem.frontendQuestionId}. {activeProblem.title}</h1>
                <div className="flex space-x-2 mb-6 flex-wrap gap-y-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getDifficultyColor(activeProblem.difficulty)}`}>
                    {activeProblem.difficulty}
                  </span>
                  {activeProblem.topics.map(topic => (
                    <span key={topic} className="inline-block px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
                
                <div 
                  className="text-sm leading-relaxed [&>p]:mb-4 [&>pre]:bg-[#1a1a1a] [&>pre]:border [&>pre]:border-gray-800 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:mb-6 [&>pre]:overflow-x-auto [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded text-gray-300 [&_img]:max-w-full [&_img]:rounded-md [&_img]:my-4"
                  dangerouslySetInnerHTML={{ __html: activeProblem.description }} 
                />
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 pb-16">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <Cpu size={16} className="text-blue-500" />
                        </div>
                      )}
                      <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 whitespace-pre-wrap'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Cpu size={16} className="text-blue-500" />
                      </div>
                      <div className="p-3 rounded-lg bg-gray-800 flex space-x-1 items-center">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#111111] border-t border-gray-800">
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                      placeholder="Ask your interviewer a question..."
                      className="w-full bg-[#1a1a1a] border border-gray-700 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button 
                      onClick={handleChat}
                      disabled={isTyping || !chatInput.trim()}
                      className="absolute right-2 p-2 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code & Console */}
        <div className="w-1/2 flex flex-col bg-[#0d0d0d]">
          {/* Editor Header */}
          <div className="flex items-center px-4 py-2 bg-[#1a1a1a] border-b border-gray-800 space-x-2">
            <span className="text-green-500 font-mono text-xs px-2 py-1 bg-green-500/10 rounded">Python 3</span>
          </div>
          
          {/* Code Editor */}
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-[#0d0d0d] text-gray-300 font-mono text-sm p-4 focus:outline-none resize-none whitespace-pre"
              spellCheck="false"
            />
          </div>

          {/* Console Output */}
          <div className="h-64 bg-[#1a1a1a] border-t border-gray-800 flex flex-col">
            <div className="flex items-center px-4 py-2 border-b border-gray-800 space-x-2">
              <Terminal size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Test Results</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
              {isRunning ? (
                <div className="text-blue-400 animate-pulse whitespace-pre-wrap">{output}</div>
              ) : (
                <div className={`${output.includes('FAIL') ? 'text-red-400' : output.includes('PASS') ? 'text-green-400' : 'text-gray-400'} whitespace-pre-wrap`}>
                  {output}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}