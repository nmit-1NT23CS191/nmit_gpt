-- ============================================================================
-- Admin User Seeding Script
-- Run this in Supabase SQL Editor to create the default admin account
-- ============================================================================

-- Step 1: Create the admin user in auth.users (Supabase Auth)
-- Note: You must run this from the Supabase SQL Editor with proper permissions
-- The password will be hashed automatically by Supabase

-- Create admin user in auth.users
-- Email: admin@nmit.edu
-- Password: admin123
-- Note: Run this first to get the UUID, or use the Supabase dashboard to create the auth user

-- For Supabase, you need to create the auth user via the dashboard or this approach:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" > "Create new user"
-- 3. Email: admin@nmit.edu, Password: admin123
-- 4. After creating, copy the User UID

-- Step 2: Insert/Update the profile in public.users
-- Replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID from auth.users

-- First, let's create a function to seed the admin if auth user exists
create or replace function seed_admin_user()
returns void as $$
declare
    admin_auth_id uuid;
begin
    -- Try to find existing auth user by email
    select id into admin_auth_id
    from auth.users
    where email = 'admin@nmit.edu'
    limit 1;

    if admin_auth_id is not null then
        -- Upsert the admin profile
        insert into public.users (supabase_uid, name, email, department, role)
        values (admin_auth_id, 'System Admin', 'admin@nmit.edu', 'Administration', 'admin')
        on conflict (supabase_uid)
        do update set
            name = 'System Admin',
            email = 'admin@nmit.edu',
            department = 'Administration',
            role = 'admin';

        raise notice 'Admin user profile created/updated successfully';
    else
        raise notice 'No auth.users record found for admin@nmit.edu. Create it in the Supabase Authentication dashboard first.';
    end if;
end;
$$ language plpgsql security definer;

-- Execute the seeding function
select seed_admin_user();

-- Create super admin user profile (if needed)
create or replace function seed_super_admin_user()
returns void as $$
declare
    super_admin_auth_id uuid;
begin
    -- Try to find existing auth user by email
    select id into super_admin_auth_id
    from auth.users
    where email = 'superadmin@nmit.edu'
    limit 1;

    if super_admin_auth_id is not null then
        -- Upsert the super admin profile
        insert into public.users (supabase_uid, name, email, department, role)
        values (super_admin_auth_id, 'Super Admin', 'superadmin@nmit.edu', 'Administration', 'super_admin')
        on conflict (supabase_uid)
        do update set
            name = 'Super Admin',
            email = 'superadmin@nmit.edu',
            department = 'Administration',
            role = 'super_admin';

        raise notice 'Super Admin user profile created/updated successfully';
    else
        raise notice 'No auth.users record found for superadmin@nmit.edu. Create it in the Supabase Authentication dashboard first.';
    end if;
end;
$$ language plpgsql security definer;

-- Execute the super admin seeding function
select seed_super_admin_user();

-- Verify the users were created
select id, name, email, role, created_at
from public.users
where email in ('admin@nmit.edu', 'superadmin@nmit.edu');
