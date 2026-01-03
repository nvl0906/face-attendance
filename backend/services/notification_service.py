"""
Notification Service
Handles all push notification logic for the attendance app
"""

from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from typing import List, Dict, Any
from datetime import datetime
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

class NotificationService:
    """
    Service class for handling push notifications
    """
    
    @staticmethod
    def validate_expo_token(token: str) -> bool:
        """
        Validates that a token is a proper Expo push token
        """
        return PushClient().is_exponent_push_token(token)
    
    @staticmethod
    def register_device(member_id: str, expo_push_token: str, device_type: str, device_name: str = None) -> dict:
        """
        Registers a device for push notifications
        
        Args:
            member_id: User's member ID
            expo_push_token: Expo push token from device
            device_type: 'ios' or 'android'
            device_name: Optional device name
            
        Returns:
            dict: Registration result
        """
        # Validate token format
        if not NotificationService.validate_expo_token(expo_push_token):
            raise ValueError("Invalid Expo push token format")
        
        try:
            # Check if device already exists
            existing = supabase.table("user_devices").select("*").eq(
                "expo_push_token", expo_push_token
            ).execute()
            
            if existing.data:
                # Update existing device
                result = supabase.table("user_devices").update({
                    "member_id": member_id,
                    "device_type": device_type,
                    "device_name": device_name,
                    "is_active": True,
                }).eq("expo_push_token", expo_push_token).execute()
                
                return {
                    "success": True,
                    "message": "Device updated successfully",
                    "device_id": existing.data[0]["id"]
                }
            else:
                # Create new device record
                result = supabase.table("user_devices").insert({
                    "member_id": member_id,
                    "expo_push_token": expo_push_token,
                    "device_type": device_type,
                    "device_name": device_name,
                    "is_active": True
                }).execute()
                
                return {
                    "message": "Appareil enregistré avec succès",
                }
                
        except Exception as e:
            raise Exception(f"Failed to register device: {str(e)}")
    
    @staticmethod
    def unregister_device(member_id: str, expo_push_token: str) -> dict:
        """
        Unregisters a device (sets is_active to False)
        
        Args:
            member_id: User's member ID
            expo_push_token: Expo push token to unregister
            
        Returns:
            dict: Unregistration result
        """
        try:
            result = supabase.table("user_devices").update({
                "is_active": False,
            }).eq("expo_push_token", expo_push_token).eq(
                "member_id", member_id
            ).execute()
            
            return {
                "success": True,
                "message": "Device unregistered successfully"
            }
        except Exception as e:
            raise Exception(f"Failed to unregister device: {str(e)}")
    
    @staticmethod
    def get_user_devices(member_id: str) -> List[str]:
        """
        Retrieves all active Expo push tokens for a user
        
        Args:
            member_id: User's member ID
            
        Returns:
            List[str]: List of active Expo push tokens
        """
        try:
            result = supabase.table("user_devices").select("expo_push_token").eq(
                "member_id", member_id
            ).eq("is_active", True).execute()
            
            return [device["expo_push_token"] for device in result.data]
        except Exception as e:
            print(f"Error fetching user devices: {e}")
            return []
    
    @staticmethod
    def send_push_notification(
        tokens: List[str], 
        title: str, 
        body: str, 
        data: Dict[str, Any] = None
    ) -> Dict[str, int]:
        """
        Sends push notifications to multiple devices
        
        Args:
            tokens: List of Expo push tokens
            title: Notification title
            body: Notification body
            data: Optional data payload
            
        Returns:
            dict: {'sent': int, 'failed': int}
        """
        if not tokens:
            return {"sent": 0, "failed": 0}
        
        messages = []
        invalid_tokens = []
        
        # Create PushMessage objects for each token
        for token in tokens:
            if not PushClient().is_exponent_push_token(token):
                invalid_tokens.append(token)
                continue
            
            messages.append(PushMessage(
                to=token,
                title=title,
                body=body,
                data=data or {},
                sound='default',
                priority='high',
                channel_id='default',
            ))
        
        # Remove invalid tokens from database
        if invalid_tokens:
            NotificationService._deactivate_tokens(invalid_tokens)
        
        sent_count = 0
        failed_count = 0
        
        # Send notifications in chunks of 100
        chunk_size = 100
        for i in range(0, len(messages), chunk_size):
            chunk = messages[i:i + chunk_size]
            
            try:
                tickets = PushClient().publish_multiple(chunk)
                
                # Check for errors in tickets
                for ticket in tickets:
                    if ticket.is_success():
                        sent_count += 1
                    else:
                        failed_count += 1
                        if isinstance(ticket.error, DeviceNotRegisteredError):
                            print(f"Device not registered: {ticket.push_message.to}")
                            
            except PushServerError as exc:
                print(f"Expo push server error: {exc}")
                failed_count += len(chunk)
            except Exception as exc:
                print(f"Error sending notifications: {exc}")
                failed_count += len(chunk)
        
        return {"sent": sent_count, "failed": failed_count}
    
    @staticmethod
    def send_to_user(
        member_id: str,
        title: str,
        body: str,
        data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Sends notification to all of a user's active devices
        
        Args:
            member_id: User's member ID
            title: Notification title
            body: Notification body
            data: Optional data payload
            
        Returns:
            dict: Result with sent/failed counts
        """
        tokens = NotificationService.get_user_devices(member_id)
        
        if not tokens:
            return {
                "success": False,
                "message": "No active devices found for user",
                "sent": 0,
                "failed": 0
            }
        
        result = NotificationService.send_push_notification(tokens, title, body, data)
        
        return {
            "success": True,
            "message": f"Notifications sent to {len(tokens)} device(s)",
            "sent": result["sent"],
            "failed": result["failed"]
        }
    
    @staticmethod
    def _deactivate_tokens(tokens: List[str]):
        """
        Marks device tokens as inactive in the database
        """
        try:
            for token in tokens:
                supabase.table("user_devices").update({
                    "is_active": False,
                }).eq("expo_push_token", token).execute()
        except Exception as e:
            print(f"Error deactivating tokens: {e}")


# Convenience functions for common use cases

def notify_attendance_marked(member_id: str, attendance_type: str, timestamp: datetime, location: str = None):
    """
    Send notification when attendance is marked
    """
    title = "Attendance Recorded"
    body = f"Your {attendance_type} at {timestamp.strftime('%I:%M %p')} has been recorded"
    
    if location:
        body += f" at {location}"
    
    data = {
        "type": "attendance",
        "attendance_type": attendance_type,
        "timestamp": timestamp.isoformat(),
        "screen": "AttendanceHistory"
    }
    
    return NotificationService.send_to_user(member_id, title, body, data)

def notify_broadcast(title: str, body: str, data: Dict[str, Any] = None):
    """
    Send notification to all active users
    """
    try:
        # Get all active devices
        result = supabase.table("user_devices").select("expo_push_token, member_id").eq(
            "is_active", True
        ).execute()
        
        if not result.data:
            return {"success": False, "message": "No active devices found"}
        
        tokens = [device["expo_push_token"] for device in result.data]
        
        # Send broadcast
        send_result = NotificationService.send_push_notification(
            tokens, 
            title, 
            body, 
            data
        )
        
        return {
            "success": True,
            "message": "Broadcast sent",
            "total_devices": len(tokens),
            "sent": send_result["sent"],
            "failed": send_result["failed"]
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to send broadcast: {str(e)}"}