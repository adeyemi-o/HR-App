-- Create AI Logs table
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    user_id UUID,
    feature TEXT,
    model TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI Cache table
CREATE TABLE IF NOT EXISTS ai_cache (
    input_hash TEXT PRIMARY KEY,
    output JSONB,
    model TEXT,
    ttl_seconds INTEGER DEFAULT 86400,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_tenant_created ON ai_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_cache(input_hash);

-- Enable RLS (optional, but good practice)
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access logs" ON ai_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access cache" ON ai_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
