const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface VideoMetadata {
  id: string;
  session_id: string;
  video_label: string;
  url: string;
  platform: string;
  title: string | null;
  creator: string | null;
  follower_count: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  hashtags: string[];
  upload_date: string | null;
  duration_seconds: number | null;
  engagement_rate: number | null;
  transcript_status: string;
  chunks_count: number;
  created_at: string;
}

export interface IngestResponse {
  session_id: string;
  video_a: VideoMetadata | null;
  video_b: VideoMetadata | null;
  chunks: { a: number; b: number };
  errors: { a: string | null; b: string | null };
  status: string;
}

export interface Citation {
  video_label: string;
  chunk_index: number;
  snippet: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at?: string;
}

export interface ChatResponse {
  response: string;
  citations: Citation[];
}

// Ingest videos
export async function ingestVideos(urlA: string, urlB: string): Promise<IngestResponse> {
  const res = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url_a: urlA, url_b: urlB }),
  });
  
  if (!res.ok) {
    throw new Error(`Ingest failed: ${res.statusText}`);
  }
  return res.json();
}

// Stream chat with SSE
export function streamChat(
  query: string,
  sessionId: string,
  threadId: string | null,
  onToken: (text: string) => void,
  onCitations: (citations: Citation[]) => void,
  onDone: (threadId: string) => void,
  onError: (err: string) => void
): () => void {
  const controller = new AbortController();
  
  fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId, thread_id: threadId }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok || !response.body) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep the last incomplete part in the buffer

      for (const chunk of lines) {
        if (!chunk.trim()) continue;
        
        // chunk format: "event: type\ndata: json_string"
        const eventMatch = chunk.match(/event: (.*)\n/);
        const dataMatch = chunk.match(/data: (.*)/);
        
        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1].trim();
          try {
            const data = JSON.parse(dataMatch[1]);
            
            if (eventType === 'token' && data.text) {
              onToken(data.text);
            } else if (eventType === 'citations' && data.citations) {
              onCitations(data.citations);
            } else if (eventType === 'done' && data.thread_id) {
              onDone(data.thread_id);
            } else if (eventType === 'error') {
              onError(data.message || 'Unknown error');
            }
          } catch (e) {
            console.error('Failed to parse SSE JSON:', e);
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError(err.message);
    }
  });

  return () => {
    controller.abort();
  };
}

// Get chat history
export async function getChatHistory(threadId: string): Promise<Message[]> {
  const res = await fetch(`${BASE_URL}/api/chat/history?thread_id=${threadId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch history: ${res.statusText}`);
  }
  return res.json();
}
