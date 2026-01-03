import httpx

async def mapilogin():
    url = "https://messaging.mapi.mg/api/authentication/login"
    
    payload = {
        'Username': 'naval0906',
        'Password': 'NlHaNlHa1170#*!?'
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=payload)
        return response.json()

async def send_sms_simple(recipient: str, message: str, mapi_token: str, channel: str = "sms"):
    """
    Reusable function to send SMS
    """
    url = "https://messaging.mapi.mg/api/msg/send"
    
    payload = {
        'Recipient': recipient,
        'Message': message,
        'Channel': channel
    }
    
    headers = {
        'Authorization': mapi_token
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, data=payload)
        return response.json()

async def get_sms_num(mapi_token: str):
    """
    Reusable function to send SMS
    """
    url = "https://messaging.mapi.mg/api/smsoffer/available"
    
    headers = {
        'Authorization': mapi_token
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        return response.json()