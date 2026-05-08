-- Run this in Supabase SQL editor after prisma db push

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- users: each user sees only their own row
CREATE POLICY "users_own" ON users
  FOR ALL USING (email = auth.jwt() ->> 'email');

-- pipeline_leads: scoped to user
CREATE POLICY "pipeline_leads_own" ON pipeline_leads
  FOR ALL USING (user_id = auth.uid());

-- follow_ups: scoped to user
CREATE POLICY "follow_ups_own" ON follow_ups
  FOR ALL USING (user_id = auth.uid());

-- activity_log: scoped to user
CREATE POLICY "activity_log_own" ON activity_log
  FOR ALL USING (user_id = auth.uid());

-- daily_stats: scoped to user
CREATE POLICY "daily_stats_own" ON daily_stats
  FOR ALL USING (user_id = auth.uid());

-- leads_cache: readable by all authenticated users (shared cache)
CREATE POLICY "leads_cache_read" ON leads_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "leads_cache_write" ON leads_cache
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "leads_cache_update" ON leads_cache
  FOR UPDATE USING (auth.role() = 'authenticated');

-- meetings: scoped via pipeline_lead ownership
CREATE POLICY "meetings_own" ON meetings
  FOR ALL USING (
    pipeline_lead_id IN (
      SELECT id FROM pipeline_leads WHERE user_id = auth.uid()
    )
  );

-- Enable realtime for pipeline_leads (kanban live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_stats;
