import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import {
  FileText, Merge, Split, FileOutput, LayoutGrid, Shield,
  Trash2, Menu, X, ChevronRight, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const navItems = [
  { path: "/merge", label: "Merge", icon: Merge },
  { path: "/split", label: "Split", icon: Split },
  { path: "/convert", label: "Convert", icon: FileOutput },
  { path: "/organize", label: "Organize", icon: LayoutGrid },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground hidden sm:inline" style={{ letterSpacing: "-0.01em" }}>PDF Suite</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main navigation">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  style={{ fontSize: "0.875rem" }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Privacy Badge */}
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            style={{ fontSize: "0.75rem" }}
          >
            <Shield className="w-3.5 h-3.5" />
            Privacy First
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <nav className="p-3 space-y-1" aria-label="Mobile navigation">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                      <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Panel */}
        <AnimatePresence>
          {showPrivacy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border overflow-hidden bg-green-50/50"
            >
              <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Lock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-foreground" style={{ fontSize: "0.875rem" }}>Your files are safe and private</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      Files are processed temporarily and auto-deleted. No signup, login, or data retention.
                      Simple PDF operations run entirely in your browser. You can delete all files instantly.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex-shrink-0"
                  style={{ fontSize: "0.75rem" }}
                >
                  <Trash2 className="w-3 h-3" /> Delete All Files Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      {isHome && (
        <footer className="border-t border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <FileText className="w-3 h-3 text-white" />
              </div>
              <span className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>PDF Suite</span>
            </div>
            <p className="text-muted-foreground text-center" style={{ fontSize: "0.75rem" }}>
              Free, private, no-account PDF tools. Files are never stored permanently.
            </p>
            <div className="flex items-center gap-1 text-green-600" style={{ fontSize: "0.75rem" }}>
              <Shield className="w-3 h-3" /> Privacy First
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
