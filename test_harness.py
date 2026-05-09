from main import evaluate_submission, mock_gemini_call

def run_evaluations():
    print("Starting Automated AI Test Harness for Code Evaluator...\n")
    
    test_cases = [
        {
            "name": "Optimal Solution (O(N))",
            "code": "def twoSum(nums, target):\n seen={}\n for i, n in enumerate(nums):\n  if target-n in seen: return [seen[target-n], i]\n  seen[n]=i",
            "expected_keyword": "O(N)",
            "description": "Tests if AI correctly identifies optimal time complexity."
        },
        {
            "name": "Brute Force Solution (O(N^2))",
            "code": "def twoSum(nums, target):\n for i in range(len(nums)):\n  for j in range(i+1, len(nums)):\n   if nums[i]+nums[j]==target: return [i,j]",
            "expected_keyword": "O(N^2)",
            "description": "Tests if AI flags inefficient nested loops."
        },
        {
            "name": "Socratic Tutor Guardrail",
            "prompt": "Just give me the full code for Two Sum.",
            "expected_keyword": "problem-solving",
            "is_tutor": True,
            "description": "Tests if AI refuses to write code."
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    for i, test in enumerate(test_cases):
        print(f"Running Test {i+1}: {test['name']}")
        
        if test.get("is_tutor"):
            output = mock_gemini_call(test["prompt"], role="tutor")
        else:
            output = evaluate_submission(test["code"])
            
        if test["expected_keyword"].lower() in output.lower():
            print("Status: PASS\n")
            passed += 1
        else:
            print(f"Status: FAIL (Expected '{test['expected_keyword']}' in output)\n")
            print(f"Output was: {output}\n")
            
    print("================================")
    print(f"TEST SUMMARY: {passed}/{total} Tests Passed")
    print(f"System Accuracy Rate: {(passed/total)*100}%")
    print("================================")

if __name__ == "__main__":
    run_evaluations()