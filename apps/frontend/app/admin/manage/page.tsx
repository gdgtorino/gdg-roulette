"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Admin {
  id: string;
  username: string;
  createdAt: string;
}

export default function ManageAdminPage(): JSX.Element {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchAdmins = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json() as Admin[];
        setAdmins(data);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    }
  };

  const createAdmin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        setUsername("");
        setPassword("");
        await fetchAdmins();
        alert("Admin created successfully");
      } else {
        const error = await response.json() as { error: string };
        alert(error.error || "Failed to create admin");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const deleteAdmin = async (adminUsername: string): Promise<void> => {
    if (!confirm(`Are you sure you want to delete admin "${adminUsername}"?`)) {
      return;
    }

    setDeleteLoading(adminUsername);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/${adminUsername}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchAdmins();
        alert("Admin deleted successfully");
      } else {
        const error = await response.json() as { error: string };
        alert(error.error || "Failed to delete admin");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    void fetchAdmins();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Admins</h1>
          <p className="text-gray-600">Create and manage administrator accounts</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Admin Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Admin</CardTitle>
              <CardDescription>Add a new administrator account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createAdmin} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Username (min 3 chars)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Admin List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Admins</CardTitle>
              <CardDescription>Manage existing administrator accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{admin.username}</div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void deleteAdmin(admin.username)}
                      disabled={deleteLoading === admin.username}
                    >
                      {deleteLoading === admin.username ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No admins found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}