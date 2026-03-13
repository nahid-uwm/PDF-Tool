import React from "react";
import { useNavigate } from "react-router";
import { FileQuestion, ArrowLeft } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-foreground mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-6" style={{ fontSize: "0.875rem" }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to PDF Suite
      </button>
    </div>
  );
}
