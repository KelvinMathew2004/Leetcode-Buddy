import json

# ==========================================
# 1. RAG ENHANCEMENT (Algorithmic Knowledge Base)
# ==========================================
KNOWLEDGE_BASE = {
    "two_sum": "Pattern: Hash Map. Store the complement (target - current_number) and its index as you iterate. Time Complexity: O(N). Space Complexity: O(N).",
    "sliding_window": "Pattern: Sliding Window. Used for contiguous subarrays. Expand right pointer, shrink left pointer when condition breaks.",
    "binary_search": "Pattern: Binary Search. Requires sorted array. Compare middle element to target and halve the search space. Time Complexity: O(log N)."
}

def retrieve_algo_context(problem_topic):
    """Retrieves standard algorithmic patterns to guide the user."""
    topic = problem_topic.lower().replace(" ", "_")
    for key, context in KNOWLEDGE_BASE.items():
        if key in topic:
            return context
    return "No specific pattern found. Focus on brute force, then optimize."

# ==========================================
# 2. SPECIALIZATION (Socratic Interviewer Tone)
# ==========================================
SYSTEM_PROMPT = """
You are a FAANG Senior Software Engineer conducting a technical interview.
You must STRICTLY follow these rules:
1. NEVER write code for the user.
2. If the user is stuck, ask a guiding question based on the [Context].
3. Be encouraging but professional.

[Examples]
User: I don't know how to start Two Sum.
AI: Let's think about the brute force approach first. If you check every possible pair, how long would that take?

User: Just give me the answer.
AI: As an interviewer, I want to see your problem-solving process. How might a Hash Map help us remember numbers we've already seen?
"""

# ==========================================
# 3. AGENTIC WORKFLOW (Code Evaluation Pipeline)
# ==========================================
def mock_gemini_call(prompt, role="evaluator"):
    """
    MOCK LLM: This simulates calling the Gemini API.
    In the React frontend, this is connected to the real Gemini API.
    """
    if role == "tutor":
        if "hash map" in prompt.lower() or "dictionary" in prompt.lower():
            return "You're on the right track! A hash map will give you O(1) lookups. Try implementing that."
        return "Think about how you can avoid nesting two loops. What data structure allows instant lookups?"
    
    if role == "evaluator":
        if "return" in prompt and "for" in prompt:
            if "dict" in prompt or "{}" in prompt or "map" in prompt.lower():
                return "[PASS]\nTime Complexity: O(N)\nSpace Complexity: O(N)\nFeedback: Optimal solution using a hash map."
            else:
                return "[PASS]\nTime Complexity: O(N^2)\nSpace Complexity: O(1)\nFeedback: This is a brute force solution. Can you optimize it to O(N) using extra memory?"
        return "[FAIL]\nFeedback: Your code has syntax errors or does not return the correct format."

def evaluate_submission(user_code):
    """
    Multi-step agent that plans tests, executes them conceptually, and grades.
    """
    print("\n--- Agent Step 1: Analyzing Code ---")
    
    # Step 1: Agent decides which problem context to pull (RAG)
    context = retrieve_algo_context("two sum")
    
    print("--- Agent Step 2: Generating Hidden Test Cases ---")
    test_cases = "[2,7,11,15], target=9; [3,2,4], target=6; [3,3], target=6"
    
    print("--- Agent Step 3: Evaluating against tests and context ---")
    eval_prompt = f"Evaluate this code against test cases {test_cases}. Context: {context}. Code:\n{user_code}"
    
    final_grade = mock_gemini_call(eval_prompt, role="evaluator")
    return final_grade

if __name__ == "__main__":
    print("=== Algo-AI Backend Simulation ===")
    sample_code = """
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    """
    print("\nUser submitted code...")
    result = evaluate_submission(sample_code)
    print(f"\nFinal Agent Output:\n{result}")