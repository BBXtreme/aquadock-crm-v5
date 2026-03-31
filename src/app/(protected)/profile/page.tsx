import { LogOut, Mail, Shield, Trash2, Upload, User, Users } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/supabase/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { safeDisplay } from "@/lib/utils/data-format";

// Server Action - Update Display Name
export async function updateDisplayName(formData: FormData) {
  'use server';
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const display_name = formData.get('display_name') as string;

  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);

  if (error) {
    console.error("Update error:", error);
    throw new Error("Failed to update display name");
  }

  // Revalidate the profile page
  revalidatePath('/profile');
}

// Server Action - Change User Role
export async function changeUserRole(formData: FormData) {
  'use server';
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const userId = formData.get('userId') as string;
  const newRole = formData.get('newRole') as 'user' | 'admin';

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw error;

  revalidatePath('/profile');
}

// Server Action - Trigger Password Reset
export async function triggerPasswordReset(formData: FormData) {
  'use server';
  const supabase = await createServerSupabaseClient();
  const userId = formData.get('userId') as string;

  const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !authUser.user?.email) throw new Error("User or email not found");

  const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email);
  if (error) throw error;

  revalidatePath('/profile');
}

// Server Action - Delete User
export async function deleteUser(formData: FormData) {
  'use server';
  const supabase = await createServerSupabaseClient();
  const userId = formData.get('userId') as string;

  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) throw profileError;

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw authError;

  revalidatePath('/profile');
}

// Server Action - Sign Out
export async function signOut() {
  'use server';
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// Client Component for User Management
function UserManagementCard({ allUsers }: { allUsers: { id: string; email: string; display_name: string | null; role: string }[] }) {
  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('newRole', newRole);
      await changeUserRole(formData);
      toast.success("Role updated successfully");
      window.location.reload();
    } catch (_error) {
      toast.error("Failed to update role");
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      await triggerPasswordReset(formData);
      toast.success("Password reset email sent");
    } catch (_error) {
      toast.error("Failed to send reset email");
    }
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const formData = new FormData();
        formData.append('userId', userId);
        await deleteUser(formData);
        toast.success("User deleted successfully");
        window.location.reload();
      } catch (_error) {
        toast.error("Failed to delete user");
      }
    }
  };

  return (
    <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center text-xl">
          <Users className="mr-3 h-6 w-6 text-primary" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">{u.display_name || 'No display name'}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                <Badge variant="secondary" className="capitalize">
                  {u.role}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => handleChangeRole(u.id, u.role)}>
                  <Shield className="h-4 w-4 mr-1" />
                  {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handlePasswordReset(u.id)}>
                  <Mail className="h-4 w-4 mr-1" />
                  Reset Password
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  // Try to fetch profile
  let { data: profileData, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Create profile if it doesn't exist
  if (error || !profileData) {
    console.log("Profile not found, creating new profile for user:", user.id);
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        role: 'user',
        display_name: user.display_name || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating profile:", insertError);
      throw new Error("Failed to create profile");
    }

    profileData = newProfile;
  }

  const displayName = safeDisplay(profileData.display_name || user.display_name);
  const role = profileData.role || "user";
  const avatarUrl = profileData.avatar_url || "";
  const email = user.email || "";

  // Fetch all users if admin
  let allUsers: { id: string; email: string; display_name: string | null; role: string }[] = [];
  if (role === 'admin') {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const { data: profiles } = await supabase.from('profiles').select('*');
    const profilesArray = profiles || [];
    allUsers = authUsers.users.map(u => {
      const profile = profilesArray.find(p => p.id === u.id);
      return {
        id: u.id,
        email: u.email || '',
        display_name: profile?.display_name || u.user_metadata?.display_name || null,
        role: profile?.role || 'user',
      };
    });
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-lg text-muted-foreground">Welcome, {displayName}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center text-xl">
              <User className="mr-3 h-6 w-6 text-primary" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-primary/10">
                  <AvatarImage src={avatarUrl || "/placeholder-avatar.png"} alt="Profile" />
                  <AvatarFallback className="text-2xl font-semibold">
                    {email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                  <Upload className="h-4 w-4" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-semibold">{displayName || "No display name"}</p>
                <p className="text-muted-foreground">{email}</p>
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Update Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateDisplayName} className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Display Name</Label>
                <Input
                  name="display_name"
                  defaultValue={profileData.display_name || ""}
                  placeholder="Enter your display name"
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="profilePicture" className="text-sm font-medium">Profile Picture</Label>
                <Input id="profilePicture" type="file" accept="image/*" disabled className="h-11" />
                <p className="text-muted-foreground text-sm">Upload functionality coming soon</p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#24BACC] text-white hover:bg-[#1da0a8] transition-colors"
              >
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-border bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button variant="destructive" className="flex items-center h-11 px-6" type="submit">
              <LogOut className="mr-2 h-5 w-5" />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>

      {role === 'admin' && <UserManagementCard allUsers={allUsers} />}
    </div>
  );
}
