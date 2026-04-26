"use client";

import { Settings, Lock, Bell, CreditCard, Globe, Shield } from "lucide-react";
import { useState } from "react";

type SettingCategory = {
  id: string;
  name: string;
  description: string;
  icon: typeof Settings;
};

const settingCategories: SettingCategory[] = [
  {
    id: "general",
    name: "General Settings",
    description: "Store name, logo, timezone, language preferences",
    icon: Settings,
  },
  {
    id: "payment",
    name: "Payment Methods",
    description: "ABA, Bakong, credit card configuration",
    icon: CreditCard,
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Email alerts, SMS notifications, webhooks",
    icon: Bell,
  },
  {
    id: "security",
    name: "Security",
    description: "Two-factor authentication, IP whitelist, API keys",
    icon: Shield,
  },
  {
    id: "internationalization",
    name: "Internationalization",
    description: "Languages, currencies, region settings",
    icon: Globe,
  },
  {
    id: "access",
    name: "Access Control",
    description: "User roles, permissions, admin accounts",
    icon: Lock,
  },
];

const notificationSettings = [
  { name: "New Order Emails", enabled: true },
  { name: "Low Stock Alerts", enabled: true },
  { name: "Customer Reviews", enabled: false },
  { name: "Refund Notifications", enabled: true },
  { name: "Weekly Report Summary", enabled: true },
  { name: "System Updates", enabled: true },
];

export function SystemSettings() {
  const [activeCategory, setActiveCategory] = useState("general");
  const [notifications, setNotifications] = useState(notificationSettings);

  const handleToggle = (index: number) => {
    const updated = [...notifications];
    updated[index].enabled = !updated[index].enabled;
    setNotifications(updated);
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-white p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Settings className="h-5 w-5" /> System Settings & Configuration
      </h3>
      <p className="mt-1 text-sm text-muted">Manage store-wide configuration and preferences</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Categories */}
        <div className="space-y-2">
          {settingCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  activeCategory === category.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-border bg-surface hover:border-border/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{category.name}</p>
                    <p className="text-xs text-muted mt-0.5">{category.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          {activeCategory === "general" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">Store Name</label>
                <input
                  type="text"
                  defaultValue="Analite"
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Timezone</label>
                <select className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none">
                  <option>Asia/Phnom_Penh (GMT+7)</option>
                  <option>Asia/Bangkok (GMT+7)</option>
                  <option>UTC</option>
                </select>
              </div>
              <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                Save Changes
              </button>
            </div>
          )}

          {activeCategory === "notifications" && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Choose which notifications you want to receive</p>
              {notifications.map((setting, idx) => (
                <label key={setting.name} className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={setting.enabled}
                    onChange={() => handleToggle(idx)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium text-foreground">{setting.name}</span>
                </label>
              ))}
              <button className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                Save Preferences
              </button>
            </div>
          )}

          {activeCategory === "security" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-700">🔒 Two-Factor Authentication</p>
                <p className="text-xs text-orange-600 mt-1">Enhance account security with 2FA</p>
                <button className="mt-3 rounded-md border border-orange-300 bg-white px-3 py-2 text-xs font-medium text-orange-700 transition hover:bg-orange-50">
                  Enable 2FA
                </button>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">Change Password</p>
                <input
                  type="password"
                  placeholder="Current Password"
                  className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm outline-none"
                />
                <button className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeCategory !== "general" && activeCategory !== "notifications" && activeCategory !== "security" && (
            <div className="rounded-lg border border-border bg-surface p-6 text-center">
              <p className="text-muted text-sm">Settings for this category coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
