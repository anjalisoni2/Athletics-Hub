import requests
import json

def test_signup():
    url = "http://localhost:8000/signup-api/"
    data = {
        "username": "tester_verify_1",
        "email": "test@verify.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "Verify",
        "mobile": "1234567890",
        "role": "organizer",
        "organizationName": "Test Org"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_signup()
