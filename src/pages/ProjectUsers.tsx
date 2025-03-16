
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, MailPlus, FileSpreadsheet, UsersRound } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  roleId: z.string().optional(),
});

type ProjectUserStatus = "active" | "pending" | "inactive" | "rejected";

type ProjectUser = {
  id: string;
  project_id: string;
  user_id: string;
  status: ProjectUserStatus;
  invited_at: string;
  invited_by: string;
  activated_at: string | null;
  email?: string;
  full_name?: string;
  role_name?: string;
};

const ProjectUsers = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectUserStatus | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      roleId: undefined,
    },
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["projectRoles", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  });

  const { data: projectUsers, isLoading } = useQuery({
    queryKey: ["projectUsers", projectId, roleFilter, statusFilter],
    queryFn: async () => {
      try {
        let query = supabase
          .from("project_users")
          .select("*")
          .eq("project_id", projectId);

        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }

        const { data: projectUsersData, error: projectUsersError } = await query;
        
        if (projectUsersError) {
          console.error("Error fetching project users:", projectUsersError);
          return [];
        }
        
        if (!projectUsersData) return [];

        const enrichedUsers = await Promise.all(
          projectUsersData.map(async (pu) => {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("email, name")
              .eq("id", pu.user_id)
              .single();

            let roleName = undefined;
            if (roleFilter) {
              const { data: userRoleData } = await supabase
                .from("user_roles")
                .select("roles(name)")
                .eq("user_id", pu.user_id)
                .eq("role_id", roleFilter)
                .eq("project_id", projectId)
                .single();

              if (!userRoleData) return null;
              
              roleName = userRoleData.roles?.name;
            } else {
              const { data: userRoleData } = await supabase
                .from("user_roles")
                .select("roles(name)")
                .eq("user_id", pu.user_id)
                .eq("project_id", projectId);

              if (userRoleData && userRoleData.length > 0 && userRoleData[0].roles) {
                roleName = userRoleData[0].roles.name;
              }
            }

            return {
              ...pu,
              email: profileData?.email,
              full_name: profileData?.name,
              role_name: roleName,
            } as ProjectUser;
          })
        );

        return enrichedUsers.filter(Boolean) as ProjectUser[];
      } catch (error) {
        console.error("Error in projectUsers query:", error);
        return [];
      }
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      try {
        // First, find the user by email (case insensitive)
        const { data: existingUser, error: userError } = await supabase
          .from("profiles")
          .select("id, email")
          .ilike("email", values.email)
          .single();

        if (userError) {
          if (userError.code === "PGRST116") {
            throw new Error(`User with email ${values.email} does not exist in the system`);
          }
          throw new Error(`Error checking user existence: ${userError.message}`);
        }

        console.log("Found existing user:", existingUser);

        // Check if the user is already in this project
        const { data: existingProjectUser, error: projectUserError } = await supabase
          .from("project_users")
          .select("*")
          .eq("user_id", existingUser.id)
          .eq("project_id", projectId);

        if (projectUserError) {
          throw new Error(`Error checking project user existence: ${projectUserError.message}`);
        }

        if (existingProjectUser && existingProjectUser.length > 0) {
          throw new Error("User is already in this project");
        }

        // Now insert the user into the project
        const { error: insertError } = await supabase
          .from("project_users")
          .insert({
            project_id: projectId as string,
            user_id: existingUser.id,
            status: "pending",
            invited_by: user?.id as string
          });

        if (insertError) {
          // Check if it's a unique constraint violation
          if (insertError.code === "23505") {
            throw new Error("User is already assigned to this project");
          }
          throw insertError;
        }

        // If a role was selected, assign it to the user
        if (values.roleId) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: existingUser.id,
              role_id: values.roleId,
              project_id: projectId as string,
              assigned_by: user?.id as string
            });

          if (roleError) {
            // Log the error but don't fail the invitation
            console.error("Error assigning role:", roleError);
          }
        }

        return existingUser;
      } catch (error: any) {
        console.error("Error in inviteUserMutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "User invited successfully",
        description: "The user has been invited to the project.",
      });
      form.reset();
      setInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projectUsers", projectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error inviting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: ProjectUserStatus }) => {
      const { error } = await supabase
        .from("project_users")
        .update({ 
          status,
          ...(status === "active" ? { activated_at: new Date().toISOString() } : {})
        })
        .eq("user_id", userId)
        .eq("project_id", projectId);

      if (error) throw error;
      return { userId, status };
    },
    onSuccess: () => {
      toast({
        title: "User status updated",
        description: "The user's status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["projectUsers", projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error updating user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    inviteUserMutation.mutate(values);
  };

  const renderStatusBadge = (status: ProjectUserStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "inactive":
        return <Badge>Inactive</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Users</h1>
          <p className="text-muted-foreground">
            Manage users for project: {project?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/roles`)}>
            Manage Roles
          </Button>
          <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
            <DialogTrigger asChild>
              <Button><MailPlus className="mr-2 h-4 w-4" /> Invite User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a User</DialogTitle>
                <DialogDescription>
                  Enter the email of the user you want to invite to this project.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {roles && roles.length > 0 && (
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setInviteModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={inviteUserMutation.isPending}
                    >
                      {inviteUserMutation.isPending ? "Inviting..." : "Invite User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Separator className="my-6" />

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">
            <UsersRound className="mr-2 h-4 w-4" /> 
            Users List
          </TabsTrigger>
          <TabsTrigger value="bulk" disabled>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> 
            Bulk Import (Coming Soon)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Project Users</CardTitle>
              <CardDescription>
                Manage all users assigned to this project.
              </CardDescription>
              <div className="flex flex-wrap gap-4 mt-4">
                <div>
                  <Select
                    onValueChange={(value) => setRoleFilter(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    onValueChange={(value: string) => 
                      setStatusFilter(value === "all" ? null : value as ProjectUserStatus)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : projectUsers && projectUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectUsers.map((projectUser) => (
                      <TableRow key={projectUser.id}>
                        <TableCell>{projectUser.full_name || "—"}</TableCell>
                        <TableCell>{projectUser.email}</TableCell>
                        <TableCell>{projectUser.role_name || "—"}</TableCell>
                        <TableCell>
                          {renderStatusBadge(projectUser.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {projectUser.status === "pending" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => 
                                    updateUserStatusMutation.mutate({
                                      userId: projectUser.user_id,
                                      status: "active"
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Activate
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => 
                                    updateUserStatusMutation.mutate({
                                      userId: projectUser.user_id,
                                      status: "rejected"
                                    })
                                  }
                                >
                                  <AlertCircle className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {projectUser.status === "active" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8"
                                onClick={() => 
                                  updateUserStatusMutation.mutate({
                                    userId: projectUser.user_id,
                                    status: "inactive"
                                  })
                                }
                              >
                                Deactivate
                              </Button>
                            )}
                            {(projectUser.status === "inactive" || projectUser.status === "rejected") && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8"
                                onClick={() => 
                                  updateUserStatusMutation.mutate({
                                    userId: projectUser.user_id,
                                    status: "active"
                                  })
                                }
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UsersRound className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No users found</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no users in this project yet.
                  </p>
                  <Button onClick={() => setInviteModalOpen(true)}>
                    <MailPlus className="mr-2 h-4 w-4" /> Invite a User
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>
                Import multiple users at once using a CSV file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Bulk import coming soon</h3>
                <p className="text-muted-foreground mb-4">
                  This feature will allow you to import multiple users at once from a CSV file.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ProjectUsers;
