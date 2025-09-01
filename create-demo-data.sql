-- Demo Data for TaskManager Application
-- This script creates a comprehensive demo user with realistic projects and tasks

-- 1. Create Demo User
INSERT OR REPLACE INTO users (id, email, password, name, role, created_at) VALUES 
(100, 'demo@taskmanager.com', '$2b$10$8K1p/a0dDxEQ4nuW/VUUZOJ/gx/dR2tt4g3jE2NYh7dULo5xtm02W', 'Sarah Johnson', 'user', datetime('now', '-30 days'));

-- 2. Create Diverse Projects
INSERT OR REPLACE INTO projects (id, name, description, owner_id, created_at) VALUES 
-- Large Enterprise Project
(101, 'Enterprise CRM Migration', 'Complete migration from legacy CRM system to new cloud-based solution. Includes data migration, user training, and system integration.', 100, datetime('now', '-25 days')),

-- Medium Marketing Campaign
(102, 'Q4 Product Launch Campaign', 'Comprehensive marketing campaign for new product line including social media, content creation, and event planning.', 100, datetime('now', '-20 days')),

-- Small Personal Project  
(103, 'Home Office Renovation', 'Transform spare bedroom into productive home office space with proper lighting, storage, and ergonomic setup.', 100, datetime('now', '-15 days')),

-- Research Project
(104, 'Market Research Analysis', 'Comprehensive analysis of competitor landscape and customer feedback for product positioning strategy.', 100, datetime('now', '-10 days')),

-- Urgent IT Project
(105, 'Security Audit Implementation', 'Implement security recommendations from recent audit including access controls and monitoring systems.', 100, datetime('now', '-5 days'));

-- 3. Create Boards for Each Project
INSERT OR REPLACE INTO boards (id, name, project_id, position, created_at) VALUES 
(201, 'CRM Migration Board', 101, 1, datetime('now', '-25 days')),
(202, 'Marketing Campaign Board', 102, 1, datetime('now', '-20 days')),
(203, 'Home Office Board', 103, 1, datetime('now', '-15 days')),
(204, 'Research Analysis Board', 104, 1, datetime('now', '-10 days')),
(205, 'Security Audit Board', 105, 1, datetime('now', '-5 days'));

-- 4. Create Columns for Each Board (Standard Kanban)
INSERT OR REPLACE INTO columns (id, name, board_id, position, created_at) VALUES 
-- CRM Migration Board Columns
(301, 'Backlog', 201, 1, datetime('now', '-25 days')),
(302, 'In Progress', 201, 2, datetime('now', '-25 days')),
(303, 'Testing', 201, 3, datetime('now', '-25 days')),
(304, 'Done', 201, 4, datetime('now', '-25 days')),

-- Marketing Campaign Board Columns  
(305, 'To Do', 202, 1, datetime('now', '-20 days')),
(306, 'In Progress', 202, 2, datetime('now', '-20 days')),
(307, 'Review', 202, 3, datetime('now', '-20 days')),
(308, 'Complete', 202, 4, datetime('now', '-20 days')),

-- Home Office Board Columns
(309, 'Planning', 203, 1, datetime('now', '-15 days')),
(310, 'Shopping', 203, 2, datetime('now', '-15 days')),
(311, 'Installation', 203, 3, datetime('now', '-15 days')),
(312, 'Finished', 203, 4, datetime('now', '-15 days')),

-- Research Board Columns
(313, 'Research', 204, 1, datetime('now', '-10 days')),
(314, 'Analysis', 204, 2, datetime('now', '-10 days')),
(315, 'Documentation', 204, 3, datetime('now', '-10 days')),
(316, 'Presentation', 204, 4, datetime('now', '-10 days')),

-- Security Audit Board Columns
(317, 'Urgent', 205, 1, datetime('now', '-5 days')),
(318, 'In Progress', 205, 2, datetime('now', '-5 days')),
(319, 'Testing', 205, 3, datetime('now', '-5 days')),
(320, 'Deployed', 205, 4, datetime('now', '-5 days'));

-- 5. Create Comprehensive Tasks

-- CRM Migration Tasks (Large Project - 15 tasks)
INSERT OR REPLACE INTO tasks (id, title, description, priority, status, column_id, assignee_id, due_date, position, created_at) VALUES 
(401, 'Data Audit & Mapping', 'Complete audit of existing CRM data and create mapping strategy for new system', 'high', 'Testing', 303, 100, datetime('now', '+2 days'), 1, datetime('now', '-24 days')),
(402, 'User Access Control Setup', 'Configure user roles and permissions in new CRM system', 'high', 'In Progress', 302, 100, datetime('now', '+5 days'), 1, datetime('now', '-23 days')),
(403, 'Legacy Data Export', 'Export all customer data from legacy system with validation checks', 'urgent', 'Done', 304, 100, datetime('now', '-2 days'), 1, datetime('now', '-22 days')),
(404, 'API Integration Testing', 'Test integration points between CRM and existing business applications', 'medium', 'In Progress', 302, 100, datetime('now', '+7 days'), 2, datetime('now', '-21 days')),
(405, 'Training Material Creation', 'Develop comprehensive user training materials and videos', 'medium', 'Backlog', 301, 100, datetime('now', '+15 days'), 1, datetime('now', '-20 days')),
(406, 'Performance Testing', 'Conduct load and performance testing on new CRM system', 'high', 'Backlog', 301, 100, datetime('now', '+20 days'), 2, datetime('now', '-19 days')),
(407, 'Data Migration Batch 1', 'Migrate customer accounts and contact information', 'urgent', 'Testing', 303, 100, datetime('now', '+3 days'), 2, datetime('now', '-18 days')),
(408, 'Backup Strategy Implementation', 'Implement automated backup and recovery procedures', 'high', 'In Progress', 302, 100, datetime('now', '+8 days'), 3, datetime('now', '-17 days')),
(409, 'User Acceptance Testing', 'Coordinate UAT sessions with key stakeholders', 'medium', 'Backlog', 301, 100, datetime('now', '+25 days'), 3, datetime('now', '-16 days')),
(410, 'Go-Live Preparation', 'Final preparations for system go-live including cutover plan', 'urgent', 'Backlog', 301, 100, datetime('now', '+40 days'), 4, datetime('now', '-15 days'));

-- Marketing Campaign Tasks (Medium Project - 12 tasks)
INSERT OR REPLACE INTO tasks (id, title, description, priority, status, column_id, assignee_id, due_date, position, created_at) VALUES 
(411, 'Brand Guidelines Review', 'Review and update brand guidelines for new product launch', 'medium', 'Complete', 308, 100, datetime('now', '-5 days'), 1, datetime('now', '-19 days')),
(412, 'Social Media Content Calendar', 'Create comprehensive 3-month social media content calendar', 'high', 'Review', 307, 100, datetime('now', '+2 days'), 1, datetime('now', '-18 days')),
(413, 'Influencer Outreach Program', 'Identify and engage with key industry influencers', 'medium', 'In Progress', 306, 100, datetime('now', '+10 days'), 1, datetime('now', '-17 days')),
(414, 'Product Photography Shoot', 'Professional photography session for all marketing materials', 'high', 'Complete', 308, 100, datetime('now', '-3 days'), 2, datetime('now', '-16 days')),
(415, 'Email Campaign Templates', 'Design email templates for product announcement campaign', 'medium', 'Review', 307, 100, datetime('now', '+5 days'), 2, datetime('now', '-15 days')),
(416, 'Launch Event Planning', 'Organize virtual product launch event with live demonstrations', 'high', 'In Progress', 306, 100, datetime('now', '+15 days'), 2, datetime('now', '-14 days')),
(417, 'Press Release Distribution', 'Write and distribute press releases to industry publications', 'medium', 'To Do', 305, 100, datetime('now', '+8 days'), 1, datetime('now', '-13 days')),
(418, 'Website Landing Page', 'Create dedicated landing page for product launch campaign', 'high', 'Complete', 308, 100, datetime('now', '-7 days'), 3, datetime('now', '-12 days')),
(419, 'Analytics Dashboard Setup', 'Configure tracking and analytics for campaign performance', 'medium', 'In Progress', 306, 100, datetime('now', '+12 days'), 3, datetime('now', '-11 days')),
(420, 'Customer Testimonial Collection', 'Gather video testimonials from beta customers', 'low', 'To Do', 305, 100, datetime('now', '+20 days'), 2, datetime('now', '-10 days'));

-- Home Office Tasks (Small Project - 8 tasks)
INSERT OR REPLACE INTO tasks (id, title, description, priority, status, column_id, assignee_id, due_date, position, created_at) VALUES 
(421, 'Room Measurements & Planning', 'Measure room dimensions and create layout plan', 'high', 'Finished', 312, 100, datetime('now', '-8 days'), 1, datetime('now', '-14 days')),
(422, 'Desk and Chair Selection', 'Research and select ergonomic desk and chair combination', 'high', 'Finished', 312, 100, datetime('now', '-6 days'), 2, datetime('now', '-13 days')),
(423, 'Lighting Assessment', 'Evaluate current lighting and plan improvements', 'medium', 'Installation', 311, 100, datetime('now', '+3 days'), 1, datetime('now', '-12 days')),
(424, 'Storage Solutions', 'Install shelving and organize filing system', 'medium', 'Shopping', 310, 100, datetime('now', '+5 days'), 1, datetime('now', '-11 days')),
(425, 'Technology Setup', 'Configure monitor setup, cables, and power management', 'high', 'Installation', 311, 100, datetime('now', '+2 days'), 2, datetime('now', '-10 days')),
(426, 'Wall Decoration', 'Add motivational artwork and plants for ambiance', 'low', 'Planning', 309, 100, datetime('now', '+10 days'), 1, datetime('now', '-9 days')),
(427, 'Cable Management', 'Install cable management solutions for clean workspace', 'medium', 'Shopping', 310, 100, datetime('now', '+7 days'), 2, datetime('now', '-8 days')),
(428, 'Final Organization', 'Complete setup and organize all office supplies', 'medium', 'Planning', 309, 100, datetime('now', '+12 days'), 2, datetime('now', '-7 days'));

-- Research Project Tasks (10 tasks)
INSERT OR REPLACE INTO tasks (id, title, description, priority, status, column_id, assignee_id, due_date, position, created_at) VALUES 
(429, 'Competitor Analysis Framework', 'Develop systematic approach for competitor evaluation', 'high', 'Documentation', 315, 100, datetime('now', '+8 days'), 1, datetime('now', '-9 days')),
(430, 'Customer Survey Design', 'Create comprehensive customer feedback survey', 'medium', 'Analysis', 314, 100, datetime('now', '+12 days'), 1, datetime('now', '-8 days')),
(431, 'Market Trend Research', 'Analyze industry trends and future projections', 'high', 'Analysis', 314, 100, datetime('now', '+15 days'), 2, datetime('now', '-7 days')),
(432, 'Focus Group Coordination', 'Organize and conduct customer focus group sessions', 'medium', 'Research', 313, 100, datetime('now', '+20 days'), 1, datetime('now', '-6 days')),
(433, 'Pricing Strategy Analysis', 'Research competitor pricing and market positioning', 'high', 'Documentation', 315, 100, datetime('now', '+10 days'), 2, datetime('now', '-5 days')),
(434, 'SWOT Analysis Completion', 'Complete comprehensive SWOT analysis', 'medium', 'Analysis', 314, 100, datetime('now', '+18 days'), 3, datetime('now', '-4 days')),
(435, 'Executive Summary Creation', 'Write executive summary of key findings', 'urgent', 'Research', 313, 100, datetime('now', '+25 days'), 2, datetime('now', '-3 days')),
(436, 'Data Visualization', 'Create charts and graphs for presentation', 'medium', 'Research', 313, 100, datetime('now', '+30 days'), 3, datetime('now', '-2 days'));

-- Security Audit Tasks (Urgent Project - 10 tasks)
INSERT OR REPLACE INTO tasks (id, title, description, priority, status, column_id, assignee_id, due_date, position, created_at) VALUES 
(437, 'Multi-Factor Authentication Setup', 'Implement MFA for all user accounts', 'urgent', 'Testing', 319, 100, datetime('now', '+1 day'), 1, datetime('now', '-4 days')),
(438, 'Firewall Configuration Review', 'Review and update firewall rules and policies', 'urgent', 'In Progress', 318, 100, datetime('now', '+2 days'), 1, datetime('now', '-3 days')),
(439, 'Access Control Audit', 'Audit all user permissions and remove unnecessary access', 'high', 'Deployed', 320, 100, datetime('now', '-1 day'), 1, datetime('now', '-2 days')),
(440, 'Security Monitoring Setup', 'Implement 24/7 security monitoring system', 'urgent', 'In Progress', 318, 100, datetime('now', '+3 days'), 2, datetime('now', '-1 day')),
(441, 'Password Policy Enforcement', 'Enforce strong password policies across all systems', 'high', 'Testing', 319, 100, datetime('now', '+1 day'), 2, datetime('now')),
(442, 'Vulnerability Scanning', 'Conduct comprehensive vulnerability scan', 'urgent', 'Urgent', 317, 100, datetime('now', '+4 days'), 1, datetime('now')),
(443, 'Employee Security Training', 'Mandatory security awareness training for all staff', 'medium', 'Urgent', 317, 100, datetime('now', '+6 days'), 2, datetime('now')),
(444, 'Incident Response Plan', 'Update incident response procedures and contacts', 'high', 'In Progress', 318, 100, datetime('now', '+5 days'), 3, datetime('now'));

-- 6. Add Project Memberships
INSERT OR REPLACE INTO project_members (project_id, user_id, role, joined_at) VALUES 
(101, 100, 'owner', datetime('now', '-25 days')),
(102, 100, 'owner', datetime('now', '-20 days')),
(103, 100, 'owner', datetime('now', '-15 days')),
(104, 100, 'owner', datetime('now', '-10 days')),
(105, 100, 'owner', datetime('now', '-5 days'));

-- 7. Add Calendar Events
INSERT OR REPLACE INTO events (id, title, description, start_date, end_date, all_day, event_type, priority, project_id, user_id, created_at) VALUES 
(501, 'CRM Migration Kickoff', 'Project kickoff meeting with all stakeholders', datetime('now', '+2 days', '09:00'), datetime('now', '+2 days', '10:30'), 0, 'meeting', 'high', 101, 100, datetime('now', '-20 days')),
(502, 'Marketing Campaign Review', 'Weekly review of campaign progress and metrics', datetime('now', '+1 day', '14:00'), datetime('now', '+1 day', '15:00'), 0, 'meeting', 'medium', 102, 100, datetime('now', '-15 days')),
(503, 'Furniture Delivery', 'Delivery of new office desk and chair', datetime('now', '+5 days'), datetime('now', '+5 days'), 1, 'event', 'medium', 103, 100, datetime('now', '-10 days')),
(504, 'Focus Group Session', 'Customer focus group for market research', datetime('now', '+7 days', '10:00'), datetime('now', '+7 days', '12:00'), 0, 'meeting', 'high', 104, 100, datetime('now', '-8 days')),
(505, 'Security Audit Deadline', 'Final deadline for security audit implementation', datetime('now', '+7 days'), datetime('now', '+7 days'), 1, 'deadline', 'urgent', 105, 100, datetime('now', '-3 days')),
(506, 'Product Launch Event', 'Virtual product launch presentation', datetime('now', '+15 days', '11:00'), datetime('now', '+15 days', '13:00'), 0, 'event', 'high', 102, 100, datetime('now', '-12 days')),
(507, 'Home Office Setup Complete', 'Target completion date for home office renovation', datetime('now', '+14 days'), datetime('now', '+14 days'), 1, 'deadline', 'medium', 103, 100, datetime('now', '-7 days'));

-- 8. Add Diary Entries (Recent Activity)
INSERT OR REPLACE INTO diary_entries (id, title, content, category, date, user_id, created_at) VALUES 
(601, 'CRM Migration Progress Update', 'Made significant progress on data mapping. Discovered some inconsistencies in customer records that need cleaning before migration. Team is working well together and we are on track for Phase 1 completion.', 'action', date('now', '-2 days'), 100, datetime('now', '-2 days')),
(602, 'Marketing Team Meeting', 'Great brainstorming session with the marketing team. We have some innovative ideas for the social media campaign. Need to follow up on influencer partnerships and finalize the content calendar by end of week.', 'meeting', date('now', '-1 day'), 100, datetime('now', '-1 day')),
(603, 'Security Concerns Discussion', 'Had urgent meeting with IT team about security audit findings. Several critical items need immediate attention. Created action plan with clear ownership and deadlines. All hands on deck for next 48 hours.', 'decision', date('now'), 100, datetime('now')),
(604, 'Home Office Layout Decision', 'Finally decided on the desk placement and lighting setup. The L-shaped desk will fit perfectly in the corner with the window providing natural light. Ordered all remaining items today.', 'note', date('now', '-3 days'), 100, datetime('now', '-3 days')),
(605, 'Research Survey Results', 'Initial survey results are very promising. Customer satisfaction is higher than expected, but there are clear areas for improvement in our mobile experience. Need to dive deeper into the data.', 'follow-up', date('now', '-4 days'), 100, datetime('now', '-4 days'));

-- 9. Add Task Dependencies (Realistic workflow dependencies)
INSERT OR REPLACE INTO task_dependencies (task_id, depends_on_task_id, created_at) VALUES 
-- CRM Migration Dependencies
(402, 403, datetime('now', '-20 days')), -- User Access depends on Data Export
(407, 401, datetime('now', '-18 days')), -- Data Migration depends on Data Audit
(408, 407, datetime('now', '-15 days')), -- Backup Strategy depends on Data Migration
(409, 404, datetime('now', '-12 days')), -- UAT depends on API Integration
(410, 409, datetime('now', '-10 days')), -- Go-Live depends on UAT

-- Marketing Campaign Dependencies  
(413, 411, datetime('now', '-15 days')), -- Influencer Outreach depends on Brand Guidelines
(415, 414, datetime('now', '-12 days')), -- Email Templates depend on Photography
(416, 418, datetime('now', '-10 days')), -- Launch Event depends on Landing Page
(419, 416, datetime('now', '-8 days')),  -- Analytics depends on Launch Event

-- Home Office Dependencies
(425, 422, datetime('now', '-8 days')),  -- Tech Setup depends on Desk Selection
(427, 425, datetime('now', '-6 days')),  -- Cable Management depends on Tech Setup
(428, 427, datetime('now', '-4 days')),  -- Final Organization depends on Cable Management

-- Security Audit Dependencies
(441, 439, datetime('now', '-1 day')),   -- Password Policy depends on Access Audit
(444, 440, datetime('now')),             -- Incident Response depends on Monitoring Setup