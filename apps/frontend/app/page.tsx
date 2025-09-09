"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">The Draw</CardTitle>
          <CardDescription className="text-lg">
            Lottery Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/admin" className="block">
            <Button className="w-full" size="lg">
              Admin Login
            </Button>
          </Link>
          <div className="text-center text-sm text-gray-600">
            Scan a QR code to participate in a lottery event
          </div>
        </CardContent>
      </Card>
    </div>
  );
}