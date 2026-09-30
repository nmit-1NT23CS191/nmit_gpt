# Admin User Setup Instructions

## Quick Setup for Local Development

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Navigate to: https://supabase.com/dashboard

2. **Create Admin Auth User**
   - Go to `Authentication` → `Users`
   - Click `Add user` → `Create new user`
   - Email: `admin@nmit.edu`
   - Password: `admin123`
   - Click `Create user`
   - **Copy the User UID** (you'll need this)

3. **Create Admin Profile**
   - Go to `SQL Editor`
   - Run the following query (replace `YOUR_AUTH_USER_ID` with the UUID you copied):

   ```sql
   INSERT INTO public.users (supabase_uid, name, email, department, role)
   VALUES (
       'YOUR_AUTH_USER_ID'::uuid,
       'System Admin',
       'admin@nmit.edu',
       'Administration',
       'admin'
   )
   ON CONFLICT (supabase_uid) DO UPDATE SET role = 'admin';
   ```

4. **Create Super Admin (Optional)**
   - Repeat steps 2-3 with:
     - Email: `superadmin@nmit.edu`
     - Password: `admin123`
     - Role: `super_admin`

### Option 2: Using SQL Script

1. **Create Auth Users in Supabase Dashboard first** (step 2 from Option 1)

2. **Run the seed script**
   - Go to `SQL Editor` in Supabase Dashboard
   - Copy and paste the contents of `backend/seed_admin.sql`
   - Click `Run`

### Option 3: Local Development Bypass (Testing Only)

1. **Enable dev bypass in `.env`:**
   ```bash
   DEV_BYPASS_AUTH=true
   ```

2. **This will:**
   - Skip JWT verification
   - Auto-create a synthetic admin user
   - ⚠️ **NEVER use in production!**

## Verify Setup

After creating the admin user, test the login:

1. Navigate to: http://localhost:3001/login
2. Login with:
   - Email: `admin@nmit.edu`
   - Password: `admin123`
   - Select: `Admin` tab
3. You should be redirected to `/dashboard`

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nmit.edu | admin123 |
| Super Admin | superadmin@nmit.edu | admin123 |

⚠️ **Change these passwords in production!**

## Troubleshooting

### Error: "Invalid email or password"
- The auth user doesn't exist in Supabase Auth
- Create it via the Supabase Dashboard (Authentication → Users)

### Error: "This account has no application profile"
- The auth user exists but the profile wasn't created in `public.users`
- Run the SQL script from Option 2

### Error: "This account is not authorized for the selected login type"
- The user's role in `public.users` doesn't match the selected tab
- Check the role: `SELECT role FROM public.users WHERE email = 'admin@nmit.edu';`
- Update if needed: `UPDATE public.users SET role = 'admin' WHERE email = 'admin@nmit.edu';`
