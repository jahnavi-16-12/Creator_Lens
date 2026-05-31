import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Adjust path to import app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.session_service import create_session, get_session, list_sessions, update_session

class TestSessionService(unittest.IsolatedAsyncioTestCase):
    
    @patch('app.services.session_service.get_client')
    async def test_create_session(self, mock_get_client):
        # Setup mock client
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_insert = MagicMock()
        
        # Chain mock calls
        mock_get_client.return_value = mock_client
        mock_client.table.return_value = mock_table
        mock_table.insert.return_value = mock_insert
        
        # Async execute mock
        mock_execute = AsyncMock()
        mock_execute.return_value.data = [{"session_id": "test-session-id", "created_at": "2026-05-31T20:00:00Z"}]
        mock_insert.execute = mock_execute
        
        # Run service function
        result = await create_session("test-session-id")
        
        # Verify
        mock_client.table.assert_called_with('video_sessions')
        mock_table.insert.assert_called_with({"session_id": "test-session-id"})
        self.assertEqual(result.get("session_id"), "test-session-id")

    @patch('app.services.session_service.get_client')
    async def test_get_session(self, mock_get_client):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Mock responses for table video_sessions and video_metadata
        mock_sessions_execute = AsyncMock()
        mock_sessions_execute.return_value.data = [{"session_id": "test-session-id", "created_at": "2026-05-31"}]
        
        mock_metadata_execute = AsyncMock()
        mock_metadata_execute.return_value.data = [
            {"video_label": "A", "url": "url-a", "title": "Title A"},
            {"video_label": "B", "url": "url-b", "title": "Title B"}
        ]
        
        # Configure table calls
        mock_sessions_table = MagicMock()
        mock_sessions_table.select.return_value.eq.return_value.execute = mock_sessions_execute
        
        mock_metadata_table = MagicMock()
        mock_metadata_table.select.return_value.eq.return_value.execute = mock_metadata_execute
        
        def table_side_effect(name):
            if name == 'video_sessions':
                return mock_sessions_table
            elif name == 'video_metadata':
                return mock_metadata_table
            return MagicMock()
            
        mock_client.table.side_effect = table_side_effect
        
        # Run service function
        result = await get_session("test-session-id")
        
        # Verify
        self.assertIsNotNone(result)
        self.assertEqual(result["id"], "test-session-id")
        self.assertEqual(result["video_a_url"], "url-a")
        self.assertEqual(result["video_b_url"], "url-b")
        self.assertEqual(result["title"], "Title A vs Title B")

if __name__ == '__main__':
    unittest.main()
