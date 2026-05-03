# Model Card & AI Reflection

## Limitations and Biases

Because the grading agent evaluates Time and Space complexity through LLM inference rather than actual sandbox execution/profiling, it is susceptible to "hallucinating" Big-O notation if the user writes highly obfuscated or non-standard code. Furthermore, the AI's "Socratic Interviewer" persona can sometimes be biased toward standard Western/Silicon Valley interview styles, which may be confusing for users from different educational backgrounds.

## Misuse Prevention

The system could be misused if a user tries to prompt-inject the chat interface to output full code solutions, defeating the purpose of the educational tool. To prevent this, strict system instructions and few-shot examples were implemented requiring the AI to *only* ask questions and never output raw code blocks.

## Reliability Surprises

I was surprised by how effectively the AI could analyze Time and Space complexity just from static code analysis. However, during early testing, the AI would sometimes confidently give a "PASS" to code that had syntax errors. I had to refine the Agentic workflow prompt to explicitly tell the AI to "read for syntax errors before generating test cases."

## Collaboration with AI

I collaborated with an AI assistant to build this system.

- **Helpful Suggestion:** The AI suggested separating the system into two distinct prompts/personas—one for the Chat Tutor and one for the Code Evaluator. This drastically improved the reliability, as trying to make one single prompt do both tasks confused the model.
- **Flawed Suggestion:** Initially, the AI suggested building a full backend containerized Docker environment to execute Python code safely. I realized this was outside the scope of the ~4 hour project window and opted to use the LLM as an *inference-based* execution engine instead, which perfectly fulfilled the "Agentic Workflow" stretch goal without the server infrastructure overhead.