import requests
import json
import time

API_URL = "http://localhost:8000/api/roadmap/generate"
payload = {
    "query": "Become a Data Scientist. My current level is: complete beginner"
}
headers = {
    "Content-Type": "application/json"
}

print("Testing backend roadmap generation with OpenAI key...")
start_time = time.time()
response = requests.post(API_URL, json=payload, headers=headers)
end_time = time.time()

if response.status_code == 200:
    data = response.json()
    print(f"\nSuccess! Roadmap generated in {end_time - start_time:.2f} seconds.")
    print(f"Goal: {data.get('query')}")
    print(f"Number of domains generated: {len(data.get('domains', []))}")
    print("\nSample Domains:")
    for i, domain in enumerate(data.get('domains', [])[:3]):
        print(f"{i+1}. {domain.get('title')}")
        print(f"   Subdomains: {len(domain.get('subdomains', []))}")
else:
    print(f"\nError ({response.status_code}):")
    try:
         print(json.dumps(response.json(), indent=2))
    except:
         print(response.text)
