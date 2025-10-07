-- Migration: Create whatsapp_users table for WhatsApp automation
-- Created: 2024-12-20
-- Description: Table to map WhatsApp phone numbers to tenant users for automation

-- Create whatsapp_users table
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT phone_number_format CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT unique_phone_per_tenant UNIQUE (tenant_id, phone_number)
);

-- Create index for fast phone number lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone_number ON whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_tenant_id ON whatsapp_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_active ON whatsapp_users(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_whatsapp_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_users_updated_at
  BEFORE UPDATE ON whatsapp_users
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_users_updated_at();

-- Create function to update last_activity
CREATE OR REPLACE FUNCTION update_whatsapp_user_activity(phone_num VARCHAR(20))
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_users 
  SET last_activity = NOW()
  WHERE phone_number = phone_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if user exists and is active
CREATE OR REPLACE FUNCTION check_whatsapp_user(phone_num VARCHAR(20))
RETURNS TABLE(
  exists BOOLEAN,
  tenant_id UUID,
  is_active BOOLEAN,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as exists,
    wu.tenant_id,
    wu.is_active,
    wu.last_activity
  FROM whatsapp_users wu
  WHERE wu.phone_number = phone_num;
  
  -- If no user found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, FALSE, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to register new WhatsApp user
CREATE OR REPLACE FUNCTION register_whatsapp_user(
  p_tenant_id UUID,
  p_phone_number VARCHAR(20)
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  message TEXT
) AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM whatsapp_users WHERE phone_number = p_phone_number) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Phone number already registered'::TEXT;
    RETURN;
  END IF;
  
  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Tenant not found'::TEXT;
    RETURN;
  END IF;
  
  -- Insert new user
  INSERT INTO whatsapp_users (tenant_id, phone_number)
  VALUES (p_tenant_id, p_phone_number)
  RETURNING id INTO new_user_id;
  
  RETURN QUERY SELECT TRUE, new_user_id, 'User registered successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function to deactivate WhatsApp user
CREATE OR REPLACE FUNCTION deactivate_whatsapp_user(phone_num VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE whatsapp_users 
  SET is_active = FALSE, updated_at = NOW()
  WHERE phone_number = phone_num;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user context for AI processing
CREATE OR REPLACE FUNCTION get_whatsapp_user_context(phone_num VARCHAR(20))
RETURNS TABLE(
  tenant_id UUID,
  user_name TEXT,
  categories JSON,
  banks JSON,
  recent_transactions JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wu.tenant_id,
    t.name as user_name,
    (
      SELECT json_agg(json_build_object(
        'id', c.id,
        'name', c.name,
        'emoji', c.emoji
      ))
      FROM categories c
      WHERE c.tenant_id = wu.tenant_id
    ) as categories,
    (
      SELECT json_agg(json_build_object(
        'id', b.id,
        'name', b.name,
        'emoji', b.emoji
      ))
      FROM banks b
      WHERE b.tenant_id = wu.tenant_id
    ) as banks,
    (
      SELECT json_agg(json_build_object(
        'id', t.id,
        'title', t.title,
        'amount', t.amount,
        'kind', t.kind,
        'created_at', t.created_at
      ))
      FROM transactions t
      WHERE t.tenant_id = wu.tenant_id
      ORDER BY t.created_at DESC
      LIMIT 5
    ) as recent_transactions
  FROM whatsapp_users wu
  JOIN tenants t ON t.id = wu.tenant_id
  WHERE wu.phone_number = phone_num AND wu.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
-- INSERT INTO whatsapp_users (tenant_id, phone_number) 
-- VALUES ('your-tenant-id', '+5511999999999');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON whatsapp_users TO authenticated;
GRANT EXECUTE ON FUNCTION check_whatsapp_user TO authenticated;
GRANT EXECUTE ON FUNCTION register_whatsapp_user TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_whatsapp_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_user_context TO authenticated;
GRANT EXECUTE ON FUNCTION update_whatsapp_user_activity TO authenticated;
